# Bivaque — Rodada 39: deslizar nas conversas

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-039.task.yml` (R1). Base: `987f7c03`.
Lote mobile. Referências: Telegram, Mensagens e Fiverr, no Mobbin.

**Veredito: PASS.**

## Correção da auditoria

A auditoria do celular disse que faltava deslizar nas conversas. Estava errada. O gesto existe
desde o protótipo original (`motion/gestures.js`):
- nas conversas, Fixar e Apagar;
- nas indicações, Seguir e Ocultar;
- também existem o toque longo nos cartões e o voltar pela borda.

Como os gestos não aparecem em captura, a auditoria não os viu. Esta rodada melhora o gesto em
vez de criá-lo.

## O que mudou

- **"Não lida / Lida"** no deslizar, antes de Fixar e Apagar. A mesma ação entrou no menu ⋮,
  que é a alternativa ao gesto para teclado e leitor de tela.
- **Dica na primeira visita:**
  - na primeira vez que a pessoa abre Conversas no celular, a primeira linha desliza um pouco e
    volta, mostrando que há ações escondidas;
  - uma vez por aparelho, nunca no desktop nem com movimento reduzido.
- **Defeito corrigido, já existente:**
  - com mouse ou trackpad, o clique gerado ao soltar o arrasto fechava a linha na mesma hora;
  - agora ela fica aberta;
  - no toque nada muda.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 39 (4 verificações; 375 e 1440, claro) | PASS, 8/8 |
| Gate completo | PASS |

Captura: `.visual/bivaque-html-round39/telas/conversas-deslizar.png`.

## Fechamento do lote mobile (rodadas 35 a 39)

Uma revisão para o lote todo e a bateria completa (375 claro, 768 claro e 1440 escuro).

### Correções da revisão (nenhum item crítico ou alto)

| Severidade | Problema | Correção |
| --- | --- | --- |
| Média | Girar o celular na conversa deixava a caixa de texto do outro formato | A conversa se refaz quando a largura cruza 720 px |
| Média | O enviar descia junto com a mensagem de erro | O botão fica preso ao topo da pílula |
| Média | Foco ia para a cópia escondida do ⋮ ao fechar o menu, no desktop | O foco escolhe o botão à vista, no quadro seguinte ao desenho |
| Média | Tocar no nome "Criar" embaixo do círculo não fazia nada | Abre o Criar, com o mesmo bloqueio do botão |
| Média | Sem contador no celular, e o rascunho podia crescer sem limite | Contador a partir de 1.800 caracteres e rascunho salvo com no máximo 2.000 |
| Média | No teclado do celular, Enter sempre enviava | No toque, Enter quebra a linha e o envio é pelo botão |
| Baixa | Exemplos da busca citavam bairros de Manaus em qualquer cidade e giravam sem parar | Exemplos gerais; uma volta só, parando com foco ou mouse em cima |
| Baixa | O nome do título da Início levava o rótulo do botão de cidade | O botão usa `aria-haspopup` e `title`, sem `aria-label` |
| Baixa | A dica do deslizar brigava com o dedo | Tocar na linha cancela a dica |
| Baixa | Avatar e luz da aba ativa sumiam em alto contraste | Borda e cor de sistema em `forced-colors` |

**Itens da revisão sem mudança:**
- **Faixas de aviso pessoal no celular:** respostas e propostas também chegam como aviso no
  sino, então a decisão de deixar os avisos só no sino vale para elas.
- **Cidade fora da barra:** foi o desenho aprovado. A bateria pediu um ajuste nele, descrito
  abaixo.
- **Botões escondidos dos deslizáveis na ordem do Tab:** ficam para depois. Nas conversas, as três
  ações também estão no ⋮; nas indicações, não confirmei se há outro caminho.

### Pego pela bateria

- **Cidade de consulta (Rodada 01):**
  - ao ver outra cidade, o celular não mostrava qual era;
  - agora a cidade volta para a barra nas telas internas quando a pessoa está numa cidade de
    consulta;
  - na cidade de casa, ela continua só no título da Início.
- **Provas antigas atualizadas** para as mudanças intencionais:
  - Rodada 13 (título do celular);
  - Rodada 19 (cartões da Início do celular);
  - Rodada 20 (o clique fora passou a usar o aviso de segurança, porque o cabeçalho da conversa
    sai da vista no celular).
- **Regressão minha durante as correções:**
  - o foco passou a exigir o botão já desenhado e deixou de ir para a aba nova da Comunidade;
  - a escolha agora espera o quadro seguinte e tem reserva.

### Resultado

| Prova | Resultado |
| --- | --- |
| Bateria das rodadas 001 a 39 | PASS, depois das correções |
| Execução da referência congelada | FAIL esperado (defeito conhecido do original) |
| Gate completo | PASS |
