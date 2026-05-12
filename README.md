# Quantumanic

A quantum computing simulator and API service built with Express.js and mathjs.

## Features

- Quantum circuit simulation with support for X and H gates
- RESTful API for running quantum circuits
- Rate limiting to prevent abuse
- Input validation for security

## Getting Started

### Prerequisites

- Node.js 14+ and npm

### Installation

```bash
git clone <repository-url>
cd quantumanic
npm install
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

```bash
npm test
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

## Security

This project implements several security measures:

1. **Rate Limiting** — Prevents DoS attacks by limiting requests per IP
2. **Input Validation** — Validates circuit parameters and gate definitions
3. **Error Handling** — Sanitizes error responses to prevent information leakage

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
