import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import UnauthorizedException
from app.core.security import decode_access_token
from app.dependencies.database import get_db
from app.models.user import User
from app.repositories.users import RevokedTokenRepository, UserRepository

# Standard OAuth2 Bearer token extractor
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Extract raw JWT bearer token from Authorization header."""
    if not credentials or credentials.scheme.lower() != "bearer":
        raise UnauthorizedException("Missing or invalid Authorization header scheme.")
    return credentials.credentials


def get_current_user(
    token: str = Depends(get_current_user_token),
    db: Session = Depends(get_db),
) -> User:
    """
    Validate JWT access token, ensure it is not revoked in the denylist,
    and fetch the active User from the database.
    """
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError as err:
        raise UnauthorizedException("Access token has expired.") from err
    except jwt.PyJWTError as err:
        raise UnauthorizedException("Invalid token signature or payload.") from err

    jti: str = payload.get("jti")
    subject: str = payload.get("sub")

    if not subject:
        raise UnauthorizedException("Token missing subject identifier.")

    # Check denylist
    if jti:
        revocation_repo = RevokedTokenRepository(db)
        if revocation_repo.is_revoked(jti):
            raise UnauthorizedException("Access token has been revoked. Please log in again.")

    user_repo = UserRepository(db)
    try:
        user_id = int(subject)
    except (ValueError, TypeError) as err:
        raise UnauthorizedException("Invalid subject format.") from err

    user = user_repo.get_by_id(user_id)
    if not user:
        raise UnauthorizedException("User associated with token no longer exists.")

    if not user.is_active:
        raise UnauthorizedException("User account is inactive.")

    return user
