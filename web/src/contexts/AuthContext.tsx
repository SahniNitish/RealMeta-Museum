import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { API_BASE } from '@/lib/api';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Museum {
  id: string;
  name: string;
  location: string;
  qrCode: string;
  qrCodeUrl?: string;
}

interface AuthContextType {
  admin: Admin | null;
  museum: Museum | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ qrCodeUrl: string }>;
  logout: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  museumName: string;
  museumLocation: string;
  museumDescription?: string;
  museumWebsite?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [museum, setMuseum] = useState<Museum | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        setAdmin(response.data.admin);
        setMuseum(response.data.museum);
        setToken(storedToken);
      } catch {
        // Token invalid, clear it
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
    const { token: newToken, admin: adminData, museum: museumData } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setAdmin(adminData);
    setMuseum(museumData);
  };

  const register = async (data: RegisterData) => {
    const response = await axios.post(`${API_BASE}/auth/register`, data);
    const { token: newToken, admin: adminData, museum: museumData } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setAdmin(adminData);
    setMuseum(museumData);

    return { qrCodeUrl: museumData.qrCodeUrl };
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setAdmin(null);
    setMuseum(null);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        museum,
        token,
        isLoading,
        isAuthenticated: !!token && !!admin,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
