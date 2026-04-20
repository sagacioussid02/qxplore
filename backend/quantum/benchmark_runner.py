"""Routes benchmark templates to quantum + classical execution and computes metrics."""
from __future__ import annotations
import math
import time
import numpy as np
from qiskit import QuantumCircuit, transpile

from .simulator import get_simulator
from .grover_circuit import run_grover
from .qft_benchmark import run_qft
from .qaoa_circuit import run_qaoa
from ..classical.classical_solvers import (
    linear_search, trial_division, pollards_rho, numpy_fft,
    brute_force_maxcut, prng_bits,
)
from ..models.benchmark_models import QuantumMetrics, ClassicalMetrics, BenchmarkResult, TemplateName

# Default edges for QAOA Max-Cut (triangle + extra for 4/5 node)
_DEFAULT_EDGES: dict[int, list[tuple[int, int]]] = {
    3: [(0, 1), (1, 2), (0, 2)],
    4: [(0, 1), (1, 2), (2, 3), (0, 3), (0, 2)],
    5: [(0, 1), (1, 2), (2, 3), (3, 4), (0, 4), (0, 2), (1, 3)],
}


def run_benchmark(template: TemplateName, parameters: dict) -> BenchmarkResult:
    quantum = _run_quantum(template, parameters)
    classical = _run_classical(template, parameters)
    speedup = _compute_speedup(template, quantum, classical, parameters)

    return BenchmarkResult(
        template=template,
        parameters=parameters,
        quantum=quantum,
        classical=classical,
        speedup_factor=speedup,
    )


# ── Quantum side ──────────────────────────────────────────────────────────────

def _run_quantum(template: TemplateName, params: dict) -> QuantumMetrics:
    if template == "grover":
        n = int(params.get("n_items", 16))
        target = int(params.get("target", 0))
        r = run_grover(n, target)
        gate_total = sum(r["gate_count"].values()) if isinstance(r["gate_count"], dict) else r["gate_count"]
        return QuantumMetrics(
            circuit_depth=r["circuit_depth"],
            gate_count=gate_total,
            cnot_count=r["cnot_count"],
            qubit_count=r["qubit_count"],
            sim_time_ms=r["sim_time_ms"],
            shots=r["shots"],
            measurement_distribution=r["measurement_distribution"],
            extra={"n_iterations": r["n_iterations"], "success": r["success"], "top_result": r["top_result"]},
        )

    elif template == "rng":
        n_bits = int(params.get("n_bits", 8))
        n_bits = max(1, min(n_bits, 16))
        sim = get_simulator()
        qc = QuantumCircuit(n_bits)
        for i in range(n_bits):
            qc.h(i)
        qc.save_statevector(label="sv")
        qc.measure_all()
        t0 = time.perf_counter()
        tqc = transpile(qc, sim, optimization_level=0)
        result = sim.run(tqc, shots=1).result()
        sim_ms = (time.perf_counter() - t0) * 1000
        counts = result.get_counts()
        value = int(list(counts.keys())[0], 2)
        return QuantumMetrics(
            circuit_depth=tqc.depth(),
            gate_count=n_bits,
            cnot_count=0,
            qubit_count=n_bits,
            sim_time_ms=round(sim_ms, 2),
            shots=1,
            measurement_distribution={str(value): 1},
            extra={"value": value, "n_bits": n_bits},
        )

    elif template == "shor":
        from .shor import run_shor
        t0 = time.perf_counter()
        r = run_shor()
        sim_ms = (time.perf_counter() - t0) * 1000
        # shor returns a narrative dict — extract what we can
        return QuantumMetrics(
            circuit_depth=0,   # shor.py doesn't expose depth directly
            gate_count=0,
            cnot_count=0,
            qubit_count=8,     # 4 counting + 4 work qubits (fixed in shor.py)
            sim_time_ms=round(sim_ms, 2),
            shots=2048,
            measurement_distribution={},
            extra={"n": 15, "factors": r.get("factors", []), "period": r.get("period")},
        )

    elif template == "qft":
        n_qubits = int(params.get("n_qubits", 3))
        r = run_qft(n_qubits)
        return QuantumMetrics(
            circuit_depth=r["circuit_depth"],
            gate_count=r["gate_count"],
            cnot_count=r["cnot_count"],
            qubit_count=r["qubit_count"],
            sim_time_ms=r["sim_time_ms"],
            shots=r["shots"],
            measurement_distribution=r["measurement_distribution"],
            extra={"n_points": r["n_points"]},
        )

    elif template == "qaoa":
        n_nodes = int(params.get("n_nodes", 4))
        edges = params.get("edges") or _DEFAULT_EDGES.get(n_nodes, _DEFAULT_EDGES[4])
        edges = [tuple(e) for e in edges]
        r = run_qaoa(n_nodes, edges)
        return QuantumMetrics(
            circuit_depth=r["circuit_depth"],
            gate_count=r["gate_count"],
            cnot_count=r["cnot_count"],
            qubit_count=r["qubit_count"],
            sim_time_ms=r["sim_time_ms"],
            shots=r["shots"],
            measurement_distribution=r["measurement_distribution"],
            extra={"best_cut": r["best_cut"], "best_partition": r["best_partition"]},
        )

    elif template == "freeform":
        from .circuit_builder import build_and_run
        gates = params.get("gates", [])
        n_qubits = int(params.get("num_qubits", 2))
        t0 = time.perf_counter()
        r = build_and_run(n_qubits, gates)
        sim_ms = (time.perf_counter() - t0) * 1000
        return QuantumMetrics(
            circuit_depth=r["circuit_depth"],
            gate_count=r["num_gates"],
            cnot_count=sum(1 for g in gates if g.get("type", "").upper() == "CNOT"),
            qubit_count=n_qubits,
            sim_time_ms=round(sim_ms, 2),
            shots=1,
            measurement_distribution={},
            extra={},
        )

    raise ValueError(f"Unknown template: {template}")


