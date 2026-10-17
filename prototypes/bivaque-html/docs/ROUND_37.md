# Bivaque — Rodada 37: conversa no celular

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-037.task.yml` (R2). Base: `483d7a33`.
Lote mobile. Referências: Luma, Fresha e Insight Timer (pessoa na barra e caixa em pílula);
Vinted e Uber (aviso de segurança), no Mobbin.

**Veredito: PASS.**

## O que mudou

- **Barra, no celular:**
  - mostra o avatar, o nome da pessoa e o assunto ("Paulo R. · Berço com colchão") no lugar
    de "Conversa";
  - o ⋮ da conversa vem para a barra.
- **Cabeçalho da página:** sai da vista no celular. O título continua para o leitor de tela e
  para o foco, e o ⋮ repetido sai da ordem do teclado.
- **Caixa de texto, no celular:**
  - vira uma pílula com o enviar redondo dentro;
  - sem o rótulo flutuante, sem a dica "Enter envia · Shift+Enter" e sem o contador "0/2000";
  - o limite de 2.000 caracteres continua valendo no envio, com o mesmo aviso.
- **Aviso de segurança** no começo de toda conversa, também no desktop: "Nunca pague
  adiantado nem envie documentos pelo chat. Combine a entrega em local público."
- **Desktop:** a barra continua "Conversa" e a caixa de texto não muda.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 37 (5 verificações; 375 e 1440, claro) | PASS, 10/10 |
| Gate completo | PASS |

Capturas: `.visual/bivaque-html-round37/telas/`.
