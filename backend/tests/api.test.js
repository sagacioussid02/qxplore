const request = require('supertest');
const app = require('../src/index');
const simulator = require('../src/quantum/simulator');

jest.mock('../src/quantum/simulator');

describe('Express-to-Python Routing', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/circuit/run', () => {
    it('should return 200 with valid circuit execution', async () => {
      const mockResult = {
        counts: { '00': 512, '11': 512 },
        statevector: [
          { real: 0.707, imag: 0 },
          { real: 0, imag: 0 },
          { real: 0, imag: 0 },
          { real: 0.707, imag: 0 }
        ],
        numQubits: 2
      };
      simulator.run.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/circuit/run')
        .send({
          circuit: {
            numQubits: 2,
            gates: [
              { type: 'H', target: 0 },
              { type: 'CNOT', control: 0, target: 1 }
            ]
          },
          shots: 1024
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockResult);
      expect(response.body.shots).toBe(1024);
    });

    it('should return 500 when Python engine is unreachable', async () => {
      const error = new Error('ECONNREFUSED: Connection refused');
      simulator.run.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/circuit/run')
        .send({
          circuit: {
            numQubits: 2,
            gates: [{ type: 'H', target: 0 }]
          },
          shots: 1024
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Quantum simulation engine unavailable');
      expect(response.body.code).toBe('ENGINE_UNAVAILABLE');
      expect(response.body.details).toContain('ECONNREFUSED');
    });

    it('should return 500 when Python returns non-object response', async () => {
      simulator.run.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/circuit/run')
        .send({
          circuit: {
            numQubits: 2,
            gates: [{ type: 'H', target: 0 }]
          },
          shots: 1024
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Invalid response from quantum simulation engine');
      expect(response.body.code).toBe('INVALID_ENGINE_RESPONSE');
    });

    it('should return 400 when Python response is missing counts and statevector', async () => {
      simulator.run.mockResolvedValue({
        numQubits: 2
        // Missing counts and statevector
      });

      const response = await request(app)
        .post('/api/circuit/run')
        .send({
          circuit: {
            numQubits: 2,
            gates: [{ type: 'H', target: 0 }]
          },
          shots: 1024
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Malformed response from quantum simulation engine');
      expect(response.body.code).toBe('MALFORMED_ENGINE_RESPONSE');
    });

    it('should return 400 when circuit definition is missing', async () => {
      const response = await request(app)
        .post('/api/circuit/run')
        .send({
          shots: 1024
          // Missing circuit
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing circuit definition');
      expect(response.body.code).toBe('INVALID_INPUT');
    });

    it('should not return 200 with empty payload on error', async () => {
      simulator.run.mockRejectedValue(new Error('Timeout'));

      const response = await request(app)
        .post('/api/circuit/run')
        .send({
          circuit: {
            numQubits: 2,
            gates: [{ type: 'H', target: 0 }]
          },
          shots: 1024
        });

      // Should NOT be 200
      expect(response.status).not.toBe(200);
      // Should have error details
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBeDefined();
      // Should not be empty
      expect(Object.keys(response.body).length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/health', () => {
    it('should return 200 with ok status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });
  });
});
