import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'sonner';
import { env } from '@/lib/config/environment';

interface ApiResponse<T = any> {
    data: T;
    message?: string;
    success: boolean;
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
        this.client = axios.create({
            baseURL: env.getApiUrl(),
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

        // Response interceptor - SOLO manejar errores, NO refresh automático
        this.client.interceptors.response.use(
            (response: AxiosResponse) => response,
            (error: AxiosError) => {
                // Solo limpiar tokens en 401, NO hacer refresh automático
                if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
                    this.clearTokens();
                    if (typeof window !== 'undefined') {
                        window.location.replace('/auth/login');
                    }
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