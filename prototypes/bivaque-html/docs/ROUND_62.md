# Bivaque — Rodada 62: apagar a conta e Ajuda com Fale com a gente

Data: 18/10/2026. Contrato: `docs/agents/tasks/HTML-062.task.yml` (R3, com o
[ADR-20260816-forma-da-admissao](../../../docs/decisions/ADR-20260816-forma-da-admissao.md): a Ajuda fala de
CPF e a exclusão mexe em dados pessoais). Lote: `docs/LOTE_FUNCIONAL.md`.
Maquete aprovada: quadros 13 a 16 (`.visual/bivaque-html-funcional/maquete.html`). Decisão do usuário: a
confirmação de apagar é digitar APAGAR.
Base: HEAD `0612251a` (Rodada 59).

**Veredito: PASS.**

## O que mudou

Módulo novo `features/support/help.js` (mapa de módulos e contagem de fragmentos, 115, atualizados).

- **Ajuda** (`#ajuda`, quadro 13), aberta com e sem conta: quem saiu lê com o visual da entrada, como as
  páginas legais da R58 (`entryGate` deixa `ajuda`, `contato` e `chamados` passarem). Quatro temas (Conta e
  entrada; Comunidade; Anúncios e negócios; Segurança) abrem de 4 a 5 perguntas em sanfona (`#ajuda/<tema>`).
  As respostas só falam do que o app faz hoje: CPF conferido e não salvo, convite de família (7 dias, só para
  o e-mail convidado), documento na análise, editar e excluir, ocultar, grupos e encontros, anúncios, pedido
  de serviço, denúncia, privacidade, apagar a conta. Cartão "Não achou? Respondemos por e-mail em até 2 dias
  úteis." com **Fale com a gente** e linha **Meus chamados** ("1 em andamento", "Todos respondidos" ou
  "Nenhum chamado ainda"). Entradas: Você (linha Ajuda), Configurações (linha Ajuda) e o rodapé da landing.
- **Fale com a gente** (`#contato`, quadro 14): chips de assunto (Conta, Comunidade, Anúncios, Segurança,
  Outro; Conta vem marcado), texto obrigatório com no mínimo 10 caracteres (erro no campo, que some ao
  digitar), "A resposta vai para <e-mail da conta>" ou, sem conta, campo de e-mail obrigatório. Enviar grava
  `state.tickets=[{id,topic,text,at,status:'open',email}]`, avisa "Recebemos. Respondemos por e-mail em até 2
  dias úteis." e abre **Meus chamados** (`#chamados`) com o estado (Em andamento / Respondido, com a
  resposta). Falha de gravação: aviso, formulário aberto e o texto digitado fica.
- **Controles do protótipo → Simular resposta do suporte**: o chamado aberto mais antigo vira respondido
  (`status:'answered'`, `answeredAt`, `reply`) e cria um aviso "O suporte respondeu ao seu chamado sobre
  <assunto>." que abre Meus chamados. Sem chamado aberto, avisa e não cria aviso.
- **Apagar a conta** (`#apagar-conta`, quadro 15): linha em Configurações (vermelha). A tela explica as três
  consequências; "Digite APAGAR para confirmar" aceita qualquer caixa e espaços nas pontas; sem a palavra, erro
  no campo e nada muda. O botão vermelho grava tudo numa só `mutate` (`accountPurge`); se o armazenamento
  recusa, o aviso aparece, a tela continua e nada fica pela metade.
  - **Saem:** anúncios (e rascunhos), perguntas, página do negócio (`myBiz`), encontros que criei e pedidos
    de serviço.
  - **Ficam, sem o nome ("Membro que saiu", iniciais MS):** respostas, indicações de negócio, publicações e
    comentários de grupo. A contagem de indicações do negócio não muda.
  - **Apagados:** conversas, avisos, chamados, convites, alertas, buscas recentes, salvos e o último visto.
    Presença em encontros alheios, voto em enquete e participação em grupos são desfeitos.
  - **Limpos:** perfil (nome, e-mail, vínculo), `state.entry`; `signedOut=true` e `accountDeletedAt`.
- **Conta apagada** (`#entrar/apagada`, quadro 16): "Sua conta foi apagada." com **Voltar ao início**, que
  leva à landing. A tela sobrevive a recarregar. A conta apagada **não volta** pelo login (e-mail antigo e
  Google de teste dão "incorreto"/"conta apagada"); criar conta de novo funciona e limpa a marca.
- **Ícones:** só da fonte embutida. Fora dela: `shield` (usei `verified_user`), `mark_email_read` (`inbox`),
  `delete_forever` (`delete`), `support_agent`/`contact_support` (`support`), `expand_less` (a seta de
  `expand_more` gira).

## Decisões

- **Grupos:** a pessoa sai de todos (`on=false`, sem papel de admin); os grupos ficam. Um grupo criado por ela
  sem moderador fica sem admin até a R61 (encerrar grupo). Os grupos automáticos não voltam sozinhos
  (`leftAuto`).
- **Pedidos de serviço** saem junto dos anúncios (têm fotos e endereço do bairro); não estavam no quadro 15.
- **Controles do protótipo** só abrem para quem está dentro: depois de apagar, "Recomeçar do zero" fica
  acessível ao criar uma conta nova pela entrada.
- **Bloquear** não está na Ajuda: a função é da R60 e não existe nesta base. Ao juntar as rodadas, acrescente
  a pergunta em `HELP_TOPICS` (tema Segurança) e ajuste o subtítulo do tema ("Denunciar, privacidade, regras").
- **Pedir orçamento, denunciar** etc. são citados pelo nome do botão atual; a R63 revisa as promessas.

## Prova

`scripts/bivaque-html/round62-proof.mjs`, 12 checkpoints: Ajuda com conta e os quatro temas abrem (3 a 5
perguntas); Ajuda sem conta (visual da entrada, rodapé da landing, endereço direto); entradas por Você e
Configurações; Fale com a gente valida e grava; sem conta pede e-mail; Meus chamados mostra o estado;
Simular resposta (mais antigo, aviso que abre Meus chamados, sem chamado); apagar exige APAGAR; apagar remove,
anonimiza, apaga conversas e limpa (nenhum nome nem e-mail restam no armazenamento); conta apagada leva à
landing e não volta pelo login; falha de gravação não deixa nada pela metade (apagar e chamado).

Baseline (HEAD `0612251a`, 375 claro): 0 de 12 PASS (todos FAIL).

| Prova | Resultado (última linha lida) |
| --- | --- |
| Rodada 62 (375 e 1440, claro) | `PASS: 24/24 checkpoints; JS errors 0; external 0` |
| Rodada 58 (375 claro) | `PASS: 15/15 checkpoints; JS errors 0; external 0` |
| Rodada 56 (375 claro) | `PASS: 6/6 checkpoints; JS errors 0; external 0` |
| Rodada 55 (375 claro) | `PASS: 5/5 checkpoints; JS errors 0; external 0` |
| Testes do build (`test_build.py`, 20 testes) | `OK` |
| Gate completo (lint, tipos, testes, segredos) | `GATE VERDE (build não rodou).` O passo de build do app web é pulado por falta de `apps/web/.env.local`; não se aplica ao protótipo. |

Método do lote: a bateria completa de provas antigas roda uma vez no fechamento do lote, não por rodada.
