const request = require('supertest');
const app = require('../src/index');

describe('Rate Limiting', () => {
  describe('POST /api/circuit/run', () => {
    it('should return 429 when circuit run rate limit is exceeded', async () => {
      const payload = {
        numQubits: 2,
        circuit: {
          gates: [
            { type: 'X', target: 0 },
          ],
        },
      };

      // Make requests up to the limit (10 by default)
      const limit = parseInt(process.env.CIRCUIT_RUN_RATE_LIMIT || '10', 10);
      for (let i = 0; i < limit; i++) {
        const res = await request(app)
          .post('/api/circuit/run')
          .send(payload);
        expect([200, 400, 422]).toContain(res.status); // Accept valid responses or validation errors
      }

      // The next request should be rate limited
      const rateLimitedRes = await request(app)
        .post('/api/circuit/run')
        .send(payload);

      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.headers['retry-after']).toBeDefined();
    });
  });

  describe('GET /api/health', () => {
    it('should not be rate limited', async () => {
      // Make multiple requests to the health endpoint
      for (let i = 0; i < 20; i++) {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
      }
    });
  });

  describe('General /api routes', () => {
    it('should apply default rate limit to /api routes', async () => {
      const limit = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
      const payload = {
        numQubits: 2,
        circuit: {
          gates: [],
        },
      };

      // Make requests up to the limit
      for (let i = 0; i < limit; i++) {
        const res = await request(app)
          .post('/api/circuit/run')
          .send(payload);
        // We expect either success or validation error, not rate limit
        expect([200, 400, 422]).toContain(res.status);
      }
    });
  });
});
