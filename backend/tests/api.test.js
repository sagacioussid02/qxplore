const request = require('supertest');
const app = require('../src/index');
const { executeCircuit } = require('../src/quantum/simulator');

jest.mock('../src/quantum/simulator');

describe('POST /api/circuit/run', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should execute a simple circuit and return counts', async () => {
    executeCircuit.mockReturnValue({
      counts: { '0': 500, '1': 500 },
      statevector: [0.707, 0.707],
      executionTime: 0.5
    });

    const response = await request(app)
      .post('/api/circuit/run')
      .send({
        circuit: [{ gate: 'H', target: 0 }, { gate: 'measure', targets: [0] }],
        numQubits: 1,
        shots: 1000
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('counts');
    expect(response.body).toHaveProperty('statevector');
    expect(response.body).toHaveProperty('executionTime');
  });

  test('should return 400 when circuit is missing', async () => {
    const response = await request(app)
      .post('/api/circuit/run')
      .send({
        numQubits: 1,
        shots: 1000
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.code).toBe('MISSING_CIRCUIT');
  });

  test('should return 500 when Python engine is unreachable', async () => {
    // Simulate Python engine connection error
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const response = await request(app)
      .post('/api/circuit/run')
      .send({
        circuit: [{ gate: 'H', target: 0 }],
        numQubits: 1,
        shots: 1000
      });

    expect(response.status).toBe(500);
    expect(response.body.code).toBe('ENGINE_UNAVAILABLE');
    expect(response.body).not.toHaveProperty('details');

    global.fetch = originalFetch;
  });

  test('should return 500 when Python returns non-object response', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => 'invalid string response'
    });

    const response = await request(app)
      .post('/api/circuit/run')
      .send({
        circuit: [{ gate: 'H', target: 0 }],
        numQubits: 1,
        shots: 1000
      });

    expect(response.status).toBe(500);
    expect(response.body.code).toBe('ENGINE_UNAVAILABLE');
    expect(response.body).not.toHaveProperty('details');

    global.fetch = originalFetch;
  });

  test('should return 400 when Python response is missing counts and statevector', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ executionTime: 0.5 })
    });

    const response = await request(app)
      .post('/api/circuit/run')
      .send({
        circuit: [{ gate: 'H', target: 0 }],
        numQubits: 1,
        shots: 1000
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('MALFORMED_ENGINE_RESPONSE');
    expect(response.body).not.toHaveProperty('details');

    global.fetch = originalFetch;
  });

  test('should not return 200 with empty payload on error', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500
    });

    const response = await request(app)
      .post('/api/circuit/run')
      .send({
        circuit: [{ gate: 'H', target: 0 }],
        numQubits: 1,
        shots: 1000
      });

    expect(response.status).not.toBe(200);
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('code');

    global.fetch = originalFetch;
  });

  test('should execute H gate correctly', async () => {
    executeCircuit.mockReturnValue({
      counts: { '0': 512, '1': 488 },
      statevector: [0.707, 0.707],
      executionTime: 0.3
    });

    const response = await request(app)
      .post('/api/circuit/run')
      .send({
        circuit: [{ gate: 'H', target: 0 }],
        numQubits: 1,
        shots: 1000
      });

    expect(response.status).toBe(200);
    expect(response.body.counts).toEqual({ '0': 512, '1': 488 });
  });

  test('should execute X gate correctly', async () => {
    executeCircuit.mockReturnValue({
      counts: { '1': 1000 },
      statevector: [0, 1],
      executionTime: 0.2
    });

    const response = await request(app)
      .post('/api/circuit/run')
      .send({
        circuit: [{ gate: 'X', target: 0 }],
        numQubits: 1,
        shots: 1000
      });

    expect(response.status).toBe(200);
    expect(response.body.counts).toEqual({ '1': 1000 });
  });
});

describe('GET /api/health', () => {
  test('should return health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
