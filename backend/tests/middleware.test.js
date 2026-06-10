const validateContractMiddleware = require('../src/middleware/validateContract');
const express = require('express');
const request = require('supertest');

describe('Contract Validation Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(validateContractMiddleware);

    // Test endpoint
    app.post('/api/circuit/run', (req, res) => {
      res.json({
        results: { '00': 0.5, '11': 0.5 },
        shots: 1000,
        execution_time_ms: 10
      });
    });

    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Request Validation', () => {
    test('should accept valid circuit request', async () => {
      const response = await request(app)
        .post('/api/circuit/run')
        .send({
          gates: [{ type: 'H', target: 0 }],
          qubits: 2,
          shots: 1000
        });

      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
    });

    test('should reject request with missing required fields', async () => {
      const response = await request(app)
        .post('/api/circuit/run')
        .send({
          qubits: 2
          // Missing 'gates'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_REQUEST');
    });

    test('should reject request with invalid gate type', async () => {
      const response = await request(app)
        .post('/api/circuit/run')
        .send({
          gates: [{ type: 'INVALID_GATE', target: 0 }],
          qubits: 2
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_REQUEST');
    });

    test('should reject request with qubit count out of range', async () => {
      const response = await request(app)
        .post('/api/circuit/run')
        .send({
          gates: [{ type: 'H', target: 0 }],
          qubits: 25 // Max is 20
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_REQUEST');
    });

    test('should reject request with negative shots', async () => {
      const response = await request(app)
        .post('/api/circuit/run')
        .send({
          gates: [{ type: 'H', target: 0 }],
          qubits: 2,
          shots: -100
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_REQUEST');
    });

    test('should reject request with extra fields', async () => {
      const response = await request(app)
        .post('/api/circuit/run')
        .send({
          gates: [{ type: 'H', target: 0 }],
          qubits: 2,
          extra_field: 'should not be here'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_REQUEST');
    });
  });

  describe('Response Validation', () => {
    test('should allow valid circuit response', async () => {
      const response = await request(app)
        .post('/api/circuit/run')
        .send({
          gates: [{ type: 'H', target: 0 }],
          qubits: 2
        });

      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(response.body.shots).toBe(1000);
      expect(response.body.execution_time_ms).toBeDefined();
    });

    test('should allow valid health check response', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should return 400 for malformed JSON', async () => {
      const response = await request(app)
        .post('/api/circuit/run')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });
});
