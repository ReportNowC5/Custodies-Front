'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Hook personalizado para manejar navegación con locale
 * Centraliza la lógica de routing con locale para evitar rutas hardcodeadas
 */
export const useLocaleNavigation = () => {
    const router = useRouter();
    const params = useParams();
    
    // Obtener el locale actual de los parámetros de la URL
    const currentLocale = (params?.lang as string) || 'es';
    
    /**
     * Navegar a una ruta con el locale actual
     * @param path - Ruta sin locale (ej: '/dashboard', '/auth/login')
     */
    const navigateWithLocale = useCallback((path: string) => {
        // Asegurar que la ruta comience con /
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const fullPath = `/${currentLocale}${cleanPath}`;
        
        console.log(`🧭 Navigating to: ${fullPath}`);
        router.push(fullPath);
    }, [router, currentLocale]);
    
    /**
     * Reemplazar la ruta actual con una nueva ruta con locale
     * @param path - Ruta sin locale
     */
    const replaceWithLocale = useCallback((path: string) => {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const fullPath = `/${currentLocale}${cleanPath}`;
        
        console.log(`🔄 Replacing route to: ${fullPath}`);
        router.replace(fullPath);
    }, [router, currentLocale]);
    
    /**
     * Obtener una URL completa con locale
     * @param path - Ruta sin locale
     * @returns URL completa con locale
     */
    const getLocaleUrl = useCallback((path: string) => {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `/${currentLocale}${cleanPath}`;
    }, [currentLocale]);
    
    /**
     * Redirigir después del login con manejo de URL guardada
     */
    const redirectAfterLogin = useCallback(() => {
        // Obtener URL de redirección guardada o usar dashboard por defecto
        const savedRedirectUrl = sessionStorage.getItem('redirectAfterLogin');
        let redirectPath = '/dashboard';
        
        if (savedRedirectUrl) {
            // Si la URL guardada ya tiene locale, extraer solo la parte sin locale
            if (savedRedirectUrl.startsWith(`/${currentLocale}/`)) {
                redirectPath = savedRedirectUrl.substring(`/${currentLocale}`.length);
            } else if (savedRedirectUrl.startsWith('/')) {
                redirectPath = savedRedirectUrl;
            }
            
            // Limpiar la URL guardada
            sessionStorage.removeItem('redirectAfterLogin');
        }
        
        navigateWithLocale(redirectPath);
    }, [navigateWithLocale, currentLocale]);
    
    return {
        currentLocale,
        navigateWithLocale,
        replaceWithLocale,
        getLocaleUrl,
        redirectAfterLogin
    };
};

export default useLocaleNavigation;