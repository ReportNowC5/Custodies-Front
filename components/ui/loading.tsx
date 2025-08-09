import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export function Loading({ 
  size = 'md', 
  variant = 'spinner', 
  text, 
  className,
  fullScreen = false 
}: LoadingProps) {
  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3',
      fullScreen && 'min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100',
      className
    )}>
      {variant === 'spinner' && (
        <Loader2 className={cn(
          'animate-spin text-purple-600',
          sizeClasses[size]
        )} />
      )}
      
      {variant === 'dots' && (
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'bg-purple-600 rounded-full animate-pulse',
                size === 'sm' && 'w-2 h-2',
                size === 'md' && 'w-3 h-3',
                size === 'lg' && 'w-4 h-4',
                size === 'xl' && 'w-6 h-6'
              )}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      )}
      
      {variant === 'pulse' && (
        <div className={cn(
          'bg-purple-200 rounded-full animate-pulse',
          sizeClasses[size]
        )} />
      )}
      
      {variant === 'skeleton' && (
        <div className="space-y-3 w-full max-w-sm">
          <div className="h-4 bg-purple-200 rounded animate-pulse" />
          <div className="h-4 bg-purple-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-purple-200 rounded animate-pulse w-1/2" />
        </div>
      )}
      
      {text && (
        <p className={cn(
          'text-gray-600 font-medium',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-base',
          size === 'lg' && 'text-lg',
          size === 'xl' && 'text-xl'
        )}>
          {text}
        </p>
      )}
    </div>
  );

  return content;
}

// Componente de loading para botones
interface ButtonLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ButtonLoading({ size = 'sm', className }: ButtonLoadingProps) {
  return (
    <Loader2 className={cn(
      'animate-spin',
      sizeClasses[size],
      className
    )} />
  );
}

// Componente de loading para tablas
export function TableLoading({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-purple-200 rounded animate-pulse flex-1"
              style={{
                animationDelay: `${(rowIndex * columns + colIndex) * 0.1}s`
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Componente de loading para cards
export function CardLoading({ className }: { className?: string }) {
  return (
    <div className={cn('p-6 space-y-4', className)}>
      <div className="h-6 bg-purple-200 rounded animate-pulse w-3/4" />
      <div className="space-y-2">
        <div className="h-4 bg-purple-200 rounded animate-pulse" />
        <div className="h-4 bg-purple-200 rounded animate-pulse w-5/6" />
        <div className="h-4 bg-purple-200 rounded animate-pulse w-4/6" />
      </div>
      <div className="flex space-x-2">
        <div className="h-8 bg-purple-200 rounded animate-pulse w-20" />
        <div className="h-8 bg-purple-200 rounded animate-pulse w-16" />
      </div>
    </div>
  );
}

// Componente de loading para páginas completas
export function PageLoading({ text = 'Cargando...' }: { text?: string }) {
  return (
    <Loading 
      size="lg" 
      text={text} 
      fullScreen 
      className="p-8"
    />
  );
}

// Componente de loading overlay
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
  className?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  children, 
  text = 'Cargando...', 
  className 
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Loading text={text} size="lg" />
        </div>
      )}
    </div>
  );
}

// Hook para manejar estados de loading
import { useState, useCallback } from 'react';

export function useLoading(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);

  const startLoading = useCallback(() => setIsLoading(true), []);
  const stopLoading = useCallback(() => setIsLoading(false), []);
  const toggleLoading = useCallback(() => setIsLoading(prev => !prev), []);

  const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T> => {
    startLoading();
    try {
      const result = await asyncFn();
      return result;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading,
    startLoading,
    stopLoading,
    toggleLoading,
    withLoading,
  };
}

export default Loading;