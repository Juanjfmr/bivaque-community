# Contratos técnicos pendentes, decisões R3 e ambientes

> Entregável do gate da etapa **W00** da
> [especificação funcional](../superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md):
> "contratos técnicos pendentes nomeados" e "levantar decisões R3 e ambientes desde já".
>
> **Revisão confrontada:** `c1622df` · **Data:** 08/09/2026.
>
> Nomear não é resolver. Este documento existe para que nenhuma etapa descubra tarde que
> dependia de uma decisão humana ou de um ambiente que ninguém providenciou. Cada linha diz
> **o que trava**, **o que destrava** e **de quem é a decisão**.

`R3`, pela [matriz de risco](../decisions/RISK_MATRIX.md:12): segurança, privacidade, dado
pessoal, permissões, RLS, migration destrutiva, pagamento, monetização, jurídico/conformidade ou
decisão irreversível. Exige **aprovação humana explícita em ADR aprovado** e `critic_verdict: pass`;
o `security-auditor` roda junto do revisor.

---

## 1. Decisões R3 pendentes

### 1.1 Afiliação militar declarada (Força Armada e OM) — **decisão de produto tomada, contrato técnico ausente**

- **Estado:** [`ADR-20260811-om-declarada`](../decisions/ADR-20260811-om-declarada.md) está
  `proposed`. As [correções do responsável de 07/09](../design/visual-guide-2026-09-06/DECISOES-2026-09-07.md)
  autorizam explicitamente o **produto**: campos opcionais e autodeclarados, com controle
  "Exibir no perfil" desligado por padrão, alteráveis e removíveis. O que **não** existe é o
  contrato técnico: colunas, política de visibilidade em RLS, semântica de remoção, e a fronteira
  entre o que o Estado afirma e o que a pessoa declara.
- **Trava:** pranchas 39 (onboarding) e 51 (perfil) — etapa **W02**. Sem o contrato, o campo só
  pode existir como UI que não persiste, e o gate G1 da especificação recusa isso.
- **Destrava:** ADR aprovado definindo armazenamento, visibilidade por RLS com teste positivo e
  negativo, e caminho de remoção — tudo na mesma migration que cria a coluna (regra do AGENTS.md
  sobre coluna de escopo e política juntas).
- **Decide:** responsável, em ADR. O agente não decide.
- **Card:** `BLOCK-AFFILIATION` (HOLD).

### 1.2 Processamento de identidade digital por IA — **adiado por decisão de 08/09**

- **Estado:** as correções de 07/09 autorizam o produto (CPF como caminho rápido, envio de
  **arquivo único** com reconhecimento por IA como alternativa). Não há ADR técnico. Não há
  fornecedor escolhido, política de descarte, prazo de retenção, nem definição de processamento
  privado com acesso mínimo.
- **Já existe:** upload de documento e decisão manual do operador
  (`onboarding/document-actions.ts`, RPC `decide_verification_document`, fila em `/admissions`).
  O **reconhecimento por IA conectado não existe**.
- **Decisão do responsável, 08/09/2026:** a IA **não** entra em W01 e fica nomeada como pendência.
  W01 entrega o caminho manual e não fica bloqueada.
- **Destrava (para construir a IA algum dia):** ADR aprovado com fornecedor, base legal LGPD,
  retenção, descarte e acesso mínimo.
- **Decide:** responsável + revisão jurídica.
- **Cards:** `BLOCK-LEGAL-AI` (a pendência) e `W01-ADMISSAO-MANUAL` (o que W01 entrega).

> **DECIDIDO PELO RESPONSÁVEL EM 08/09/2026 — a IA fica nomeada como pendência.**
>
> W01 **não depende** do reconhecimento por IA e **não fica bloqueada** por ele. A etapa entrega o
> caminho que já existe: CPF pelo Portal como caminho rápido; sem conclusão por CPF, envio de
> **arquivo único** e **decisão de operador** na fila de `/admissions`.
>
> **Consequência de implementação, obrigatória.** As telas de espera das pranchas 33, 38, 68 e 69
> **não podem afirmar análise por IA nem prometer prazo** — nesta entrega a análise é humana, e a
> guia já proíbe SLA inventado. Os estados de envio, processamento, resultado e reenvio de arquivo
> ilegível continuam valendo, com o **operador** como ator.
>
> Construir o reconhecimento por IA continua exigindo ADR aprovado com fornecedor, base legal,
> retenção, descarte e acesso mínimo. Nada disso foi decidido aqui — o que se decidiu foi **não
> construir agora**. Card `W01-ADMISSAO-MANUAL`; a pendência da IA vive em `BLOCK-LEGAL-AI`.

### 1.3 Textos legais para abertura pública

- **Estado:** `/privacidade` e `/codigo-de-conduta` servem documentos do disco e o aceite é
  versionado (`record_consent_acceptance`). O que falta é a revisão jurídica que autoriza abrir ao
  público.
- **Trava:** publicação (gate **G6**), não as etapas de construção.
- **Decide:** responsável + revisão jurídica. **Card:** `BLOCK-LEGAL-ENTRY`.

### 1.4 Superfície de escape do gate de rota

- **Estado:** `BIVAQUE_AUTH_BYPASS=true` desliga todo o gate (`proxy.ts:35-43`); todo `/api/*`
  escapa do proxy (`proxy.ts:20`), e `/api/localities*` não exige autenticação alguma.
