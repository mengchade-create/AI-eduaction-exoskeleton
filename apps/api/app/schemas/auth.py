"""Authentication request and response schemas."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer


class UserOut(BaseModel):
    id: UUID
    username: str
    role: str
    display_name: str | None = None
    avatar: str | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("id")
    def serialize_id(self, value: UUID) -> str:
        return str(value)


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
