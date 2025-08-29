"use client";
import React from 'react';
import { Battery, BatteryLow, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BatteryIndicatorProps {
  voltage: number;
  className?: string;
  showVoltage?: boolean;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'horizontal' | 'vertical' | 'circular';
}

// Función para calcular porcentaje de batería basado en voltaje
const calculateBatteryPercentage = (voltage: number) => {
  // Rango típico para dispositivos GPS: 3.3V (0%) a 4.2V (100%)
  const minVoltage = 3.3;
  const maxVoltage = 4.2;
  
  if (voltage <= minVoltage) return 0;
  if (voltage >= maxVoltage) return 100;
  
  return Math.round(((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100);
};

// Función para obtener el color basado en el porcentaje
const getBatteryColor = (percentage: number) => {
  if (percentage > 60) return {
    bg: 'bg-green-500',
    text: 'text-green-600',
    badge: 'bg-green-100 text-green-700',
    icon: 'text-green-600'
  };
  if (percentage > 30) return {
    bg: 'bg-yellow-500',
    text: 'text-yellow-600',
    badge: 'bg-yellow-100 text-yellow-700',
    icon: 'text-yellow-600'
  };
  return {
    bg: 'bg-red-500',
    text: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
    icon: 'text-red-600'
  };
};

// Función para obtener el estado de la batería
const getBatteryStatus = (percentage: number) => {
  if (percentage > 80) return 'Excelente';
  if (percentage > 60) return 'Buena';
  if (percentage > 30) return 'Media';
  if (percentage > 15) return 'Baja';
  return 'Crítica';
};

export const BatteryIndicator: React.FC<BatteryIndicatorProps> = ({
  voltage,
  className = '',
  showVoltage = true,
  showPercentage = true,
  size = 'md',
  variant = 'horizontal'
}) => {
  const percentage = calculateBatteryPercentage(voltage);
  const colors = getBatteryColor(percentage);
  const status = getBatteryStatus(percentage);
  
  const sizeClasses = {
    sm: {
      container: 'text-xs',
      bar: 'h-1.5',
      width: 'w-12',
      icon: 'h-3 w-3',
      text: 'text-xs'
    },
    md: {
      container: 'text-sm',
      bar: 'h-2',
      width: 'w-16',
      icon: 'h-4 w-4',
      text: 'text-sm'
    },
    lg: {
      container: 'text-base',
      bar: 'h-3',
      width: 'w-20',
      icon: 'h-5 w-5',
      text: 'text-base'
    }
  };
  
  const sizeClass = sizeClasses[size];
  
  // Renderizado horizontal (por defecto)
  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-2 ${sizeClass.container} ${className}`}>
        {/* Icono de batería */}
        <div className={`${colors.icon} flex-shrink-0`}>
          {percentage <= 15 ? (
            <BatteryLow className={sizeClass.icon} />
          ) : percentage >= 95 ? (
            <Zap className={sizeClass.icon} />
          ) : (
            <Battery className={sizeClass.icon} />
          )}
        </div>
        
        {/* Barra de progreso */}
        <div className={`${sizeClass.width} ${sizeClass.bar} bg-gray-200 rounded-full overflow-hidden flex-shrink-0`}>
          <div 
            className={`${sizeClass.bar} ${colors.bg} transition-all duration-500 ease-out`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        
        {/* Información textual */}
        <div className="flex items-center gap-1 min-w-0">
          {showPercentage && (
            <span className={`font-medium ${colors.text} flex-shrink-0`}>
              {percentage}%
            </span>
          )}
          {showVoltage && (
            <span className={`font-mono ${sizeClass.text} text-gray-600 flex-shrink-0`}>
              {voltage}V
            </span>
          )}
        </div>
      </div>
    );
  }
  
  // Renderizado vertical
  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center gap-2 ${sizeClass.container} ${className}`}>
        {/* Icono de batería */}
        <div className={colors.icon}>
          {percentage <= 15 ? (
            <BatteryLow className={sizeClass.icon} />
          ) : percentage >= 95 ? (
            <Zap className={sizeClass.icon} />
          ) : (
            <Battery className={sizeClass.icon} />
          )}
        </div>
        
        {/* Barra de progreso vertical */}
        <div className={`w-2 h-16 bg-gray-200 rounded-full overflow-hidden relative`}>
          <div 
            className={`absolute bottom-0 w-full ${colors.bg} transition-all duration-500 ease-out rounded-full`}
            style={{ height: `${percentage}%` }}
          ></div>
        </div>
        
        {/* Información textual */}
        <div className="flex flex-col items-center gap-1">
          {showPercentage && (
            <span className={`font-medium ${colors.text}`}>
              {percentage}%
            </span>
          )}
          {showVoltage && (
            <span className={`font-mono ${sizeClass.text} text-gray-600`}>
              {voltage}V
            </span>
          )}
        </div>
      </div>
    );
  }
  
  // Renderizado circular
  if (variant === 'circular') {
    const circumference = 2 * Math.PI * 16; // radio de 16
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
              stroke={percentage > 60 ? '#10b981' : percentage > 30 ? '#f59e0b' : '#ef4444'}
              strokeWidth="3"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          
          {/* Icono central */}
          <div className={`absolute inset-0 flex items-center justify-center ${colors.icon}`}>
            {percentage <= 15 ? (
              <BatteryLow className="h-4 w-4" />
            ) : percentage >= 95 ? (
              <Zap className="h-4 w-4" />
            ) : (
              <Battery className="h-4 w-4" />
            )}
          </div>
        </div>
        
        {/* Información textual */}
        <div className="flex flex-col items-center gap-1">
          {showPercentage && (
            <span className={`font-medium ${colors.text}`}>
              {percentage}%
            </span>
          )}
          {showVoltage && (
            <span className={`font-mono ${sizeClass.text} text-gray-600`}>
              {voltage}V
            </span>
          )}
          <Badge className={`${colors.badge} text-xs px-2 py-0.5`}>
            {status}
          </Badge>
        </div>
      </div>
    );
  }
  
  return null;
};

export default BatteryIndicator;