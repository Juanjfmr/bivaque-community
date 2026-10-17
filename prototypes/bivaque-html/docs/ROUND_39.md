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
