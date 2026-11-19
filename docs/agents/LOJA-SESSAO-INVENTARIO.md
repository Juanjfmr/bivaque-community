# Inventário da sessão para o app de loja

Em 19/11/2026, este lote apenas empacota o app; não implementa sessão nativa.
O identificador `br.com.bivaque.app`, o nome `Bivaque` e o esquema `bivaque`
estão declarados em `apps/app/capacitor.config.ts`. O manifesto Android e o
Info.plist também registram o esquema para o sistema operacional.

## Entrada atual

O app começa em `/app/entrar`. `apps/app/src/entrada/servidor.ts` chama
`/api/app/entry/*` por caminhos relativos, com `credentials: include` e o
cabeçalho do app. O envio do código usa `entry/otp`; `entry/otp/verify` valida
o código no servidor e cria a sessão pelo cliente SSR do Supabase, escrevendo
os cookies na resposta. A leitura e retomada usam `entry/progress`. A entrada
OAuth inicia em `entry/oauth`; o callback `/auth/callback` troca o código pela
sessão e retorna ao app. Os cookies de sessão usam caminho `/`, SameSite Lax,
400 dias e `Secure` em produção. O cliente geral em `lib/api/cliente.ts` usa
cookies na web e base absoluta configurável no nativo.

## O que já existe e o que falta

O resolvedor em `apps/web/lib/app-api/sessao-do-next.ts` aceita cookie ou
`Authorization: Bearer`, valida o token e cria cliente do usuário sob RLS.
Credenciais simultâneas são recusadas; token inválido não recorre ao cookie.
Escritas e CORS seguem `apps/web/lib/app-api/contrato.ts`.

O app nativo ainda não obtém, renova nem envia token; tampouco existe fluxo
definido para retorno seguro do navegador externo, saída e revogação. As rotas
de entrada ainda usam caminhos relativos, sem a base nativa do cliente geral.
Assim, configurar `VITE_API_BASE` não completa a entrada no aparelho. A origem
do Capacitor, as regras de CORS e os cookies entre origens exigem prova no fluxo
escolhido. Não se deve presumir que cookies do navegador externo são os da
WebView. A persistência e recuperação segura após reinício precisam de decisão
e testes de falha, expiração e troca de conta.

## Opções para o próximo ADR

1. **Recomendada: sessão nativa explícita por token**, com troca de retorno
   protegida, armazenamento seguro do sistema, renovação e revogação; o app
   envia Bearer às rotas existentes. Exige desenhar a entrega inicial sem expor
   credenciais em links ou logs e resolver o ciclo de vida completo.
2. **Cookies na WebView**, adaptando entrada e CORS para origens distintas.
   Depende das políticas de cookies das plataformas e não compartilha
   automaticamente a sessão do navegador externo.
3. **Sessão intermediada pelo servidor**, com uma credencial opaca do aparelho
   e renovação controlada no servidor. Evita entregar tokens do provedor ao app,
   mas acrescenta estado, revogação e infraestrutura próprios.

Estas opções não autorizam mudança de login, sessão ou armazenamento neste lote.
