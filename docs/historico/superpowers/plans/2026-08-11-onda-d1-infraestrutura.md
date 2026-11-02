# Onda D1 — infraestrutura

> Plano de execução. Nenhuma tela. Sete peças que quase todo o resto do roadmap depende.
> Marque `- [x]` conforme avança e **commite por task**.

## Três bloqueios humanos, e eles vêm antes do código

Nenhum agente resolve estes. Se não estiverem prontos, as Tasks 4, 5 e 7 param:

1. **Conta no Resend + domínio verificado.** Registros de DKIM e SPF no DNS do domínio de
   envio. Leva de horas a dias, dependendo da propagação.
2. **Chip dedicado e descartável para o WhatsApp.** Número novo, que não esteja ativo no
   WhatsApp comum, e que **não** seja o do fundador nem o de administrador de vila.
3. **CNPJ** — para o Asaas (onda G) e para o Cloud API oficial no futuro. Depende do veículo
   jurídico do §7.6 do `BIVAQUE.md`, que precisa de parecer.

**Comece por eles.** As Tasks 1, 2, 3 e 6 não dependem de nada e podem correr enquanto a
espera acontece.

## Contexto obrigatório antes de começar

1. [`docs/BIVAQUE.md`](../../BIVAQUE.md) §7.7 (stack), §7.8 (o canal de WhatsApp e os cinco
   requisitos de sobrevivência) e §7.9 (o limite do Portal). Leia os três inteiros — esta onda
   é a implementação deles.
2. [`docs/PRODUCT_STATUS.md`](../../PRODUCT_STATUS.md) §11.
3. `AGENTS.md` — segredo nunca entra em commit, nunca é ecoado no terminal.

---

## Task 1: Upstash, os quatro limites e o breaker

Um mecanismo só. Não crie contador em tabela para uns e Redis para outros.

- [x] **Step 1: cliente e configuração**

  Adicionar a dependência e as variáveis em `apps/web/.env.example`. Sem valor real no
  arquivo — só o nome da variável.

- [x] **Step 2: os quatro limites**

  | Limite | Chave | Teto |
  |---|---|---|
  | Consulta de CPF | por usuário | 3 por hora |
  | Convite de membro | por usuário | cota da D15, definir o número |
  | Leitura de perfil | por usuário | teto que torne caminhar por perfis caro |
  | Chamadas ao Portal | **global** | bem abaixo de 180/min |

  Janela deslizante, não janela fixa — janela fixa deixa passar o dobro na virada.

- [x] **Step 3: o circuit breaker do Portal**

  Chave global no Redis. Ao receber 429 ou sinal de suspensão: abrir o breaker e **parar de
  chamar**. Enquanto aberto, toda verificação cai em `pending` — nunca em `rejected`, nunca
  em `temporary_error`.

  Fechar por tempo, não por tentativa. A suspensão do Portal é de **8 horas**; o breaker deve
  respeitar isso em vez de sondar.

  **Retry automático em laço é proibido.** É o que transforma um bug numa suspensão.

- [x] **Step 4: testes**

  Unitário sobre a lógica de limite: dentro do teto passa, acima é negado, e a janela desliza
  como esperado. Sobre o breaker: fechado deixa passar, 429 abre, aberto devolve `pending`,
  e reabre depois do tempo.

  Não bata no Redis real no teste — abstraia o armazenamento.

- [x] **Step 5: gate e commit**

  `feat(infra): rate limiting and the Portal circuit breaker on Upstash`.

---

## Task 2: pg_cron

- [x] **Step 1: confirmar disponibilidade**

  `pg_cron` e `pg_net` no plano Supabase em uso. **`pg_net` é o que permite chamada HTTP a
  partir do banco**, e sem ele a reconciliação de `pending` da onda D2 não funciona como
  desenhada.

  Se `pg_net` não estiver disponível: **pare e reporte.** A alternativa é o worker chamar o
  Portal a partir da aplicação, e isso muda o desenho da D2 — é decisão, não improviso.

