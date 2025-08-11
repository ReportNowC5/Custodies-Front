export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse<T> {
    success: boolean;
    data: T[];
}

// Tipos adicionales para autenticación
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}