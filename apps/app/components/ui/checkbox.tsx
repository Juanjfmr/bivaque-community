"use client"

import { Checkbox as CheckboxPrimitive } from "radix-ui"
import type * as React from "react"
import { cn } from "@/lib/utils"

// Caixa do bloco Card Style Checkbox, de cnippet-dev no 21st.dev
// (https://21st.dev/@cnippet-dev/components/v-checkbox-4), arquivo auxiliar
// `v-checkbox-4-utils/checkbox`. Trocas: o pacote `radix-ui` do app no lugar de
// `@radix-ui/react-checkbox`, o traço do `Check` do lucide-react em SVG próprio
// (sem texto que vaze para o rótulo) e `ref` como propriedade (React 19) no
// lugar de `forwardRef`.
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-sm border border-(--primary) ring-offset-(--background) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-(--primary) data-[state=checked]:text-(--primary-foreground)",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <svg
          viewBox="0 0 24 24"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
