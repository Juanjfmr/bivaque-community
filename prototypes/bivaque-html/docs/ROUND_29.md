# Bivaque — Rodada 29: cartão de compartilhamento

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-029.task.yml` (R1). Base: `c252ce44`.
Primeiro item do lote C. Referências do Mobbin: Rodeo e Brink.

**Veredito: PASS.**

## O que mudou

- **Folha de compartilhar:** compartilhar um anúncio ou negócio abre uma folha com a prévia de um
  cartão de 1080×1350, pronto para grupos de WhatsApp.
- **Conteúdo do cartão:**
  - foto, ou o ícone do anúncio quando não há foto;
  - etiqueta: tipo do imóvel, desapego ou categoria do negócio;
  - preço ou número de indicações;
  - título e detalhes: quartos, área e vagas com o total com condomínio, estado e categoria, ou
    o benefício do negócio;
  - bairro e cidade, e a faixa "Bivaque · Comunidade de militares e famílias".
- **Como é gerado:** o cartão é desenhado no próprio aparelho (canvas), sem serviço externo.
- **Ações da folha:**
  - "Compartilhar com imagem" manda o PNG e o link juntos; some onde o aparelho não compartilha
    arquivos;
  - "Baixar imagem" salva o PNG;
  - "Compartilhar link" segue exatamente o fluxo antigo: copiar, permissão negada e cancelamento.
- **Leitor de tela:** a prévia tem descrição com título, valor e bairro.
- Encontros e perguntas continuam compartilhando só o link.

## Outros ajustes

- **Harness das provas:** endereços `blob:` (a imagem do cartão em memória) passaram a contar como
  locais, porque nunca saem do navegador.
- **Rodada 01:** os três testes de compartilhamento escolhem "Compartilhar link" na folha.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 29 (6 verificações; 375 e 1440, claro) | PASS, 12/12 |
| Rodada 01, com compartilhamento ajustado | PASS |
| Gate completo | PASS |
