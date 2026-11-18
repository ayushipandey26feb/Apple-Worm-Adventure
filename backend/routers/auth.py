import uuid
from datetime import datetime, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from lib.auth import COOKIE, current_user, public_user, set_session
from lib.db import db
from models.schemas import AuthIn, PublicUser

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=PublicUser)
async def register(body: AuthIn, response: Response):
    email = body.email.lower().strip()
    if "@" not in email:
        raise HTTPException(422, "Enter a valid email")
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "That email is already registered")
    user = {"id": str(uuid.uuid4()), "email": email, "name": (body.name or "").strip() or email.split("@")[0].title(), "role": "player", "password_hash": bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode(), "coins": 0, "best_score": 0, "total_stars": 0, "completed_levels": 0, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.users.insert_one(user)
    set_session(response, user["id"])
    return public_user(user)


@router.post("/login", response_model=PublicUser)
async def login(body: AuthIn, response: Response):
    user = await db.users.find_one({"email": body.email.lower().strip()}, {"_id": 0})
    if not user or not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(401, "Email or password is incorrect")
    set_session(response, user["id"])
    return public_user(user)


@router.get("/me", response_model=PublicUser)
async def me(user=Depends(current_user)):
    return public_user(user)


@router.post("/logout")
async def logout(request: Request, response: Response):
    raw = request.cookies.get(COOKIE)
    if raw:
        await db.revoked_tokens.update_one({"token": raw}, {"$set": {"token": raw, "revoked_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    response.delete_cookie(COOKIE, secure=True, samesite="none")
    return {"ok": True}
