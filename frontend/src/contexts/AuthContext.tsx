import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserResponse, LoginRequest, RegisterRequest } from '../types';
import { authService } from '../services/auth';
import { getStoredToken, setStoredToken } from '../services/api';

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<UserResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await authService.getMe();
      setUser(profile);
    } catch {
      setUser(null);
      setToken(null);
      setStoredToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [token, fetchProfile]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      setStoredToken(null);
    };

    window.addEventListener('blp:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('blp:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (data: LoginRequest) => {
    const response = await authService.login(data);
    setStoredToken(response.access_token);
    setToken(response.access_token);
    // Fetch user profile right after obtaining the token
    const profile = await authService.getMe();
    setUser(profile);
  };

  const register = async (data: RegisterRequest) => {
    const newUser = await authService.register(data);
    return newUser;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      // Even if network or token expired, clean up frontend state
      console.warn('Backend logout response error:', e);
    } finally {
      setStoredToken(null);
      setToken(null);
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

