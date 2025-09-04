'use client';

import React from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResizeDividerProps {
  isResizing?: boolean;
  isDesktop?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  className?: string;
}

export const ResizeDivider: React.FC<ResizeDividerProps> = ({
  isResizing = false,
  isDesktop = false,
  onMouseDown,
  onTouchStart,
  className,
}) => {
  // No renderizar en mobile/tablet
  if (!isDesktop) {
    return null;
  }

  return (
    <div
      className={cn(
        // Estilos base del divisor
        'relative flex items-center justify-center',
        'w-1 bg-border hover:bg-primary/60',
        'cursor-col-resize select-none',
        'transition-all duration-200 ease-out',
        // Estados
        {
          'bg-primary/80 w-1.5 shadow-lg shadow-primary/20': isResizing,
          'hover:w-1.5': !isResizing,
        },
        className
      )}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      role="separator"
      aria-label="Redimensionar paneles"
      aria-orientation="vertical"
      tabIndex={0}
    >
      {/* Icono GripVertical centrado */}
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          'opacity-0 hover:opacity-100 transition-opacity duration-200',
          {
            'opacity-100': isResizing,
          }
        )}
      >
        <GripVertical 
          className="h-4 w-4 text-primary" 
          strokeWidth={2}
        />
      </div>
      
      {/* Área de arrastre expandida para mejor UX */}
      <div 
        className="absolute inset-y-0 -left-2 -right-2 cursor-col-resize"
        aria-hidden="true"
      />
    </div>
  );
};

export default ResizeDivider;