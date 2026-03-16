import axios from 'axios';

export const API_BASE = 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});
