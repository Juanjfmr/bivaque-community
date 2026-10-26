# APP-005 — instrumentos da onda 1

`node scripts/app/capturar.mjs` serve a referência HTML e o build Vite local,
abre contextos separados por tema/tamanho e salva os dois lados e o par PNG.
São 35 rotas + entrada sem estado + Criar + Cidade = 38 cenas × 2 tamanhos
(375/1440) × 2 temas = 152 pares. Interações continuam medidas em 375/768/1440.
O modo `--amostra` faz 12 pares para diagnóstico, sem substituir a matriz inteira.

Atualização APP-007 (26/10): a captura mede as telas V1 no modo normal, sem
`TelaDeProva`. O título esperado vem do contrato e da fixture da referência;
identidade renderizada, ausência de andaime e fim do carregamento também são
exigidos. Publicações usam ID global no app e composto no HTML, casados pelo
mesmo conteúdo. As 152 imagens não cobrem todos os estados da entrada nem
aprovam as jornadas incompletas das ondas 2–8. A conferência exige agora 509
E2E aprovados (480 da fundação + 29 reais) e continua recusando gate vermelho.

Os pares de 01:27Z foram anteriores a alterações posteriores e à entrega V1;
não provam a árvore atual. A rodada atual é
`.visual/onda-1/pares-2026-10-26T11-41-20-974Z/`, com revisão base e árvore suja
preservadas no manifesto. Os hashes identificam o WIP, não um commit integrado.
Revisão focal Qwen: `.visual/coordenacao/APP-REAL-C1-revisao.md`, aprovada para
medição com limites de foco, corrida de histórico não forçada e Pedido incompleto.

Saída única em `.visual/onda-1/pares-<data>/`: `index.html` navegável,
`manifesto.json` e PNGs. `ultimo.json` só é atualizado após matriz completa.
Falha preserva o manifesto parcial, sem gerar marcador de sucesso.
URL, título, conteúdo carregado, erros de runtime e fontes são conferidos antes
da foto. Referência e app vão para `about:blank` entre cenas para impedir que
o histórico de um overlay contamine a cena seguinte. Servidores e navegador
próprios encerram em `finally`; não se reutiliza porta ocupada silenciosamente.

O manifesto registra revisão Git, árvore suja, hashes do app, fontes locais e
referência, destinos, matriz e hash de cada par. Uma árvore suja não é anunciada
como revisão limpa. Mercado é comparado ao catálogo HTML, diferença autorizada
pelo ADR. Entrada usa fixture sintética, sem credenciais; nenhuma escrita em banco.
A referência é inicializada pela interface de configurações, usando o mecanismo
determinístico já existente. Seu relógio histórico fica em 13/10/2026; a base
demo portada usa 25/10. Essa diferença de dados não aprova fidelidade de jornada.

`node scripts/app/conferir-cobertura.mjs` confronta `cobertura.json` com IDs
extraídos independentemente das tabelas dos capítulos 1–9 do inventário.
O ID usa capítulo, título da tabela, primeiro campo e repetição; linha é origem,
não identidade. Alteração do inventário exige reconciliação do hash.
São 1.203 entradas de tabela, incluindo repetições contextuais; não são 1.203
funcionalidades distintas. Descrições narrativas continuam exigindo leitura humana.

Cada entrada aponta onda e estado. Uma implementação isolada de componente não
fecha sua jornada consumidora. Itens futuros permanecem pendentes com motivo;
o helper DOM global é dispensado com motivo. As primeiras 52 linhas de componentes
e os 40 movimentos são confrontados com o mapa APP-003, com consumidores futuros.
Entidades/imagens efetivamente portadas se relacionam com APP-004.

A conferência rejeita ID ausente, duplicado ou sem origem, caminho inexistente,
implementado sem arquivo/teste/prova, e log externo incompleto/vermelho. Exige a
bateria Playwright completa e gate verde. Existência de arquivo ou sumário verde
não substitui revisão da qualidade do teste, runtime nem aprovação visual.

`tests/scope/app-instrumentos.test.mjs` verifica matriz/ordem dos lados,
destino/título/boot errados, cobertura inválida, origem independente dos IDs e
rejeição de auto-relato/falso PASS. Revisão por Qwen, distinto do produtor Codex,
e resultados finais são registrados no STATUS antes de declarar o aceite técnico.
