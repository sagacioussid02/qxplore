"""1-layer QAOA circuit for Max-Cut on small graphs (3–5 nodes)."""
from __future__ import annotations
import math
import time
import numpy as np
from qiskit import QuantumCircuit, transpile
from .simulator import get_simulator


def run_qaoa(n_nodes: int, edges: list[tuple[int, int]]) -> dict:
    """
    Run 1-layer QAOA for Max-Cut on a graph with n_nodes and given edges.
    Uses fixed parameters γ=π/4, β=π/8 (reasonable starting point).
    Returns circuit metrics + best cut found from measurement distribution.
    """
    n_nodes = max(3, min(n_nodes, 5))
    gamma = math.pi / 4
    beta = math.pi / 8
    sim = get_simulator()

    qc = QuantumCircuit(n_nodes)

    # Initial state: equal superposition
    qc.h(range(n_nodes))

    # Cost unitary (phase separation)
    for u, v in edges:
        if u < n_nodes and v < n_nodes:
            qc.cx(u, v)
            qc.rz(2 * gamma, v)
            qc.cx(u, v)

    # Mixer unitary
    for i in range(n_nodes):
        qc.rx(2 * beta, i)

    qc.save_statevector(label="sv")
    qc.measure_all()

    t0 = time.perf_counter()
    tqc = transpile(qc, sim, optimization_level=0)
    result = sim.run(tqc, shots=1024).result()
    sim_time_ms = (time.perf_counter() - t0) * 1000

    counts = result.get_counts()
    sv = np.array(result.data(0)["sv"])

    # Evaluate cut value for each measured bitstring
    def cut_value(bs: str) -> int:
        bits = [int(b) for b in reversed(bs)]
        return sum(1 for u, v in edges if u < len(bits) and v < len(bits) and bits[u] != bits[v])

    best_bs = max(counts, key=lambda bs: cut_value(bs))
    best_cut = cut_value(best_bs)
    dist = {bs: cnt for bs, cnt in sorted(counts.items(), key=lambda x: -x[1])}

    return {
        "circuit_depth": tqc.depth(),
        "gate_count": sum(tqc.count_ops().values()),
        "cnot_count": tqc.count_ops().get("cx", 0),
        "qubit_count": n_nodes,
        "sim_time_ms": round(sim_time_ms, 2),
        "shots": 1024,
        "gamma": gamma,
        "beta": beta,
        "best_cut": best_cut,
        "best_partition": best_bs,
        "measurement_distribution": dist,
    }
