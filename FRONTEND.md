# Frontend Circuit Builder Documentation

## Overview

The Quantumanic frontend is a React/TypeScript web application that provides a user interface for building and executing quantum circuits. The current implementation focuses on an MVP (Minimum Viable Product) scope that allows users to construct circuits visually and submit them to the backend simulator.

## Current MVP Scope

### What the Frontend Renders

The current frontend circuit builder provides:

1. **Circuit Visualization** — Static display of quantum circuit gates and qubits
   - Visual representation of qubits as horizontal lines
   - Gates rendered as boxes on the circuit grid
   - Support for single-qubit gates: X, H, Z, Y, S, T
   - Support for multi-qubit gates: CNOT/CX, SWAP, Toffoli (when implemented in backend)

2. **Gate Selection** — UI controls to add gates to the circuit
   - Dropdown or button-based gate selection
   - Target qubit selection for single-qubit gates
   - Control and target qubit selection for multi-qubit gates

3. **Circuit Parameters** — Basic input fields for circuit configuration
   - Number of qubits (1–10)
   - Circuit depth (number of gate layers)
   - Gate sequence definition

4. **Execution Interface** — Submit circuits to the backend
   - "Run Circuit" button to execute the circuit
   - Display of execution results (state vector, measurement outcomes)
   - Error handling and user feedback for invalid circuits

### Backend Integration

The frontend calls the following backend endpoint:

**Endpoint:** `POST /api/circuit/run`

**Request Payload:**
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

**Response Payload:**
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

## Deferred Features (Sprint N+1)

The following features are **explicitly deferred** to sprint N+1 or later:

### 1. Drag-and-Drop Circuit Builder
- Interactive drag-and-drop interface for placing gates on the circuit grid
- Drag-to-reorder gates within a circuit layer
- Drag-to-delete gates
- **Rationale:** Requires finalization of dual-backend architecture (ADR 0001) to avoid rework; MVP static selection is sufficient for initial delivery

### 2. Advanced Circuit Optimization
- Circuit simplification and optimization suggestions
- Gate cancellation detection (e.g., X followed by X)
- Qubit mapping and layout optimization
- **Rationale:** Requires backend support for optimization algorithms; deferred until multi-qubit gates are stable

### 3. Real-Time Collaboration
- Multi-user circuit editing
- Shared circuit sessions
- Live execution results across users
- **Rationale:** Requires backend session management and WebSocket support; out of scope for MVP

### 4. Advanced Visualization
- Bloch sphere visualization for single-qubit states
- Entanglement diagrams for multi-qubit states
- Probability histograms and amplitude plots
- **Rationale:** Requires additional visualization libraries and backend state export; deferred to improve UX incrementally

### 5. Circuit Library and Templates
- Pre-built circuit templates (e.g., Bell state, GHZ state, Grover's algorithm)
- User-saved circuit library
- Circuit sharing and export (QASM, Qiskit format)
- **Rationale:** Requires backend circuit storage and user authentication; deferred until user management is implemented

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── CircuitBuilder.tsx      # Main circuit builder component
│   │   ├── GateSelector.tsx        # Gate selection UI
│   │   ├── CircuitCanvas.tsx       # Circuit visualization
│   │   └── ResultsDisplay.tsx      # Results and measurement output
│   ├── pages/
│   │   └── CircuitPage.tsx         # Main circuit builder page
│   ├── api/
│   │   └── client.ts               # Backend API client
│   ├── types/
│   │   └── circuit.ts              # TypeScript type definitions
│   └── App.tsx                     # Root component
├── public/
├── package.json
├── tsconfig.json
└── README.md
```

## Development Workflow

### Running the Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173` (or the next available port).

### Building for Production

```bash
cd frontend
npm run build
```

The production build is output to the `dist/` directory.

### Testing

Frontend tests are configured with Jest and React Testing Library:

```bash
cd frontend
npm test
```

Test files should be colocated with components (e.g., `CircuitBuilder.test.tsx`).

## API Contract

The frontend expects the backend to provide:

1. **Circuit Execution** — `POST /api/circuit/run`
   - Accepts circuit definition with gates and qubit count
   - Returns state vector and measurement probabilities
   - Validates circuit parameters and returns 400 for invalid input
   - Enforces rate limiting (10 requests per 15 minutes per IP)

2. **Health Check** — `GET /health`
   - Returns `{ "status": "ok" }` if backend is operational
   - Used by frontend to verify backend availability

## Security Considerations

1. **Input Validation** — The frontend should validate circuit parameters before submission:
   - Number of qubits: 1–10
   - Gate types: only supported gates (X, H, Z, Y, S, T, CNOT, SWAP, Toffoli)
   - Target qubits: within valid range [0, numQubits-1]

2. **Rate Limiting** — The frontend should respect backend rate limits:
   - Display user-friendly error messages for 429 (Too Many Requests) responses
   - Implement exponential backoff for retries
   - Show "Retry-After" header value to users

3. **Error Handling** — Gracefully handle backend errors:
   - Display error messages for 4xx and 5xx responses
   - Prevent submission of malformed circuits
   - Log errors for debugging (without exposing sensitive information)

## Next Steps

1. **Sprint N+1** — Implement drag-and-drop circuit builder based on finalized backend architecture
2. **Sprint N+2** — Add circuit optimization and advanced visualization
3. **Sprint N+3** — Implement circuit library, templates, and user authentication

## References

- [Backend API Documentation](README.md#api-endpoints)
- [Architecture Decision Records](docs/adr/)
- [Contributing Guide](CONTRIBUTING.md)
