import { NextRequest, NextResponse } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { AuthMiddleware } from "./lib/auth-middleware";

// Solo soportar inglés y español
const locales = ["en", "es"];
const defaultLocale = "es";

function getLocale(request: NextRequest) {
    const acceptedLanguage = request.headers.get("accept-language") ?? undefined;
    const headers = { "accept-language": acceptedLanguage };
    const languages = new Negotiator({ headers }).languages();
    return match(languages, locales, defaultLocale);
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Excluir rutas de NextAuth.js del middleware de internacionalización
    if (pathname.startsWith('/api/auth/')) {
        return NextResponse.next();
    }

    // Excluir assets estáticos (imágenes, archivos, etc.)
    if (pathname.startsWith('/images/') || 
        pathname.startsWith('/files/') || 
        pathname.startsWith('/icons/') || 
        pathname.startsWith('/assets/') ||
        pathname.includes('.')) {
        return NextResponse.next();
    }

    // Verificar autenticación primero para rutas protegidas
    const authResponse = await AuthMiddleware.authenticate(request);
    if (authResponse) {
        return authResponse;
    }

    // Check if there is any supported locale in the pathname
    const pathnameHasLocale = locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    // Redirect if there is no locale
    if (!pathnameHasLocale) {
        const locale = getLocale(request);
        request.nextUrl.pathname = `/${locale}${pathname}`;
        // e.g. incoming request is /products
        // The new URL is now /es/products
        return NextResponse.redirect(request.nextUrl);
    }

    // Rate limiting para API routes
    if (pathname.startsWith('/api/')) {
        const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
        if (!AuthMiddleware.checkRateLimit(clientIP, 100, 60000)) {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
                { status: 429 }
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Skip all internal paths (_next), static assets, and auth API routes
        "/((?!_next|api/auth|images|files|icons|assets|favicon.ico|sitemap.xml|robots.txt|.*\\.).*)",
        // Include other API routes for rate limiting but exclude auth
        "/api/((?!auth).*)/:path*",
    ],
};
