# EXP-001 — Como se mede

A bateria de medição é escrita antes das candidatas, por quem não as produz, e roda igual nas duas. Ela acha os
elementos pelos rótulos e papéis de `acessibilidade.md`, nunca por classe ou estrutura interna.

Tudo roda pela fila (`scripts/agents/prova-fila.mjs`), com reset do banco com seed e os dados de carga, uma candidata
de cada vez, com o build de produção dela servido em `127.0.0.1:3000`.

## 1. Eliminatórios: `tests/e2e/exp-front/eliminatorios.spec.ts`

Nos três projetos (`mobile-375`, `tablet-768`, `desktop-1440`):

1. **Acesso:** conta sem cidade e conta de outra cidade não veem as perguntas; nenhuma chave `service_role` no
   bundle servido (busca no JavaScript entregue).
2. **Sem duplicar:** a rota de insert de pergunta é interceptada; a primeira chamada vai ao banco, mas a resposta é
   descartada como tempo esgotado. A pessoa tenta de novo. No banco há uma pergunta só com aquele título.
3. **Rascunho:** a gravação falha com erro de rede; o texto continua no diálogo.
4. **Navegação:** todos os casos de `navegacao.md`, um teste por caso.
5. **Escape:** pergunta com título `<img src=x onerror="window.__xss=1">"'` e corpo com `<script>`; aparece como
   texto e `window.__xss` continua indefinido.

Mais o gate e o build.

## 2. Fidelidade: `scripts/exp-front/capturas.mjs`

Mesmas telas, mesmos dados, no protótipo e na candidata, em 375, 768 e 1440, claro e escuro, nos estados normal,
carregando (rede atrasada) e erro (rede recusada). Saída: os pares e a diferença de pixels por par. O juiz vê os
pares sem saber qual candidata é qual.

Mais, por teste: navegação só por teclado na jornada inteira, foco visível, foco devolvido ao fechar o diálogo, e
movimento reduzido respeitado.

**Tema:** com a preferência do sistema mudando com o app aberto (`page.emulateMedia`), o app troca de tema sem
recarregar.

## 3. Falhas: `tests/e2e/exp-front/falhas.spec.ts`

- **Respostas fora de ordem:** troca rápida de filtro com a primeira resposta atrasada; a lista final é a do último
  filtro.
- **Sessão expirada:** o token expira no meio da jornada; a próxima ação renova ou manda ao login e volta ao mesmo
  destino, sem perder o rascunho.
- **Duas abas:** pergunta publicada numa aba aparece na outra ao voltar o foco ou ao recarregar; nenhuma aba
  sobrescreve a outra.

## 4. Celular: `scripts/exp-front/celular.mjs`

Chromium com CPU 4× mais lenta e rede "4G lenta" (Playwright, CDP), build de produção, cache frio e quente:
- tempo até o conteúdo principal da Comunidade (meta: até 2,5 s);
- resposta visual ao tocar em filtro, abrir pergunta e voltar (meta: p95 abaixo de 100 ms);
- rolagem da lista com 2.000 perguntas carregadas por páginas (quadros perdidos);
- memória do JavaScript depois de 10 páginas carregadas;
- bytes transferidos em `/app`.

Fica registrado que é emulação, não aparelho físico.

## 5. Correções e tamanho: o coordenador registra

- Por candidata: execuções usadas, defeitos achados em cada uma, intervenções do coordenador, tempo e tokens (do log
  do produtor).
- Linhas adicionadas e removidas, dependências diretas novas, tamanho do bundle de `/app` (saída do build).

## 6. Manutenção: depois do julgamento

A mesma mudança de requisito é pedida às duas que passarem: **"a lista de Minhas ganha um filtro por categoria, com
os chips Saúde, Serviços, Educação e Casa, e o filtro sobrevive a voltar e recarregar"**. Mede-se o mesmo que no
item 5.
