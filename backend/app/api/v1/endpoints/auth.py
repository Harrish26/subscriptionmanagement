"""Authentication endpoints: Register, Login, Password Reset, and Identity."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.auth import (
    LoginRequest, 
    PasswordResetConfirm, 
    PasswordResetRequest, 
    Token
)
from app.schemas.common import ApiResponse
from app.schemas.user import UserCreate, UserRead
from app.services.user_service import UserService

router = APIRouter()

@router.post("/register", response_model=ApiResponse[UserRead], status_code=status.HTTP_201_CREATED)
def register_customer(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Public customer registration.
    Validates email uniqueness and strict password policy (>8 chars, uppercase, lowercase, special char).
    """
    existing_user = UserService.get_by_email(db, user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    new_user = UserService.create_customer_user(db, user_in)
    return ApiResponse(
        success=True,
        message="Customer account created successfully.",
        data=UserRead.model_validate(new_user)
    )

@router.post("/login", response_model=ApiResponse[Token])
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates email and password, returning a JWT bearer token."""
    user = UserService.authenticate(db, email=login_data.email, password=login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive."
        )

    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value
    )

    token_data = Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name
    )

    return ApiResponse(
        success=True,
        message="Authentication successful.",
        data=token_data
    )

@router.get("/me", response_model=ApiResponse[UserRead])
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieves profile of the authenticated user."""
    return ApiResponse(
        success=True,
        message="Current user profile fetched.",
        data=UserRead.model_validate(current_user)
    )

@router.post("/forgot-password", response_model=ApiResponse[dict])
def forgot_password(req: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Initiates password reset link generation.
    Returns token (in a real production app this is emailed; returned here for seamless testing).
    """
    token = UserService.generate_password_reset_token(db, req.email)
    # Always return success message even if email doesn't exist for security
    message = "If your email is registered, a password reset link has been dispatched."
    data = {"reset_token": token} if token else None
    return ApiResponse(
        success=True,
        message=message,
        data=data
    )

@router.post("/reset-password", response_model=ApiResponse[dict])
def reset_password(req: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Resets password using valid token and validates new password strength."""
    success, message = UserService.reset_password_with_token(db, req.token, req.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    return ApiResponse(
        success=True,
        message=message,
        data=None
    )

