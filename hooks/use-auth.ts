import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/auth.service';
import { User } from '@/lib/types/auth';

interface AuthState { 
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface UseAuthReturn extends AuthState {
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  checkPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Verificar autenticación al cargar
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Auto-refresh token cada 15 minutos
  useEffect(() => {
    if (state.isAuthenticated) {
      const interval = setInterval(() => {
        refreshToken();
      }, 15 * 60 * 1000); // 15 minutos

      return () => clearInterval(interval);
    }
  }, [state.isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const user = await authService.getCurrentUser();
      if (user) {
        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } else {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: 'Error al verificar autenticación',
      });
    }
  };

  const login = useCallback(async (
    email: string, 
    password: string, 
    remember: boolean = false
  ): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await authService.login({ email, password, remember });
      
      if (response.user && response.accessToken) {
        setState({
          user: {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            role: response.user.role,
            avatar: response.user.avatar,
            phone: '',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
        return true;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Error al iniciar sesión: respuesta inválida',
        }));
        return false;
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Error al iniciar sesión',
      }));
      return false;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Forzar logout local incluso si falla el servidor
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
      router.push('/auth/login');
    }
  }, [router]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await authService.refreshToken();
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          user: response.data && 'user' in response.data ? response.data.user as User : null,
          isAuthenticated: true,
          error: null,
        }));
        return true;
      } else {
        // Token refresh falló, hacer logout
        await logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      await logout();
      return false;
    }
  }, [logout]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const checkPermission = useCallback((permission: string): boolean => {
    if (!state.user) return false;
    
    // Administradores tienen todos los permisos
    if (state.user.role === 'administrator') return true;
    
    // Implementar lógica de permisos específicos según necesidades
    const rolePermissions: Record<string, string[]> = {
      administrator: ['*'], // Todos los permisos
      supervisor: [
        'users.read',
        'users.create',
        'users.update',
        'vehicles.read',
        'vehicles.create',
        'vehicles.update',
        'tracking.read',
        'reports.read',
        'reports.create',
      ],
      operator: [
        'vehicles.read',
        'tracking.read',
        'reports.read',
      ],
    };
    
    const userPermissions = rolePermissions[state.user.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }, [state.user]);

  const hasRole = useCallback((role: string | string[]): boolean => {
    if (!state.user) return false;
    
    if (Array.isArray(role)) {
      return role.includes(state.user.role);
    }
    
    return state.user.role === role;
  }, [state.user]);

  return {
    ...state,
    login,
    logout,
    refreshToken,
    clearError,
    checkPermission,
    hasRole,
  };
}

// Hook para proteger componentes
export function useRequireAuth(redirectTo: string = '/auth/login') {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push(redirectTo);
    }
  }, [auth.isLoading, auth.isAuthenticated, router, redirectTo]);

  return auth;
}

// Hook para verificar permisos
export function usePermission(permission: string) {
  const { checkPermission, isAuthenticated, isLoading } = useAuth();
  
  return {
    hasPermission: isAuthenticated && checkPermission(permission),
    isLoading,
    isAuthenticated,
  };
}

// Hook para verificar roles
export function useRole(role: string | string[]) {
  const { hasRole, isAuthenticated, isLoading } = useAuth();
  
  return {
    hasRole: isAuthenticated && hasRole(role),
    isLoading,
    isAuthenticated,
  };
}