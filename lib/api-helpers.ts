import { NextResponse } from 'next/server';
import { GenericResponse } from '@/lib/types/auth';

/**
 * Crea una respuesta exitosa estandarizada
 */
export function createSuccessResponse<T>(
  data: T[],
  message: string = 'Operación exitosa',
  path?: string
): NextResponse {
  const response: GenericResponse<T> = {
    success: true,
    message,
    result: data,
    ...(path && { path })
  };
  
  return NextResponse.json(response, { status: 200 });
}

/**
 * Crea una respuesta de error estandarizada
 */
export function createErrorResponse<T = any>(
  message: string,
  statusCode: number = 500,
  error?: string,
  path?: string
): NextResponse {
  const response: GenericResponse<T> = {
    success: false,
    message,
    result: [],
    ...(error && { error }),
    ...(path && { path })
  };
  
  return NextResponse.json(response, { status: statusCode });
}

/**
 * Crea una respuesta de creación exitosa
 */
export function createCreatedResponse<T>(
  data: T,
  message: string = 'Recurso creado exitosamente',
  path?: string
): NextResponse {
  const response: GenericResponse<T> = {
    success: true,
    message,
    result: [data], // Convertir a array según la interfaz
    ...(path && { path })
  };
  
  return NextResponse.json(response, { status: 201 });
}

/**
 * Crea una respuesta de no encontrado
 */
export function createNotFoundResponse(
  message: string = 'Recurso no encontrado',
  path?: string
): NextResponse {
  return createErrorResponse(message, 404, 'NOT_FOUND', path);
}

/**
 * Maneja errores de manera consistente
 */
export function handleApiError(
  error: any,
  path?: string,
  customMessage?: string
): NextResponse {
  console.error('API Error:', error);
  
  const message = customMessage || 'Error interno del servidor';
  const errorDetails = error instanceof Error ? error.message : String(error);
  
  return createErrorResponse(message, 500, errorDetails, path);
}