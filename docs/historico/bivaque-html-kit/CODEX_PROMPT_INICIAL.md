# PROMPT PARA COLAR NO CODEX — BIVAQUE: HTML SOBERANO

Atue como **diretor técnico/orquestrador** da equipe de especialistas Bivaque instalada em `.codex/agents/` (18 perfis, inclusive `bivaque_ui_ux_especialista`).

## Autoridades e regras
1. A referência visual definitiva é `prototypes/bivaque-html/reference/Bivaque_Material_Web.original.html`. Verifique SHA-256 `29a402c4e717ab2826c2e2aa0c3da6bac7f7b2b390090ed22c5ff1f2cbb385a4`. **Não** aproveite aparência, navegação, componentes ou tokens do Next.js/Figma. Todo visual novo deve nascer do sistema Material Web deste HTML.
2. O repositório `bivaque-community` serve de referência para contratos e regras de negócio futuras; sua interface atual NÃO é a interface-alvo. NÃO integre o backend real nesta fase.
3. Preserve os comandos, branch policies, security gates e regras existentes em `AGENTS.md`, `docs/agents/AGENT_ARCHITECTURE.md` e `docs/agents/TASK_CONTRACT.md`. Não reescreva esses arquivos. Se houver conflito com segurança/privacidade, siga a regra mais restritiva e registre.
4. Objetivo final: protótipo HTML navegável, com UI premium consistente, temas claro/escuro, fluxos completos simulados, estados de erro/vazio/loading, nenhuma ação sem resposta e fidelidade visual demonstrada. `localStorage` nesta fase é demo, não segurança.
5. **NÃO** permita que especialistas editem simultaneamente o mesmo HTML. Primeiro modularize com cuidado e estabeleça ownership por diretório. Garanta output standalone que abra no navegador e mantenha Material Web.
6. UI/UX especialista (`bivaque_ui_ux_especialista`) valida arquitetura da informação, hierarquia, jornadas, microcopy e comportamento mobile antes de qualquer alteração visual estrutural. Frontend Premium implementa os estilos; Motion implementa transições; QA e security fazem revisão independente.
7. Não prometa testes, screenshots, links ou integrações não executados. Não decida unilateralmente mudanças de escopo como excluir módulos, mudar a navegação ou alterar regras de monetização.

## A primeira execução (RODADA 00)
Leia `docs/bivaque-html-kit/ROADMAP.md`, `AGENT_RULES.md`, `UI_UX.md`, `ARCHITECTURE.md`, `ACCEPTANCE.md` e `tasks/ROUND_00.md`.

**Entregue a Rodada 00 completa**:
A. Medir baseline: git status, hash HTML, inventário de rotas e `data-action`, casos sem handler, capturas visuais 375/768/1440 claro/escuro (ou registrar limitação se browser indisponível). Não alegar diagnóstico completo só com regex.
B. Propor fronteira dos módulos sem redesenhar nada; trabalhar em branch dedicado, com diretórios por especialidade e build determinístico para HTML único.
C. Modularizar gradualmente os estilos, dados demo, views, controles de navegação e handlers; preservar o HTML original imutável e gerar um `dist/Bivaque_Material_Web.html` portável.
D. Rodar prova funcional E2E de pelo menos home, busca, navegação, modal Criar, grupo, anúncio, negócio, conversas e onboarding; comparar capturas. Quando falhar, corrigir o bug somente se pertencer ao escopo da Rodada 00 ou registrar bloqueio.
E. Apresentar relatório com: arquivos, comandos executados e seus resultados, divergências antes/depois, ações descobertas sem tratamento, cobertura e riscos. Não marcar PASS sem evidência.

## Delegação
- Mobilize inicialmente **arquitetura-integracao**, **ui-ux-especialista** (auditoria read-only), **frontend-premium** e **qa-experiencia** (verificação independente).
- Evite trabalho paralelo em paths compartilhados; prefira sequência explorador/UX → implementador → revisor → verificador.
- Ao iniciar cada rodada seguinte, escolher no máximo 2 especialistas de domínio em módulos independentes + frontend/motion e QA conforme necessário.
- Cada alteração deve possuir contrato, `allowed_paths`, aceite observável, prova executável, e limites claros de privacidade.

Comece agora pela Rodada 00; **não** construa novas telas nem ligue Supabase antes de ter baseline visual, modularização e testes básicos funcionando. Não faça merge na `main` sem os gates e a revisão. Se algo bloquear, produza o máximo verificável e classifique como `BLOCKED`, não como concluído.
