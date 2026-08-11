"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5d4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#060b14] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#00f5d4] text-[#060b14] hover:bg-[#a5fff0] shadow-[0_0_16px_rgba(0,245,212,0.3)]",
        destructive: "bg-[#f87171] text-[#060b14] hover:bg-[#fca5a5] shadow-[0_0_16px_rgba(248,113,113,0.3)]",
        outline: "border border-[#1c2a3f] bg-[#0e1626] text-[#f1f5f9] hover:bg-[#131c2e]",
        secondary: "border border-[#1c2a3f] bg-[#0e1626] text-[#f1f5f9] hover:bg-[#131c2e]",
        ghost: "bg-transparent hover:bg-[#131c2e] text-[#f1f5f9]",
        link: "text-[#00f5d4] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-8",
        xl: "h-12 rounded-xl px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };