import { useState, useEffect, useCallback, useRef } from 'react';

// Constantes de límites según especificaciones del plan
const MIN_PANEL_WIDTH = 45; // 20% mínimo para panel izquierdo
const MAX_PANEL_WIDTH = 70; // 70% máximo para panel izquierdo
const DEFAULT_PANEL_WIDTH = 45; // 45% por defecto
const DESKTOP_BREAKPOINT = 1024; // lg breakpoint de Tailwind

interface UseResizableLayoutReturn {
  panelWidth: number;
  isResizing: boolean;
  isDesktop: boolean;
  handleResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
  handleResizeEnd: () => void;
  setPanelWidth: (width: number) => void;
  validatePanelWidth: (width: number) => number;
}

export const useResizableLayout = (): UseResizableLayoutReturn => {
  const [panelWidth, setPanelWidthState] = useState<number>(DEFAULT_PANEL_WIDTH);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(DEFAULT_PANEL_WIDTH);

  // Función de validación de límites
  const validatePanelWidth = useCallback((width: number): number => {
    return Math.min(Math.max(width, MIN_PANEL_WIDTH), MAX_PANEL_WIDTH);
  }, []);

  // Función para establecer el ancho del panel con validación
  const setPanelWidth = useCallback((width: number) => {
    const validatedWidth = validatePanelWidth(width);
    setPanelWidthState(validatedWidth);
  }, [validatePanelWidth]);

  // Detección de breakpoint desktop
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    };

    // Verificar al montar
    checkIsDesktop();

    // Agregar listener para cambios de tamaño
    window.addEventListener('resize', checkIsDesktop);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsDesktop);
    };
  }, []);

  // Función para calcular el nuevo ancho basado en la posición del mouse/touch
  const calculateNewWidth = useCallback((clientX: number): number => {
    if (typeof window === 'undefined') return DEFAULT_PANEL_WIDTH;
    
    const containerWidth = window.innerWidth;
    const deltaX = clientX - startXRef.current;
    const deltaPercent = (deltaX / containerWidth) * 100;
    const newWidth = startWidthRef.current + deltaPercent;
    
    return validatePanelWidth(newWidth);
  }, [validatePanelWidth]);

  // Event handlers para mouse
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !isDesktop) return;
    
    e.preventDefault();
    const newWidth = calculateNewWidth(e.clientX);
    setPanelWidthState(newWidth);
  }, [isResizing, isDesktop, calculateNewWidth]);

  const handleMouseUp = useCallback(() => {
    if (!isResizing) return;
    
    setIsResizing(false);
    document.body.classList.remove('resizing');
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Aquí se podría agregar persistencia en localStorage en el futuro
  }, [isResizing, handleMouseMove]);

  // Event handlers para touch
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isResizing || !isDesktop || e.touches.length === 0) return;
    
    e.preventDefault();
    const newWidth = calculateNewWidth(e.touches[0].clientX);
    setPanelWidthState(newWidth);
  }, [isResizing, isDesktop, calculateNewWidth]);

  const handleTouchEnd = useCallback(() => {
    if (!isResizing) return;
    
    setIsResizing(false);
    document.body.classList.remove('resizing');
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    
    // Aquí se podría agregar persistencia en localStorage en el futuro
  }, [isResizing, handleTouchMove]);

  // Función para iniciar redimensionamiento
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDesktop) return;
    
    e.preventDefault();
    setIsResizing(true);
    document.body.classList.add('resizing');
    
    // Determinar si es mouse o touch event
    const clientX = 'clientX' in e ? e.clientX : e.touches[0]?.clientX;
    if (clientX === undefined) return;
    
    startXRef.current = clientX;
    startWidthRef.current = panelWidth;
    
    // Agregar event listeners
    if ('clientX' in e) {
      // Mouse event
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      // Touch event
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }
  }, [isDesktop, panelWidth, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Función para finalizar redimensionamiento (para uso externo si es necesario)
  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    }
  }, [isResizing, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Cleanup effect para event listeners
  useEffect(() => {
    return () => {
      // Cleanup en caso de unmount durante resize
      document.body.classList.remove('resizing');
      // Remover todos los event listeners posibles sin depender de las funciones específicas
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []); // Dependencias vacías para evitar bucle infinito

  return {
    panelWidth,
    isResizing,
    isDesktop,
    handleResizeStart,
    handleResizeEnd,
    setPanelWidth,
    validatePanelWidth,
  };
};

export default useResizableLayout;