import { api } from './api';
import { LoginRequest, RegisterRequest, TokenResponse, LogoutResponse, UserResponse } from '../types';

export const authService = {
  async register(data: RegisterRequest): Promise<UserResponse> {
    const res = await api.post<UserResponse>('/api/v1/auth/register', data);
    return res.data;
  },

  async login(data: LoginRequest): Promise<TokenResponse> {
    const res = await api.post<TokenResponse>('/api/v1/auth/login', data);
    return res.data;
  },

  async logout(): Promise<LogoutResponse> {
    const res = await api.post<LogoutResponse>('/api/v1/auth/logout');
    return res.data;
  },

  async getMe(): Promise<UserResponse> {
    const res = await api.get<UserResponse>('/api/v1/auth/me');
    return res.data;
  },
};

