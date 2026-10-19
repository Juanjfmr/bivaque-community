# Bivaque — Rodada 59: editar e excluir o que publicou

Data: 18/10/2026. Contrato: `docs/agents/tasks/HTML-059.task.yml` (R2). Lote: `docs/LOTE_FUNCIONAL.md`.
Origem: `docs/AUDITORIA_FUNCIONAL_2026-10-18.md`, seção C (primeira linha). Maquete aprovada: quadros 1 e 2
(`.visual/bivaque-html-funcional/maquete.html`).
Base: HEAD `09e27711` (Rodada 58), build sem alterações com SHA256 `cbe06eab…`.

**Veredito: PASS.**

## O que mudou

Anúncios já tinham editar e excluir; perguntas, respostas, publicações, comentários e encontros de grupo
não. Agora quem publicou edita e exclui o que publicou. O menu ⋮ só aparece para o autor (`mine`) e,
com a cidade em modo consulta, não aparece. Conteúdo de outra pessoa não mudou (denunciar e bloquear é a
R60). Código novo em `features/community/manage.js`.

- **Pergunta** (quadro 1): ⋮ na barra de cima da pergunta que é minha, com **Editar pergunta**, **Marcar
  como resolvida** (vira **Reabrir pergunta** quando já está resolvida), **Compartilhar** e **Excluir
  pergunta** (em vermelho). O menu é a folha de opções que o app já usa (`openCreate`), ganhou só a marca
  de item perigoso. Editar abre o editor com o texto preenchido e grava no mesmo registro; a pergunta
  mostra "editada". Texto curto demais não salva.
- **Excluir pergunta** (quadro 2): confirmação "Excluir pergunta?" com "A pergunta e as 2 respostas saem
  da comunidade. Isso não pode ser desfeito.", botões **Cancelar** e **Excluir** (vermelho). A pergunta sai
  do armazenamento, então some junto das listas (Comunidade, Início, Minhas), da busca e da paleta, da
  página do negócio que a citava, de Retomar e das seguidas. O aviso que apontava para ela deixa de abrir
  (o resolvedor de avisos devolve "O conteúdo deste aviso não está mais disponível") e o endereço antigo
  abre "Conteúdo indisponível". Publicação de grupo que tinha mandado a pergunta à cidade perde só o
  atalho. Depois de excluir, o app volta à Comunidade e avisa "Pergunta excluída."
- **Resposta minha** numa pergunta (de qualquer pessoa): ⋮ só nas minhas, com **Editar resposta** e
  **Excluir resposta** (confirmação). Se a resposta excluída era a marcada como solução, a pergunta volta
  a "sem solução" (`status` aberto, nenhuma resposta destacada) e a confirmação avisa antes.
- **Publicação minha em grupo**: ⋮ no cartão, com Editar e Excluir (confirmação). Nomes pelo tipo:
  publicação, pergunta, enquete, encontro. **Enquete**: com votos só o texto muda (as opções aparecem
  fixas e os votos ficam); sem votos as opções também mudam, com o mínimo de duas. **Pergunta** enviada
  também à cidade: a cópia em Indicações é independente; a confirmação diz que ela continua lá.
- **Comentário meu** numa publicação (resposta, se a publicação é uma pergunta): ⋮ com Editar e Excluir.
  Os contadores saem da própria lista, então ficam coerentes na página e no feed. Excluir o comentário que
  resolveu reabre a publicação e retira a indicação que ele tinha dado ao negócio marcado.
- **Encontros**: o encontro que criei em grupo tem **Editar encontro** e **Cancelar encontro**; o da Agenda
  já tinha os dois e ganhou o aviso. Mudar data, horário ou local, ou cancelar, avisa quantas pessoas que
  confirmaram "foram avisadas" (aviso local; no modo teste ninguém recebe nada). Só mudar o texto não avisa.
  Data passada não passa. Na Agenda, `going` conta a própria pessoa e o número de avisadas é `going - 1`.
- **Marca de editado**: "editada" (pergunta, resposta, publicação) e "editado" (comentário) ao lado da
  data.
- **Confirmação destrutiva**: `confirm(título, texto, fn, {ok, cancel, danger})` aceita rótulos e o botão
  vermelho; sem o quarto argumento continua "Continuar / Confirmar". O resto do app não mudou.
- **Armazenamento falhando**: toda edição e exclusão passa por `mutate`; se o armazenamento recusa, o
  aviso "Não foi possível salvar…" aparece, o editor continua aberto com o texto e nada sai da tela.

## Decisões