- **Trava:** o gate **G6** proíbe declarar conclusão com o bypass ligado; falta a trava que impeça
  ligá-lo em ambiente implantado.
- **Decide:** responsável. **Card:** `PROXY-SURFACE-RISK`.

### 1.5 Fora de escopo desta entrega, registrado para não voltar por engano

Pagamento, monetização e alcance pago (`ADR-20260820-alcance-pago`, `BLOCK-ASAAS`): a
especificação vigente é explícita — Mercado conecta partes, **sem** checkout, custódia, comissão,
assinatura, selo, ranking ou estrelas.

---

## 2. Ambientes e integrações

| Dependência | Estado real | O que trava | O que destrava |
|---|---|---|---|
| **E-mail transacional (Resend)** | Adaptadores e outbox existem (`lib/outbox/adapters.ts`); **sem projeto de deploy, sem `RESEND_API_KEY`/`RESEND_FROM_EMAIL`**. Sem a chave o canal fica indisponível e as linhas reciclam — deliberado, não silencioso | Confirmação de e-mail (**W01**), convites de comunidade, família e evento (**W03**) | Criar o projeto de deploy e configurar as chaves; provar uma entrega real pelo outbox. Card `BLOCK-RESEND` |
| **Destinatários de convite** | `community_invite` enfileira `"owner-link@local"`; `event_invite` enfileira `"event-invite:{id}"` — nenhum é endereço | Mesmo com Resend configurado, esses dois convites **não podem ser entregues** | Card `OUTBOX-INVITE-RECIPIENTS` |
| **Portal da Transparência** | Integração server-side existe, chave é segredo de ambiente (`chave-api-dados`); testes usam fixtures | Verificação por CPF em ambiente implantado (**W01**) | Confirmar a chave no ambiente-alvo; `REPO-SECRETS-ROTATION` (P0) pede rotação |
| **Homologação / staging** | **Não existe** (risco D42 aceito historicamente) | O gate **G6** exige "prova em homologação" antes da publicação | Decisão do responsável: criar homologação, ou redefinir o que G6 aceita como prova |
| **`NEXT_PUBLIC_SITE_URL`** | Não confirmado no ambiente-alvo | O único e-mail que monta link (`provider_invite`) cai em `http://127.0.0.1:3000` se ausente | Configurar no ambiente de deploy |
| **WhatsApp** | Fora do escopo web | — | Card `BLOCK-WHATSAPP` |
| **Runtime mobile** | Fora do escopo desta entrega — a especificação admite **WEB CONCLUÍDO** com **MOBILE NÃO AVALIADO** | — | Cards `BLOCK-MOBILE-RUNTIME`, `S6-MOBILE-RUNTIME`, `MOB-001-SESSION` |

---

## 3. CI e prova externa — estado medido hoje

Corrige o que este agente afirmou antes: **a CI executa**; não está bloqueada por pagamento. Mas
está **vermelha**.

| Workflow | Estado |
|---|---|
| **Pull Request CI** | **8 execuções consecutivas com `failure`** (07 e 08/09), nenhuma verde na janela. A última (`codex/incorporar-guia-20260908`, 08/09 11:39) rodou 1h01: **470 E2E passaram, ~22 falharam — todas de `/consent`** (redirects de aceite, cabeçalho, adulteração de cookie) |
| **Deploy migrations (`main`)** | `failure` em 08/09 11:57 (após o merge do PR #55) e em 07/09 20:29 |
| **Claude Code Review** | `failure` nas mesmas execuções |
| **Dependabot Updates** | `success` |

**Consequências que precisam de decisão:**

1. O gate **G4** da especificação diz que "a CI da revisão candidata precisa passar antes do gate
   final de release" e que "falha anterior deve ser comprovada na base e resolvida ou manter a
   entrega bloqueada". Hoje a `main` está vermelha. **Nenhuma etapa pode fechar com prova de CI
   enquanto isso não for resolvido.**
2. As falhas de `/consent` são anteriores ao trabalho desta sessão e estão na `main` — não foram
   causadas pela correção de a11y do `/consent` (`6da3839`), que vive só nesta branch. Precisam ser
   confrontadas na base antes de qualquer conclusão sobre elas.
3. Não existe hoje a cadeia de revisão independente que o gate **G5** descreve. Enquanto uma sessão
   separada não revisar, o estado honesto de cada entrega é **"implementado; revisão independente
   pendente"**.

---

## 4. Leitura para quem executar W01

A próxima etapa é **acesso completo + operação de admissão**. Ela encontra, nesta ordem:

1. **Identidade por IA: já decidido (§1.2)** — fora de W01, nomeada como pendência. A etapa entrega
   o caminho manual. **As telas de espera não podem afirmar análise por IA nem prometer prazo.**
2. **Resend** — sem ele, confirmação de e-mail não tem prova de entrega real.
3. **CI vermelha** — nenhuma prova externa de W01 vale enquanto a base não estiver verde.
4. `ADR-20260907-login-com-senha` e `ADR-20260907-consentimento-no-cadastro` já estão `approved`:
   o mecanismo de entrada é **e-mail e senha** com Google, e o aceite integra o cadastro. A prancha
   36 mostra fluxo por código; a decisão posterior prevalece.
