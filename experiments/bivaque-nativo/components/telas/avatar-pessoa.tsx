import { View } from "react-native"
import { Text } from "@/components/ui/text"
import { iniciais, type Pessoa } from "@/lib/dados"

interface AvatarPessoaProps {
  pessoa: Pessoa
  /** Tamanho em pixels; o padrão 40 fica entre o pequeno e o grande. */
  tamanho?: 32 | 40 | 48 | 96
}

const FONTE: Record<NonNullable<AvatarPessoaProps["tamanho"]>, number> = {
  32: 12,
  40: 14,
  48: 16,
  96: 30,
}

/** Avatar com as iniciais: a demonstração não usa foto de pessoa. */
export function AvatarPessoa({ pessoa, tamanho = 40 }: AvatarPessoaProps) {
  const grande = tamanho === 96
  return (
    <View
      accessible
      accessibilityLabel={pessoa.nome}
      className={grande ? "border-4 border-background bg-secondary" : "bg-secondary"}
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text className="font-semibold text-muted-foreground" style={{ fontSize: FONTE[tamanho] }}>
        {iniciais(pessoa.nome)}
      </Text>
    </View>
  )
}
