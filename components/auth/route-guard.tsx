'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredRole?: string | string[];
  requiredPermission?: string;
  redirectTo?: string;
  fallback?: ReactNode;
}

export function RouteGuard({
  children,
  requireAuth = true,
  requiredRole,
  requiredPermission,
  redirectTo = '/auth/login',
  fallback,
}: RouteGuardProps) {
  const { user, isLoading, isAuthenticated, hasRole, checkPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Verificar autenticación
    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // Verificar rol requerido
    if (requiredRole && !hasRole(requiredRole)) {
      router.push('/auth/unauthorized');
      return;
    }

    // Verificar permiso requerido
    if (requiredPermission && !checkPermission(requiredPermission)) {
      router.push('/auth/unauthorized');
      return;
    }
  }, [isLoading, isAuthenticated, user, requiredRole, requiredPermission, router, redirectTo, hasRole, checkPermission, requireAuth]);

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

// Componente específico para administradores
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ConditionalRender condition="role" value="administrator" fallback={fallback}>
      {children}
    </ConditionalRender>
  );
}

// Componente específico para supervisores y administradores
export function SupervisorOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ConditionalRender condition="role" value={['administrator', 'supervisor']} fallback={fallback}>
      {children}
    </ConditionalRender>
  );
}

export default RouteGuard;