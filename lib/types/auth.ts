export interface GenericResponse<T> {
    success?: boolean;
    message?: string;
    path?: string;
    error?: string;
    result?: T[];
}

export interface AuthResponse<T = User>
    extends GenericResponse<T> {
    token?: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar?: string;
    phone?: string;
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
    remember?: boolean;
}

export interface RefreshTokenResponse<T> {
    success: boolean;
    result: T[];
}

// Tipos adicionales para autenticación
export interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;
}

export interface Permission {
    id: string;
    name: string;
    description?: string;
}

export interface Role {
    id: string;
    name: string;
    permissions: Permission[];
}


// Tipos de errores de autenticación
export type AuthErrorType =
    | 'MISSING_CREDENTIALS'
    | 'INVALID_CREDENTIALS'
    | 'INVALID_TOKEN'
    | 'MISSING_TOKEN'
    | 'NETWORK_ERROR'
    | 'SERVER_ERROR'
    | 'UNKNOWN_ERROR';

export interface AuthError {
    type: AuthErrorType;
    message: string;
    details?: string;
}