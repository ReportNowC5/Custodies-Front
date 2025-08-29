import { NextRequest, NextResponse } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const locales = ["en", "es"];
const defaultLocale = "es";

function getLocale(request: NextRequest): string {
    const acceptedLanguage = request.headers.get("accept-language") ?? undefined;
    const headers = { "accept-language": acceptedLanguage };
    const languages = new Negotiator({ headers }).languages();
    try {
        return match(languages, locales, defaultLocale);
    } catch (e) {
        return defaultLocale;
    }
}

const protectedRoutes = [
    '/dashboard',
    '/projects',
    '/tasks',
    '/boards',
    '/calendars',
    '/email',
    '/gps',
    '/utility',
    '/customers'  // Agregar esta línea
];

const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify',
    '/auth/unauthorized',
    '/error-page'
];

function isProtectedRoute(pathname: string): boolean {
    return protectedRoutes.some(route => pathname.startsWith(route));
}

function isPublicRoute(pathname: string): boolean {
    return publicRoutes.some(route => pathname.startsWith(route));
}

function isAuthenticated(request: NextRequest): boolean {
    // Verificar token en cookies
    const cookieToken = request.cookies.get('auth_token')?.value;
    
    // También verificar en headers Authorization (para requests con token)
    const authHeader = request.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const token = cookieToken || headerToken;

    if (!token) {
        return false;
    }

    // Validación más estricta del token
    try {
        // Verificar que el token no esté vacío y tenga un formato mínimo válido
        if (token.length < 10) {
            return false;
        }
        
        // Verificar que no sea un token obviamente inválido
        if (token === 'null' || token === 'undefined' || token === '') {
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error validating token:', error);
        return false;
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isAuth = isAuthenticated(request);

    // Si ya tiene locale, manejar lógica de autenticación
    const pathnameHasLocale = locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    if (pathnameHasLocale) {
        const locale = pathname.split('/')[1];
        const routeWithoutLocale = '/' + pathname.split('/').slice(2).join('/');

        // Si está autenticado y accede a rutas públicas, redirigir al dashboard
        if (isPublicRoute(routeWithoutLocale) && isAuth) {
            return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
        }

        // Si no está autenticado y accede a rutas protegidas, redirigir al login
        if (isProtectedRoute(routeWithoutLocale) && !isAuth) {
            return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
        }

        return NextResponse.next();
    }

    // Para rutas sin locale, añadir locale y manejar autenticación
    const locale = getLocale(request);

    // Si está autenticado y accede a rutas públicas, redirigir al dashboard con locale
    if (isPublicRoute(pathname) && isAuth) {
        return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }

    // Si no está autenticado y accede a rutas protegidas, redirigir al login con locale
    if (isProtectedRoute(pathname) && !isAuth) {
        return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
    }

    // Añadir locale a la ruta
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
}

export const config = {
    matcher: [
        "/((?!_next|api|images|files|icons|assets|favicon.ico|sitemap.xml|robots.txt|.*\\.).*)",
    ],
};
