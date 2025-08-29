"use client";
import React from 'react';
import { Signal, SignalHigh, SignalLow, SignalMedium, SignalZero } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GSMSignalIndicatorProps {
  signal: number; // Valor de 0 a 5
  className?: string;
  showValue?: boolean;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'bars' | 'icon' | 'circular' | 'minimal';
  animated?: boolean;
}

// Función para obtener el estado de la señal
const getSignalStatus = (signal: number) => {
  if (signal >= 5) return { text: 'Excelente', color: 'text-green-600', badge: 'bg-green-100 text-green-700' };
  if (signal >= 4) return { text: 'Buena', color: 'text-green-600', badge: 'bg-green-100 text-green-700' };
  if (signal >= 3) return { text: 'Media', color: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' };
  if (signal >= 2) return { text: 'Débil', color: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' };
  if (signal >= 1) return { text: 'Muy débil', color: 'text-red-600', badge: 'bg-red-100 text-red-700' };
  return { text: 'Sin señal', color: 'text-gray-600', badge: 'bg-gray-100 text-gray-700' };
};

// Función para obtener el color de las barras
const getBarColor = (barIndex: number, signal: number, animated: boolean = false) => {
  const isActive = barIndex <= signal;
  const baseClasses = animated ? 'transition-all duration-300 ease-in-out' : '';
  
  if (!isActive) return `bg-gray-300 ${baseClasses}`;
  
  if (signal >= 4) return `bg-green-500 ${baseClasses} ${animated ? 'animate-pulse' : ''}`;
  if (signal >= 3) return `bg-yellow-500 ${baseClasses}`;
  if (signal >= 2) return `bg-orange-500 ${baseClasses}`;
  return `bg-red-500 ${baseClasses}`;
};

// Función para obtener el icono apropiado
const getSignalIcon = (signal: number, className: string = '') => {
  if (signal >= 4) return <SignalHigh className={`text-green-600 ${className}`} />;
  if (signal >= 3) return <SignalMedium className={`text-yellow-600 ${className}`} />;
  if (signal >= 2) return <SignalLow className={`text-orange-600 ${className}`} />;
  if (signal >= 1) return <Signal className={`text-red-600 ${className}`} />;
  return <SignalZero className={`text-gray-600 ${className}`} />;
};

export const GSMSignalIndicator: React.FC<GSMSignalIndicatorProps> = ({
  signal,
  className = '',
  showValue = true,
  showStatus = false,
  size = 'md',
  variant = 'bars',
  animated = false
}) => {
  // Asegurar que el signal esté en el rango correcto
  const normalizedSignal = Math.max(0, Math.min(5, Math.round(signal)));
  const status = getSignalStatus(normalizedSignal);
  
  const sizeClasses = {
    sm: {
      container: 'text-xs',
      bar: 'w-1',
      icon: 'h-3 w-3',
      text: 'text-xs',
      maxHeight: 12
    },
    md: {
      container: 'text-sm',
      bar: 'w-1.5',
      icon: 'h-4 w-4',
      text: 'text-sm',
      maxHeight: 16
    },
    lg: {
      container: 'text-base',
      bar: 'w-2',
      icon: 'h-5 w-5',
      text: 'text-base',
      maxHeight: 20
    }
  };
  
  const sizeClass = sizeClasses[size];
  
  // Renderizado con barras (por defecto)
  if (variant === 'bars') {
    return (
      <div className={`flex items-center gap-2 ${sizeClass.container} ${className}`}>
        {/* Barras de señal */}
        <div className="flex items-end gap-0.5">
          {[1, 2, 3, 4, 5].map((bar) => {
            const height = (bar * sizeClass.maxHeight) / 5 + 4;
            return (
              <div
                key={bar}
                className={`${sizeClass.bar} rounded-sm ${getBarColor(bar, normalizedSignal, animated)}`}
                style={{ height: `${height}px` }}
              ></div>
            );
          })}
        </div>
        
        {/* Información textual */}
        <div className="flex items-center gap-1">
          {showValue && (
            <span className={`font-medium ${status.color}`}>
              {normalizedSignal}/5
            </span>
          )}
          {showStatus && (
            <Badge className={`${status.badge} text-xs px-2 py-0.5`}>
              {status.text}
            </Badge>
          )}
        </div>
      </div>
    );
  }
  
  // Renderizado con icono
  if (variant === 'icon') {
    return (
      <div className={`flex items-center gap-2 ${sizeClass.container} ${className}`}>
        {/* Icono de señal */}
        <div className="flex-shrink-0">
          {getSignalIcon(normalizedSignal, sizeClass.icon)}
        </div>
        
        {/* Información textual */}
        <div className="flex items-center gap-1">
          {showValue && (
            <span className={`font-medium ${status.color}`}>
              {normalizedSignal}/5
            </span>
          )}
          {showStatus && (
            <Badge className={`${status.badge} text-xs px-2 py-0.5`}>
              {status.text}
            </Badge>
          )}
        </div>
      </div>
    );
  }
  
  // Renderizado circular
  if (variant === 'circular') {
    const percentage = (normalizedSignal / 5) * 100;
    const circumference = 2 * Math.PI * 16;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
      <div className={`flex flex-col items-center gap-2 ${sizeClass.container} ${className}`}>
        {/* Círculo de progreso */}
        <div className="relative">
          <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
            {/* Círculo de fondo */}
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="3"
            />
            {/* Círculo de progreso */}
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke={
                normalizedSignal >= 4 ? '#10b981' :
                normalizedSignal >= 3 ? '#f59e0b' :
                normalizedSignal >= 2 ? '#f97316' : '#ef4444'
              }
              strokeWidth="3"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={animated ? 'transition-all duration-500 ease-out' : ''}
            />
          </svg>
          
          {/* Icono central */}
          <div className="absolute inset-0 flex items-center justify-center">
            {getSignalIcon(normalizedSignal, 'h-4 w-4')}
          </div>
        </div>
        
        {/* Información textual */}
        <div className="flex flex-col items-center gap-1">
          {showValue && (
            <span className={`font-medium ${status.color}`}>
              {normalizedSignal}/5
            </span>
          )}
          {showStatus && (
            <Badge className={`${status.badge} text-xs px-2 py-0.5`}>
              {status.text}
            </Badge>
          )}
        </div>
      </div>
    );
  }
  
  // Renderizado minimal
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-1 ${sizeClass.container} ${className}`}>
        {/* Barras pequeñas */}
        <div className="flex items-end gap-px">
          {[1, 2, 3, 4, 5].map((bar) => {
            const height = (bar * 8) / 5 + 2;
            return (
              <div
                key={bar}
                className={`w-0.5 rounded-sm ${getBarColor(bar, normalizedSignal, animated)}`}
                style={{ height: `${height}px` }}
              ></div>
            );
          })}
        </div>
        
        {/* Solo valor numérico */}
        {showValue && (
          <span className={`font-medium ${status.color} text-xs`}>
            {normalizedSignal}
          </span>
        )}
      </div>
    );
  }
  
  return null;
};

export default GSMSignalIndicator;