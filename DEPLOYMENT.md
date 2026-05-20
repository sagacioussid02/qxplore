# Quantumanic Deployment Guide

## Overview

Quantumanic is a quantum computing simulator and API service built with Express.js and mathjs. This document provides deployment and runtime configuration information.

## Runtime Environment

### Technology Stack
- **Runtime**: Node.js 14+
- **Framework**: Express.js
- **Quantum Engine**: mathjs
- **Default Port**: 3000

### Prerequisites
- Node.js 14 or higher
- npm (Node Package Manager)

## Configuration

Quantumanic uses environment variables for runtime configuration. Copy `.env.example` to `.env` and configure as needed:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Purpose | Default | Type |
|----------|---------|---------|------|
| `PORT` | Server listening port | 3000 | integer |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window duration | 900000 (15 min) | integer (milliseconds) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per IP for general /api routes | 100 | integer |
| `CIRCUIT_RUN_RATE_LIMIT` | Max requests per IP for POST /api/circuit/run | 10 | integer |

## Running the Server

### Local Development

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server will start on `http://localhost:3000`.

### Running Tests

```bash
npm test
```

## API Endpoints

### Health Check

**Endpoint**: `GET /health`

Not rate limited. Returns:
```json
{
  "status": "ok"
}
```

### Circuit Execution

**Endpoint**: `POST /api/circuit/run`

Run a quantum circuit and get the resulting state vector.

**Rate Limit**: 10 requests per 15 minutes per IP

**Request**:
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

**Response**:
```json
{
  "stateVector": [0.7071, 0, 0.7071, 0],
  "measurement": [0, 0]
}
```

**Rate Limit Response** (HTTP 429):
Includes `Retry-After` header indicating when to retry.

## Security Considerations

1. **Rate Limiting** — Prevents DoS attacks by limiting requests per IP
   - General API routes: 100 requests per 15 minutes
   - Circuit execution: 10 requests per 15 minutes

2. **Input Validation** — Validates circuit parameters and gate definitions

3. **Error Handling** — Sanitizes error responses to prevent information leakage

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
├── README.md
└── DEPLOYMENT.md
```

## Troubleshooting

### Server fails to start
- Verify Node.js version: `node --version` (should be 14+)
- Check port availability: ensure port 3000 (or configured PORT) is not in use
- Review `.env` file for valid configuration

### Rate limiting issues
- Verify `RATE_LIMIT_WINDOW_MS` and rate limit max values are set correctly
- Check client IP is being properly identified (important behind proxies)
- Use `Retry-After` header to determine when to retry

## Additional Resources

- [README.md](README.md) — Feature overview and quick start
- [CONTRIBUTING.md](CONTRIBUTING.md) — Development guidelines
- [package.json](package.json) — Dependencies and scripts
