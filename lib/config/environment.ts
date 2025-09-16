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
        // Debug: Verificar variables de entorno
        console.log('🔍 Debug Environment Variables:');
        console.log('NEXT_PUBLIC_BACKEND_SERVICE_URL:', process.env.NEXT_PUBLIC_BACKEND_SERVICE_URL);
        console.log('NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
        console.log('NEXT_PUBLIC_ENV:', process.env.NEXT_PUBLIC_ENV);
        
        const isDev = process.env.NEXT_PUBLIC_ENV === 'development';
        
        this.config = {
            api: {
                API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || (isDev ? 'http://localhost:3000' : 'https://gps.dxplus.org/')
            },
            backend: {
                BACKEND_SERVICE_URL: process.env.NEXT_PUBLIC_BACKEND_SERVICE_URL || (isDev ? 'http://localhost:3000' : 'https://gps.dxplus.org/')
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
        
        // Debug: Verificar configuración final
        console.log('📋 Final Config:');
        console.log('Backend URL:', this.config.backend.BACKEND_SERVICE_URL);
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

    get env() {
        return this.config.env;
    }

    getApiUrl(path: string = ''): string {
        return `${this.config.api.API_BASE_URL}${path}`;
    }

    getBackendUrl(path: string = ''): string {
        return `${this.config.backend.BACKEND_SERVICE_URL}${path}`;
    }
}

export const env = new Environment();
export default env;