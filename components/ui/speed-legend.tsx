"use client";
import React from 'react';
import { Card } from '@/components/ui/card';

interface SpeedLegendProps {
    className?: string;
    compact?: boolean;
}

// Función para obtener color de velocidad (sincronizada con device-map.tsx)
const getSpeedColor = (speed: number): string => {
    if (speed === 0) return '#374151'; // Gris oscuro para detenido
    if (speed <= 40) return '#10B981'; // Verde para velocidad baja (1-40)
    if (speed <= 79) return '#F59E0B'; // Naranja para velocidad media (41-79)
    return '#EF4444'; // Rojo para velocidad alta (80+)
};

// Rangos de velocidad para la leyenda
const speedRanges = [
    { min: 0, max: 0, label: 'Detenido', color: getSpeedColor(0) },
    { min: 1, max: 40, label: '1-40 km/h', color: getSpeedColor(20) },
    { min: 41, max: 79, label: '41-79 km/h', color: getSpeedColor(60) },
    { min: 80, max: 999, label: '80+ km/h', color: getSpeedColor(100) }
];

export const SpeedLegend: React.FC<SpeedLegendProps> = ({ 
    className = '', 
    compact = false 
}) => {
    if (compact) {
        return (
            <div className={`flex items-center gap-2 text-xs ${className}`}>
                <span className="font-medium text-muted-foreground">Velocidad:</span>
                <div className="flex items-center gap-1">
                    {speedRanges.map((range, index) => (
                        <div key={index} className="flex items-center gap-1">
                            <div 
                                className="w-3 h-3 rounded-full border border-border/30 shadow-sm ring-1 ring-black/5"
                                style={{ 
                                    backgroundColor: range.color,
                                    boxShadow: `0 2px 4px ${range.color}20, inset 0 1px 0 rgba(255,255,255,0.2)`
                                }}
                            />
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                                {range.min === 0 ? '0' : `${range.min}${range.max === 999 ? '+' : `-${range.max}`}`}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <Card className={`p-4 ${className}`}>
            <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-500 to-red-500"></div>
                    Leyenda de Velocidad
                </h4>
                
                <div className="space-y-2">
                    {speedRanges.map((range, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <div 
                                className="w-4 h-4 rounded-full border border-border/30 flex-shrink-0 shadow-md ring-1 ring-black/5"
                                style={{ 
                                    backgroundColor: range.color,
                                    boxShadow: `0 3px 6px ${range.color}25, inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1)`
                                }}
                            />
                            <div className="flex-1">
                                <div className="text-sm font-medium text-foreground">
                                    {range.label}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {range.min === 0 
                                        ? 'Vehículo detenido' 
                                        : range.max === 999 
                                            ? 'Velocidad alta' 
                                            : 'Velocidad normal'
                                    }
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                        Los colores indican la velocidad del vehículo en cada punto de la ruta.
                    </p>
                </div>
            </div>
        </Card>
    );
};

export default SpeedLegend;