- [x] **Step 2: migration**

  Habilitar a extensão e criar o primeiro job, mesmo que trivial, para provar que o
  agendamento funciona de ponta a ponta.

- [x] **Step 3: teste**

  pgTAP: a extensão está habilitada e o job existe. Sem isso, uma falha de agendamento só
  aparece quando alguém reparar que nada roda.

- [x] **Step 4: gate e commit**

  `feat(infra): enable pg_cron and prove scheduling end to end`.

---

## Task 3: a tabela de saída e o worker

O coração da entrega de notificação. O trigger não envia — ele enfileira.

- [x] **Step 1: a tabela**

  Migration criando `outbox` com, no mínimo: destinatário, **canal** (`email`, `whatsapp`),
  tipo, carga, estado (`pending`, `sent`, `failed`, `skipped`), tentativas, erro da última
  tentativa, e timestamps.

  A coluna de canal é o que torna a troca para o WhatsApp oficial um adaptador novo em vez de
  uma reescrita (§7.8, requisito 2).

  RLS habilitada e forçada. `authenticated` não tem privilégio nenhum aqui: é tabela de
  operação, e a carga contém conteúdo de notificação.

- [x] **Step 2: o worker**

  Job do pg_cron que lê `pending`, envia pelo adaptador do canal e marca o resultado.

  Antes de cada envio, verificar **preferência de notificação e opt-out**. É aqui que a regra
  mora — em um lugar só, não espalhada por trigger.

  Retentativa com recuo exponencial e teto de tentativas. Depois do teto, `failed` fica
  registrado, não some.

- [x] **Step 3: degradar em vez de quebrar**

  Falha persistente no WhatsApp cai para e-mail (§7.8, requisito 3). Registrar a troca de
  canal na linha, senão ninguém descobre que o WhatsApp morreu.

- [x] **Step 4: testes**

  pgTAP: linha enfileirada sai como `sent`; com preferência desligada sai como `skipped` sem
  enviar; falha incrementa tentativa; acima do teto vira `failed`; opt-out nunca envia.

  O caso de opt-out precisa dos dois lados testados.

- [x] **Step 5: gate e commit**

  `feat(infra): outbox table and delivery worker on pg_cron`.

  Executado em duas partes: a tabela em `c5b5a2c` e o worker
  (`feat(infra): outbox delivery worker on pg_cron`).

---

## Task 4: adaptador de e-mail (Resend)

Depende do bloqueio 1.

- [ ] **Step 1: o adaptador**

  Função que recebe uma linha do outbox e envia. A chave vem de variável de ambiente e
  **nunca** aparece em log, nem em mensagem de erro do Sentry.

- [ ] **Step 2: descadastro**

  Todo e-mail leva link de descadastro que funciona sem login. Descadastrar grava opt-out, e o
  worker respeita na próxima leitura.

- [ ] **Step 3: bounce**

  Endereço que retorna bounce permanente é marcado, e o worker para de tentar. Sem isso a
  reputação do domínio cai e o e-mail legítimo passa a ir para spam.

- [ ] **Step 4: teste**

  Com o provedor simulado: envio bem-sucedido marca `sent`; erro marca tentativa; descadastro
  faz pular. Não bata no Resend real no teste.

- [ ] **Step 5: gate e commit**

  `feat(infra): Resend adapter with unsubscribe and bounce handling`.

---

## Task 5: adaptador de WhatsApp

Depende do bloqueio 2. **Leia o §7.8 do `BIVAQUE.md` inteiro antes de começar** — esta é uma
decisão de risco assumido, com requisitos que não são opcionais.

