# Frontend Backend

This directory contains a secondary backend implementation for quantumanic.

## Purpose

The purpose of this backend directory is currently being clarified. See [ADR 0001: Dual-Backend Architecture](../../docs/adr/0001-dual-backend-architecture.md) for context.

This backend may serve one of the following purposes:
1. **Legacy backend** — An older implementation kept for reference or gradual migration
2. **Alternative backend** — A Python-based backend for specific use cases or experimentation
3. **Development/testing backend** — A secondary implementation for testing or CI purposes
4. **Unused artifact** — Code that is no longer actively maintained

## Status

**Action Required:** The team should clarify the purpose of this directory and update this README accordingly.

## Architecture

For high-level architecture and the relationship between this backend and the primary `backend/` service, see:
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — High-level architecture overview
- [ADR 0001](../../docs/adr/0001-dual-backend-architecture.md) — Architectural decision record

## Dependencies

See `requirements.txt` for Python dependencies.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT
