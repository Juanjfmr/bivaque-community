---
id: ADR-20261024-front-react-spa
status: proposed
risk: R3
owner: Juan
approved_at:
accepted_at:
expires_at:
linked_plan: docs/agents/experimento-front/README.md (EXP-001)
critic_verdict: PASS
critic_review: >
  Primeira crítica do gpt-6.1-sol em 24/10/2026: NÃO PRONTO, com seis pontos (CSRF e CORS nas rotas de API;
  resolvedor de sessão que não use o cliente de serviço como atalho; login Google proibido em WebView e PKCE no
  retorno; mídia com token e tratamento de foto; publicação conjunta dos dois builds e links antigos; prova vertical
  antes de retirar telas). A segunda deu os seis como resolvidos e apontou um ciclo possível entre os
  redirecionamentos das rotas antigas e os portões do proxy; esta versão o fecha (seção 8). A terceira
  conferência confirmou, sem furo novo: PRONTO.
---

# O app vira um React de página única, com shadcn/ui; o Next fica como servidor e landing

## Problem

Levar o protótipo (`prototypes/bivaque-html/`, HTML com Material Web) para o app Next deu atrito em todas as
tentativas:

- **Porte tela a tela no app atual (lotes 4 e 5):** a barra de navegação levou cinco correções brigando com o
  roteador do Next; o tema não segue o sistema; componentes e testes antigos travam a estrutura de um produto
  anterior (cerca de 64 mil linhas).
- **Experimento EXP-001 (24/10/2026):** a mesma jornada feita em React e em Lit, com o Next só como hospedeiro.
  Nenhuma ficou pronta nos dois eixos. A versão React ficou funcional e barata, mas longe do protótipo, e ao buscar a
  fidelidade com Material Web quebrou a acessibilidade (o texto dos ícones entrava no nome dos botões). A versão Lit
  ficou fiel, mas custou quase o dobro de tokens ao modelo. O instrumento e o produtor (gpt-6-luna) também erraram, e
  o juiz não declarou superioridade de nenhuma tecnologia.
- **As causas comuns:**
  - o Material Web: componentes de outra família no React, acessibilidade frágil e projeto em modo de manutenção;
  - a regra de navegação do protótipo (origem por entrada do histórico, foco e rolagem restaurados), que briga com
    qualquer roteador do navegador;
  - o código antigo do app.

O dono decidiu (24/10/2026): a prioridade é a web, e o app de loja (iPhone e Android) vem logo depois.

## Decision

### 1. O app

- O app que a pessoa usa logada é um **React de página única**: Vite, TanStack Router e TanStack Query.
- Componentes **shadcn/ui** (Radix e Tailwind), com o código no próprio repositório. O que o shadcn não tem (barra de
  navegação, botão "Criar", chips, linha de pergunta) é feito com Radix e Tailwind.
- **Sai o Material Web** do app. Sai também o HeroUI, à medida que as telas antigas saem.
- O protótipo em shadcn (`apps/prototipo`, PROTO-001) é o começo do app: quando a primeira jornada for aprovada, ele
  passa para Vite e vira o app.

### 2. O visual

- Os tokens do protótipo (cores dos dois temas, tipografia Noto, raios, espaçamentos) são traduzidos para o tema do
  shadcn. O tema segue o sistema.
- O protótipo HTML continua sendo a especificação de telas, textos e comportamento até cada jornada estar aprovada
  pelo dono no app novo. Depois disso, a referência daquela jornada passa a ser o app novo.
- Ícones `lucide-react`, decorativos com `aria-hidden`.

### 3. A navegação (provisório)

- Rotas de verdade, aba ativa pelo endereço e voltar do navegador.
- Sai a regra do protótipo de "origem por entrada do histórico".
- **Provisório:** o dono confirma depois de usar o protótipo em shadcn. Se ele quiser a regra do protótipo, ela volta
  com o TanStack Router, que deixa o app controlar o histórico.

### 4. O servidor e a landing

- O **Next atual continua como servidor**: login, sessão, Portal da Transparência, fotos, exclusão de conta, workers e
  as regras que já existem. A **landing pública** continua no Next, renderizada no servidor, por causa da busca.
- As ações de servidor que o app novo usa viram **rotas de API**, tela por tela, quando cada jornada é ligada ao banco.
  A validação de cada ação fica num módulo comum, chamado pela ação antiga e pela rota nova, e não é copiada.
