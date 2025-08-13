# Plan para Solucionar Problemas de CORS

## 1. Análisis del Problema Actual

### 1.1 Situación Actual
- **Frontend**: Next.js ejecutándose en `http://localhost:3001`
- **Backend**: Express.js ejecutándose en `http://localhost:3000`
- **Problema**: Errores de CORS y "Network Error" al realizar peticiones entre diferentes puertos
- **Causa**: Configuración incorrecta de CORS y uso inconsistente de ApiClient

### 1.2 Objetivos
- Configurar CORS correctamente para desarrollo local
- Implementar interceptores HTTP para manejo de tokens
- Preparar configuración para producción con datos reales
- Establecer estrategias de debugging y testing

## 2. Configuración de Variables de Entorno

### 2.1 Desarrollo Local (.env.local)
```env
# URLs del proyecto
NEXT_PUBLIC_SITE_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_SERVICE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

# Configuración CORS
NEXT_PUBLIC_CORS_ORIGIN=http://localhost:3001

# Servicios adicionales
NEXT_PUBLIC_GPS_SERVICE_URL=http://localhost:3000
NEXT_PUBLIC_USER_SERVICE_URL=http://localhost:3000

# Configuración de entorno
NEXT_PUBLIC_ENV=development

# Autenticación
AUTH_SECRET=your-secret-key-here
```

### 2.2 Producción (.env.production)
```env
# URLs de producción
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_BACKEND_SERVICE_URL=https://api.your-domain.com
NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com

# Configuración CORS
NEXT_PUBLIC_CORS_ORIGIN=https://your-domain.com

# Servicios adicionales
NEXT_PUBLIC_GPS_SERVICE_URL=https://api.your-domain.com
NEXT_PUBLIC_USER_SERVICE_URL=https://api.your-domain.com

# Configuración de entorno
NEXT_PUBLIC_ENV=production

# Autenticación
AUTH_SECRET=your-production-secret-key

# Base de datos
DATABASE_URL=your-production-database-url
```

## 3. Configuración del Backend (Express.js)

### 3.1 Middleware CORS
```javascript
// server.js o app.js
const express = require('express');
const cors = require('cors');
const app = express();

// Configuración CORS para desarrollo
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3001', // Frontend en desarrollo
      'https://your-domain.com' // Frontend en producción
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true, // Permitir cookies y headers de autenticación
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Access-Token'
  ]
};

app.use(cors(corsOptions));

// Middleware para parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de autenticación
app.post('/auth/login', (req, res) => {
  // Lógica de login
});

app.post('/auth/refresh', (req, res) => {
  // Lógica de refresh token
});
```

### 3.2 Configuración Dinámica por Entorno
```javascript
// config/cors.js
const getCorsOptions = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    origin: isDevelopment 
      ? ['http://localhost:3001', 'http://localhost:3000']
      : [process.env.FRONTEND_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-Access-Token'
    ]
  };
};

module.exports = { getCorsOptions };
```

## 4. Configuración del Frontend (ApiClient)

### 4.1 Mejoras en ApiClient
```typescript
// lib/api-client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'sonner';
import { env } from './config/environment';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: env.api.API_BASE_URL,
      timeout: 30000,
      withCredentials: true, // Importante para CORS
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Log para debugging
        if (env.isDevelopment) {
          console.log('🚀 API Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            baseURL: config.baseURL,
            headers: config.headers
          });
        }
        
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        if (env.isDevelopment) {
          console.log('✅ API Response:', {
            status: response.status,
            url: response.config.url,
            data: response.data
          });
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Log detallado del error
        console.error('❌ API Error:', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
          method: error.config?.method
        });

        // Manejo de errores 401 (token expirado)
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshToken();
            this.processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.clearAuth();
            window.location.href = '/auth/login';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Manejo de errores de red/CORS
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
          toast.error('Error de conexión. Verifica que el servidor esté ejecutándose.');
        } else if (error.response?.status >= 500) {
          toast.error('Error del servidor. Intenta nuevamente.');
        } else if (error.response?.status === 403) {
          toast.error('No tienes permisos para realizar esta acción.');
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available1');
    }

    const response = await axios.post(
      `${env.api.API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { withCredentials: true }
    );

    const { access_token } = response.data;
    localStorage.setItem('access_token', access_token);
    return access_token;
  }

  private clearAuth() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  // Métodos públicos
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

