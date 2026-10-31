"""User management endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin, require_staff
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse
from app.schemas.user import UserRead, UserStaffCreate
from app.services.user_service import UserService

router = APIRouter()

@router.post("/staff", response_model=ApiResponse[UserRead], status_code=status.HTTP_201_CREATED)
def create_staff_member(
    staff_in: UserStaffCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin-Only: Creates a new internal staff member.
    Enforces Brightloop requirement: 'Only the admin can add a new member of staff'.
    """
    existing_user = UserService.get_by_email(db, staff_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    staff_user = UserService.create_staff_user(db, staff_in)
    return ApiResponse(
        success=True,
        message=f"Staff account for {staff_user.full_name} created successfully.",
        data=UserRead.model_validate(staff_user)
    )

@router.get("/", response_model=ApiResponse[List[UserRead]])
def list_users(
    role: Optional[UserRole] = Query(None, description="Filter by user role"),
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Admin & Staff: List registered users with optional role filtering."""
    users = UserService.list_users(db, role=role)
    return ApiResponse(
        success=True,
        message="Users retrieved successfully.",
        data=[UserRead.model_validate(u) for u in users]
    )

@router.get("/{user_id}", response_model=ApiResponse[UserRead])
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve user details. Customers can only view their own profile."""
    if current_user.role == UserRole.CUSTOMER and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customers are restricted to their own account."
        )

    user = UserService.get_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    return ApiResponse(
        success=True,
        message="User profile fetched.",
        data=UserRead.model_validate(user)
    )

