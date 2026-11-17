import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Text } from "@/components/ui/text"
import { iniciais, type Pessoa } from "@/lib/dados"

interface AvatarPessoaProps {
  pessoa: Pessoa
  /** Tamanho em pixels; o padrão 40 fica entre o pequeno e o grande. */
  tamanho?: 32 | 40 | 48 | 96
}

/** Avatar com as iniciais: a demonstração não usa foto de pessoa. */
export function AvatarPessoa({ pessoa, tamanho = 40 }: AvatarPessoaProps) {
  return (
    <Avatar
      alt={pessoa.nome}
      className="bg-secondary"
      style={{ width: tamanho, height: tamanho }}
    >
      <AvatarFallback>
        <Text className="text-xs font-semibold text-muted-foreground">{iniciais(pessoa.nome)}</Text>
      </AvatarFallback>
    </Avatar>
  )
}
