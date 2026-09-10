// apps/mobile/src/components/ui/TextField.tsx
// Campo de texto nativo com rótulo visível, estado de foco e mensagem de erro
// associada. O rótulo é um <Text> de verdade, não um placeholder: placeholder
// desaparece ao digitar e leitor de tela não o trata como nome do campo.
import { useState } from "react"
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native"
import { bodyLineHeight, theme } from "../../theme"
import { MIN_TOUCH_TARGET } from "./Button"

interface TextFieldProps {
  label: string
  value: string
  onChangeText: (value: string) => void
  /** Mensagem de erro visível; também vira o nome acessível do estado inválido. */
  error?: string | undefined
  hint?: string | undefined
  inputProps?: Omit<TextInputProps, "value" | "onChangeText" | "style">
}

export function TextField({ label, value, onChangeText, error, hint, inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false)
  const invalid = Boolean(error)

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        {...(error ? { accessibilityHint: error } : hint ? { accessibilityHint: hint } : {})}
        placeholderTextColor={theme.color.muted}
        style={[styles.input, focused && styles.inputFocused, invalid && styles.inputInvalid]}
        {...inputProps}
      />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: {
    gap: theme.space[2],
  },
  label: {
    fontSize: theme.text.sm,
    fontWeight: "600",
    color: theme.color.foreground,
  },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[3],
    borderRadius: theme.radius.base,
    borderWidth: 1,
    borderColor: theme.color.controlBorder,
    backgroundColor: theme.color.surface,
    color: theme.color.foreground,
    fontSize: theme.text.base,
  },
  inputFocused: {
    borderColor: theme.color.focus,
    borderWidth: 2,
  },
  inputInvalid: {
    borderColor: theme.color.danger,
    borderWidth: 2,
  },
  error: {
    fontSize: theme.text.sm,
    color: theme.color.danger,
    lineHeight: bodyLineHeight(theme.text.sm),
  },
  hint: {
    fontSize: theme.text.sm,
    color: theme.color.muted,
    lineHeight: bodyLineHeight(theme.text.sm),
  },
})
