export type UserType = 'SUPERADMIN' | 'ADMIN' | 'OPERATOR';

export interface CreateUserRequest {
    name: string;
    phone: string;
    email: string;
    password: string;
    type: UserType;
}

export interface UpdateUserRequest {
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
    type?: UserType;
}

export interface UserResponse {
    id: number;
    name: string;
    phone: string;
    email: string;
    type: UserType;
    isEmailVerified?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface UsersListResponse {
    success: boolean;
    path: string;
    message: string;
    error?: string;
    result: UserResponse[];
}

export interface UserDetailResponse {
    success: boolean;
    path: string;
    message: string;
    result: UserResponse;
}