- [ ] **Step 1: os requisitos, no código**

  - número dedicado, configurado por variável de ambiente;
  - adaptador atrás da mesma interface do e-mail, sem vazar detalhe do canal para o worker;
  - **jitter** entre envios, e volume baixo por janela;
  - só envia para quem optou **e** é da comunidade — nunca para número fora do grafo;
  - `PARE` grava opt-out e o worker respeita imediatamente.

- [ ] **Step 2: o banimento como estado esperado, não como exceção**

  Falha de autenticação da sessão é sinal provável de banimento. Ao detectar: abrir breaker do
  canal, cair para e-mail e registrar. **Não** tente reconectar em laço — reconexão agressiva
  é ela mesma sinal de detecção.

- [ ] **Step 3: teste**

  Com a biblioteca simulada: respeita jitter, respeita opt-out, cai para e-mail quando o canal
  abre o breaker. O teste de queda para e-mail é o mais importante da task.

- [ ] **Step 4: gate e commit**

  `feat(infra): WhatsApp adapter with opt-out, jitter and email fallback`.

---

## Task 6: Sentry

- [x] **Step 1: instalar e configurar** para servidor e cliente.

- [x] **Step 2: filtro de PII — antes de qualquer evento sair**

  Remover, do corpo e das URLs: CPF, e-mail, token, cabeçalho de autorização e conteúdo de
  post ou mensagem. O padrão é **não enviar**; o que for enviado é escolha explícita.

  Um produto que trata dado de militar não pode descobrir o vazamento depois de vê-lo no
  painel de um terceiro.

- [x] **Step 3: teste**

  Unitário sobre o filtro: evento contendo CPF, e-mail e token sai limpo. Este teste é a
  task — sem ele, o Sentry é uma superfície nova de vazamento.

- [x] **Step 4: gate e commit**

  `feat(infra): Sentry with mandatory PII scrubbing`.

---

## Task 7: migration para produção por GitHub Action

Depende de a credencial de produção existir como secret.

- [x] **Step 1: o workflow**

  No merge para `main`, **depois do gate verde**, rodar `supabase db push` contra produção. A
  credencial é secret do repositório e nunca sai em log.

  Gate vermelho não empurra. Nunca.

- [x] **Step 2: `--linked` é proibido no ambiente local**

  O workflow é o único lugar que fala com produção. Se houver script local que aceite
  `--linked`, ele sai.

- [x] **Step 3: teste de escopo**

  Em `tests/scope/`: o workflow existe, roda depois do gate, e nenhum script de
  `package.json` aponta para produção.

- [x] **Step 4: atualizar o runbook**

  `docs/PILOT_RUNBOOK.md` §9 ainda manda testar o Portal com a chave de produção localmente,
  e afirma que `test:privacy` e `test:secrets` verificam produção — **eles não abrem conexão
  com banco nenhum**. Corrija as duas coisas: o probe autenticado em
  `/api/admin/portal-health` substitui o teste local, e a garantia de RLS em produção vem de
  paridade de migration.

  Isso fecha a Task 8 do plano de observabilidade, que está aberta desde 2026-08-06.

- [x] **Step 5: gate e commit**

  `feat(ci): push migrations from CI and take the production key off the laptop`.

---

## Definição de pronto

- Gate verde após cada task.
- O breaker devolve `pending`, nunca `rejected`, e nenhum caminho tenta retry em laço.
- Nenhum segredo em commit, em log ou em evento do Sentry.
- Opt-out testado nos dois canais.
- A chave de produção não vive mais em máquina pessoal.

## Sobre a auditoria visual

Esta onda **não toca tela nenhuma**, então a auditoria do §10.2 não se aplica. Registre isso
no `PRODUCT_STATUS.md` de forma explícita — onda sem veredito visual parece onda que pulou o
gate, e daqui a três meses ninguém vai lembrar por quê.

## O que esta onda não faz

Não constrói o fluxo de admissão, que é a D2 e consome estas peças. Não integra o Asaas, que
é a onda G. Não instala o PostHog, que é a onda H.