- O que é leitura e escrita protegida pelas regras do banco (RLS) pode ir direto do app ao Supabase, como o app atual
  já faz em parte. O que precisa de segredo, de regra fora do banco ou do cliente de serviço passa pela API.

### 5. O contrato de segurança da API

Vale para toda rota de API nova, desde a primeira, com teste positivo e negativo:

1. **Um resolvedor de sessão único.** Ele aceita o cookie da web (mesma origem) ou o token no cabeçalho
   `Authorization` (app de loja):
   - credenciais em conflito são recusadas;
   - token inválido é recusado e **não cai para o cookie**;
   - a sessão resolvida produz um **cliente do usuário**, sob as regras do banco;
   - o cliente de serviço (`service_role`) só entra em operação com autorização explícita no código, nunca como atalho
     depois de validar o token.
2. **CSRF.** Toda rota que grava e aceita cookie confere `Origin` contra uma lista explícita e exige um cabeçalho
   próprio do app. As rotas de API não herdam a proteção que as ações de servidor têm.
3. **CORS.** Lista explícita de origens: o domínio da web e a origem do Capacitor. Nada de curinga com credencial.
   CORS não substitui a proteção contra CSRF.
4. **Mídia.** Imagem protegida chega ao app por URL assinada de vida curta ou por busca autenticada; uma tag `<img>`
   não leva o token. O envio de foto continua passando pelo tratamento do servidor (`sanitize-image`, que tira
   EXIF e localização), porque as regras do banco não fazem isso.
5. **Sessão no app de loja.** Token em armazenamento seguro do sistema, renovação ao reabrir, e cache local limpo ao
   sair da conta.

### 6. O app de loja

- **Capacitor** sobre o mesmo build do app, depois da web.
- **Login Google pelo navegador do sistema**, nunca dentro do app embutido: o Google proíbe OAuth em WebView. Volta ao
  app por link profundo, com troca de código PKCE e o verificador guardado onde o retorno o encontra.
- Links de confirmação e de recuperação de senha, inclusive abertos em outro navegador, chegam ao lugar certo.
- Foto pela câmera nativa convertida em arquivo, com cancelamento e recuperação quando o Android encerra o app no
  meio.

### 7. A prova vertical, antes de qualquer retirada

O EXP-001 não testou esta combinação. Antes de aposentar qualquer tela do `apps/web`, uma jornada inteira passa no app
novo com as fronteiras reais:
- jornada: Indicações (listar, perguntar, abrir, responder) e uma tela com foto;
- servidor: pelo menos uma rota de API com o contrato da seção 5, com teste de cada item;
- login: e-mail e Google na web; no Capacitor, um teste de fumaça de login Google, sessão ao reabrir e foto;
- publicação: os dois builds juntos (seção 8), com e2e nos três tamanhos e nos dois temas;
- custo: tokens e rodadas dos agentes registrados, para comparar com o porte antigo.

Se a prova falhar num ponto que a arquitetura não resolve, este ADR reabre.

### 8. A troca e a publicação

- O app novo nasce em `apps/app` (o protótipo é renomeado quando passar para Vite).
- **Publicação conjunta:** o app é servido em `/app` pelo mesmo domínio. O roteamento manda `/app/*` para o build do
  app, com retorno ao `index.html` para as rotas dele, e **nunca** captura `/api` nem `/auth`, que continuam no Next. O
  build e o e2e passam a conhecer os dois apps.
- **Volta atrás:** trocar a rota de `/app` de volta para as telas antigas desfaz a troca enquanto elas existirem.
- **Links antigos:** cada rota antiga redireciona para a nova equivalente, inclusive os destinos das notificações
  (`notifications/deep-links.ts`) e os links de e-mail. Depois do login, a pessoa chega ao conteúdo.
- **Os portões do proxy acompanham a troca.** O `apps/web/proxy.ts` separa membro, prestador e pré-admissão por rota
  (por exemplo, manda o prestador de volta a `/prestador`). Cada jornada que muda de endereço adapta esses portões no
  mesmo PR, para que o redirecionamento da rota antiga e o portão não formem ciclo (`/prestador` → `/app/…` →
  `/prestador`). A separação entre membro, prestador e pré-admissão continua igual, com teste de cada perfil
  chegando ao destino certo e de nenhum ciclo.
