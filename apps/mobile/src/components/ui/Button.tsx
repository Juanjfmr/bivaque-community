// apps/mobile/src/components/ui/Button.tsx
// Botão nativo do Bivaque. Não é um wrapper de componente web: React Native
// não tem :hover nem :focus-visible, então os estados que existem aqui são
// default, pressionado e desabilitado — os três que o dedo produz.
//
// Cores, raio e espaço vêm de src/theme.ts, que deriva de @bivaque/tokens.
// Nenhum valor de cor é escrito neste arquivo (DESIGN_SYSTEM §5).
import type { ReactNode } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { theme } from "../../theme"

// 44pt é o alvo mínimo de toque das duas plataformas; o sistema já usa
// 2.75rem em `semantic.control-min-height`.
export const MIN_TOUCH_TARGET = 44

export type ButtonVariant = "primary" | "secondary"

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  disabled?: boolean
  loading?: boolean
  loadingLabel?: string
  accessibilityHint?: string
  icon?: ReactNode
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  loadingLabel,
  accessibilityHint,
  icon,
}: ButtonProps) {
  const isBlocked = disabled || loading
  const shown = loading && loadingLabel ? loadingLabel : label

  return (
    <Pressable
      onPress={onPress}
      disabled={isBlocked}
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked, busy: loading }}
      accessibilityLabel={shown}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" ? styles.primary : styles.secondary,
        pressed && !isBlocked && (variant === "primary" ? styles.primaryPressed : styles.pressed),
        disabled && (variant === "primary" ? styles.primaryDisabled : styles.secondaryDisabled),
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === "primary" ? theme.color.accentForeground : theme.color.accent}
          />
        ) : (
          icon
        )}
        <Text
          style={[
            styles.label,
            variant === "primary" ? styles.primaryLabel : styles.secondaryLabel,
            disabled && variant === "primary" && styles.primaryLabelDisabled,
          ]}
          numberOfLines={2}
        >
          {shown}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: "center",
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[4],
    borderRadius: theme.radius.base,
    borderWidth: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space[2],
  },
  primary: {
    backgroundColor: theme.color.accent,
    borderColor: theme.color.accent,
  },
  primaryPressed: {
    backgroundColor: theme.color.accentPressed,
    borderColor: theme.color.accentPressed,
  },
  primaryDisabled: {
    backgroundColor: theme.color.accentDisabled,
    borderColor: theme.color.accentDisabled,
  },
  secondary: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.controlBorder,
  },
  pressed: {
    backgroundColor: theme.color.surfaceSunken,
  },
  secondaryDisabled: {
    borderColor: theme.color.border,
  },
  label: {
    flexShrink: 1,
    fontSize: theme.text.base,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryLabel: {
    color: theme.color.accentForeground,
  },
  // O branco do estado ativo não sobrevive à superfície clara do desabilitado.
  primaryLabelDisabled: {
    color: theme.color.accentDisabledForeground,
  },
  secondaryLabel: {
    color: theme.color.foreground,
  },
})
