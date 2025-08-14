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

                const user: User = {
                    id: response.result.id,
                    email: response.result.email,
                    name: response.result.name,
                    role: response.result.type,
                    avatar: response.result.avatar || null,
                    isEmailVerified: response.result.isEmailVerified
                };
                
                apiClient.setTokens({
                    accessToken: token,
                    refreshToken: token
                });
                
                localStorage.setItem(this.TOKEN_KEY, token);
                localStorage.setItem(this.USER_KEY, JSON.stringify(user));
                this.setCookie(this.TOKEN_KEY, token);
                
                console.log('✅ Login exitoso');
                
                return {
                    success: true,
                    result: [user],
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
            window.location.replace('/es/auth/login');
        }
    }

    /**
     * Decodifica un JWT sin verificar la firma (solo para leer el payload)
     */
    private decodeJWT(token: string): any {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Token JWT inválido');
            }
            
            const payload = parts[1];
            const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Error decodificando JWT:', error);
            return null;
        }
    }

    /**
     * Verifica si el token ha expirado
     */
    private isTokenExpired(decodedToken: any): boolean {
        if (!decodedToken || !decodedToken.exp) {
            return true;
        }
        
        const currentTime = Math.floor(Date.now() / 1000);
        return decodedToken.exp < currentTime;
    }

    getCurrentUser(): User | null {
        try {
            const user = localStorage.getItem(this.USER_KEY);
            if (user) {
                return JSON.parse(user);
            }
            return null;
        } catch (error) {
            console.error('Error al obtener el usuario:', error);
            return null;
        }
    }

    // Función mejorada para verificar autenticación
    isAuthenticated(): boolean {
        const token = this.getToken();
        if (!token) return false;
        
        // Verificar que no sea un token obviamente inválido
        if (token === 'null' || token === 'undefined' || token === '') {
            return false;
        }

        // Verificar que el token sea válido y no haya expirado
        const decodedToken = this.decodeJWT(token);
        if (!decodedToken) {
            return false;
        }

        if (this.isTokenExpired(decodedToken)) {
            return false;
        }
        
        return true;
    }

    getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(this.TOKEN_KEY);
        }
        return null;
    }
}

export const authService = new AuthService();
export default authService;