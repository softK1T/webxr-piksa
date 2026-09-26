import os
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api import SessionDep
from app.models import User
from app.security import (
    TOKEN_TTL_SECONDS,
    create_token,
    hash_password,
    read_token,
    verify_password,
)

COOKIE_NAME = "piksa_session"
router = APIRouter(prefix="/auth", tags=["auth"])


class Credentials(BaseModel):
    login: str = Field(min_length=3, max_length=32, pattern=r"^[A-Za-z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    id: int
    login: str


def _set_cookie(response: Response, user: User) -> None:
    response.set_cookie(
        COOKIE_NAME,
        create_token(user.id),
        max_age=TOKEN_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        secure=os.environ.get("COOKIE_SECURE", "0") == "1",
        path="/",
    )


def current_user(
    session: SessionDep,
    token: Annotated[str | None, Cookie(alias=COOKIE_NAME)] = None,
) -> User:
    user_id = read_token(token) if token else None
    user = session.get(User, user_id) if user_id is not None else None
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


UserDep = Annotated[User, Depends(current_user)]


@router.post("/register", status_code=201)
def register(payload: Credentials, session: SessionDep, response: Response) -> UserOut:
    login = payload.login.lower()
    if session.scalar(select(User).where(User.login == login)) is not None:
        raise HTTPException(status_code=409, detail="Login already taken")
    user = User(login=login, password_hash=hash_password(payload.password))
    session.add(user)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="Login already taken") from exc
    _set_cookie(response, user)
    return UserOut(id=user.id, login=user.login)


@router.post("/login")
def login(payload: Credentials, session: SessionDep, response: Response) -> UserOut:
    user = session.scalar(select(User).where(User.login == payload.login.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid login or password")
    _set_cookie(response, user)
    return UserOut(id=user.id, login=user.login)


@router.post("/logout", status_code=204)
def logout(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


@router.get("/me")
def me(user: UserDep) -> UserOut:
    return UserOut(id=user.id, login=user.login)
