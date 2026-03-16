"""Pydantic models for NCAA bracket challenge."""
from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field
import uuid
from datetime import datetime, timezone

AgentName = Literal["claude", "openai", "gemini", "montecarlo", "quantum"]

AGENT_LABELS: dict[AgentName, str] = {
    "claude": "Claude",
    "openai": "OpenAI GPT-4o",
    "gemini": "Gemini 2.0",
    "montecarlo": "Monte Carlo",
    "quantum": "Quantum ⚛",
}


class TeamEntry(BaseModel):
    team_id: str
    name: str
    seed: int
    region: str
    record: str = ""
    conference: str = ""
    kenpom_rank: Optional[int] = None
    strength_of_schedule: Optional[float] = None
    recent_news: str = ""


class Matchup(BaseModel):
    game_id: str
    region_id: str
    round: int          # 1=R64 2=R32 3=S16 4=E8 5=F4 6=Champ
    position: int       # top-to-bottom slot within round
    team_a: Optional[TeamEntry] = None
    team_b: Optional[TeamEntry] = None
    winner_advances_to: Optional[str] = None  # game_id of next matchup


class Region(BaseModel):
    name: str
    region_id: str
    matchups: list[Matchup]   # all matchups in this region (rounds 1-4)


class BracketData(BaseModel):
    tournament_id: str
    year: int
    fetched_at: str
    source: Literal["sportsdata_io", "static_fallback"]
    regions: list[Region]           # 4 regions
    final_four: list[Matchup] = []  # 2 matchups
    championship: Optional[Matchup] = None


class BracketPick(BaseModel):
    session_id: str
    agent: AgentName
    game_id: str
    winner_team_id: str
    winner_name: str
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str = ""
    pick_metadata: dict = {}


class CompletedBracket(BaseModel):
    session_id: str
    agent: AgentName
    picks: dict[str, BracketPick] = {}   # keyed by game_id
    champion: Optional[TeamEntry] = None
    completed_at: str = ""
    agent_metadata: dict = {}


class AgentScore(BaseModel):
    agent: AgentName
    methodology_score: int
    upset_score: int
    champion_rationale_score: int
    total: int


class EvaluationResult(BaseModel):
    session_id: str
    scores: dict[str, AgentScore] = {}
    written_analysis: str = ""


class BracketSession(BaseModel):
    session_id: str
    bracket: BracketData
    status: Literal["pending", "picking", "evaluating", "complete"] = "pending"
    completed_brackets: dict[str, CompletedBracket] = {}
    evaluation: Optional[EvaluationResult] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
