# Auditoria visual — lote de cinco telas da reconstrução web

> Run final: `.visual/2026-09-09T01-01-35-567Z/` · **ITERATION COMPLETE, 0 findings high**
> Revisões avaliadas: `86e24ad` (quatro telas), `501813e` (guia), `813b4a9` (transições)
> Stack local autenticada, 308 perfis, captura em 375/768/1440.

## Veredito por tela

| Tela | Prancha | Mecânica | Revisão independente |
|---|---|---|---|
| `/inicio` | 01 | limpa | `deepseek-v4-pro` — 6 achados, 3 refutados por evidência |
| `/explorar` + `/explorar/servicos` | 61 | limpa após correção | `glm-5.2` — **PASS-com-ressalva**, 5 achados baixa/informativo |
| `/communities` | 42 | limpa | pendente |
| `/notifications` | 54 | limpa | pendente |
| `/guide` | 12 | limpa | pendente |

Total do repositório: **36 → 12 findings**, 0 `high`, depois de fechar as oito transições
ausentes em `/explorar`.

## Achados refutados com evidência

O revisor do `/inicio` levantou três pontos e, em todos, declarou honestamente que não podia
verificar porque o artefato não estava no diff. Verificados aqui:

1. **"Teste unitário ausente" (HIGH)** — `tests/unit/ui/inicio-recon.test.tsx` **existe**. Foi
   criado por outra sessão, fora do diff entregue ao revisor.
2. **"Rotas não verificadas"** — `/guide`, `/recommendations` e `/events` **existem**.
3. **"Vazamento no feed depende de RLS não verificável"** — `feed_community`
   (`20260821000000_community_feed_locality_reach.sql`) é `security definer` e filtra
   `user_id = (select auth.uid()) and status = 'approved'` contra `community_memberships`.
   **Não há vazamento.**

O padrão vale registrar: o revisor acertou ao não afirmar. O erro de montagem foi meu — entreguei
um diff sem o contexto de que ele depende, o mesmo erro da rodada da sidebar, em outra direção.

## Dívida real que sobrou, sem correção nesta leva

- Cast duplo `as unknown as` no retorno de `search_providers` — se a assinatura do RPC mudar, o
  cast esconde. Caminho: gerar tipos e tipar sem cast.
- `createBrowserClient()` no corpo do componente, em quatro arquivos — cria cliente a cada render.
  Padrão pré-existente no repositório, não introduzido aqui.
- N+1 em `createSignedUrl` por prestador; `createSignedUrls` batcha.
- `not-found.tsx` de `/explorar/servicos` é boundary que nunca dispara.

## Desvios da prancha, justificados pelo contrato

Nenhum é omissão: em cada caso, renderizar exigiria inventar dado que não existe.

- Destaques editoriais de `/explorar` e do `/guide`, e "Profissionais em destaque".
- Localidade do prestador nas fichas — `search_providers` não a retorna e `provider_profiles`
  não tem coluna de bairro.
- Aba Mercado e "Sugerir referência" no guia — a primeira não tem rota, a segunda levaria à fila
  do operador, não do membro.
- Categorias Mercado e Moradia em `/explorar` aparecem **sem link e sem seta**, em vez de
  prometer destino.

## O que esta auditoria NÃO prova

- **E2E não rodou** neste lote. `test:db` foi cancelado deliberadamente ao ser disparado com a
  captura de pé — é a armadilha do perfil fantasma documentada no `AGENTS.md`, e teria produzido
  seis asserts vermelhos com aparência de regressão real.
- **Revisão independente de `/communities`, `/notifications` e `/guide`** ainda não aconteceu.
- Fidelidade visual fina contra as pranchas é julgamento humano; a auditoria mecânica cobre
  contraste, alvo, sobreposição, tamanho de texto e movimento, não composição.
