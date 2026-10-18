# Bivaque — Rodada 60: bloquear, denunciar e consequência no Painel

Data: 18/10/2026. Contrato: `docs/agents/tasks/HTML-060.task.yml` (R2). Lote: `docs/LOTE_FUNCIONAL.md`.
Origem: `docs/AUDITORIA_FUNCIONAL_2026-10-18.md`, seção C (bloquear e denunciar; consequência no Painel).
Maquete aprovada: quadros 3, 4, 5 e 6 (`.visual/bivaque-html-funcional/maquete.html`).
Base: HEAD `0612251a` (Rodada 59), build `9f0674e8…`. Candidato: build `3402aae2…`.

**Veredito: PASS.**

## O que mudou

### Bloquear pessoa (código novo em `features/profile/blocks.js`)

No protótipo a pessoa é o nome que aparece no conteúdo; a lista é `state.blocked=[{name,at}]`.

- **Pontos de entrada:** ⋮ em resposta, comentário e publicação de outra pessoa (**Denunciar …** e
  **Bloquear X**, no popover do ⋮ da R59); menu da conversa; página do anúncio e da pergunta de outra
  pessoa (botão ao lado de Denunciar). Nunca se oferece bloquear a si mesmo, nem autores de exemplo
  ("Relato da comunidade", "Comunidade de Manaus": só nome + inicial conta como pessoa).
- **Confirmação** (quadro 4): "Bloquear Jéssica L.?" com os dois parágrafos do quadro, **Cancelar** e
  **Bloquear** (botão normal, não vermelho). `confirm()` passou a quebrar o texto em parágrafos quando
  ele tem `\n`; sem `\n` o HTML é o mesmo de antes. Aviso "X bloqueada." com Desfazer. Ninguém é avisado.
- **Some para quem bloqueou:** perguntas, anúncios (`cityAsks`/`cityItems`, então Comunidade, Resolvidas,
  Início, busca, paleta, Desapegos, Imóveis, comparar e Salvos), respostas e comentários (contadores
  descontam), publicações de grupo (feed, "Próximo encontro", Início do desktop). O detalhe aberto pelo
  endereço, por aviso ou por Retomar mostra **"Conteúdo de uma pessoa que você bloqueou"** com
  **Ver mesmo assim**; com a escolha, o conteúdo abre com a faixa "Você bloqueou X" e Desbloquear (só
  vale até recarregar).
- **Conversa** (quadro 6): a caixa de mensagem dá lugar a "Você bloqueou X." + **Desbloquear**. A lista
  mostra "Você bloqueou esta pessoa" no lugar da última mensagem. Enviar e "Simular resposta" são recusados.
  `contact()` (Tenho interesse, oferta, visita, orçamento) recusa com aviso e não cria conversa.
- **Configurações → Pessoas bloqueadas** (quadro 5, rota `bloqueados`): "Quem você bloqueou não vê que foi
  bloqueado.", lista com "Bloqueada em dd/mm" e **Desbloquear**; desbloquear devolve tudo; vazio: "Ninguém
  bloqueado".
- **Menu da conversa** virou o popover do ⋮ (antes era uma folha): Marcar como (não) lida, **Fixar
  conversa**, **Denunciar conversa**, **Bloquear X** (vira **Desbloquear X**), **Apagar conversa** (vermelho).

### Denunciar o que não dava

Resposta, comentário, publicação de grupo e conversa, pelo fluxo `openReport`/`submitReport` que já existia.
Os alvos que moram dentro de outro registro levam o id dos pais separado por `~` (`pergunta~resposta`,
`grupo~publicação~comentário`). A denúncia nova guarda o **título** do alvo (`label`) para o caso de o
autor excluir o conteúdo depois. Chega à fila com título e alvo legíveis: "Resposta de Mônica L. · “…”",
"Comentário/Resposta de …", "Publicação de Ana P. · “…”", "Conversa com Marcos T.".

### Consequência no Painel (`features/owner/`)

| Tipo | Consequência | Efeito |
| --- | --- | --- |
| anúncio, pergunta | Remover (como antes) | some para todos |
| resposta, comentário, publicação | **Remover** | some das contas; "Resposta/Comentário/Publicação removida pela moderação." no lugar; o endereço da publicação abre "Publicação removida" |
| pedido, proposta | **Remover** | pedido: "Pedido removido", sai das listas do cliente e dos prestadores; proposta: sai da comparação (proposta já escolhida: o pedido volta a ficar aberto) |
| negócio | **Suspender página** | sai do catálogo, da busca, da aba de negócios e dos pedidos elegíveis; a página mostra "Página suspensa pela moderação" e sem contato |
| conversa | **Advertir** | registra a advertência (`state.owner.warnings`), entra no registro do Painel e em Decididas; a conversa não é mexida |
| qualquer | Dispensar | fecha as denúncias, sem consequência |

