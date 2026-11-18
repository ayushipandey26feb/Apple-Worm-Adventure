import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import bcrypt
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Request
from starlette.middleware.cors import CORSMiddleware

load_dotenv()
from lib.db import client, db, ensure_indexes  # noqa: E402
from lib.economy import get_config  # noqa: E402
from routers import admin, auth, progress, rewards, social  # noqa: E402

GAME_NAME = os.environ["GAME_NAME"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    password_hash = bcrypt.hashpw(os.environ["ADMIN_PASSWORD"].encode(), bcrypt.gensalt()).decode()
    if not await db.users.find_one({"email": admin_email}):
        await db.users.insert_one({"id": str(uuid.uuid4()), "email": admin_email, "name": "Economy Admin", "role": "admin", "password_hash": password_hash, "coins": 0, "best_score": 0, "total_stars": 0, "completed_levels": 0, "created_at": datetime.now(timezone.utc).isoformat()})
    yield
    client.close()


app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": GAME_NAME, "levels": 50}


@api_router.get("/config")
async def config(request: Request):
    publisher = os.environ.get("ADSENSE_PUBLISHER_ID", "").strip()
    if publisher and not publisher.startswith("ca-"):
        publisher = "ca-" + (publisher if publisher.startswith("pub-") else f"pub-{publisher}")
    # Google test ads on preview/localhost; real ads on the live domain (override with ADSENSE_TEST_MODE=on|off).
    host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
    override = os.environ.get("ADSENSE_TEST_MODE", "").strip().lower()
    test_mode = override == "on" if override in ("on", "off") else ("preview" in host or "localhost" in host or "127.0.0.1" in host)
    ads = {"provider": "adsense" if publisher else "demo", "publisher_id": publisher, "test_mode": test_mode}
    return {"game_name": GAME_NAME, "levels": 50, "economy": (await get_config()).model_dump(), "ads": ads}


api_router.include_router(auth.router)
api_router.include_router(progress.router)
api_router.include_router(rewards.router)
api_router.include_router(admin.router)
api_router.include_router(social.router)

app.add_middleware(CORSMiddleware, allow_origins=os.environ["CORS_ORIGINS"].split(","), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(api_router)
