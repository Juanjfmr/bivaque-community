# Parecer preservado da sessão FIGMA-001

Sessão: `ses_ef034623effenMFt0z4oW2UVug`. Extração somente do último texto do parecer, sem ferramentas, prompts ou credenciais.
O texto abaixo é o parecer do modelo; limites e adjudicação constam no índice de rastreabilidade.

# Reavaliação do delta — FIGMA-001 (segundo parecer, mesma sessão)

**Candidato congelado:** `review-polish-snapshot.json` (31 hashes, HEAD `b9faf50c`, implementador `ses_ef0229…`, congelado ~07:29Z). Delta desde meu primeiro parecer = 7 arquivos novos + 8 alterados (`changedSinceProviderReview`), todos conferidos por leitura contra o `review-provider-snapshot.json`.

## Achados do primeiro parecer — resolução

| Achado | Status | Evidência |
|---|---|---|
| Acentos pt-BR nos avisos de denúncia (chat-thread.tsx) | **Resolvido** | `chat-thread.tsx:244-250` ("Você já denunciou…", "Você não pode denunciar…", "Não foi possível enviar a denúncia…"); spec `reports-member-flow.spec.ts:387-390` trava a string acentuada mantendo a prova de não-vazamento de diagnóstico interno |
| `nav-active` zero itens na nav do painel | **Resolvido** | `provider-nav.ts:39-47` (regra pura: prefixo mais longo vence, thread `/prestador/conversas/<id>` ativa Conversas, sufixo `/` impede vazamento de segmento, fallback Painel) + `provider-navigation.tsx` (um `aria-current`, foco visível, 120ms com `motion-reduce:transition-none`, tokens semânticos); unit `figma001-provider-nav.test.ts` (4 casos) + E2E asserindo contagem 1 em três estados (`conversas.spec.ts:238-270`); `final2-provider-inbox` sem finding `nav-active` |
| FIGMA-002 fora de `allowed_paths` | **Ratificado pelo Codex** (fora do meu escopo) | — |
| Lacuna de prova: gate no candidato final | **Suprida** | `candidate-polish-tool-proofs.json`: `gate` completo — "ok lint (7s) / typecheck (11s) / **build (89s)** / **test (68s)** / secrets (10s) → GATE VERDE" (~06:56Z); a rodada provider registra dois gates completos verdes adicionais |
| Lacuna de prova: E2E final da spec | **Suprida** | Provider: `--grep conversas` exit 0 com o spec já reescrito; polish: `--grep "conversas|move foco"` **39 passed** (~07:02Z) — 7 testes do spec ×3 + `move foco` ×3 + nav-invariant ×3 + shell-navigation ×9 + denials ×3. As linhas do log (487/433/378) batem com o arquivo atual; primeiro run teve 1 falha de infra (`openProviderConversation` `response.ok()` false, tablet-768) re-run verde isolado (3/3) e combinado (39/39) |

Notas que permanecem (não bloqueiam, sem mudança no delta): font 12px da prancha vs mín. 13 do auditor (findings medium em `final2-provider-inbox`); `initialsOf` duplicando `MemberAvatar`; N+1 de prévia por conversa; `no-transition` ×5/viewport no `/prestador` (ações pré-existentes da página, não do delta); kanban sem card do lote.

## Fronteiras — sem regressão

Nenhum arquivo `supabase/` tocado no delta; o diff do `(provider)/layout.tsx` só troca a nav inline pelo componente e **mantém** o gate de papel (`isProvider` → `/community`), o redirect sem sessão e o `ToastProvider`; `conversas-inbox.tsx`/`conversas-loaders.ts` ganham apenas `audience`/`inboxCopyFor` (copy; o mecanismo, as queries e o tratamento do param legado são idênticos); `prestador/conversas/page.tsx` só passa `audience="provider"`; boundaries `error/loading/not-found` são wrappers de `segment-fallbacks`. As provas negativas (42501 direto, `/community`, login, 404 honesto, offline/retry) continuam verdes no E2E final. Capturas finais todas válidas: `final-member-inbox/thread`, `final-provider-thread`, `final2-provider-painel/inbox/thread` — 0 invalid, 0 high; o thread do dono exibe "Diego Almeida" (o membro), confirmando a fronteira de nome por lado em runtime. Escopo: 100% dentro do `allowed_paths` ratificado (`FIGMA-001.task.yml:64-78`).

## Lacunas concretas e limites

1. **Limite para Flash (pedido explícito):** as capturas iniciais `final-provider-painel` (1 invalid, 21 high) e `final-provider-inbox` (2 invalid, 42 high) registraram página branca — "Expected heading not found" e 19 console errors HTTP 500 em mobile-375/tablet-768. A recaptura `final2-*` é válida, mas **não prova a causa eliminada**: o episódio não foi diagnosticado. A prova de runtime final deve carregar este limite — se reproduzir em `/prestador` ou `/prestador/conversas`, investigar, não descartar como resolvido.
2. **Sequência prova↔estado:** gate verde ~06:56 e E2E final ~07:02; congelamento ~07:29. Não há tool-proof entre 07:02 e 07:29; mitigatei confrontando cada asserção crítica dos runs verdes com o conteúdo atual dos arquivos (todas coincidem). Risco residual de edição cosmética pós-prova não é eliminável por leitura.
3. **Observação pré-existente (fora do delta, sem ação neste lote):** `reports-member-flow.spec.ts:337` chama `mintSession("visual@…", "bivaque-e2e-local")` — senha literal inline e segundo argumento além da assinatura (`mintSession(email: string)`); o teste `:330-344` não afirma o que o título promete. Ambos estão em HEAD (hash `f461de99`), não foram introduzidos pelo lote — sugiro card próprio.

## Veredito do delta

**PASS.** Os reparos resolveram os achados menores sem introduzir defeito novo nem regressão de fronteira, e as duas lacunas de prova maiores do primeiro parecer foram supridas com saída bruta de ferramenta (gate completo verde incluindo build/test/secrets; E2E final 39/39 incluindo todas as negações). Este PASS **não** fecha a tarefa: a prova de runtime final (Flash) permanece pendente, com o limite do HTTP 500 não diagnosticado registrado acima, e eu não autoaprovo UI por teste — captura/E2E não substituem a verificação de runtime do verificador.
