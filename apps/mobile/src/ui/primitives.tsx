import { nativeTokens } from "@bivaque/tokens"
import type { PropsWithChildren } from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
} from "react-native"

type TextVariant = "eyebrow" | "title" | "body" | "label" | "caption"

type BivaqueTextProps = PropsWithChildren<
  TextProps & {
    variant?: TextVariant
    tone?: "default" | "muted" | "accent" | "inverse"
  }
>

const toneStyles = StyleSheet.create({
  default: { color: nativeTokens.color.foreground },
  muted: { color: nativeTokens.color.muted },
  accent: { color: nativeTokens.color.accent },
  inverse: { color: nativeTokens.color.accentForeground },
})

export function BivaqueText({
  children,
  style,
  variant = "body",
  tone = "default",
  ...props
}: BivaqueTextProps) {
  return (
    <Text {...props} style={[styles[variant], toneStyles[tone], style]}>
      {children}
    </Text>
  )
}

type BivaqueButtonProps = {
  label: string
  onPress: () => void
  variant?: "primary" | "secondary"
  disabled?: boolean
  accessibilityHint?: string
}

export function BivaqueButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  accessibilityHint,
}: BivaqueButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" ? styles.primaryButton : styles.secondaryButton,
        disabled ? styles.disabledButton : null,
        pressed && !disabled ? styles.pressedButton : null,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "primary" ? styles.primaryButtonText : styles.secondaryButtonText,
          disabled ? styles.disabledButtonText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

type BivaqueFieldProps = TextInputProps & {
  label: string
  error?: string
}

export function BivaqueField({ label, error, style, ...props }: BivaqueFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={nativeTokens.color.muted}
        style={[styles.field, error ? styles.fieldError : null, style]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: nativeTokens.text.sm,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: nativeTokens.text["3xl"],
    lineHeight: 35,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  body: {
    fontSize: nativeTokens.text.base,
    lineHeight: 24,
  },
  label: {
    fontSize: nativeTokens.text.base,
    lineHeight: 22,
    fontWeight: "700",
  },
  caption: {
    fontSize: nativeTokens.text.sm,
    lineHeight: 20,
  },
  button: {
    minHeight: nativeTokens.controlMinHeight,
    borderRadius: nativeTokens.radius.base,
    paddingHorizontal: nativeTokens.space[4],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: nativeTokens.color.accent,
    borderColor: nativeTokens.color.accent,
  },
  secondaryButton: {
    backgroundColor: nativeTokens.color.surface,
    borderColor: nativeTokens.color.border,
  },
  disabledButton: {
    backgroundColor: nativeTokens.color.disabledSurface,
    borderColor: nativeTokens.color.disabledSurface,
  },
  pressedButton: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    fontSize: nativeTokens.text.base,
    lineHeight: 22,
    fontWeight: "700",
  },
  primaryButtonText: {
    color: nativeTokens.color.accentForeground,
  },
  secondaryButtonText: {
    color: nativeTokens.color.foreground,
  },
  disabledButtonText: {
    color: nativeTokens.color.disabledForeground,
  },
  fieldGroup: {
    gap: nativeTokens.space[2],
  },
  fieldLabel: {
    color: nativeTokens.color.foreground,
    fontSize: nativeTokens.text.sm,
    fontWeight: "700",
  },
  field: {
    minHeight: nativeTokens.controlMinHeight,
    borderWidth: 1,
    borderColor: nativeTokens.color.border,
    borderRadius: nativeTokens.radius.base,
    backgroundColor: nativeTokens.color.surface,
    color: nativeTokens.color.foreground,
    paddingHorizontal: nativeTokens.space[4],
    fontSize: nativeTokens.text.base,
  },
  fieldError: {
    borderColor: nativeTokens.color.danger,
  },
  errorText: {
    color: nativeTokens.color.danger,
    fontSize: nativeTokens.text.sm,
  },
})
