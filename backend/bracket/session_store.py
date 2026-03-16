"""In-memory session store for bracket sessions (LRU, max 20) with Supabase write-through."""
import logging
from collections import OrderedDict
from datetime import datetime, timezone
import uuid
from ..models.bracket import BracketData, BracketSession

log = logging.getLogger(__name__)

MAX_SESSIONS = 20
_sessions: OrderedDict[str, BracketSession] = OrderedDict()


def create_session(bracket: BracketData, user_id: str | None = None) -> BracketSession:
    session = BracketSession(
        session_id=str(uuid.uuid4()),
        user_id=user_id,
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


async def save_session_async(session: BracketSession) -> None:
    """Save to memory and persist to Supabase if user is authenticated."""
    save_session(session)
    if session.user_id:
        try:
            from ..core.supabase_auth import save_bracket_session
            await save_bracket_session(session)
        except Exception:
            log.exception("Failed to persist session %s to Supabase", session.session_id)


async def load_session_for_user(user_id: str) -> BracketSession | None:
    """Load user's latest session — memory first, then Supabase."""
    # Check in-memory cache first
    for session in reversed(list(_sessions.values())):
        if session.user_id == user_id:
            return session

    # Fall back to Supabase
    try:
        from ..core.supabase_auth import load_bracket_session
        from ..models.bracket import BracketSession
        data = await load_bracket_session(user_id)
        if data:
            session = BracketSession.model_validate(data)
            # Warm the in-memory cache
            _sessions[session.session_id] = session
            return session
    except Exception:
        log.exception("Failed to load session for user %s from Supabase", user_id)

    return None
