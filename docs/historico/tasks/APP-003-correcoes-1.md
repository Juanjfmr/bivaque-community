# APP-003 — correções únicas do julgamento, 25/10/2026

Mesma etapa e retry_budget 3. C1 é identificação da retomada, não novo lote ou orçamento.
A sessão original terminou com HTTP 400 data_inspection_failed antes do STATUS. Há
baseline vermelha e implementação/reteste; concedida somente a rodada restante 3/3.
Se não fechar nesta rodada, registre HUMAN_DECISION com falhas reais; não crie outro lote.
Execute sozinho; não instale, delegue, commite ou faça segundo plano. allowed_paths
continuam no APP-003.task.yml. Nunca escreva PRONTO: somente o script da cadeia o escreve.
Preserve trabalho existente e leia por trechos. Aplique a autoridade SPA/shadcn de 25/10.

## Lista única de correções

1. Gate do julgador FAIL: 11 erros, 16 warnings e 51 infos; lint parou em 6s.
   Corrija os erros introduzidos nos allowed_paths sem supressões nem reduzir regras:
   deps de efeitos em avisos/chips-de-filtro/lista-paginada; interação, foco e semântica
   do puxador em sobreposicao; autoFocus de BarraDoTopo; div/ARIA/teclado em MenuCriar;
   fallback genérico da fonte em styles.css. Leia o log
   .visual/coordenacao/APP-003-julgamento-gate.log por trecho. Avisos preexistentes em
   apps/web são fora de escopo: classifique e preserve. Não presuma que o typecheck/build
   passou: não foi executado pelo gate após o lint vermelho.
2. Remova o novo components/ui/dialog.tsx sem consumidores que importa lucide-react;
   confirme consumidores antes. Reutilize o Radix existente em bivaque/sobreposicao.
   Nenhuma dependência de ícones externa, package.json ou lockfile novo.
3. Corrija o instrumento tests/e2e/acessibilidade.spec.ts:69-82: textContent não é nome
   acessível e inclui ligaturas ocultas com aria-hidden. Use alvo focado real e assertiva
   Playwright toHaveAccessibleName, preservando a prova do percurso de teclado. No
   casca.spec.ts:36, confronte marca/topo com protótipo e ADR: seletor sem consumidor
   não é prova. Ajuste o seletor à marca visível correta ou corrija a ausência real,
   documentando a referência; não invente marca/topo só para agradar teste errado.
4. Remova a função morta mostraChipDeCidade e seus testes novos da regra antiga
   de esconder cidade abaixo de 1024. ADR seção 3.1 exige cidade no topo móvel.
   Prove cidade visível a 375/768/1440. Não enfraqueça os 291 E2E da 1b.
5. O botão visível Limpar busca precisa limpar o campo local, com teste externo de
   digitar/limpar. Não implemente a jornada de busca. Corrija o ícone morto de Você
   se ainda houver valor contraditório sem consumidor.
6. Escreva APP-003-cobertura.md ausente, com mapeamento rastreável dos 52 componentes,
   40 movimentos, 100 ícones e ações/overlays para arquivos e testes. Consumidor futuro
   explícito não é entregue. Leia somente os trechos pertinentes do inventário.
   Os 77/77 unitários passaram no julgador, mas contagem não comprova equivalência.
7. Escopo ajustado pelo Codex: apps/app/index.html agora permitido para theme-color;
   foi a única alteração fora do contrato, de finalidade coerente com temas. Preserve
   newline final e tema acompanhando sistema, inclusive mudança ao vivo. Instrumentos
   alterados serão revistos por Qwen e Codex, diferentes do produtor.
8. Execute gate completo, unitários e bateria E2E inteira nos três viewports (incluindo
   291 casos anteriores), dois temas e reduced-motion onde aplicável. Sem duplicar
   servidores, writers ou banco; gate com variáveis públicas locais somente no processo,
   nunca env.local. Escreva STATUS: rodada 3/3, resultados/quantidades, logs, falhas,
   limites e dúvidas. Sem autoaprovação, 1d ou novas telas. Encerre após a rodada.

## Protocolo

Use logs UTF-8 explícito (Out-File -Encoding utf8). Windows PowerShell 5 com > pode
produzir UTF-16; não alimente JSON bruto com NUL ao modelo. Não altere provedor/modelo
para contornar erro de inspeção; se repetir, registre o bloqueio e encerre.
O snapshot .visual/coordenacao/APP-003-C1-base guarda o WIP antes desta retomada.
Qwen verifica diff completo contra d4810b41 e delta desse snapshot. Não rode banco.

Nos efeitos, preserve reinício de timeout quando muda aviso, reposicionamento de chips
quando muda a lista e foco no primeiro item após Carregar mais. Não remova dependências
apenas para satisfazer Biome se isso quebrar esses comportamentos; prove pelo uso externo.