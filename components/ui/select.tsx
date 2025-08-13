import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const selectVariants = cva(
    "w-full px-3 h-10 text-sm flex [&>svg]:h-5 [&>svg]:w-5 justify-between items-center read-only:bg-background disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 hover:border-opacity-80 focus-within:ring-2 focus-within:ring-offset-2",
    {
        variants: {
            color: {
                default:
                    "border-default-300 text-default-500 focus:outline-none focus:border-default-500/50 focus-within:ring-default-500/20 hover:border-default-400 disabled:bg-default-200 placeholder:text-accent-foreground/50 [&>svg]:stroke-default-600 hover:[&>svg]:stroke-default-700",
                primary:
                    "border-primary text-primary focus:outline-none focus:border-primary-700 focus-within:ring-primary/20 hover:border-primary-600 disabled:bg-primary/30 disabled:placeholder:text-primary placeholder:text-primary/70 [&>svg]:stroke-primary hover:[&>svg]:stroke-primary-700",
                info: "border-info/50 text-info focus:outline-none focus:border-info-700 focus-within:ring-info/20 hover:border-info-600 disabled:bg-info/30 disabled:placeholder:text-info placeholder:text-info/70 hover:[&>svg]:stroke-info-700",
                warning:
                    "border-warning/50 text-warning focus:outline-none focus:border-warning-700 focus-within:ring-warning/20 hover:border-warning-600 disabled:bg-warning/30 disabled:placeholder:text-info placeholder:text-warning/70 hover:[&>svg]:stroke-warning-700",
                success:
                    "border-success/50 text-success focus:outline-none focus:border-success-700 focus-within:ring-success/20 hover:border-success-600 disabled:bg-success/30 disabled:placeholder:text-info placeholder:text-success/70 hover:[&>svg]:stroke-success-700",
                destructive:
                    "border-destructive/50 text-destructive focus:outline-none focus:border-destructive-700 focus-within:ring-destructive/20 hover:border-destructive-600 disabled:bg-destructive/30 disabled:placeholder:text-destructive placeholder:text-destructive/70 hover:[&>svg]:stroke-destructive-700",
            },
            variant: {
                flat: "read-only:bg-default-500/10 hover:bg-default-500/5",
                underline: "border-b hover:border-b-2",
                bordered: "border hover:shadow-sm",
                faded: "border border-default-300 read-only:bg-default-100 hover:bg-default-50",
                ghost: "border-0 focus:border hover:bg-default-100/50",
                "flat-underline": "read-only:bg-default-100 border-b hover:border-b-2 hover:bg-default-50",
            },
            shadow: {
                none: "shadow-none",
                xs: "shadow-sm hover:shadow",
                sm: "shadow hover:shadow-md",
                md: "shadow-md hover:shadow-lg",
                lg: "shadow-lg hover:shadow-xl",
                xl: "shadow-xl hover:shadow-2xl",
                "2xl": "shadow-2xl hover:shadow-2xl",
            },
            radius: {
                none: "rounded-none",
                sm: "rounded",
                md: "rounded-lg",
                lg: "rounded-xl",
                xl: "rounded-[20px]",
            },
            size: {
                sm: "h-8 text-xs px-2",
                md: "h-9 text-xs px-3",
                lg: "h-10 text-sm px-3",
                xl: "h-12 text-base px-4",
            },
        },
        compoundVariants: [
            {
                variant: "flat",
                color: "primary",
                className: "read-only:bg-primary/10 hover:bg-primary/5",
            },
            {
                variant: "flat",
                color: "info",
                className: "read-only:bg-info/10 hover:bg-info/5",
            },
            {
                variant: "flat",
                color: "warning",
                className: "read-only:bg-warning/10 hover:bg-warning/5",
            },
            {
                variant: "flat",
                color: "success",
                className: "read-only:bg-success/10 hover:bg-success/5",
            },
            {
                variant: "flat",
                color: "destructive",
                className: "read-only:bg-destructive/10 hover:bg-destructive/5",
            },
            {
                variant: "faded",
                color: "primary",
                className: "read-only:bg-primary/10 border-primary/30 hover:bg-primary/5 hover:border-primary/50",
            },
            {
                variant: "faded",
                color: "info",
                className: "read-only:bg-info/10 border-info/30 hover:bg-info/5 hover:border-info/50",
            },
            {
                variant: "faded",
                color: "warning",
                className: "read-only:bg-warning/10 border-warning/30 hover:bg-warning/5 hover:border-warning/50",
            },
            {
                variant: "faded",
                color: "success",
                className: "read-only:bg-success/10 border-success/30 hover:bg-success/5 hover:border-success/50",
            },
            {
                variant: "faded",
                color: "destructive",
                className: "read-only:bg-destructive/10 border-destructive/30 hover:bg-destructive/5 hover:border-destructive/50",
            },
        ],
        defaultVariants: {
            color: "default",
            size: "lg",
            variant: "bordered",
            radius: "md",
        },
    }
);

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

interface SelectTriggerProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>,
    VariantProps<typeof selectVariants> {
    icon?: React.ReactNode
    color?: 'default' | 'primary' | 'info' | 'warning' | 'success' | 'destructive'
}

const SelectTrigger = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Trigger>,
    SelectTriggerProps
>(
    (
        {
            className,
            children,
            color,
            size,
            radius,
            variant,
            icon = <ChevronDown />,
            ...props
        },
        ref
    ) => (
        <SelectPrimitive.Trigger
            ref={ref}
            className={cn(
                selectVariants({ color, size, radius, variant }),
                "group", // Añadido para mejor control de hover
                className
            )}
            {...props}
        >
            {children}
            <SelectPrimitive.Icon asChild>
                <span className="transition-transform duration-200 group-hover:scale-110 group-data-[state=open]:rotate-180">
                    {icon}
                </span>
            </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
    )
);
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(
  ({ className, children, position = "popper", ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-[9999] min-w-[8rem] max-h-[300px] overflow-visible rounded-md border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.Viewport
          className={cn(
            "p-1 overflow-y-auto max-h-[280px]",
            position === "popper" &&
            "w-full min-w-[var(--radix-select-trigger-width)]"
          )}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f1f5f9'
          }}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
);
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Label>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
    <SelectPrimitive.Label
        ref={ref}
        className={cn("py-1.5 ltr:pl-8 rtl:pr-8 ltr:pr-2 rtl:pl-2 text-sm font-semibold text-muted-foreground", className)}
        {...props}
    />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(
    ({ className, children, ...props }, ref) => (
        <SelectPrimitive.Item
            ref={ref}
            className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground",
                className
            )}
            {...props}
        >
            <span className="absolute ltr:right-2 rtl:left-2 flex h-3.5 w-3.5 items-center justify-center">
                <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4" />
                </SelectPrimitive.ItemIndicator>
            </span>

            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    )
);
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Separator>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
    <SelectPrimitive.Separator
        ref={ref}
        className={cn("-mx-1 my-1 h-px bg-muted", className)}
        {...props}
    />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
    Select,
    SelectGroup,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectLabel,
    SelectItem,
    SelectSeparator,
};