Remover, Suspender e Advertir pedem motivo. **Desfazer** (Filas → Decididas) devolve cada consequência
(`undo.mod` guarda o campo e o valor anterior; a advertência sai da lista) sem tocar em outro conteúdo.
**Alvo excluído pelo autor** (R59): a revisão diz "O conteúdo já foi excluído pelo autor.", não pede motivo
e só oferece **Dispensar**; o título vem do `label` guardado (ou "Conteúdo denunciado" para denúncia sem
título). O id de decisão `owner-decide` passou a separar a decisão pelo **último** `~`.

## Decisões

- **Menu da conversa com 5 itens:** o quadro 6 tem 4; mantive "Marcar como (não) lida" no topo porque a
  R39 oferecia isso no menu e, no desktop, é o único caminho (o deslizar é só do celular).
- **Ícone de bloquear:** `block`, `person_remove` e `person_off` não existem na fonte embutida; usei
  `cancel`. Suspender página não usa ícone novo.
- **Gênero nas frases** ("dela/dele", "Bloqueada/Bloqueado em"): nome que termina em "a" vira feminino.
  É limite do protótipo; no back-end vem do cadastro.
- **Botão Bloquear na pergunta de outra pessoa** (além dos pontos pedidos), ao lado de "Denunciar pergunta".
- **Eventos da Agenda** não têm autor no protótipo e não entram no bloqueio.
- A cópia de bloqueio é por nome: bloquear um nome de negócio que aparece como contato da conversa
  (ex.: "Amazon Climatização") recusa contato novo com ele, mas não esconde a página do negócio.
- A "advertência" no protótipo é um registro local; o aviso à pessoa advertida é do back-end.

## Prova

`scripts/bivaque-html/round60-proof.mjs`, 14 checkpoints, um por comportamento: menu de resposta e
confirmação com os dois parágrafos; bloquear pelo anúncio some de Comunidade, Resolvidas, busca,
Desapegos, grupo e conversas, e o detalhe pede confirmação (Ver mesmo assim, recarregar volta ao aviso);
menus de publicação e comentário de grupo; menu da conversa e conversa bloqueada sem caixa (com
Desbloquear); contato recusado (anúncio, visita e negócio) sem criar conversa; Configurações → Pessoas
bloqueadas e desbloquear devolve tudo; nada de bloquear a si mesmo; denunciar resposta, comentário,
publicação e conversa chega ao Painel (e a repetição não duplica); remover resposta, comentário e
publicação com o aviso no lugar; advertir ou dispensar conversa; suspender negócio (catálogo, busca,
página); remover proposta e pedido; desfazer cada consequência (inclusive proposta escolhida); denúncia
de conteúdo excluído só dispensa.

Baseline (HEAD `0612251a`, 375 claro): 0 de 14 PASS.

Provas antigas adaptadas, com comentário no arquivo: `round39-proof.mjs` (o menu da conversa é o
popover: `#create-menu` no lugar de `#dialog`) e `round41-proof.mjs` (a folha que encolhe a página passou a
ser a das Configurações, já que o menu da conversa deixou de ser folha).

| Prova | Resultado (última linha lida) |
| --- | --- |
| Rodada 60 (375 e 1440, claro) | `PASS: 28/28 checkpoints; JS errors 0; external 0` |
| Rodada 50 (375 claro) | `PASS: 4/4 checkpoints; JS errors 0; external 0` |
| Rodada 49 (375 claro) | `PASS: 12/12 checkpoints; JS errors 0; external 0` |
| Rodada 39 (375 claro, adaptada) | `PASS: 4/4 checkpoints; JS errors 0; external 0` |
| Rodada 41 (375 claro, adaptada) | `PASS: 8/8 checkpoints; JS errors 0; external 0` (antes do último rebuild, que só mudou Salvos) |
| Testes do build (`test_build.py`, 20 testes) | `OK` |
| Gate completo | `GATE VERDE (build não rodou).` O passo de build do app web é pulado por falta de `apps/web/.env.local`; não se aplica ao protótipo. |

Também rodaram verdes durante o desenvolvimento, antes do último rebuild: rodadas 001, 01 a 24 (375 claro).
Por ajuste de método, a bateria completa fica para o fechamento do lote.
