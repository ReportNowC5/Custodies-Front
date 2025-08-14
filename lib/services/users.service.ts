import apiClient from '@/lib/api-client';
import { 
    CreateUserRequest, 
    UpdateUserRequest, 
    UserResponse, 
    UsersListResponse, 
    UserDetailResponse 
} from '@/lib/types/user';

class UsersService {
    private readonly BASE_URL = '/api/admin/users';

    async getUsers(): Promise<UsersListResponse> {
        try {
            console.log('📋 Obteniendo lista de usuarios...');
            const response = await apiClient.get<UsersListResponse>(this.BASE_URL);
            console.log('✅ Lista de usuarios obtenida:', response);
            // filtrar por usuarios que no sean CLIENT
            return {
                ...response,
                result: (response?.result as any).filter((user: any) => user.type !== 'CLIENT') as UserResponse[]
            } as any;
        } catch (error: any) {
            console.error('💥 Error obteniendo usuarios:', error);
            throw error;
        }
    }

    async getUserById(id: number): Promise<UserDetailResponse> {
        try {
            console.log(`👤 Obteniendo usuario con ID: ${id}`);
            const response = await apiClient.get<UserDetailResponse>(`${this.BASE_URL}/${id}`);
            console.log('✅ Usuario obtenido:', response);
            return response as any;
        } catch (error: any) {
            console.error(`💥 Error obteniendo usuario ${id}:`, error);
            throw error;
        }
    }

    async createUser(userData: CreateUserRequest): Promise<UserDetailResponse> {
        try {
            console.log('➕ Creando nuevo usuario:', userData);
            const response = await apiClient.post<UserDetailResponse>(this.BASE_URL, userData);
            console.log('✅ Usuario creado:', response);
            return response as any;
        } catch (error: any) {
            console.error('💥 Error creando usuario:', error);
            throw error;
        }
    }

    async updateUser(id: number, userData: UpdateUserRequest): Promise<UserDetailResponse> {
        try {
            console.log(`✏️ Actualizando usuario ${id}:`, userData);
            const response = await apiClient.put<UserDetailResponse>(`${this.BASE_URL}/${id}`, userData);
            console.log('✅ Usuario actualizado:', response);
            return response as any;
        } catch (error: any) {
            console.error(`💥 Error actualizando usuario ${id}:`, error);
            throw error;
        }
    }

    async deleteUser(id: number): Promise<{ success: boolean; message: string }> {
        try {
            console.log(`🗑️ Eliminando usuario ${id}`);
            const response = await apiClient.delete<{ success: boolean; message: string }>(`${this.BASE_URL}/${id}`);
            console.log('✅ Usuario eliminado:', response);
            return response as any;
        } catch (error: any) {
            console.error(`💥 Error eliminando usuario ${id}:`, error);
            throw error;
        }
    }
}

export const usersService = new UsersService();
export default usersService;