# Comunidade — protótipo React/shadcn

Branch baseada em `codex/app`. Sete telas implementadas em `apps/prototipo`:

1. `/comunidade` — painel com Indicações, Grupos, Eventos e últimas atividades.
2. `/comunidade/indicacoes` — filtro por status, categoria e busca.
3. `/comunidade/pergunta/internet` — pergunta, respostas, seguir, útil e responder.
4. `/comunidade/criar` — publicar pergunta da demonstração.
5. `/comunidade/grupos` — descoberta, grupos e entrada.
6. `/comunidade/grupos/chegados` — grupo e feed; publicação demonstrativa.
7. `/comunidade/eventos` — lista de eventos e presença demonstrativa.

Executar: `pnpm --filter @bivaque/prototipo dev` (porta 3100). `pnpm --filter @bivaque/prototipo build` para validar.

UI construída com os primitivos shadcn/ui já instalados (Card, CardHeader, CardContent, CardFooter, Button, Input, Textarea, Badge). O padrão do Post Card do 21st.dev foi usado como inspiração estrutural; **não foi instalado como código idêntico**. Identidade: Grafite/Papel/Brasa e glifo oficial (componente Marca). A aplicação Next carrega imagens demonstrativas já existentes no repositório público.

**Não integrado ao backend.** Perguntas, respostas, votos, grupos e presenças do protótipo são gravados apenas em localStorage no navegador. Negócios não existe na Comunidade; deve permanecer em Mercado.

A `main` e produção não foram modificadas.
