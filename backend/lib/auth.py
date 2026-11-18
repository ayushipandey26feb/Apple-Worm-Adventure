"""Cookie-JWT auth helpers shared by every router."""

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import HTTPException, Request, Response

from lib.db import db

SECRET = os.environ["JWT_SECRET"]
COOKIE = "access_token"


def make_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id, "jti": str(uuid.uuid4()), "exp": datetime.now(timezone.utc) + timedelta(days=7)}, SECRET, algorithm="HS256")


def set_session(response: Response, user_id: str) -> None:
    response.set_cookie(COOKIE, make_token(user_id), httponly=True, secure=True, samesite="none", max_age=604800)


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user.get("role", "player"), "coins": user.get("coins", 0), "best_score": user.get("best_score", 0), "total_stars": user.get("total_stars", 0), "completed_levels": user.get("completed_levels", 0), "skin": user.get("skin", "skin-classic"), "hat": user.get("hat")}


async def _resolve(request: Request) -> dict[str, Any] | None:
    raw = request.cookies.get(COOKIE)
    if not raw:
        return None
    try:
        payload = jwt.decode(raw, SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None
    if await db.revoked_tokens.find_one({"token": raw}, {"_id": 0}):
        return None
    return await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})


async def current_user(request: Request) -> dict[str, Any]:
    user = await _resolve(request)
    if not user:
        raise HTTPException(401, "Sign in to continue")
    return user


async def optional_user(request: Request) -> dict[str, Any] | None:
    return await _resolve(request)


async def admin_user(request: Request) -> dict[str, Any]:
    user = await current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user
