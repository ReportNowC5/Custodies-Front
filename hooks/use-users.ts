import { useState, useEffect } from 'react';
import { usersService } from '@/lib/services/users.service';
import { UserResponse, CreateUserRequest, UpdateUserRequest } from '@/lib/types/user';
import { toast } from 'sonner';

export const useUsers = () => {
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await usersService.getUsers();
            if (response.success && response.result) {
                setUsers(response.result);
            } else {
                throw new Error(response.message || 'Error obteniendo usuarios');
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Error obteniendo usuarios';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const createUser = async (userData: CreateUserRequest) => {
        try {
            setIsLoading(true);
            const response = await usersService.createUser(userData);
            if (response.success && response.result) {
                await fetchUsers(); // Refrescar la lista
                toast.success('Usuario creado exitosamente');
                return response.result;
            } else {
                throw new Error(response.message || 'Error creando usuario');
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Error creando usuario';
            toast.error(errorMessage);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const updateUser = async (id: number, userData: UpdateUserRequest) => {
        try {
            setIsLoading(true);
            const response = await usersService.updateUser(id, userData);
            if (response.success && response.result) {
                await fetchUsers(); // Refrescar la lista
                toast.success('Usuario actualizado exitosamente');
                return response.result;
            } else {
                throw new Error(response.message || 'Error actualizando usuario');
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Error actualizando usuario';
            toast.error(errorMessage);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const deleteUser = async (id: number) => {
        try {
            setIsLoading(true);
            const response = await usersService.deleteUser(id);
            if (response.success) {
                await fetchUsers(); // Refrescar la lista
                toast.success('Usuario eliminado exitosamente');
            } else {
                throw new Error('Error eliminando usuario');
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Error eliminando usuario';
            toast.error(errorMessage);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    return {
        users,
        isLoading,
        error,
        fetchUsers,
        createUser,
        updateUser,
        deleteUser,
    };
};