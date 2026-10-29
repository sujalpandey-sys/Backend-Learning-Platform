from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user, get_current_user_token
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LogoutResponse, TokenResponse
from app.schemas.user import UserCreate, UserResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Register a new user account with secure password hashing."""
    service = AuthService(db)
    user = service.register(user_in)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login_for_access_token(
    login_in: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate credentials and issue a signed JWT access token."""
    service = AuthService(db)
    return service.login(login_in)


@router.post("/logout", response_model=LogoutResponse)
def logout_user(
    token: str = Depends(get_current_user_token),
    db: Session = Depends(get_db),
) -> LogoutResponse:
    """
    Revoke current JWT access token via database-backed denylist.
    Stateless JWTs are officially invalidated before their natural expiry.
    """
    service = AuthService(db)
    return service.logout(token)


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Retrieve the authenticated user's profile."""
    return UserResponse.model_validate(current_user)