### 4.2 Servicio de Autenticación Refactorizado
```typescript
// lib/services/auth.service.ts
import { apiClient } from '../api-client';
import { User } from '../types/auth';
import Cookies from 'js-cookie';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      console.log('🔐 Iniciando login con:', { email: credentials.email });
      
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
      
      console.log('✅ Login exitoso:', response);
      
      // Guardar tokens y usuario
      this.setTokens(response.access_token, response.refresh_token);
      this.setUser(response.user);
      
      return response.user;
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  }

  async refreshToken(): Promise<string> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available2');
      }

      const response = await apiClient.post<{ access_token: string }>('/auth/refresh', {
        refresh_token: refreshToken
      });

      this.setToken(response.access_token);
      return response.access_token;
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      this.logout();
      throw error;
    }
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    
    // Redirect to login
    window.location.href = '/auth/login';
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    
    // También en cookies para SSR
    Cookies.set('access_token', accessToken, { expires: 1 });
    Cookies.set('refresh_token', refreshToken, { expires: 7 });
  }

  private setToken(accessToken: string): void {
    localStorage.setItem('access_token', accessToken);
    Cookies.set('access_token', accessToken, { expires: 1 });
  }

  private setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

export const authService = new AuthService();
```

## 5. Configuración de Entorno

### 5.1 Actualización de environment.ts
```typescript
// lib/config/environment.ts
interface EnvironmentConfig {
  // URLs de servicios
  api: {
    API_BASE_URL: string;
  };
  backend: {
    BACKEND_SERVICE_URL: string;
  };
  site: {
    SITE_URL: string;
  };
  cors: {
    CORS_ORIGIN: string;
  };
  // Configuraciones adicionales
  isDevelopment: boolean;
  isProduction: boolean;
  env: string;
}

class Environment {
  private config: EnvironmentConfig;

  constructor() {
    this.config = {
      api: {
        API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'
      },
      backend: {
        BACKEND_SERVICE_URL: process.env.NEXT_PUBLIC_BACKEND_SERVICE_URL || 'http://localhost:3000'
      },
      site: {
        SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
      },
      cors: {
        CORS_ORIGIN: process.env.NEXT_PUBLIC_CORS_ORIGIN || 'http://localhost:3001'
      },
      isDevelopment: process.env.NEXT_PUBLIC_ENV === 'development',
      isProduction: process.env.NEXT_PUBLIC_ENV === 'production',
      env: process.env.NEXT_PUBLIC_ENV || 'development'
    };

    // Log de configuración en desarrollo
    if (this.config.isDevelopment) {
      console.log('🔧 Environment Config:', this.config);
    }
  }

  get api() {
    return this.config.api;
  }

  get backend() {
    return this.config.backend;
  }

  get site() {
    return this.config.site;
  }

  get cors() {
    return this.config.cors;
  }

  get isDevelopment() {
    return this.config.isDevelopment;
  }

  get isProduction() {
    return this.config.isProduction;
  }

  getApiUrl(path: string = ''): string {
    return `${this.config.api.API_BASE_URL}${path}`;
  }

  getBackendUrl(path: string = ''): string {
    return `${this.config.backend.BACKEND_SERVICE_URL}${path}`;
  }
}

export const env = new Environment();
```

## 6. Estrategias de Debugging y Testing

### 6.1 Herramientas de Debugging
```typescript
// lib/utils/debug.ts
class DebugHelper {
  static logRequest(method: string, url: string, data?: any) {
    if (process.env.NEXT_PUBLIC_ENV === 'development') {
      console.group(`🚀 ${method.toUpperCase()} ${url}`);
      console.log('URL:', url);
      if (data) console.log('Data:', data);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }

  static logResponse(status: number, url: string, data?: any) {
    if (process.env.NEXT_PUBLIC_ENV === 'development') {
      const emoji = status >= 200 && status < 300 ? '✅' : '❌';
      console.group(`${emoji} ${status} ${url}`);
      console.log('Status:', status);
      console.log('URL:', url);
      if (data) console.log('Response:', data);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }

  static logError(error: any, context?: string) {
    console.group(`❌ Error${context ? ` in ${context}` : ''}`);
    console.error('Error:', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }
}

export { DebugHelper };
```