# ── Classical side ────────────────────────────────────────────────────────────

def _run_classical(template: TemplateName, params: dict) -> ClassicalMetrics | None:
    if template == "grover":
        n = int(params.get("n_items", 16))
        target = int(params.get("target", 0))
        r = linear_search(n, target)
        return ClassicalMetrics(
            algorithm=r.algorithm, steps=r.steps, time_ms=r.time_ms,
            result=r.result, complexity_label=r.complexity_label,
        )

    elif template == "rng":
        n_bits = int(params.get("n_bits", 8))
        r = prng_bits(n_bits)
        return ClassicalMetrics(
            algorithm=r.algorithm, steps=r.steps, time_ms=r.time_ms,
            result=r.result, complexity_label=r.complexity_label,
        )

    elif template == "shor":
        r = pollards_rho(15)
        return ClassicalMetrics(
            algorithm=r.algorithm, steps=r.steps, time_ms=r.time_ms,
            result=r.result, complexity_label=r.complexity_label,
        )

    elif template == "qft":
        n_qubits = int(params.get("n_qubits", 3))
        n_points = 2 ** n_qubits
        r = numpy_fft(n_points)
        return ClassicalMetrics(
            algorithm=r.algorithm, steps=r.steps, time_ms=r.time_ms,
            result=r.result, complexity_label=r.complexity_label,
        )

    elif template == "qaoa":
        n_nodes = int(params.get("n_nodes", 4))
        edges = params.get("edges") or _DEFAULT_EDGES.get(n_nodes, _DEFAULT_EDGES[4])
        edges = [tuple(e) for e in edges]
        r = brute_force_maxcut(n_nodes, edges)
        return ClassicalMetrics(
            algorithm=r.algorithm, steps=r.steps, time_ms=r.time_ms,
            result=r.result, complexity_label=r.complexity_label,
        )

    elif template == "freeform":
        return None  # no classical equivalent for free-form

    return None


# ── Speedup computation ────────────────────────────────────────────────────────

def _compute_speedup(
    template: TemplateName,
    quantum: QuantumMetrics,
    classical: ClassicalMetrics | None,
    params: dict,
) -> float | None:
    if classical is None or classical.steps == 0:
        return None
    if template == "grover":
        n = int(params.get("n_items", 16))
        quantum_steps = max(1, round(math.pi / 4 * math.sqrt(n)))
        return round(classical.steps / quantum_steps, 2)
    if template == "qft":
        n_qubits = int(params.get("n_qubits", 3))
        n_points = 2 ** n_qubits
        quantum_steps = n_qubits * (n_qubits - 1) // 2 + n_qubits  # H + CPhase gate count
        return round(classical.steps / max(quantum_steps, 1), 2)
    # For other templates use raw step ratio
    q_steps = quantum.gate_count if isinstance(quantum.gate_count, int) else sum(quantum.gate_count.values()) if isinstance(quantum.gate_count, dict) else 1
    return round(classical.steps / max(q_steps, 1), 2)
