"""Common response and pagination schemas."""
from typing import Any, Generic, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation successful"
    data: Optional[T] = None
    error: Optional[str] = None

class HealthCheckResponse(BaseModel):
    status: str
    service: str
    environment: str
    database_connected: bool
    sqlite_foreign_keys_enforced: bool
    timestamp: str