- **Excluir tira o registro de vez** (como o anúncio), sem Desfazer: o quadro 2 diz "não pode ser
  desfeito". Uma denúncia de demonstração apontando para a pergunta fica na fila do Painel com o título
  genérico; denúncia e exclusão pelo autor se cruzam na R60.
- **Marcar como resolvida pelo menu** não escolhe resposta: a pergunta fica resolvida sem solução
  destacada. Para destacar uma, o botão "Ajudou a resolver" da resposta continua.
- **Folha de opções**: o app não tem folha de baixo; o menu usa o popover do `openCreate`, igual ao menu
  do grupo e do anúncio. Na barra do desktop a busca continua ao lado do ⋮.
- A cópia da pergunta de grupo em Indicações **não acompanha** a edição nem a exclusão da publicação.

## Prova

`scripts/bivaque-html/round59-proof.mjs`, 14 checkpoints, um por comportamento: menu do autor com os quatro
itens e ícones; menu ausente em conteúdo alheio (pergunta, resposta, publicação, comentário, encontro) e
presente só no meu; editar pergunta no mesmo registro; resolver e reabrir; excluir pergunta com
confirmação, Cancelar sem efeito, e some das listas, da busca, da página do negócio, de Retomar, do aviso
e do endereço antigo; editar e excluir resposta; excluir a solução volta a sem solução; publicação criada
pela tela, editada e excluída; comentário criado pela tela, editado e excluído com contadores; comentário
que resolveu; enquete com votos e sem votos; encontro de grupo e da Agenda avisando quem confirmou;
armazenamento falhando sem perder nada.

Baseline (HEAD `09e27711`, 375 claro): 0 de 14 PASS (todos FAIL).

| Prova | Resultado (última linha lida) |
| --- | --- |
| Rodada 59 (375 e 1440, claro) | `PASS: 28/28 checkpoints; JS errors 0; external 0` |
| Rodada 58 (375 claro) | `PASS: 15/15 checkpoints; JS errors 0; external 0` |
| Rodada 57 (375 claro) | `PASS: 8/8 checkpoints; JS errors 0; external 0` |
| Rodada 47 (375 claro) | `PASS: 4/4 checkpoints; JS errors 0; external 0` |
| Rodada 42 (375 claro) | `PASS: 6/6 checkpoints; JS errors 0; external 0` |
| Rodada 41 (375 claro) | `PASS: 8/8 checkpoints; JS errors 0; external 0` |
| Rodada 38 (375 claro) | `PASS: 3/3 checkpoints; JS errors 0; external 0` |
| Rodada 37 (375 claro) | `PASS: 8/8 checkpoints; JS errors 0; external 0` |
| Rodada 36 (375 claro) | `PASS: 3/3 checkpoints; JS errors 0; external 0` |
| Rodada 35 (375 claro) | `PASS: 9/9 checkpoints; JS errors 0; external 0` |
| Rodada 32 (375 claro) | `PASS: 4/4 checkpoints; JS errors 0; external 0` |
| Rodada 22 (375 claro) | `PASS: 6/6 checkpoints; JS errors 0; external 0` |
| Rodada 17 (375 claro) | `PASS: 8/8 checkpoints; JS errors 0; external 0` |
| Rodada 13 (375 claro) | `PASS: 16/16 checkpoints; JS errors 0; external 0` |
| Rodada 11 (375 claro) | `PASS: 13/13 checkpoints; JS errors 0; external 0` |
| Rodada 09 (375 claro) | `PASS: 4/4 checkpoints; JS errors 0; external 0` |
| Rodada 07 (375 claro) | `PASS: 8/8 checkpoints; JS errors 0; external 0` |
| Rodada 06 (375 claro) | `PASS: 6/6 checkpoints; JS errors 0; external 0` |
| Rodada 05 (375 claro) | `PASS: 12/12 checkpoints; JS errors 0; external 0` |
| Rodada 04 (375 claro) | `PASS: 14/14 checkpoints; JS errors 0; external 0` |
| Rodada 01 (todos os contextos, o roteiro ignora a variável) | `PASS: …\.visual\bivaque-html-round01\independent-functional` |
| Testes do build (`test_build.py`, 20 testes) | `OK` |
| Gate completo (lint, tipos, testes, segredos) | `GATE VERDE (build não rodou).` O passo de build do app web é pulado por falta de `apps/web/.env.local`; não se aplica ao protótipo. |

Nenhuma prova antiga precisou de adaptação: as que tocam perguntas, grupos e encontros usam os botões que
continuam iguais; a confirmação padrão manteve "Continuar / Confirmar".
