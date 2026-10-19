# Bivaque — Rodada 58: privacidade e conduta, pedido depois da escolha e ocultar pessoal

Data: 18/10/2026. Contrato: `docs/agents/tasks/HTML-058.task.yml` (R3, com o
[ADR-20260816-forma-da-admissao](../../../docs/decisions/ADR-20260816-forma-da-admissao.md): as
páginas de privacidade falam de CPF). Lote: `docs/LOTE_FUNCIONAL.md`.
Origem: `docs/AUDITORIA_FUNCIONAL_2026-10-18.md`, itens A4, A5 e A6. Maquete aprovada: quadros 7, 8, 9
e 10 (`.visual/bivaque-html-funcional/maquete.html`).
Base: HEAD `04845c92` (Rodada 57), build sem alterações com SHA256 `5aeeed7e…`.

**Veredito: PASS.**

## O que mudou

### A4. Política de privacidade e Código de conduta legíveis

- Duas rotas novas, `#privacidade` e `#conduta` (`features/legal/pages.js`), com texto curto e a
  marca "Versão de teste · 18/10/2026". Privacidade: o que guardamos (o CPF só confirma o vínculo e
  não fica salvo), quem vê (o bairro só aparece se a pessoa permitir), seus direitos e o que vale neste
  teste. Conduta: respeito, nada de discriminação, dados de outras pessoas, comércio honesto e como
  denunciar.
- **Abrem para quem saiu e para quem entrou.** `entryGate` deixa as duas rotas passarem. Para quem
  saiu, a página usa o visual da entrada (sem a barra do app, com o botão de voltar); para quem
  entrou, usa a barra do app. Também abrem pelo endereço direto.
- **Os nomes no aceite viram links** (cadastro, aceite do Google e convite familiar). Ao tocar, a
  entrada guarda o que foi digitado (nome, e-mail, senha, código) e a caixa do aceite **só na
  memória** da página e devolve tudo ao voltar, no mesmo passo. A caixa não é marcada nem desmarcada
  pelo toque no link. A senha nunca vai para o armazenamento; o rascunho é descartado ao voltar ou ao
  sair do fluxo.
- Links também em Você → Configurações (junto de Ocultados) e no rodapé da landing da entrada.

### A5. Pedido depois da escolha

- Com a proposta escolhida, o pedido mostra o cartão do prestador com **Serviço concluído**,
  **Conversar com o prestador** e **Desistir desta proposta** (quadro 9).
- **Serviço concluído**: o pedido passa a `done` ("Concluído" no detalhe e na lista de pedidos), com
  aviso e Desfazer. Concluído ainda permite conversar com o prestador.
- **Conversar com o prestador**: reaproveita `contact('biz', …)`, que abre a conversa da escolha (ou
  cria uma, como o app já faz em Negócios).
- **Desistir desta proposta**: pede confirmação; marca a proposta como desistida (`gaveup`), tira-a da
  lista e reabre o pedido. As outras propostas recusadas pela escolha e ainda válidas voltam a
  `sent`. Se o prazo do pedido (`expiresAt`) já passou, ele fica encerrado ("Expirado") e nenhuma
  proposta volta. O aviso diz o resultado.
- **Proposta vencida** (`validUntil` anterior a hoje): aparece como "Vencida", sem botão Escolher; a
  ação recusa com o aviso "venceu em … e não pode ser escolhida", também na confirmação. Fica fora dos
  destaques de menor valor e data mais cedo.
- **Lado do prestador**: a empresa desistida recebe "O cliente desistiu da sua proposta…"; a que
  voltou à lista, "Sua proposta … voltou à lista: o cliente reabriu o pedido." (`requestGaveUpNotice`,
  junto de `requestDeclinedNotice`). A proposta desistida não conta no limite de cinco e a empresa
  pode enviar outra.

### A6. "Ocultar" pessoal com Desfazer

- Deslizar e tocar em Ocultar grava `hiddenByMe` (data) em vez de `hidden`. `hidden` volta a ser só da
  moderação. A pergunta some das listas da pessoa (`cityAsks`: Comunidade, Início, busca e paleta) e
  do bloco de perguntas da página do negócio, com o aviso "Pergunta ocultada para você." e Desfazer.
