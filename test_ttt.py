"""Integration test for Quantum TTT - cycle detection and collapse."""
import httpx

BASE = "http://localhost:8000"
c = httpx.Client(base_url=BASE, timeout=30)

# Create 2-player game (no AI) so we control all moves
game_id = c.post("/games/ttt/new?vs_ai=false").json()["game_id"]
print(f"Game: {game_id}\n")

def move(player, cells, label):
    r = c.post(f"/games/ttt/{game_id}/move", json={"player": player, "cells": cells})
    if r.status_code != 200:
        print(f"  {label}: ERROR {r.status_code} - {r.json()['detail']}")
        return None
    d = r.json()
    gs = d["game_state"]
    owned = {cell["index"]: cell["classical_owner"] for cell in gs["board"] if cell["classical_owner"]}
    print(f"  {label}: cycle={d['cycle_detected']} collapse={d['collapse_triggered']} "
          f"player={gs['current_player']} turn={gs['turn_number']} detected_cycle={gs['detected_cycle']}")
    if owned:
        print(f"    -> Classically collapsed: {owned}")
    return d

# Build a triangle cycle: 0-4 (X1), 4-8 (O2), 0-8 (X3) → cycle at cells 0,4,8
print("--- Building cycle: X[0,4] → O[4,8] → X[0,8] ---")
move("X", [0, 4], "X1")
move("O", [4, 8], "O2")
r = move("X", [0, 8], "X3 (should trigger cycle)")

if r:
    gs = r["game_state"]
    print(f"\nAfter cycle collapse:")
    print(f"  Phase: {gs['phase']}")
    print(f"  Current player: {gs['current_player']}")
    print(f"  Turn number: {gs['turn_number']}")
    print(f"  detected_cycle: {gs['detected_cycle']}")
    owned = {cell["index"]: cell["classical_owner"] for cell in gs["board"] if cell["classical_owner"]}
    print(f"  Classical owners: {owned}")

# Verify game can continue
print("\n--- Verifying game continues after collapse ---")
r2 = move("X", [1, 2], "X4 (should work)")
if r2:
    print("  Game continues correctly!")
