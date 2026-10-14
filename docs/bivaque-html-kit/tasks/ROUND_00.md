# RODADA 00 — congelamento, inventário e modularização sem regressão

**Meta:** preservar integralmente o HTML aprovado, identificar áreas acopladas e viabilizar agentes por domínio antes de qualquer novo acabamento.

## Passos
1. Inspecionar git e as regras do repo (`AGENTS.md`, `docs/agents/*`, `apps/web/AGENTS.md` quando aplicável). Não tocar no frontend atual do Next.js durante a Rodada 00.
2. Conferir SHA do HTML original (`python scripts/bivaque-html/verify_reference.py`).
3. Inventariar módulos, funções render*, rotas, ações utilizadas/atendidas, dados demo, classes e IDs. `audit_html.py` é uma análise regex inicial, **não** um parser JavaScript completo.
4. Capturar o original em 375/768/1440, modo claro/escuro, incluindo Home, Busca, detalhe, modal Criar e telas de grupos. Se Playwright/browser indisponível, documentar BLOCKED e não alegar paridade.
5. Desenhar fronteiras de diretórios; criar build que gere HTML único reproduzível; extrair incrementos pequenos e testar após cada extração.
6. Provar HTML gerado com navegação, interação Material Web, telas demo e screenshot comparativo. Corrigir somente regressões da extração neste sprint.
7. Abrir card/contrato aceito no sistema existente; fornecer resumo do diff, cobertura, logs, falhas.

## Aceite
- Original permanece intacto e hash não muda.
- Build HTML produzido, sem exclusão de módulos ou navegação.
- Nenhum CSS/asset substituído por visual do Next.js/Figma.
- Scripts verificam sua saída e relatam claramente erros.
- Runtime demonstrado com evidências ou marcado bloqueado.
- Sem alteração em supabase/, RLS, secrets, auth real, cobrança ou produção.

## Agentes
- Arquitetura (implementa ferramentas/build), UI/UX (audita, não edita fonte nesta rodada), Frontend (dono de estilos/shell após extração, se necessário), QA (revisor independente).