- **Endereço direto** de pergunta ocultada abre normalmente, com a faixa "Você ocultou esta pergunta"
  e **Mostrar**. Não fala em moderação.
- **Configurações → Ocultados** (`#ocultados`, quadro 8): lista com data e **Mostrar** por item.
- Em Minhas perguntas e indicações a pergunta própria continua aparecendo (é o histórico da pessoa e
  o contador "suas perguntas" a conta); a faixa e o Mostrar aparecem ao abri-la.

## Decisões da rodada

- `hiddenByMe` fica no próprio registro da pergunta, neste aparelho. No back-end é um vínculo
  pessoa-pergunta (tabela própria), não um campo da pergunta.
- Páginas legais como rotas próprias (`privacidade`, `conduta`), não `entrar/…`: precisam abrir para
  os dois estados sem depender do passo da entrada.
- O texto é de versão de teste: a versão final é do jurídico.
- Dois módulos novos (`features/legal/pages.js`, `features/profile/hidden.js`); o mapa de módulos e a
  contagem de fragmentos (113) foram atualizados.

## Prova

`scripts/bivaque-html/round58-proof.mjs`, 15 checkpoints (links do aceite abrem e voltam sem perder o
formulário, também no aceite do Google; páginas com e sem conta e pelo rodapé da landing; links em
Configurações; concluir; conversar; desistir reabre; desistir depois do prazo; proposta vencida;
aviso ao prestador; ocultar com Desfazer; endereço direto sem "moderação"; remoção pela moderação
intacta; Ocultados → Mostrar).

Baseline (antes das mudanças, 375 claro): 14 de 15 FAIL; o controle negativo da moderação passa.

| Prova | Resultado (última linha lida) |
| --- | --- |
| Rodada 58 (375 e 1440, claro) | `PASS: 30/30 checkpoints; JS errors 0; external 0` |
| Rodada 02 (375 claro) | `PASS: 12/12 checkpoints; JS errors 0; external 0` |
| Rodada 10 (375 claro) | `PASS: 12/12 checkpoints; JS errors 0; external 0` |
| Rodada 11 (375 claro) | `PASS: 13/13 checkpoints; JS errors 0; external 0` |
| Rodada 12 (375 claro) | `PASS: 9/9 checkpoints; JS errors 0; external 0` |
| Rodada 16 (375 claro) | `PASS: 9/9 checkpoints; JS errors 0; external 0` |
| Rodada 54 (375 claro) | `PASS: 6/6 checkpoints; JS errors 0; external 0` |
| Rodada 55 (375 claro) | `PASS: 5/5 checkpoints; JS errors 0; external 0` |
| Rodada 56 (375 claro) | `PASS: 6/6 checkpoints; JS errors 0; external 0` |
| Rodada 57 (375 claro) | `PASS: 8/8 checkpoints; JS errors 0; external 0` |
| Rodada 17 (375 claro) | `PASS: 8/8 checkpoints; JS errors 0; external 0` |
| Rodada 04 (375 claro) | `PASS: 14/14 checkpoints; JS errors 0; external 0` |
| Rodada 05 (375 claro) | `PASS: 12/12 checkpoints; JS errors 0; external 0` |
| Rodada 06 (375 claro) | `PASS: 6/6 checkpoints; JS errors 0; external 0` |
| Rodada 53 (375 claro) | `PASS: 4/4 checkpoints; JS errors 0; external 0` |
| Rodada 49 (375 claro) | `PASS: 12/12 checkpoints; JS errors 0; external 0` |
| Testes do build (`test_build.py`, 20 testes) | `OK` |
| Gate completo (lint, tipos, testes, segredos) | `GATE VERDE (build não rodou).` O passo de build do app web é pulado por falta de `apps/web/.env.local`; não se aplica ao protótipo. |

Nenhuma prova antiga precisou de adaptação: as de entrada (54 a 56) clicam em `#en-consent`, que
continua igual; as de pedido (11, 16) escolhem propostas com validade futura.

