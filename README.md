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

### Frontend Setup

The quantumanic project includes a full React/TypeScript frontend for building and visualizing quantum circuits. For detailed frontend setup, development, and deployment instructions, see [FRONTEND.md](FRONTEND.md).

**Quick Start:**

1. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Configure the backend API URL (optional; defaults to http://localhost:3000):
   ```bash
   cp .env.example .env
   # Edit .env and set VITE_API_URL if your backend is on a different host/port
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173` (or the port shown in your terminal)

5. The frontend will automatically connect to the backend API at the URL specified in `VITE_API_URL`

For more details on frontend architecture, component structure, and production builds, see [FRONTEND.md](FRONTEND.md).

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

**Request Body:**
```json
{
  "qubits": 2,
  "gates": [
    {"gate": "H", "target": 0},
    {"gate": "CNOT", "control": 0, "target": 1}
  ],
  "measurements": 1000
}
```

**Response:**
```json
{
  "statevector": [0.707, 0, 0, 0.707],
  "probabilities": {
    "00": 0.5,
    "11": 0.5
  },
  "measurement_results": ["00", "11", "00", ...]
}
```

### GET /health

Health check endpoint. Returns service status and version.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Supported Quantum Gates

- **X** (Pauli X / NOT gate) — Single-qubit
- **H** (Hadamard gate) — Single-qubit
- **Z** (Pauli Z gate) — Single-qubit
- **Y** (Pauli Y gate) — Single-qubit
- **S** (S gate / phase gate) — Single-qubit
- **T** (T gate) — Single-qubit
- **CNOT** (Controlled NOT / CX gate) — Two-qubit (when implemented)

For detailed gate definitions and matrix representations, see [FRONTEND.md](FRONTEND.md) and the API documentation.

## Project Structure

For a detailed breakdown of the project structure, including frontend and backend directories, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started, including local development setup, branching strategy, and the PR review process.

## License

MIT
