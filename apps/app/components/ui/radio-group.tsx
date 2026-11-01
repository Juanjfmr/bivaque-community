"use client"

import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import type * as React from "react"
import { cn } from "@/lib/utils"

// Radio Group de originui no 21st.dev
// (https://21st.dev/@originui/components/radio-group). Trocas: o pacote
// `radix-ui` do app no lugar de `@radix-ui/react-radio-group` e `ref` como
// propriedade (React 19) no lugar de `forwardRef`.
function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn("grid gap-3", className)} {...props} />
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "aspect-square size-4 rounded-full border border-(--input) shadow-sm shadow-black/5 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--ring)/70 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-(--primary) data-[state=checked]:bg-(--primary) data-[state=checked]:text-(--primary-foreground)",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center text-current">
        <svg
          width="6"
          height="6"
          viewBox="0 0 6 6"
          fill="currentcolor"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="3" cy="3" r="3" />
        </svg>
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
