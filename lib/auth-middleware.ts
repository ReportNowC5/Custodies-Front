import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';

// Rutas que requieren autenticación
const protectedRoutes = [
  '/gps/dashboard',
  '/gps/users',
  '/gps/vehicles',
  '/gps/tracking',
  '/gps/reports',
  '/gps/settings',
];

// Rutas públicas (no requieren autenticación)
const publicRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot',
  '/auth/reset',
  '/',
];

// Rutas de administrador
const adminRoutes = [
  '/gps/users',
  '/gps/settings',
];

// Rutas de supervisor
const supervisorRoutes = [
  '/gps/reports',
  '/gps/users',
];

// Renombrar la interfaz local para evitar conflictos
interface CustomJWTPayload extends JoseJWTPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export class AuthMiddleware {
  private static readonly JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
  );

  /**
   * Verifica si una ruta está protegida
   */
  static isProtectedRoute(pathname: string): boolean {
    return protectedRoutes.some(route => pathname.startsWith(route));
  }

  /**
   * Verifica si una ruta es pública
   */
  static isPublicRoute(pathname: string): boolean {
    return publicRoutes.some(route => pathname === route || pathname.startsWith(route));
  }

  /**
   * Verifica si el usuario tiene acceso a una ruta específica
   */
  static hasRouteAccess(pathname: string, userRole: string): boolean {
    // Administradores tienen acceso a todo
    if (userRole === 'administrator') {
      return true;
    }

    // Verificar rutas de administrador
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      return userRole === 'administrator';
    }

    // Verificar rutas de supervisor
    if (supervisorRoutes.some(route => pathname.startsWith(route))) {
      return ['administrator', 'supervisor'].includes(userRole);
    }

    // Para otras rutas protegidas, cualquier usuario autenticado puede acceder
    return true;
  }

  /**
   * Verifica y decodifica el JWT token
   */
  static async verifyToken(token: string): Promise<CustomJWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.JWT_SECRET);
      return payload as CustomJWTPayload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  /**
   * Obtiene el token del request
   */
  static getTokenFromRequest(request: NextRequest): string | null {
    // Intentar obtener el token del header Authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Intentar obtener el token de las cookies
    const tokenFromCookie = request.cookies.get('accessToken')?.value;
    if (tokenFromCookie) {
      return tokenFromCookie;
    }

    return null;
  }

  /**
   * Middleware principal de autenticación
   */
  static async authenticate(request: NextRequest): Promise<NextResponse | null> {
    const { pathname } = request.nextUrl;

    // Permitir rutas públicas
    if (this.isPublicRoute(pathname)) {
      return null; // Continuar sin autenticación
    }

    // Verificar si la ruta requiere autenticación
    if (!this.isProtectedRoute(pathname)) {
      return null; // Continuar sin autenticación
    }

    // Obtener el token
    const token = this.getTokenFromRequest(request);
    if (!token) {
      return this.redirectToLogin(request);
    }

    // Verificar el token
    const payload = await this.verifyToken(token);
    if (!payload) {
      return this.redirectToLogin(request);
    }

    // Verificar si el token ha expirado
    if (payload.exp * 1000 < Date.now()) {
      return this.redirectToLogin(request);
    }

    // Verificar permisos de ruta
    if (!this.hasRouteAccess(pathname, payload.role)) {
      return this.redirectToUnauthorized(request);
    }

    // Agregar información del usuario a los headers para uso en la aplicación
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.sub);
    response.headers.set('x-user-email', payload.email);
    response.headers.set('x-user-role', payload.role);

    return response;
  }

  /**
   * Redirige al login
   */
  private static redirectToLogin(request: NextRequest): NextResponse {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  /**
   * Redirige a página de no autorizado
   */
  private static redirectToUnauthorized(request: NextRequest): NextResponse {
    const unauthorizedUrl = new URL('/auth/unauthorized', request.url);
    return NextResponse.redirect(unauthorizedUrl);
  }

  /**
   * Middleware para API routes
   */
  static async authenticateAPI(request: NextRequest): Promise<{
    success: boolean;
    user?: CustomJWTPayload;
    response?: NextResponse;
  }> {
    const token = this.getTokenFromRequest(request);
    
    if (!token) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Token de acceso requerido' },
          { status: 401 }
        ),
      };
    }

    const payload = await this.verifyToken(token);
    if (!payload) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Token inválido o expirado' },
          { status: 401 }
        ),
      };
    }

    // Verificar si el token ha expirado
    if (payload.exp * 1000 < Date.now()) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Token expirado' },
          { status: 401 }
        ),
      };
    }

    return {
      success: true,
      user: payload,
    };
  }

  /**
   * Verifica permisos específicos para API
   */
  static checkAPIPermissions(
    user: CustomJWTPayload,
    requiredRole?: string,
    requiredPermissions?: string[]
  ): boolean {
    // Administradores tienen todos los permisos
    if (user.role === 'administrator') {
      return true;
    }

    // Verificar rol requerido
    if (requiredRole && user.role !== requiredRole) {
      return false;
    }

    // Verificar permisos específicos (implementar según necesidades)
    if (requiredPermissions && requiredPermissions.length > 0) {
      // Aquí se implementaría la lógica de permisos específicos
      // Por ahora, asumimos que supervisores tienen permisos de lectura
      // y operadores tienen permisos limitados
      return true;
    }

    return true;
  }

  /**
   * Genera un response de error de permisos para API
   */
  static forbiddenResponse(message: string = 'No tienes permisos para realizar esta acción'): NextResponse {
    return NextResponse.json(
      { error: message },
      { status: 403 }
    );
  }

  /**
   * Rate limiting básico (implementación simple)
   */
  private static rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  static checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.rateLimitMap.get(identifier);

    if (!record || now > record.resetTime) {
      this.rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (record.count >= maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Limpia registros de rate limiting expirados
   */
  static cleanupRateLimit(): void {
    const now = Date.now();
    for (const [key, record] of this.rateLimitMap.entries()) {
      if (now > record.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }
}

export default AuthMiddleware;