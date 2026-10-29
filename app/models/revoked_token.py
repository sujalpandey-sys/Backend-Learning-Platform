from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.database import Base


class RevokedToken(Base):
    """
    Database-backed token denylist model.
    Stores the JTI (unique JWT identifier) and expiration date of revoked tokens.
    Provides verifiable, secure token invalidation for stateless JWTs.
    """

    __tablename__ = "revoked_tokens"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    jti = Column(String(64), unique=True, index=True, nullable=False)
    revoked_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)

    def __repr__(self) -> str:
        return f"<RevokedToken jti={self.jti} expires_at={self.expires_at}>"
