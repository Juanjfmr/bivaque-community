# Bivaque — Rodada 44: busca em tela cheia

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-044.task.yml` (R1). Base: `9442fe13`.
Lote mobile 2. Maquete aprovada: "Sim, como na maquete". Referências: Fresha e Perplexity,
no Mobbin.

**Veredito: PASS.**

## O que mudou

- **No celular, sem título repetido:** "Buscar em Manaus" deixa de aparecer abaixo do campo de
  busca.
- **Busca vazia:**
  - "Buscas recentes", com "Limpar";
  - "Explorar em {cidade}": até seis grupos de serviço com negócio na cidade, mais Imóveis e
    Desapegos, cada atalho com a contagem real e abrindo a tela já filtrada;
  - "Sugestões";
  - recentes e sugestões são linhas: tocar busca; a seta ↖ completa o campo sem buscar;
  - a ilustração grande saiu.
- **Ao digitar:**
  - antes dos resultados, até duas palavras que completam o texto, com a parte digitada em
    destaque, vindas das recentes, dos sinônimos, dos grupos e especialidades, das categorias e
    dos bairros;
  - para cada tipo com resultado, um atalho ("diar em Indicações · 2 respostas") que filtra.
- **"Sugestões", e não "Mais buscados":** o protótipo não tem dado de buscas mais feitas, e o
  rótulo prometeria algo que não existe.
- **Desktop:** ganha as mesmas seções; a busca rápida (Ctrl K) não muda.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 44 (5 verificações; 375 e 1440, claro) | PASS, 10/10 |
| Rodada 10 (busca), adaptada às linhas no lugar dos chips | PASS, 24/24 |
| Gate completo | PASS |

Capturas: `.visual/bivaque-html-round44/telas/`. Maquete: `.visual/bivaque-html-search/`.
