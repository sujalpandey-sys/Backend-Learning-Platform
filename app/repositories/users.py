from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.revoked_token import RevokedToken
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        stmt = select(User).where(User.id == user_id)
        return self.db.scalars(stmt).first()

    def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email.lower().strip())
        return self.db.scalars(stmt).first()

    def create(self, email: str, hashed_password: str, full_name: str | None = None) -> User:
        user = User(
            email=email.lower().strip(),
            hashed_password=hashed_password,
            full_name=full_name,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user


class RevokedTokenRepository:
    def __init__(self, db: Session):
        self.db = db

    def is_revoked(self, jti: str) -> bool:
        stmt = select(RevokedToken).where(RevokedToken.jti == jti)
        return self.db.scalars(stmt).first() is not None

    def revoke(self, jti: str, expires_at: datetime) -> RevokedToken:
        revoked = RevokedToken(jti=jti, expires_at=expires_at)
        self.db.add(revoked)
        self.db.commit()
        self.db.refresh(revoked)
        return revoked
