"""RSA + Shor's algorithm endpoints."""
import math
import logging
from fastapi import APIRouter, HTTPException
from ..models.rsa_models import (
    KeygenRequest, KeygenResponse,
    EncryptRequest, EncryptResponse,
    DecryptRequest, DecryptResponse,
    ClassicalFactorRequest, ClassicalFactorResponse,
    ShorResponse,
)
from ..quantum.shor import (
    _is_prime,
    run_keygen,
    run_encrypt,
    run_decrypt,
    run_classical_factor,
    run_shor_n15,
)

log = logging.getLogger(__name__)
router = APIRouter(prefix="/rsa", tags=["rsa"])

_MAX_N = 10 ** 9   # keeps all values in safe JS number range


@router.post("/keygen", response_model=KeygenResponse)
async def keygen(req: KeygenRequest):
    if not _is_prime(req.p):
        raise HTTPException(400, f"{req.p} is not prime")
    if not _is_prime(req.q):
        raise HTTPException(400, f"{req.q} is not prime")
    if req.p == req.q:
        raise HTTPException(400, "p and q must be distinct primes")
    if req.p * req.q > _MAX_N:
        raise HTTPException(400, f"n = p×q must be ≤ {_MAX_N:,} for this demo")
    phi_n = (req.p - 1) * (req.q - 1)
    if phi_n < 3:
        raise HTTPException(400, "Primes are too small — choose p,q ≥ 5")
    return run_keygen(req.p, req.q)


@router.post("/encrypt", response_model=EncryptResponse)
async def encrypt(req: EncryptRequest):
    if req.message_int < 1:
        raise HTTPException(400, "message_int must be ≥ 1")
    if req.message_int >= req.n:
        raise HTTPException(400, f"message_int must be < n={req.n} (RSA requirement)")
    return run_encrypt(req.message_int, req.e, req.n)


@router.post("/decrypt", response_model=DecryptResponse)
async def decrypt(req: DecryptRequest):
    if req.ciphertext < 0 or req.ciphertext >= req.n:
        raise HTTPException(400, f"ciphertext must be in [0, n={req.n})")
    return run_decrypt(req.ciphertext, req.d, req.n)


@router.post("/classical-factor", response_model=ClassicalFactorResponse)
async def classical_factor(req: ClassicalFactorRequest):
    if req.n < 4:
        raise HTTPException(400, "n must be ≥ 4")
    if req.n > _MAX_N:
        raise HTTPException(400, f"n must be ≤ {_MAX_N:,} for this demo")
    capped_steps = min(req.max_steps, 5000)
    return run_classical_factor(req.n, capped_steps)


@router.post("/shor-factor", response_model=ShorResponse)
async def shor_factor():
    """Run Shor's QPE circuit for n=15, a=7 on the AerSimulator."""
    log.info("shor-factor: starting QPE run")
    result = run_shor_n15(shots=2048)
    log.info(
        "shor-factor: done — factors=%s period=%d depth=%d qubits=%d",
        result.factors, result.period_r, result.circuit_depth, result.num_qubits,
    )
    return result
