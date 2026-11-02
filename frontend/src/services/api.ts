import axios, { AxiosError } from 'axios';
import { BackendErrorResponse } from '../types';

// Use environment variable, fallback to window.location.origin in production or localhost:8000
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Security-conscious token access helper:
// Read from sessionStorage (session-scoped, automatically cleared when tab is closed)
export const getStoredToken = (): string | null => {
  return sessionStorage.getItem('blp_access_token');
};

export const setStoredToken = (token: string | null): void => {
  if (token) {
    sessionStorage.setItem('blp_access_token', token);
  } else {
    sessionStorage.removeItem('blp_access_token');
  }
};

// Request interceptor to attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors and 401s gracefully
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<BackendErrorResponse>) => {
    if (error.response?.status === 401) {
      // If unauthorized, clear the token
      setStoredToken(null);
      // Trigger event or let route guards redirect to /login
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.dispatchEvent(new CustomEvent('blp:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

// Helper to extract user-friendly error message from FastAPI Backend response
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.error?.message) {
      return data.error.message;
    }
    if (data?.detail) {
      if (typeof data.detail === 'string') return data.detail;
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        return data.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(', ');
      }
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

