const Ajv = require('ajv');
const fs = require('fs');
const path = require('path');

// Load OpenAPI spec
const openApiPath = path.join(__dirname, '../../openapi.json');
const openApiSpec = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));

// Initialize AJV validator
const ajv = new Ajv({ strict: false });

// Compile validators for each endpoint
const validators = {};

Object.entries(openApiSpec.components.schemas).forEach(([schemaName, schema]) => {
  validators[schemaName] = ajv.compile(schema);
});

/**
 * Middleware to validate requests and responses against OpenAPI spec
 */
function validateContractMiddleware(req, res, next) {
  // Store original send method
  const originalSend = res.send;

  // Override send to validate response before sending
  res.send = function (data) {
    // Only validate JSON responses
    if (res.getHeader('content-type') && res.getHeader('content-type').includes('application/json')) {
      const responseBody = typeof data === 'string' ? JSON.parse(data) : data;
      const statusCode = res.statusCode;

      // Determine expected response schema based on endpoint and status code
      let expectedSchema = null;

      if (req.path === '/api/circuit/run' && req.method === 'POST') {
        if (statusCode === 200) {
          expectedSchema = 'CircuitResponse';
        } else if (statusCode >= 400) {
          expectedSchema = 'ErrorResponse';
        }
      } else if (req.path === '/health' && req.method === 'GET') {
        if (statusCode === 200) {
          expectedSchema = 'HealthResponse';
        }
      }

      // Validate response if schema is defined
      if (expectedSchema && validators[expectedSchema]) {
        const isValid = validators[expectedSchema](responseBody);
        if (!isValid) {
          console.error(`Response validation failed for ${req.method} ${req.path}:`, validators[expectedSchema].errors);
          // Return 502 Bad Gateway to indicate backend contract violation
          return originalSend.call(this, {
            error: 'Invalid response from backend service',
            code: 'INVALID_RESPONSE',
            details: { schema: expectedSchema, errors: validators[expectedSchema].errors }
          });
        }
      }
    }

    // Call original send if validation passed
    return originalSend.call(this, data);
  };

  // Validate request body if present
  if (req.method === 'POST' && req.path === '/api/circuit/run') {
    const isValid = validators.CircuitRequest(req.body);
    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid circuit request',
        code: 'INVALID_REQUEST',
        details: { errors: validators.CircuitRequest.errors }
      });
    }
  }

  next();
}

module.exports = validateContractMiddleware;
