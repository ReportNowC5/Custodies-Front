import { apiClient } from '../api-client';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'administrator' | 'supervisor' | 'operator';
  status: 'active' | 'inactive';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  permissions?: string[];
}

export interface CreateUserData {
  name: string;
  email: string;
  phone?: string;
  role: 'administrator' | 'supervisor' | 'operator';
  password: string;
  status?: 'active' | 'inactive';
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  phone?: string;
  role?: 'administrator' | 'supervisor' | 'operator';
  status?: 'active' | 'inactive';
  avatar?: string;
}

export interface UsersListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UsersFilters {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class UsersService {
  async getUsers(filters?: UsersFilters): Promise<UsersListResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const queryString = params.toString();
    const url = queryString ? `/users?${queryString}` : '/users';
    
    const response = await apiClient.get<UsersListResponse>(url);
    return response.data;
  }

  async getUserById(id: string): Promise<User> {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const response = await apiClient.post<User>('/users', userData);
    return response.data;
  }

  async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    const response = await apiClient.put<User>(`/users/${id}`, userData);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  }

  async toggleUserStatus(id: string): Promise<User> {
    const response = await apiClient.patch<User>(`/users/${id}/toggle-status`);
    return response.data;
  }

  async resetUserPassword(id: string): Promise<{ temporaryPassword: string }> {
    const response = await apiClient.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`);
    return response.data;
  }

  async uploadUserAvatar(id: string, file: File): Promise<User> {
    const response = await apiClient.uploadFile<User>(`/users/${id}/avatar`, file);
    return response.data;
  }

  async getUserPermissions(id: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/users/${id}/permissions`);
    return response.data;
  }

  async updateUserPermissions(id: string, permissions: string[]): Promise<void> {
    await apiClient.put(`/users/${id}/permissions`, { permissions });
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  }> {
    const response = await apiClient.get<{
      total: number;
      active: number;
      inactive: number;
      byRole: Record<string, number>;
    }>('/users/stats');
    return response.data;
  }

  async exportUsers(filters?: UsersFilters): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const queryString = params.toString();
    const url = queryString ? `/users/export?${queryString}` : '/users/export';
    
    return await apiClient.downloadFile(url);
  }

  async importUsers(file: File): Promise<{
    imported: number;
    failed: number;
    errors?: Array<{ row: number; error: string }>;
  }> {
    const response = await apiClient.uploadFile<{
      imported: number;
      failed: number;
      errors?: Array<{ row: number; error: string }>;
    }>('/users/import', file);
    return response.data;
  }

  // Métodos de utilidad
  getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      administrator: 'Administrador',
      supervisor: 'Supervisor',
      operator: 'Operador',
    };
    return roleNames[role] || role;
  }

  getStatusDisplayName(status: string): string {
    const statusNames: Record<string, string> = {
      active: 'Activo',
      inactive: 'Inactivo',
    };
    return statusNames[status] || status;
  }

  getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      active: 'text-green-600 bg-green-100',
      inactive: 'text-red-600 bg-red-100',
    };
    return statusColors[status] || 'text-gray-600 bg-gray-100';
  }

  getRoleColor(role: string): string {
    const roleColors: Record<string, string> = {
      administrator: 'text-purple-600 bg-purple-100',
      supervisor: 'text-blue-600 bg-blue-100',
      operator: 'text-green-600 bg-green-100',
    };
    return roleColors[role] || 'text-gray-600 bg-gray-100';
  }
}

export const usersService = new UsersService();
export default usersService;