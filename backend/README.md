# Quantumanic Backend

The primary Express.js-based quantum circuit API service for quantumanic.

## Overview

This backend provides a RESTful API for simulating quantum circuits. It uses mathjs for quantum computations and supports single-qubit gates (X, H, Z, Y, S, T).

## Architecture

For high-level architecture and the relationship between this backend and `frontend/backend/`, see [ARCHITECTURE.md](../ARCHITECTURE.md) and [ADR 0001](../docs/adr/0001-dual-backend-architecture.md).

## Getting Started

### Prerequisites

- Node.js 14+
- npm

### Installation

```bash
cd backend
npm install
```

### Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key environment variables:
- `PORT` — Server port (default: 3000)
- `RATE_LIMIT_WINDOW_MS` — Rate limit window in milliseconds (default: 900000 = 15 min)
- `RATE_LIMIT_MAX_REQUESTS` — Max requests per IP for general /api routes (default: 100)
- `CIRCUIT_RUN_RATE_LIMIT` — Max requests per IP for POST /api/circuit/run (default: 10)

### Running the Server

```bash
npm start
```

The server will start on `http://localhost:3000`.

## API Endpoints

### POST /api/circuit/run

Run a quantum circuit and get the resulting state vector.

**Request:**
```json
{
  "numQubits": 2,
  "circuit": {
    "gates": [
      { "type": "X", "target": 0 },
      { "type": "H", "target": 1 }
    ]
  }
}
```

**Response:**
```json
{
  "stateVector": [0.7071, 0, 0.7071, 0],
  "measurement": [0, 0]
}
```

**Supported Gates:**
- **X** — Pauli X gate (NOT gate)
- **H** — Hadamard gate
- **Z** — Pauli Z gate
- **Y** — Pauli Y gate
- **S** — S gate (phase gate)
- **T** — T gate

**Rate Limiting:**
- General /api routes: 100 requests per 15 minutes per IP
- POST /api/circuit/run: 10 requests per 15 minutes per IP
- When rate limited, the server returns HTTP 429 with a `Retry-After` header

### GET /health

Health check endpoint (not rate limited).

**Response:**
```json
{
  "status": "ok"
}
```

## Project Structure

```
.
├── src/
│   ├── index.js                 # Express app setup and middleware
│   ├── api/
│   │   └── routes.js            # API route handlers
│   └── quantum/
│       ├── simulator.js         # Quantum circuit simulator
│       └── gates.js             # Quantum gate definitions
├── tests/
│   ├── simulator.test.js        # Simulator tests
│   └── rate-limit.test.js       # Rate limiting tests
├── package.json
├── .env.example
└── README.md
```

## Testing

```bash
npm test
```

Tests cover:
- Quantum gate operations and eigenstate validation
- Circuit simulation
- Rate limiting behavior
- API endpoint responses

## Security

This backend implements several security measures:

1. **Rate Limiting** — Prevents DoS attacks by limiting requests per IP
2. **Input Validation** — Validates circuit parameters and gate definitions
3. **Error Handling** — Sanitizes error responses to prevent information leakage

## Dependencies

See `package.json` for the complete list of dependencies. Key dependencies:
- **express** — Web framework
- **mathjs** — Mathematical computations for quantum operations

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT
