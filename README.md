# Quantumanic

A quantum computing simulator and API service built with a modern multi-language stack: React/TypeScript frontend, Node.js/Express API layer, and Python quantum simulation backend.

## Features

- Quantum circuit simulation with support for X and H gates (expanding to CNOT, Z, Y, S, T, RZ)
- RESTful API for running quantum circuits
- Rate limiting to prevent abuse
- Input validation for security
- Type-safe React frontend for circuit building and visualization

## Architecture

Quantumanic uses a three-layer architecture:

```
┌─────────────────────────────────────┐
│  Frontend (React/TypeScript)        │  Browser-based circuit builder
│  - Circuit UI components            │  and visualization
│  - Type-safe API client             │
└────────────────┬────────────────────┘
                 │ HTTP/REST
┌────────────────▼────────────────────┐
│  API Layer (Node.js/Express)        │  RESTful endpoints
│  - Circuit execution routes         │  Rate limiting
│  - Input validation & security      │  Middleware
│  - mathjs for matrix operations     │
└────────────────┬────────────────────┘
                 │ IPC/HTTP
┌────────────────▼────────────────────┐
│  Backend (Python)                   │  Advanced quantum simulation
│  - Gate implementations             │  State vector calculations
│  - Quantum algorithm support        │  Qiskit integration (future)
└─────────────────────────────────────┘
```

See [docs/adr/001-multi-language-architecture.md](docs/adr/001-multi-language-architecture.md) for the architectural decision record.

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
├── frontend/                    # React/TypeScript frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   └── api/                 # Type-safe API client
│   └── package.json
├── backend/                     # Python quantum simulation backend
│   ├── simulator/               # Quantum simulation modules
│   ├── gates/                   # Gate implementations
│   └── requirements.txt          # Python dependencies
├── tests/
│   ├── simulator.test.js        # Node.js simulator tests
│   ├── rate-limit.test.js       # Rate limiting tests
│   └── backend/                 # Python backend tests
├── docs/
│   └── adr/                     # Architecture Decision Records
│       └── 001-multi-language-architecture.md
├── .github/workflows/           # CI/CD workflows
├── package.json
├── .env.example
├── README.md
└── CONTRIBUTING.md
```

## Getting Started

### Prerequisites

- Node.js 14+ and npm
- Python 3.8+ (for backend simulation)

### Installation

```bash
git clone <repository-url>
cd quantumanic
npm install
```

If using the Python backend:

```bash
cd backend
pip install -r requirements.txt
```

### Configuration

Copy `.env.example` to `.env` and configure as needed:

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

### Running Tests

**Node.js tests:**
```bash
npm test
```

**Python backend tests:**
```bash
cd backend
pytest
```

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

## Security

This project implements several security measures:

1. **Rate Limiting** — Prevents DoS attacks by limiting requests per IP
2. **Input Validation** — Validates circuit parameters and gate definitions
3. **Error Handling** — Sanitizes error responses to prevent information leakage
4. **Environment Isolation** — Secrets are managed via environment variables, never committed to the repository

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on code style, testing, and the development workflow.

## License

MIT
