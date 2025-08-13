import { LoginCredentials, AuthResponse, User } from '@/lib/types/auth';
import apiClient from '@/lib/api-client';
import { env } from '@/lib/config/environment';

class AuthService {
    private readonly TOKEN_KEY = 'auth_token';
    private readonly USER_KEY = 'auth_user';

    private setCookie(name: string, value: string, days: number = 7) {
        if (typeof window !== 'undefined') {
            const expires = new Date();
            expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
            document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
        }
    }

    private deleteCookie(name: string) {
        if (typeof window !== 'undefined') {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
        }
    }

    async login(credentials: LoginCredentials): Promise<AuthResponse<User>> {
        try {
            console.log('🔐 Intentando login...');
            
            const response = await apiClient.post<any>('/api/auth/login', {
                email: credentials.email,
                password: credentials.password
            });
            
            console.log('📥 Respuesta del login:', response);
            
            if (response.success && response.result) {
                const token = response.result.token;
                const user = response.result.user || { email: credentials.email };
                
                // Guardar tokens
                apiClient.setTokens({
                    accessToken: token,
                    refreshToken: token // Usar el mismo token por ahora
                });
                
                // Guardar en localStorage y cookies
                localStorage.setItem(this.TOKEN_KEY, token);
                localStorage.setItem(this.USER_KEY, JSON.stringify(user));
                this.setCookie(this.TOKEN_KEY, token);
                
                console.log('✅ Login exitoso');
                
                return {
                    success: true,
                    result: user,
                    message: 'Login exitoso'
                };
            } else {
                throw new Error(response.message || 'Error en el login');
            }
        } catch (error: any) {
            console.error('💥 Error en login:', error);
            throw error;
        }
    }

    logout(): void {
        console.log('🚪 Cerrando sesión...');
        
        if (typeof window !== 'undefined') {
            // Limpiar todo
            apiClient.clearTokens();
            localStorage.clear();
            sessionStorage.clear();
            
            // Limpiar cookies
            this.deleteCookie(this.TOKEN_KEY);
            this.deleteCookie('auth_token');
            
            console.log('✅ Sesión cerrada');
            
            // Redireccionar
            window.location.replace('/auth/login');
        }
    }

    getCurrentUser(): User | null {
        try {
            if (typeof window !== 'undefined') {
                const userStr = localStorage.getItem(this.USER_KEY);
                return userStr ? JSON.parse(userStr) : null;
            }
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
        }
        return null;
    }

    getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(this.TOKEN_KEY);
        }
        return null;
    }

    isAuthenticated(): boolean {
        const token = this.getToken();
        return !!token;
    }
}

export const authService = new AuthService();
export default authService;