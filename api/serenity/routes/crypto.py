"""Public crypto parameters for clients."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from serenity.agent.service import SERVER_KEY_SETTING
from serenity.deps import DbDep
from serenity.models import Setting

router = APIRouter(prefix="/api/crypto", tags=["crypto"])


class ServerKey(BaseModel):
    """X25519 public key used by clients to seal the agent key (docs/crypto.md §5.3)."""

    public_key: str
    key_id: str


@router.get("/server-key")
def get_server_key(db: DbDep) -> ServerKey:
    row = db.get(Setting, SERVER_KEY_SETTING)
    if row is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Agent pas encore démarré.")
    return ServerKey(**row.value)
