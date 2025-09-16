"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTheme } from "next-themes";

interface DatePickerWithRangeProps {
  className?: string;
  onDateChange?: (date: any) => void;
  defaultValue?: any;
}

const DatePickerWithRange = React.memo(({ className, onDateChange, defaultValue }: DatePickerWithRangeProps) => {
  const [date, setDate] = React.useState<any | null>(defaultValue || null);
  const { theme: mode } = useTheme();

  // Memoizar el handler de cambio de fecha para evitar re-renders
  const handleDateChange = React.useCallback((newDate: any) => {
    setDate(newDate);
    onDateChange?.(newDate);
  }, [onDateChange]);

  // Memoizar el texto del botón para evitar re-renders innecesarios
  const buttonText = React.useMemo(() => {
    if (date?.from) {
      if (date.to) {
        return `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}`;
      }
      return format(date.from, "LLL dd, y");
    }
    return "Pick a date";
  }, [date]);

  // Memoizar las clases del botón
  const buttonClasses = React.useMemo(() => {
    return cn(" font-normal", {
      " bg-white text-default-600": mode !== "dark",
    });
  }, [mode]);

  return (
    <div className={cn("grid gap-2", className)} key="date-picker-wrapper">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            color={mode === "dark" ? "secondary" : "default"}
            className={buttonClasses}
          >
            <CalendarIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            <span>{buttonText}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
});

DatePickerWithRange.displayName = "DatePickerWithRange";

export default DatePickerWithRange;
