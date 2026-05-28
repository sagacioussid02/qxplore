# Quantumanic

A quantum computing simulator and API service with a React/TypeScript frontend and Python/Express.js backend.

## Stack Overview

**Frontend:**
- React 18+ with TypeScript
- Vite for build tooling
- Jest and React Testing Library for testing

**Backend:**
- Express.js (Node.js) for API routing
- Python quantum simulation engine (via mathjs for matrix operations)
- Rate limiting and input validation middleware

**Note:** This project was previously built with Express.js and mathjs. The current architecture uses a dual-backend approach (see [ARCHITECTURE.md](ARCHITECTURE.md) and [ADR 0001](docs/adr/0001-dual-backend-architecture.md) for clarification on backend ownership and deployment strategy).

## Features

- Quantum circuit simulation with support for X, H, Z, Y, S, and T gates
- Multi-qubit gates: CNOT/CX, SWAP, Toffoli (when implemented)
- RESTful API for running quantum circuits
- Measurement and probability output for circuit results
- Rate limiting to prevent abuse
- Input validation for security
- Automated unit tests and linting
- React-based circuit builder UI (MVP scope; see [FRONTEND.md](FRONTEND.md) for details)

## Getting Started

### Prerequisites

**For Backend:**
- Node.js 14+ and npm

**For Frontend:**
- Node.js 16+ and npm

### Installation

```bash
git clone <repository-url>
cd quantumanic

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (in a new terminal)
cd frontend
npm install
```

### Configuration

**Backend:**
```bash
cd backend
cp .env.example .env
```

Key environment variables:
- `PORT` — Server port (default: 3000)
- `RATE_LIMIT_WINDOW_MS` — Rate limit window in milliseconds (default: 900000 = 15 min)
- `RATE_LIMIT_MAX_REQUESTS` — Max requests per IP for general /api routes (default: 100)
- `CIRCUIT_RUN_RATE_LIMIT` — Max requests per IP for POST /api/circuit/run (default: 10)

**Frontend:**
```bash
cd frontend
cp .env.example .env
```

Key environment variables:
- `VITE_API_URL` — Backend API URL (default: http://localhost:3000)

### Running the Services

**Backend:**
```bash
cd backend
npm start
```

The API will start on `http://localhost:3000`.

**Frontend (in a new terminal):**
```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173` (or the next available port).

### Running Tests

**Backend:**
```bash
cd backend
npm test
```

Tests validate quantum gates (X, H, Z, Y, S, T), rate limiting behavior, and input validation.

**Frontend:**
```bash
cd frontend
npm test
```

Tests validate circuit builder components and API integration.

### Linting

**Backend:**
```bash
cd backend
npm run lint          # Check code style
npm run lint:fix      # Auto-fix linting issues
```

**Frontend:**
```bash
cd frontend
npm run lint          # Check code style
npm run lint:fix      # Auto-fix linting issues
```

## API Endpoints

### POST /api/circuit/run

Run a quantum circuit and get the resulting state vector and measurement probabilities.

**Request:**
```json
{
  "numQubits": 2,
  "circuit": {
    "gates": [
      { "type": "X", "target": 0 },
      { "type": "H", "target": 1 },
      { "type": "CNOT", "control": 0, "target": 1 }
    ]
  }
}
```

**Response:**
```json
{
  "stateVector": [0.7071, 0, 0, 0.7071],
  "measurement": [0, 1],
  "probabilities": {
    "00": 0.5,
    "11": 0.5
  }
}
```

**Supported Gates:**
- **X** — Pauli X gate (NOT gate)
- **H** — Hadamard gate
- **Z** — Pauli Z gate
- **Y** — Pauli Y gate
- **S** — S gate (phase gate)
- **T** — T gate
- **CNOT/CX** — Controlled-NOT gate (multi-qubit)
- **SWAP** — SWAP gate (multi-qubit)
- **Toffoli** — Toffoli gate (multi-qubit)

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
quantumanic/
├── backend/                         # Express.js API service
│   ├── src/
│   │   ├── index.js                # Express app setup and middleware
│   │   ├── api/
│   │   │   └── routes.js           # API route handlers
│   │   └── quantum/
│   │       ├── simulator.js        # Quantum circuit simulator
│   │       └── gates.js            # Quantum gate definitions
│   ├── tests/
│   │   ├── simulator.test.js       # Simulator tests
│   │   └── rate-limit.test.js      # Rate limiting tests
│   ├── package.json
│   ├── .env.example
│   ├── .eslintrc.json              # ESLint configuration
│   ├── jest.config.js              # Jest test configuration
│   └── README.md
├── frontend/                        # React/TypeScript UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── CircuitBuilder.tsx  # Main circuit builder
│   │   │   ├── GateSelector.tsx    # Gate selection UI
│   │   │   ├── CircuitCanvas.tsx   # Circuit visualization
│   │   │   └── ResultsDisplay.tsx  # Results display
│   │   ├── pages/
│   │   ├── api/
│   │   │   └── client.ts           # Backend API client
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── README.md
├── docs/
│   └── adr/                         # Architecture Decision Records
│       └── 0001-dual-backend-architecture.md
├── ARCHITECTURE.md                  # System architecture overview
├── FRONTEND.md                      # Frontend circuit builder documentation
├── CONTRIBUTING.md                  # Contribution guidelines
├── README.md                        # This file
└── package.json
```

## Frontend Circuit Builder

The frontend provides a React-based circuit builder for constructing and executing quantum circuits. See [FRONTEND.md](FRONTEND.md) for detailed documentation on:
- Current MVP scope and capabilities
- Backend API integration
- Deferred features (drag-and-drop, optimization, collaboration)
- Development workflow

## Security

This project implements several security measures:

1. **Rate Limiting** — Prevents DoS attacks by limiting requests per IP
2. **Input Validation** — Validates circuit parameters and gate definitions
3. **Error Handling** — Sanitizes error responses to prevent information leakage
4. **CORS** — Configured to allow frontend requests from localhost (development) and configured origins (production)

## Architecture

For detailed information on system architecture, backend ownership, and deployment strategy, see:
- [ARCHITECTURE.md](ARCHITECTURE.md) — System overview and service responsibilities
- [docs/adr/0001-dual-backend-architecture.md](docs/adr/0001-dual-backend-architecture.md) — Decision record on dual-backend approach

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Code of conduct
- What you can contribute
- Development workflow
- Submitting pull requests
- Coding standards

## License

MIT

## Support

For questions or issues, please open a GitHub issue or contact the maintainers.