- **Cada jornada**, nesta ordem:
  1. interface com dados de demonstração;
  2. aprovação visual do dono;
  3. ligação ao banco e à API;
  4. e2e nos três tamanhos;
  5. a cobertura de teste da tela antiga migrada para a nova;
  6. só então a tela antiga sai, com o código e os testes dela.
- O `apps/web` fica com a landing e o servidor quando a última jornada sair.

### 9. O que muda em decisões anteriores

- **Substitui o ADR-20261022-porte-visual-material-web** no app: componentes, ícones e a migração tela a tela.
  Continua valendo dele: os tokens da R70 como fonte das cores, as fontes Noto self-hosted, o tema seguindo o sistema
  e a prova por captura.
- A regra do `AGENTS.md` "No shadcn/Radix/Headless UI" muda para o app novo.
- O teste de escopo que trava as raízes do monorepo aceita `apps/prototipo`, e depois `apps/app`.

## Alternatives considered

- **Seguir portando para o app Next atual, com Material Web.** Rejeitada: é o caminho que falhou nos lotes 4 e 5.
- **Lit com Material Web, Next como hospedeiro (EXP-001).** Rejeitada por ora: fiel, mas cara para os modelos, e
  mantém a dependência do Material Web, que está em modo de manutenção.
- **Next com shadcn, sem SPA.** Considerada seriamente. Perde para o SPA porque o app de loja vem logo depois e o
  Capacitor precisa de build estático, e porque o roteador do Next foi a principal fonte de atrito.
- **Expo com React Native Paper (um código para web, iPhone e Android).** Rejeitada: a web sai mais limitada, e a web
  é a prioridade.
- **Flutter.** Rejeitada: web desenhada em canvas, fraca em acessibilidade e busca, e outra linguagem para os agentes.
- **MUI (Material UI).** Rejeitada: Material 3 incompleto, pesado, e mantém a briga entre a linguagem Material e a
  customização.

## Market or reference baseline

React de página única com shadcn/ui e Radix é o padrão mais comum hoje em apps web autenticados. Capacitor sobre o
mesmo build é o caminho usual para levar um app web à loja sem reescrever.

## Proposed divergence from baseline

Nenhuma no app. A navegação simplificada diverge do protótipo, e é provisória (seção 3).

## Evidence and sources

- EXP-001: `docs/agents/experimento-front/` (contrato, instrumento v2) e os resultados em
  `.claude/worktrees/exp-front-a` e `exp-front-b` (`.visual/exp-front/`), julgados pelo gpt-6.1-sol em 24/10/2026.
- As cinco correções da barra no app atual: COM-004, branch `codex/lote5-nav`.
- Material Web em modo de manutenção: repositório `material-components/material-web`.
- Conversa de alternativas entre Claude e gpt-6.1-sol, duas rodadas, 24/10/2026.

## Benefits

- A stack que os agentes conhecem melhor, com acessibilidade de diálogos, foco e teclado vinda do Radix.
- Um build que serve à web e ao app de loja.
- O servidor que já funciona é aproveitado, sem mexer agora em segredo nem em verificação.
- O app novo nasce sem o código do produto anterior.

## Risks

- **A aparência se afastar do protótipo** por trocar Material Web por shadcn. Mitigação: tokens traduzidos, aprovação
  visual do dono por jornada e comparação de captura.
- **Duas formas de sessão** (cookie na web, token no app de loja). Mitigação: o resolvedor único e o contrato da
  seção 5, com teste de cada item.
- **Login Google no app de loja.** Mitigação: navegador do sistema e prova de fumaça na prova vertical, antes de
  qualquer retirada.
- **Converter ações de servidor em API** pode deixar uma regra só no código antigo. Mitigação: cada rota nova repete
  as validações da ação e tem teste positivo e negativo; a tela antiga só sai depois do e2e da nova.
- **Duas apps em paralelo por um tempo.** Mitigação: a ordem por jornada da seção 6, e a tela antiga sai no mesmo PR
  em que a nova entra.

## Reversal cost

Médio enquanto houver poucas jornadas no app novo. Alto depois que o `apps/web` perder as telas.

## Success metric

- A primeira jornada no app novo aprovada visualmente pelo dono, com e2e nos três tamanhos e nos dois temas.
- Nenhuma regra de acesso enfraquecida na conversão para API, por teste.
- O mesmo build rodando no Capacitor, na etapa do app de loja.

## Reopen condition

Reabrir se a primeira jornada no app novo custar mais que o porte no app atual, ou se o Capacitor não servir para o
app de loja.
