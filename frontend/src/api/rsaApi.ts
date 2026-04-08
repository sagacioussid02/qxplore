import { apiClient } from './client';

export interface KeygenRequest { p: number; q: number }
export interface KeygenResponse { p: number; q: number; n: number; phi_n: number; e: number; d: number; steps: string[] }

export interface EncryptRequest { message_int: number; e: number; n: number }
export interface EncryptResponse { ciphertext: number; steps: string[] }

export interface DecryptRequest { ciphertext: number; d: number; n: number }
export interface DecryptResponse { plaintext_int: number; plaintext_char: string; steps: string[] }

export interface ClassicalFactorRequest { n: number; max_steps?: number }
export interface ClassicalFactorStep { divisor: number; remainder: number; is_factor: boolean }
export interface ClassicalFactorResponse {
  n: number; factors: number[]; steps_taken: number; total_steps_needed: number;
  step_log: ClassicalFactorStep[]; succeeded: boolean; time_estimate: string;
}

export interface ShorMeasurement { bitstring: string; register_value: number; phase: number; period_candidate: number; count: number }
export interface ShorResponse {
  n: number; a: number; factors: number[]; period_r: number;
  measurements: ShorMeasurement[]; num_qubits: number; circuit_depth: number;
  gate_count: number; shots: number; steps: string[]; succeeded: boolean;
}

export const rsaApi = {
  keygen: (p: number, q: number) =>
    apiClient.post<KeygenResponse>('/rsa/keygen', { p, q }).then(r => r.data),

  encrypt: (message_int: number, e: number, n: number) =>
    apiClient.post<EncryptResponse>('/rsa/encrypt', { message_int, e, n }).then(r => r.data),

  decrypt: (ciphertext: number, d: number, n: number) =>
    apiClient.post<DecryptResponse>('/rsa/decrypt', { ciphertext, d, n }).then(r => r.data),

  classicalFactor: (n: number, max_steps = 5000) =>
    apiClient.post<ClassicalFactorResponse>('/rsa/classical-factor', { n, max_steps }).then(r => r.data),

  shorFactor: () =>
    apiClient.post<ShorResponse>('/rsa/shor-factor').then(r => r.data),
};