### 6.2 Componente de Testing CORS
```typescript
// components/debug/cors-tester.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { authService } from '@/lib/services/auth.service';

export function CORSTester() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, success: boolean, data?: any, error?: any) => {
    setResults(prev => [...prev, {
      test,
      success,
      data,
      error: error?.message || error,
      timestamp: new Date().toISOString()
    }]);
  };

  const testCORS = async () => {
    setLoading(true);
    setResults([]);

    // Test 1: Preflight request
    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3001',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });
      addResult('Preflight Request', response.ok, {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });
    } catch (error) {
      addResult('Preflight Request', false, null, error);
    }

    // Test 2: Simple GET request
    try {
      const data = await apiClient.get('/health');
      addResult('GET Request', true, data);
    } catch (error) {
      addResult('GET Request', false, null, error);
    }

    // Test 3: POST request with credentials
    try {
      const data = await apiClient.post('/auth/login', {
        email: 'test@example.com',
        password: 'test123'
      });
      addResult('POST with Credentials', true, data);
    } catch (error) {
      addResult('POST with Credentials', false, null, error);
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>CORS Tester</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={testCORS} disabled={loading} className="mb-4">
          {loading ? 'Testing...' : 'Run CORS Tests'}
        </Button>
        
        <div className="space-y-2">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-3 rounded border ${
                result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.success ? '✅' : '❌'}
                </span>
                <strong>{result.test}</strong>
                <span className="text-sm text-gray-500">{result.timestamp}</span>
              </div>
              {result.data && (
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}
              {result.error && (
                <div className="mt-2 text-sm text-red-600">
                  Error: {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

## 7. Checklist de Implementación

### 7.1 Backend (Express.js)
- [ ] Instalar y configurar middleware CORS
- [ ] Configurar headers permitidos
- [ ] Habilitar credentials: true
- [ ] Configurar origins dinámicos por entorno
- [ ] Implementar manejo de preflight requests
- [ ] Agregar logging de requests CORS

### 7.2 Frontend (Next.js)
- [ ] Actualizar variables de entorno
- [ ] Refactorizar ApiClient con interceptores mejorados
- [ ] Actualizar AuthService para usar ApiClient
- [ ] Configurar withCredentials en axios
- [ ] Implementar manejo de refresh tokens
- [ ] Agregar logging detallado para debugging

### 7.3 Testing y Debugging
- [ ] Crear componente CORSTester
- [ ] Implementar DebugHelper
- [ ] Verificar requests en Network tab
- [ ] Probar autenticación completa
- [ ] Verificar refresh de tokens
- [ ] Probar en diferentes navegadores

### 7.4 Producción
- [ ] Configurar variables de entorno de producción
- [ ] Configurar CORS para dominio de producción
- [ ] Implementar HTTPS
- [ ] Configurar certificados SSL
- [ ] Probar en entorno de staging
- [ ] Monitorear logs de producción

## 8. Comandos de Testing

### 8.1 Verificar CORS desde Terminal
```bash
# Test preflight request
curl -X OPTIONS http://localhost:3000/auth/login \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  -v

# Test actual request
curl -X POST http://localhost:3000/auth/login \
  -H "Origin: http://localhost:3001" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -v
```

### 8.2 Scripts de Package.json
```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "dev:backend": "node server.js",
    "dev:full": "concurrently \"npm run dev\" \"npm run dev:backend\"",
    "test:cors": "node scripts/test-cors.js",
    "build": "next build",
    "start": "next start -p 3001"
  }
}
```

## 9. Monitoreo y Logs

### 9.1 Configuración de Logs
```typescript
// lib/utils/logger.ts
class Logger {
  static info(message: string, data?: any) {
    if (process.env.NEXT_PUBLIC_ENV === 'development') {
      console.log(`ℹ️ ${message}`, data || '');
    }
  }

  static error(message: string, error?: any) {
    console.error(`❌ ${message}`, error || '');
  }

  static cors(message: string, data?: any) {
    if (process.env.NEXT_PUBLIC_ENV === 'development') {
      console.log(`🌐 CORS: ${message}`, data || '');
    }
  }

  static auth(message: string, data?: any) {
    if (process.env.NEXT_PUBLIC_ENV === 'development') {
      console.log(`🔐 AUTH: ${message}`, data || '');
    }
  }
}

export { Logger };
```

## 10. Próximos Pasos

1. **Implementar configuración de backend CORS**
2. **Actualizar variables de entorno**
3. **Refactorizar ApiClient y AuthService**
4. **Probar en desarrollo local**
5. **Crear componente de testing**
6. **Preparar configuración de producción**
7. **Documentar proceso de deployment**

Este plan proporciona una solución completa para resolver los problemas de CORS, implementar interceptores HTTP adecuados y preparar el proyecto para funcionar tanto en desarrollo como en producción con datos reales de la base de datos.