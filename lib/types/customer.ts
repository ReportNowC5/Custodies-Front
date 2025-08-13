export interface Customer {
    id: string;
    name: string;
    email: string;
    phone?: string;
    password?: string;
    rfc?: string;
    address?: string;
    postalCode?: string;
    state?: string;
    city?: string;
    colony?: string;
    interiorNumber?: string;
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
}

export interface CreateCustomerRequest {
    name: string;
    email: string;
    phone?: string;
    password: string;
    rfc?: string;
    address?: string;
    postalCode?: string;
    state?: string;
    city?: string;
    colony?: string;
    interiorNumber?: string;
}

export interface UpdateCustomerRequest extends Partial<Omit<CreateCustomerRequest, 'password'>> {
    id: string;
    password?: string; // Opcional en actualizaciones
}

export interface CustomersResponse {
    customers: Customer[];
    total: number;
    page: number;
    limit: number;
}

// Nuevos tipos para la respuesta del API
export interface ApiUser {
    id: number;
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
    type: string;
    isEmailVerified: boolean;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    deletedAt: string | null;
}

export interface ApiCustomer {
    id: number;
    user: ApiUser;
    rfc?: string;
    address?: string;
    postalCode?: string;
    state?: string;
    city?: string;
    colony?: string;
    interiorNumber?: string;
    createdAt: string;
    deletedAt: string | null;
}

export interface ApiCustomersResponse {
    success: boolean;
    path: string;
    message: string;
    result?: ApiCustomer[];
}