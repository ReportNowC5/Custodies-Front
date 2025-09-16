import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'sonner';
import { env } from '@/lib/config/environment';

interface ApiResponse<T = any> {
    success: boolean;
    path?: string;
    message?: string;
    error?: string;
    result?: T;
}

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

class ApiClient {
    private client: AxiosInstance;
    private isRefreshing = false;

    constructor() {
        console.log('🚀 Inicializando ApiClient con backend:', env.getBackendUrl());
        this.client = axios.create({
            baseURL: env.getBackendUrl(),
            timeout: 30000,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // Request interceptor - solo agregar token si existe
        this.client.interceptors.request.use(
            (config) => {
                const token = this.getAccessToken();
                if (token && !config.url?.includes('/auth/login')) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );
    
        // Response interceptor - Mejorado con manejo de errores y fallbacks
        this.client.interceptors.response.use(
            (response: AxiosResponse) => {
                return response;
            },
            (error: AxiosError) => {
                console.error('💥 Error en respuesta:', error.response?.status, error.config?.url);
                
                // Manejar errores de red/conexión
                if (!error.response) {
                    console.warn('🌐 Error de conexión - usando datos mock');
                    // No rechazar el error, permitir que el servicio maneje el fallback
                    return Promise.reject({
                        ...error,
                        isNetworkError: true,
                        message: 'Error de conexión - usando datos de respaldo'
                    });
                }
                
                // Manejar errores 401 para autenticación
                if (error.response?.status === 401) {
                    if (error.config?.url?.includes('/auth/login')) {
                        // Error de login - no redirigir
                        return Promise.reject(error);
                    }
                    
                    console.log('🚫 Token caducado o inválido');
                    
                    // Limpiar tokens y estado
                    this.clearTokens();
                    
                    // Limpiar localStorage y cookies
                    if (typeof window !== 'undefined') {
                        localStorage.clear();
                        sessionStorage.clear();
                        document.cookie = 'auth_token=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
                        
                        // Disparar evento personalizado para que el AuthProvider escuche
                        window.dispatchEvent(new CustomEvent('auth:logout'));
                        
                        // Obtener locale actual de la URL
                        const currentPath = window.location.pathname;
                        const locale = currentPath.split('/')[1] || 'es';
                        
                        // Redirigir con locale correcto
                        setTimeout(() => {
                            window.location.replace(`/${locale}/auth/login`);
                        }, 100);
                    }
                }
                
                // Manejar errores de CORS
                if (error.code === 'ERR_NETWORK' || error.message?.includes('CORS')) {
                    console.warn('🚫 Error de CORS detectado');
                    return Promise.reject({
                        ...error,
                        isCorsError: true,
                        message: 'Error de CORS - verificar configuración del proxy'
                    });
                }
                
                return Promise.reject(error);
            }
        );
    }

    private getAccessToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('accessToken');
    }

    public setTokens(tokens: AuthTokens) {
        if (typeof window === 'undefined') return;
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
    }

    public clearTokens() {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    }

    // Métodos HTTP simples
    public async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.get(url, config);
        return response.data;
    }

    public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        console.log('📤 POST a:', url, 'con datos:', data, "client", this.client);
        const response = await this.client.post(url, data, config);
        return response.data;
    }

    public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.put(url, data, config);
        return response.data;
    }

    public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.delete(url, config);
        return response.data;
    }

    public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.patch(url, data, config);
        return response.data;
    }

    public async uploadFile<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.post(url, data, config);
        return response.data;
    }

    public async uploadFiles<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.post(url, data, config);
        return response.data;
    }

    public async downloadFile<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.get(url, config);
        return response.data;
    }

    public async downloadFiles<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.get(url, config);
        return response.data;
    }
}

export const apiClient = new ApiClient();
export default apiClient;