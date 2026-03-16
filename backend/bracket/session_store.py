"""In-memory session store for bracket sessions (LRU, max 20)."""
from collections import OrderedDict
from datetime import datetime, timezone
import uuid
from ..models.bracket import BracketData, BracketSession

MAX_SESSIONS = 20
_sessions: OrderedDict[str, BracketSession] = OrderedDict()


def create_session(bracket: BracketData) -> BracketSession:
    session = BracketSession(
        session_id=str(uuid.uuid4()),
        bracket=bracket,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    _sessions[session.session_id] = session
    if len(_sessions) > MAX_SESSIONS:
        _sessions.popitem(last=False)
    return session


def get_session(session_id: str) -> BracketSession | None:
    return _sessions.get(session_id)


def save_session(session: BracketSession) -> None:
    _sessions[session.session_id] = session
    _sessions.move_to_end(session.session_id)
