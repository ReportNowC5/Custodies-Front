"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/lib/types/auth';
import { authService } from '@/lib/services/auth.service';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    hasRole: (role: string | string[]) => boolean;
    checkPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const currentUser = await authService.getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                console.error('Error initializing auth:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);

    // Escuchar eventos de logout automático
    useEffect(() => {
        const handleAutoLogout = () => {
            console.log('🔄 Logout automático detectado');
            setUser(null);
            setIsLoading(false);
        };

        window.addEventListener('auth:logout', handleAutoLogout);

        return () => {
            window.removeEventListener('auth:logout', handleAutoLogout);
        };
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            setIsLoading(true);
            const response = await authService.login({ email, password });

            if (response.success && response.result) {
                // Guardar token y usuario en localStorage
                //localStorage.setItem('auth_token', response.data.token || 'dummy-token');
                //localStorage.setItem('user', JSON.stringify(response.data.user || { 
                //  id: 1, 
                //  email, 
                //  emailVerified: null,
                //  image: null,
                //  name: email.split('@')[0],
                //  role: 'user',
                //  permissions: ['read', 'write']
                //}));

                const currentUser = await authService.getCurrentUser();
                setUser(currentUser);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const hasRole = (role: string | string[]): boolean => {
        if (!user || !user.role) return false;

        if (Array.isArray(role)) {
            return role.includes(user.role);
        }
        return user.role === role;
    };

    const checkPermission = (permission: string): boolean => {
        //if (!user || !user.permissions) return false;
        //return user.permissions.includes(permission);
        return true;
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user && authService.isAuthenticated(),
        isLoading,
        login,
        logout,
        hasRole,
        checkPermission,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
