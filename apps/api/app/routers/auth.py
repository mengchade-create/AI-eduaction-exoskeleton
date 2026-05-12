"""Authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.deps import get_current_user, get_db
from app.models import User
from app.schemas.auth import LoginRequest, LoginResponse, UserOut
from app.security import create_access_token, verify_password


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.exec(select(User).where(User.username == body.username)).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid_credentials")

    return LoginResponse(
        access_token=create_access_token(subject=str(user.id)),
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)
