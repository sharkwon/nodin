"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#0e1626] group-[.toaster]:text-[#f1f5f9] group-[.toaster]:border-[#1c2a3f] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[#64748b]",
          actionButton:
            "group-[.toast]:bg-[#00f5d4] group-[.toast]:text-[#060b14]",
          cancelButton:
            "group-[.toast]:bg-[#131c2e] group-[.toast]:text-[#94a3b8]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }