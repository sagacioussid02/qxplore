# Frontend Documentation

## Overview

The quantumanic frontend is a React 18+ application built with TypeScript and Vite. It provides a web-based interface for building, visualizing, and executing quantum circuits against the quantumanic backend API.

## Technology Stack

- **React 18+** — UI framework
- **TypeScript** — Type-safe JavaScript
- **Vite** — Fast build tool and dev server
- **Jest** — Unit testing framework
- **React Testing Library** — Component testing utilities
- **ESLint** — Code linting and style enforcement

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── CircuitBuilder/  # Circuit construction UI
│   │   ├── GatePanel/       # Gate selection and configuration
│   │   ├── Visualization/   # State vector and probability visualization
│   │   └── ...
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API client and utilities
│   │   └── api.ts           # Backend API integration
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Root component
│   ├── index.tsx            # Application entry point
│   └── ...
├── tests/                   # Test files
├── public/                  # Static assets
├── .env.example             # Environment variable template
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
├── jest.config.js           # Jest configuration
└── README.md                # Frontend-specific README
```

## Local Development Setup

### Prerequisites

- Node.js 16+ (check with `node --version`)
- npm 7+ (check with `npm --version`)
- A running instance of the quantumanic backend (see main README)

### Installation

1. Clone the repository (if not already done):
   ```bash
   git clone <repository-url>
   cd quantumanic
   ```

2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and configure the backend API URL (if needed):
   ```bash
   VITE_API_URL=http://localhost:3000
   ```

   - `VITE_API_URL` — The URL where the quantumanic backend API is running
   - Default: `http://localhost:3000`
   - For remote backends, use the full URL (e.g., `https://api.example.com`)

### Running the Development Server

1. Start the frontend development server:
   ```bash
   npm run dev
   ```

2. The application will be available at `http://localhost:5173` (or the next available port if 5173 is in use)

3. The dev server includes hot module replacement (HMR), so changes to source files will automatically reload in your browser

### Backend Integration

The frontend communicates with the quantumanic backend API through the `VITE_API_URL` environment variable. Ensure:

1. The backend is running on the configured URL (default: http://localhost:3000)
2. The backend has CORS enabled to allow requests from the frontend origin
3. The `VITE_API_URL` environment variable matches your backend's actual location

If the backend is not running or unreachable, the frontend will display an error when attempting to execute circuits.

## Development Workflow

### Running Tests

Run the test suite:
```bash
npm test
```

Run tests in watch mode (re-run on file changes):
```bash
npm test -- --watch
```

Run tests with coverage report:
```bash
npm test -- --coverage
```

### Linting and Code Style

Check code style:
```bash
npm run lint
```

Auto-fix linting issues:
```bash
npm run lint:fix
```

### Building for Production

Create an optimized production build:
```bash
npm run build
```

The build output will be in the `dist/` directory.

Preview the production build locally:
```bash
npm run preview
```

## API Integration

The frontend integrates with the quantumanic backend through the following API endpoints:

### POST /api/circuit/run

Execute a quantum circuit and retrieve results.

**Request:**
```typescript
interface CircuitRequest {
  qubits: number;           // Number of qubits in the circuit
  gates: Gate[];            // Array of gates to apply
  measurements?: number;    // Number of measurement samples (optional)
}

interface Gate {
  gate: string;             // Gate name (e.g., "H", "X", "CNOT")
  target: number;           // Target qubit index
  control?: number;         // Control qubit index (for controlled gates like CNOT)
}
```

**Response:**
```typescript
interface CircuitResponse {
  statevector: number[];    // Complex state vector (flattened)
  probabilities: Record<string, number>;  // Measurement probabilities
  measurement_results?: string[];         // Individual measurement outcomes
}
```

### GET /health

Check the health status of the backend service.

**Response:**
```typescript
interface HealthResponse {
  status: string;           // "ok" or error status
  version: string;          // Backend version
  timestamp: string;        // ISO 8601 timestamp
}
```

## Supported Quantum Gates

The frontend supports the following quantum gates (as implemented in the backend):

### Single-Qubit Gates

- **H** (Hadamard) — Creates superposition
- **X** (Pauli X / NOT) — Bit flip
- **Y** (Pauli Y) — Bit and phase flip
- **Z** (Pauli Z) — Phase flip
- **S** (S gate) — Phase gate (π/2 rotation)
- **T** (T gate) — π/8 rotation

### Multi-Qubit Gates

- **CNOT** (Controlled NOT / CX) — Entangles two qubits
- **SWAP** (when implemented) — Exchanges qubit states
- **Toffoli** (when implemented) — Three-qubit controlled gate

## Deployment

### Static Hosting

The frontend is a static single-page application (SPA) and can be deployed to any static hosting service:

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `dist/` directory to your hosting service (e.g., Netlify, Vercel, AWS S3, GitHub Pages)

3. Configure the `VITE_API_URL` environment variable to point to your production backend

### Docker Deployment

To deploy the frontend in a Docker container:

1. Create a `Dockerfile` in the frontend directory (if not already present)
2. Build the Docker image
3. Run the container with the appropriate `VITE_API_URL` environment variable

### CI/CD Integration

The frontend is included in the quantumanic deployment pipeline. See the main README and CONTRIBUTING.md for CI/CD configuration details.

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, Vite will automatically use the next available port. Check the terminal output for the actual URL.

To use a specific port:
```bash
npm run dev -- --port 3001
```

### Backend Connection Issues

If the frontend cannot connect to the backend:

1. Verify the backend is running on the configured `VITE_API_URL`
2. Check that `VITE_API_URL` is correctly set in `.env`
3. Ensure CORS is enabled on the backend
4. Check browser console for detailed error messages

### Build Errors

If you encounter build errors:

1. Clear the node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear the Vite cache:
   ```bash
   rm -rf dist .vite
   ```

3. Try building again:
   ```bash
   npm run build
   ```

## Contributing

For guidelines on contributing to the frontend, see [CONTRIBUTING.md](../CONTRIBUTING.md).

## License

MIT
