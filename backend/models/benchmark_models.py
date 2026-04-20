"""Pydantic models for the benchmarking tool."""
from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel

TemplateName = Literal["grover", "rng", "shor", "qft", "qaoa", "freeform"]


class BenchmarkRunRequest(BaseModel):
    template: TemplateName
    parameters: dict[str, Any]


class QuantumMetrics(BaseModel):
    circuit_depth: int
    gate_count: int | dict
    cnot_count: int
    qubit_count: int
    sim_time_ms: float
    shots: int
    measurement_distribution: dict[str, Any] = {}
    extra: dict[str, Any] = {}


class ClassicalMetrics(BaseModel):
    algorithm: str
    steps: int
    time_ms: float
    result: dict[str, Any]
    complexity_label: str


class BenchmarkResult(BaseModel):
    id: str | None = None
    template: TemplateName
    parameters: dict[str, Any]
    quantum: QuantumMetrics
    classical: ClassicalMetrics | None = None
    speedup_factor: float | None = None
    created_at: str | None = None


class BenchmarkRunSummary(BaseModel):
    id: str
    template: TemplateName
    parameters: dict[str, Any]
    speedup_factor: float | None
    sim_time_ms: float
    created_at: str


class TemplateInfo(BaseModel):
    name: TemplateName
    title: str
    tagline: str
    quantum_algo: str
    classical_algo: str
    complexity_quantum: str
    complexity_classical: str
    parameters: list[dict[str, Any]]  # parameter schema for the UI
