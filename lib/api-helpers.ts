import { NextResponse } from 'next/server';
import { GenericResponse } from '@/lib/types/auth';

/**
 * Crea una respuesta exitosa estandarizada
 */
export function createSuccessResponse<T>(
  message: string = 'Operación exitosa',
  path?: string,
  success: boolean = true,
  error?: string,   
  result?: T[]
): NextResponse {
  const response: GenericResponse<T> = {
    success,
    message,
    result,
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
  path?: string,
  success: boolean = false
): NextResponse {
  const response: GenericResponse<T> = {
    success,
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
  message: string = 'Recurso creado exitosamente',
  path?: string,
  success: boolean = true,
  error?: string,
  result?: T[]
): NextResponse {
  const response: GenericResponse<T> = {
    success,
    message,
    result,
    ...(path && { path })
  };
  
  return NextResponse.json(response, { status: 201 });
}

/**
 * Crea una respuesta de no encontrado
 */
export function createNotFoundResponse(
  message: string = 'Recurso no encontrado',
  path?: string,
  success: boolean = false,
  error?: string,
): NextResponse {
  return createErrorResponse(message, 404, 'NOT_FOUND', path, success);
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