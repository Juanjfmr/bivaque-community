"use client"

import { Alert, CloseButton } from "@heroui/react"
import type { ReactNode } from "react"

type FeedbackVariant = "info" | "success" | "warning" | "danger"

interface FeedbackAlertProps {
  variant: FeedbackVariant
  title?: string
  description?: ReactNode
  actions?: ReactNode
  onClose?: () => void
  className?: string
}

// Token-driven feedback surface wrapping HeroUI v3 Alert. Centralises every
// success/error/warning/info message so future token tweaks land in one file
// (DESIGN_SPEC §3.3). `danger`/`warning` use role="alert" (assertive), while
// `success`/`info` use role="status" (polite) — never mix these for screen
// readers. HeroUI v3 Alert accepts `role` as a normal HTML attr because the
// root is a polymorphic div by default.
const VARIANT_TO_STATUS: Record<FeedbackVariant, "default" | "success" | "warning" | "danger"> = {
  info: "default",
  success: "success",
  warning: "warning",
  danger: "danger",
}

const VARIANT_TO_ROLE: Record<FeedbackVariant, "alert" | "status"> = {
  danger: "alert",
  warning: "alert",
  success: "status",
  info: "status",
}

export function FeedbackAlert({
  variant,
  title,
  description,
  actions,
  onClose,
  className,
}: FeedbackAlertProps) {
  const status = VARIANT_TO_STATUS[variant]
  const role = VARIANT_TO_ROLE[variant]
  const resolvedClassName = className ?? ""
  return (
    <Alert status={status} role={role} className={resolvedClassName}>
      <Alert.Indicator />
      <Alert.Content>
        {title ? <Alert.Title>{title}</Alert.Title> : null}
        {description ? <Alert.Description>{description}</Alert.Description> : null}
      </Alert.Content>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      {onClose ? (
        <CloseButton slot="close" onPress={onClose} aria-label="Fechar aviso">
          <span aria-hidden="true">×</span>
        </CloseButton>
      ) : null}
    </Alert>
  )
}

export default FeedbackAlert
