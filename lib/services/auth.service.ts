import { apiClient } from '../api-client';

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

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
      
      // Guardar tokens
      if (response.data.accessToken && response.data.refreshToken) {
        apiClient.setTokens({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        });
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Continuar con el logout local incluso si falla el servidor
      console.error('Error during server logout:', error);
    } finally {
      // Limpiar tokens locales
      apiClient.clearTokens();
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh');
    
    // Actualizar tokens
    if (response.data.accessToken && response.data.refreshToken) {
      apiClient.setTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      });
    }
    
    return response.data;
  }

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, password });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>('/auth/profile', data);
    return response.data;
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('accessToken');
    return !!token;
  }

  // Obtener el token actual
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  // Verificar permisos del usuario
  hasPermission(permission: string): boolean {
    // Implementar lógica de permisos basada en el rol del usuario
    // Por ahora, retornamos true para simplificar
    return true;
  }

  // Verificar si el usuario tiene un rol específico
  hasRole(role: string): boolean {
    // Implementar lógica de roles
    // Por ahora, retornamos true para simplificar
    return true;
  }
}

export const authService = new AuthService();
export default authService;