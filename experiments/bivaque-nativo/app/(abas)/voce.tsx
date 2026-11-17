import { useColorScheme } from "nativewind"
import { type ReactNode, useState } from "react"
import { ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Icone, type NomeIcone } from "@/components/icons"
import { AvatarPessoa } from "@/components/telas/avatar-pessoa"
import { useCores } from "@/components/telas/cores"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Text } from "@/components/ui/text"
import { CIDADE, PERFIL } from "@/lib/dados"

export default function TelaVoce() {
  const cores = useCores()
  const { colorScheme, setColorScheme } = useColorScheme()
  const [contaApagada, setContaApagada] = useState(false)
  const escuro = colorScheme === "dark"

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <ScrollView contentContainerClassName="pb-10">
        <View className="h-28 bg-secondary" />

        <View className="-mt-12 items-center gap-1 px-4">
          <AvatarPessoa pessoa={PERFIL} tamanho={96} />
          <Text variant="h3" className="text-2xl font-bold">
            {PERFIL.nome}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {PERFIL.bairro}, {CIDADE}
          </Text>
          <Badge variant="secondary" className="mt-1">
            <Text className="text-xs text-muted-foreground">Perfil de demonstração</Text>
          </Badge>
        </View>

        <View className="mt-6 gap-6 px-4">
          <Secao titulo="Só você vê">
            <Card className="gap-0 rounded-xl border-border p-0">
              <Linha nome="salvar" titulo="Salvos" detalhe="4 publicações e 2 anúncios" />
              <Separator />
              <Linha nome="evento" titulo="Eventos" detalhe="Você vai em 2 eventos" />
            </Card>
          </Secao>

          <Secao titulo="Família">
            <Card className="gap-0 rounded-xl border-border p-0">
              <Linha nome="familia" titulo="Familiares" detalhe="Nenhum familiar vinculado" />
            </Card>
          </Secao>

          <Secao titulo="Ajustes">
            <Card className="gap-0 rounded-xl border-border p-0">
              <View className="flex-row items-center gap-3 p-4">
                <Icone nome="tema" tamanho={20} cor={cores.mutedForeground} />
                <View className="flex-1">
                  <Text className="text-base">Tema escuro</Text>
                  <Text className="text-xs text-muted-foreground">
                    Segue o aparelho até você escolher
                  </Text>
                </View>
                <Switch
                  checked={escuro}
                  onCheckedChange={(valor) => setColorScheme(valor ? "dark" : "light")}
                  accessibilityLabel="Tema escuro"
                />
              </View>
            </Card>
          </Secao>

          <Secao titulo="Conta">
            <Card className="gap-0 rounded-xl border-border p-0">
              {contaApagada ? (
                <Text className="p-4 text-sm text-muted-foreground">
                  Conta apagada nesta demonstração. Nada foi enviado ao servidor.
                </Text>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="h-12 justify-start gap-3 px-4">
                      <Icone nome="sair" tamanho={20} cor={cores.mutedForeground} />
                      <Text className="text-base text-destructive">Apagar conta</Text>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Apagar sua conta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Seu perfil, suas publicações e suas conversas deixam de aparecer para a
                        cidade. Esta é uma demonstração: nada é apagado de verdade.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        <Text>Cancelar</Text>
                      </AlertDialogCancel>
                      <AlertDialogAction onPress={() => setContaApagada(true)}>
                        <Text>Apagar conta</Text>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </Card>
          </Secao>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase text-muted-foreground">{titulo}</Text>
      {children}
    </View>
  )
}

interface LinhaProps {
  nome: NomeIcone
  titulo: string
  detalhe: string
}

function Linha({ nome, titulo, detalhe }: LinhaProps) {
  const cores = useCores()

  return (
    <View className="flex-row items-center gap-3 p-4">
      <Icone nome={nome} tamanho={20} cor={cores.mutedForeground} />
      <View className="flex-1">
        <Text className="text-base">{titulo}</Text>
        <Text className="text-xs text-muted-foreground">{detalhe}</Text>
      </View>
      <Icone nome="avancar" tamanho={18} cor={cores.mutedForeground} />
    </View>
  )
}
