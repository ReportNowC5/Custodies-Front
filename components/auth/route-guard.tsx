'use client';

import { useEffect, ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/provider/auth.provider';
import { Loader2 } from 'lucide-react';
import ErrorBlock from '@/components/error-block';
import { useLocaleNavigation } from '@/hooks/use-locale-navigation';

interface RouteGuardProps {
    children: ReactNode;
    requireAuth?: boolean;
    requiredRole?: string | string[];
    requiredPermission?: string;
    redirectTo?: string;
    fallback?: ReactNode;
    showNotFound?: boolean;
}

export function RouteGuard({
    children,
    requireAuth = true,
    requiredRole,
    requiredPermission,
    redirectTo = '/auth/login',
    fallback,
    showNotFound = false,
}: RouteGuardProps) {
    const { user, isLoading, isAuthenticated, hasRole, checkPermission } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { navigateWithLocale, getLocaleUrl } = useLocaleNavigation();
    const [shouldShowNotFound, setShouldShowNotFound] = useState(false);

    useEffect(() => {
        if (isLoading) return;

        // Si se debe mostrar 404 directamente
        if (showNotFound) {
            setShouldShowNotFound(true);
            return;
        }

        // Verificar autenticación
        if (requireAuth && !isAuthenticated) {
            // Guardar la URL actual para redireccionar después del login
            sessionStorage.setItem('redirectAfterLogin', pathname);
            console.log('🔒 User not authenticated, redirecting to login');
            navigateWithLocale(redirectTo);
            return;
        }

        // Verificar rol requerido
        if (requiredRole && !hasRole(requiredRole)) {
            console.log('🚫 User does not have required role, redirecting to unauthorized');
            navigateWithLocale('/auth/unauthorized');
            return;
        }

        // Verificar permiso requerido
        if (requiredPermission && !checkPermission(requiredPermission)) {
            console.log('🚫 User does not have required permission, redirecting to unauthorized');
            navigateWithLocale('/auth/unauthorized');
            return;
        }
    }, [isLoading, isAuthenticated, user, requiredRole, requiredPermission, router, redirectTo, hasRole, checkPermission, requireAuth, pathname, showNotFound]);

    // Mostrar 404 si se especifica
    if (shouldShowNotFound) {
        return <ErrorBlock />;
    }

    // Mostrar loading mientras se verifica
    if (isLoading) {
        return fallback || <LoadingScreen />;
    }

    // No mostrar contenido si no está autenticado y se requiere autenticación
    if (requireAuth && !isAuthenticated) {
        return fallback || <LoadingScreen />;
    }

    // No mostrar contenido si no tiene el rol requerido
    if (requiredRole && !hasRole(requiredRole)) {
        return fallback || <LoadingScreen />;
    }

    // No mostrar contenido si no tiene el permiso requerido
    if (requiredPermission && !checkPermission(requiredPermission)) {
        return fallback || <LoadingScreen />;
    }

    return <>{children}</>;
}

// Componente de loading por defecto
function LoadingScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600">Verificando permisos...</p>
            </div>
        </div>
    );
}

// HOC para proteger páginas
export function withAuth<P extends object>(
    Component: React.ComponentType<P>,
    options?: Omit<RouteGuardProps, 'children'>
) {
    return function AuthenticatedComponent(props: P) {
        return (
            <RouteGuard {...options}>
                <Component {...props} />
            </RouteGuard>
        );
    };
}

// HOC específico para páginas que no existen
export function withNotFound<P extends object>(
    Component: React.ComponentType<P>
) {
    return function NotFoundComponent(props: P) {
        return (
            <RouteGuard requireAuth={false} showNotFound={true}>
                <Component {...props} />
            </RouteGuard>
        );
    };
}

// Componente para mostrar contenido condicionalmente basado en permisos
interface ConditionalRenderProps {
    children: ReactNode;
    condition: 'authenticated' | 'role' | 'permission';
    value?: string | string[];
    fallback?: ReactNode;
}

export function ConditionalRender({
    children,
    condition,
    value,
    fallback = null,
}: ConditionalRenderProps) {
    const { isAuthenticated, hasRole, checkPermission } = useAuth();

    let shouldRender = false;

    switch (condition) {
        case 'authenticated':
            shouldRender = isAuthenticated;
            break;
        case 'role':
            shouldRender = isAuthenticated && value ? hasRole(value) : false;
            break;
        case 'permission':
            shouldRender = isAuthenticated && value ? checkPermission(value as string) : false;
            break;
    }

    return shouldRender ? <>{children}</> : <>{fallback}</>;
}

export default RouteGuard;