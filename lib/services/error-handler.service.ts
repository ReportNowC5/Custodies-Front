import { toast } from 'sonner';

export interface AppError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
  timestamp: Date;
}

export class ErrorHandlerService {
  private static instance: ErrorHandlerService;
  private errorLog: AppError[] = [];
  private maxLogSize = 100;

  private constructor() {}

  static getInstance(): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      ErrorHandlerService.instance = new ErrorHandlerService();
    }
    return ErrorHandlerService.instance;
  }

  /**
   * Maneja errores de la aplicación
   */
  handleError(error: any, context?: string): AppError {
    const appError = this.parseError(error, context);
    this.logError(appError);
    this.showUserFriendlyMessage(appError);
    return appError;
  }

  /**
   * Parsea diferentes tipos de errores
   */
  private parseError(error: any, context?: string): AppError {
    let appError: AppError;

    if (error instanceof Error) {
      appError = {
        code: error.name || 'UNKNOWN_ERROR',
        message: error.message,
        details: { stack: error.stack, context },
        timestamp: new Date(),
      };
    } else if (typeof error === 'object' && error !== null) {
      // Error de API
      if (error.response) {
        const { status, data } = error.response;
        appError = {
          code: data?.code || `HTTP_${status}`,
          message: data?.message || this.getHttpErrorMessage(status),
          details: { ...data, context },
          statusCode: status,
          timestamp: new Date(),
        };
      } else if (error.request) {
        // Error de red
        appError = {
          code: 'NETWORK_ERROR',
          message: 'Error de conexión. Verifica tu conexión a internet.',
          details: { context },
          timestamp: new Date(),
        };
      } else {
        // Otro tipo de error de objeto
        appError = {
          code: error.code || 'OBJECT_ERROR',
          message: error.message || 'Error desconocido',
          details: { ...error, context },
          timestamp: new Date(),
        };
      }
    } else {
      // Error primitivo
      appError = {
        code: 'PRIMITIVE_ERROR',
        message: String(error),
        details: { context },
        timestamp: new Date(),
      };
    }

    return appError;
  }

  /**
   * Obtiene mensaje de error HTTP amigable
   */
  private getHttpErrorMessage(status: number): string {
    const messages: Record<number, string> = {
      400: 'Solicitud inválida. Verifica los datos enviados.',
      401: 'No autorizado. Inicia sesión nuevamente.',
      403: 'No tienes permisos para realizar esta acción.',
      404: 'Recurso no encontrado.',
      408: 'Tiempo de espera agotado. Intenta nuevamente.',
      409: 'Conflicto con el estado actual del recurso.',
      422: 'Datos de entrada inválidos.',
      429: 'Demasiadas solicitudes. Intenta más tarde.',
      500: 'Error interno del servidor.',
      502: 'Servidor no disponible temporalmente.',
      503: 'Servicio no disponible.',
      504: 'Tiempo de espera del servidor agotado.',
    };

    return messages[status] || `Error del servidor (${status})`;
  }

  /**
   * Registra el error en el log
   */
  private logError(error: AppError): void {
    console.error('App Error:', error);
    
    this.errorLog.unshift(error);
    
    // Mantener solo los últimos errores
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // En producción, enviar a servicio de logging
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(error);
    }
  }

  /**
   * Muestra mensaje amigable al usuario
   */
  private showUserFriendlyMessage(error: AppError): void {
    const shouldShowToast = this.shouldShowToast(error);
    
    if (shouldShowToast) {
      const message = this.getUserFriendlyMessage(error);
      
      if (error.statusCode && error.statusCode >= 500) {
        toast.error(message);
      } else if (error.statusCode === 401) {
        toast.warning(message);
      } else {
        toast.error(message);
      }
    }
  }

  /**
   * Determina si se debe mostrar toast
   */
  private shouldShowToast(error: AppError): boolean {
    // No mostrar toast para ciertos errores
    const silentErrors = [
      'VALIDATION_ERROR',
      'FORM_ERROR',
      'CANCELLED_REQUEST',
    ];
    
    return !silentErrors.includes(error.code);
  }

  /**
   * Obtiene mensaje amigable para el usuario
   */
  private getUserFriendlyMessage(error: AppError): string {
    // Mensajes específicos por código de error
    const friendlyMessages: Record<string, string> = {
      NETWORK_ERROR: 'Sin conexión a internet. Verifica tu conexión.',
      TIMEOUT_ERROR: 'La operación tardó demasiado. Intenta nuevamente.',
      VALIDATION_ERROR: 'Por favor, verifica los datos ingresados.',
      UNAUTHORIZED: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
      FORBIDDEN: 'No tienes permisos para realizar esta acción.',
      NOT_FOUND: 'El recurso solicitado no fue encontrado.',
      SERVER_ERROR: 'Error del servidor. Intenta más tarde.',
    };

    return friendlyMessages[error.code] || error.message || 'Ha ocurrido un error inesperado.';
  }

  /**
   * Envía error a servicio de logging (implementar según necesidades)
   */
  private async sendToLoggingService(error: AppError): Promise<void> {
    try {
      // Implementar envío a servicio de logging externo
      // Por ejemplo: Sentry, LogRocket, etc.
      console.log('Sending error to logging service:', error);
    } catch (loggingError) {
      console.error('Failed to send error to logging service:', loggingError);
    }
  }

  /**
   * Obtiene el log de errores
   */
  getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  /**
   * Limpia el log de errores
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Maneja errores de validación de formularios
   */
  handleValidationError(errors: Record<string, string[]>): AppError {
    const firstError = Object.values(errors)[0]?.[0] || 'Error de validación';
    
    const appError: AppError = {
      code: 'VALIDATION_ERROR',
      message: firstError,
      details: errors,
      timestamp: new Date(),
    };

    this.logError(appError);
    return appError;
  }

  /**
   * Maneja errores de autenticación
   */
  handleAuthError(error: any): AppError {
    const appError = this.parseError(error, 'authentication');
    
    // Para errores 401, redirigir al login
    if (appError.statusCode === 401) {
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 2000);
    }

    return appError;
  }

  /**
   * Maneja errores de permisos
   */
  handlePermissionError(action: string): AppError {
    const appError: AppError = {
      code: 'PERMISSION_DENIED',
      message: `No tienes permisos para ${action}`,
      details: { action },
      statusCode: 403,
      timestamp: new Date(),
    };

    this.logError(appError);
    this.showUserFriendlyMessage(appError);
    return appError;
  }

  /**
   * Crea un error personalizado
   */
  createError(code: string, message: string, details?: any): AppError {
    const appError: AppError = {
      code,
      message,
      details,
      timestamp: new Date(),
    };

    this.logError(appError);
    return appError;
  }
}

// Instancia singleton
export const errorHandler = ErrorHandlerService.getInstance();

// Funciones de utilidad
export const handleError = (error: any, context?: string) => 
  errorHandler.handleError(error, context);

export const handleValidationError = (errors: Record<string, string[]>) => 
  errorHandler.handleValidationError(errors);

export const handleAuthError = (error: any) => 
  errorHandler.handleAuthError(error);

export const handlePermissionError = (action: string) => 
  errorHandler.handlePermissionError(action);

export const createError = (code: string, message: string, details?: any) => 
  errorHandler.createError(code, message, details);