import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ConflictException, UnauthorizedException
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.users import RevokedTokenRepository, UserRepository
from app.schemas.auth import LoginRequest, LogoutResponse, TokenResponse
from app.schemas.user import UserCreate


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.revocation_repo = RevokedTokenRepository(db)

    def register(self, user_in: UserCreate) -> User:
        # Check if email is already registered
        existing = self.user_repo.get_by_email(user_in.email)
        if existing:
            raise ConflictException("A user with this email already exists.")

        hashed_password = hash_password(user_in.password)
        return self.user_repo.create(
            email=user_in.email,
            hashed_password=hashed_password,
            full_name=user_in.full_name,
        )

    def login(self, login_in: LoginRequest) -> TokenResponse:
        user = self.user_repo.get_by_email(login_in.email)
        if not user or not verify_password(login_in.password, user.hashed_password):
            raise UnauthorizedException("Incorrect email or password.")

        if not user.is_active:
            raise UnauthorizedException("Inactive user account.")

        jti = str(uuid.uuid4())
        access_token = create_access_token(subject=user.id, jti=jti)
        expires_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in_seconds=expires_seconds,
        )

    def logout(self, token: str) -> LogoutResponse:
        """
        Revokes token by placing its JTI onto the database-backed denylist.
        Stateless JWTs normally remain valid until expiration unless explicitly checked against a denylist.
        """
        try:
            payload = decode_access_token(token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                expires_at = datetime.fromtimestamp(exp, tz=UTC)
                self.revocation_repo.revoke(jti=jti, expires_at=expires_at)
                return LogoutResponse(
                    message="Logged out successfully. Token JTI has been revoked.",
                    revoked_jti=jti,
                    note="The token's unique ID (JTI) is recorded in the denylist and will be rejected until its natural expiry.",
                )
        except Exception:
            pass

        return LogoutResponse(
            message="Logged out successfully.",
            revoked_jti=None,
            note="Client should delete the token from local storage. Stateless JWT without JTI cannot be server-revoked.",
        )
