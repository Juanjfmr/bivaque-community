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

## Fechamento do lote mobile 2 (rodadas 40 a 44)

Uma revisão para o lote todo e a bateria completa (375 claro, 768 claro e 1440 escuro).

### Correções da revisão (nenhum item crítico)

| Severidade | Problema | Correção |
| --- | --- | --- |
| Alta | Na galeria, o toque em botão logo depois de um gesto era engolido | Qualquer toque novo zera a marca do gesto |
| Alta | Na folha do bairro, arrastar com o dedo engolia o toque seguinte | O supressor de clique vale só para o mouse |
| Média | Redesenhar a folha (ex.: ao salvar) perdia rolagem e foco | Rolagem e foco são guardados e devolvidos |
| Média | Esc fechava a folha junto com o menu Criar ou os filtros | Esc respeita a camada de cima |
| Média | O Voltar do celular e o da barra saíam do mapa com a folha aberta | A folha entra no histórico; Voltar a recolhe primeiro |
| Média | Fechar a folha dos avisos pelo X, Esc ou arrastando perguntava de novo logo | Mostrar já conta como pergunta (7 dias); não abre por cima de outra camada nem de quem digita |
| Baixa | Mensagem de instalação cancelada prometia um caminho inexistente | "Instalação cancelada." |
| Baixa | Destaque da sugestão falhava com acento | Comparação sem acento |
| Baixa | No celular, o título da busca sumia também para leitor de tela | Fica fora da vista, mas legível |
| Baixa | Setas da foto ampliada continuavam no Tab | Saem do Tab com a foto ampliada |

**Sem mudança:** a folha do bairro cobre a barra de baixo e o "Criar", que continuariam no Tab;
nas telas de mapa do celular eles já ficam escondidos, porque Imóveis e Desapegos não são abas
principais.

### Pego pela bateria

- **Folha dos avisos (R43) cobrindo fluxos antigos:** ela abre 900 ms depois de publicar pergunta,
  enviar pedido ou criar alerta. As provas R04, R11, R12, R25 e R33 passaram a dispensá-la
  (`skipPushAsk` e `dismissPushAsk` no harness). No app, a folha também espera quando há um campo
  de texto em foco.
- **Bateria em dobro:** a bateria anterior, parada para recompilar, continuou rodando junto da
  nova; as falhas por disputa de processador foram rodadas de novo sozinhas e passaram.
- A prova de execução falha só no defeito já registrado do HTML original congelado.

Base visual nova em [VISUAL_BASELINE_R44](VISUAL_BASELINE_R44.md).
