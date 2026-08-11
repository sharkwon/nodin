import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#00f5d4] focus:ring-offset-2 focus:ring-offset-[#060b14]",
  {
    variants: {
      variant: {
        default: "border-[#00f5d4]/40 bg-[#00f5d4]/15 text-[#00f5d4] hover:bg-[#00f5d4]/25",
        secondary: "border-[#1c2a3f] bg-[#0e1626] text-[#94a3b8] hover:bg-[#131c2e]",
        destructive: "border-[#f87171]/40 bg-[#f87171]/15 text-[#f87171] hover:bg-[#f87171]/25",
        outline: "border-[#00f5d4]/40 bg-transparent text-[#00f5d4] hover:bg-[#00f5d4]/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };