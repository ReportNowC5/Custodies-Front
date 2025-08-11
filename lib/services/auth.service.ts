import { apiClient } from '../api-client';
import type { LoginCredentials, LoginResponse, User, RefreshTokenResponse } from '../types/auth';

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

  async refreshToken<T>(): Promise<RefreshTokenResponse<T>> {
    const response = await apiClient.post<RefreshTokenResponse<T>>('/auth/refresh');
    
    // Actualizar tokens
    if (response.data && 'accessToken' in response.data && 'refreshToken' in response.data) {
      apiClient.setTokens({
        accessToken: response.data.accessToken as string,
        refreshToken: response.data.refreshToken as string,
      });
    }
    
    return response.data as RefreshTokenResponse<T>;
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