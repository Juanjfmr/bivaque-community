# Padrão de tela — régua Nextdoor (01/11/2026)

O F01 refeito foi aprovado como **referência de maturidade, qualidade de interação e acabamento** para as próximas jornadas — não como obrigação de reproduzir sua arquitetura em busca, grupos, Mercado, eventos e conversas. O F01 aprovado mantém sua composição. As peças (cor, forma, texto, ícone e imagem) estão em [IDENTIDADE-DAS-PECAS.md](IDENTIDADE-DAS-PECAS.md). Referência viva: `apps/app/src/previa-f01/` (prévia em `/app/previa/f01`, só no desenvolvimento). O padrão se soma à régua do [HANDOFF](HANDOFF.md) e à [gramática por tarefa](GRAMATICAS-VNEXT.md), sem substituir decisões aprovadas.

> **Aplicação documental (10/11/2026):** a [Design vNext](DESIGN-VNEXT.md) passa a orientar a **seleção de composição por tarefa**, a rejeição de layouts genéricos e a prova da qualidade. A identidade vigente das peças, o F01 aprovado e decisões superiores permanecem. Alterar telas existentes depende de [experimento isolado e revisão](EXPERIMENTOS-VNEXT.md), não apenas deste texto.

## O que deixava as telas amadoras

Antes da reconstrução, a mesma tela juntava estes problemas:
- parágrafo cinza de 2 a 5 linhas embaixo de todo título;
- tudo em cartão branco igual;
- seis tamanhos de texto;
- rótulo em negrito pequeno em cima de cada campo;
- foto sem relação com o assunto (máquina de café em "Saúde");
- a mesma foto em duas telas;
- coluna de celular solta no computador;
- ícone que não faz nada;
- texto que explica o sistema: métricas da plataforma, "consulta" e "Contagens arredondadas e só a partir de 10".

## Regras

**Texto**
- O título é uma pergunta ou afirmação útil à pessoa. O apoio imediatamente abaixo do título deve ser breve, **sem meta de uma linha que esconda informação**. Detalhes de ajuda podem ir para um "Por que…?" expansível, desde que instruções essenciais, consequências e erros permaneçam visíveis ou acessíveis no momento da decisão.
- A tela fala com a pessoa, nunca descreve o sistema. Fica fora da tela:
  - mecanismo, nome de função, "consulta";
  - regra de privacidade (ela vale no código);
  - métrica da plataforma.
- O momento de valor é conteúdo concreto do momento da pessoa. Exemplo: perguntas de quem chegou antes e o
  próximo encontro, nunca "mais de 1.000 membros".
- O botão diz o que acontece ("Enviar código", "Confirmar vínculo", "Continuar com 2 grupos").
- Todo erro diz como sair.

**Escala, cor, forma, ícone e imagem**
- Desde 02/11 valem as regras de [IDENTIDADE-DAS-PECAS.md](IDENTIDADE-DAS-PECAS.md). Elas substituem a escala, o
  raio, o acento e a regra de imagem que estavam aqui (Serif 30 em todo título, botão de raio 12, Brasa em ícone e
  link, monograma).
- Espaço: múltiplos de 8 (8, 16, 24, 32, 48).

**Composição — selecionar pela tarefa, não pela receita**
- **Conservar as peças:** no feed, cada publicação continua usando o cartão de publicação vigente; listas de grupos, passos e regras usam linha plana com divisória. Cartão agrupa um objeto/ação quando isso melhora a compreensão; não acrescentar cartão para isolar cada texto, status ou link.
- **Não replicar o F01 em todas as jornadas:** busca, leitura editorial, grade/lista de imóveis, calendário, conversa e fila operacional têm necessidades diferentes. Não usar automaticamente a sequência título → apoio → busca → chips → cards → CTA. Escolher conforme a [gramática](GRAMATICAS-VNEXT.md) e justificar o que entra na primeira dobra.
- **Campos, botões e código de verificação** seguem as regras da [biblioteca de peças](IDENTIDADE-DAS-PECAS.md) e sua implementação; este documento não mantém uma receita visual duplicada.
- **Ação inferior:** no F01 e nos fluxos já aprovados com ação de avanço fixa, preservar a barra no rodapé e sua ergonomia. Em telas de leitura, busca, lista e conversa, não criar um segundo rodapé fixo apenas por uniformidade; considerar a barra de navegação e o compositor já previstos.
- **Computador:** preservar as duas colunas contextuais do F01 aprovado. Nas outras jornadas, usar espaço adicional para contexto simultâneo, resultados, detalhes ou leitura com largura intencional — não esticar uma coluna mobile nem obrigar duas colunas sem função.
- **Primeira dobra útil:** em 320 e 375 px, conferir tarefa, informação prioritária e ação; não aumentar título, saudação, card vazio ou áreas de respiro à custa de utilidade. Não sacrificar legibilidade nem alvo de toque para compactar.
- **Integridade:** grupo sem capa usa selo e nome, sem faixa vazia; ícone decorativo não parece ação; item concluído permanece marcado, não riscado. Não inventar dados, estrelas, números de membros ou avatares fotográficos para preencher espaços.

## Prova antes de mostrar ao dono

1. Percorrer a jornada por robô em 375, 768 e 1440 px, claro e escuro; conferir erros de console, transbordo, navegação, foco e resposta a toque/teclado. Para mudança estrutural, explorar também 320, 360 e 430 px.
2. Capturar lado a lado o estado atual e o candidato com **os mesmos conteúdos e ações**. Incluir estado vazio, dados escassos, texto longo, loading, erro e negação; "não verificado" nunca conta como aprovado.
3. Registrar o que cabe na primeira dobra (informações e ações reais) sem recorrer a pontuação estética arbitrária.
4. Julgar funcionalidade, praticidade, interface e clareza contra a [régua](HANDOFF.md) e referências maduras de fluxo/tela, com revisor independente quando o protocolo exigir.
5. Se a mudança for de arquitetura, usar [experimentos comparáveis](EXPERIMENTOS-VNEXT.md) antes de promover; nenhum checklist documental substitui prova de runtime.
