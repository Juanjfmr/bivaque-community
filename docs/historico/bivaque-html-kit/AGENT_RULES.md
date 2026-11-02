# Regras comuns para os 18 especialistas

## Soberania e limites
- Única referência visual e de navegação: HTML original do pacote. Preservar o shell aprovado, modo claro/escuro e a implementação oficial Material Web. Não usar código de UI antigo do Next.js, Figma ou HTML de rodadas anteriores como ponto de partida visual.
- Backend Supabase existente é fonte técnica para entender domínios e futuras adaptações — **não** é alvo de migração neste sprint.
- HTML final é protótipo local, com dados fictícios e avisos de demonstração; não simular credenciais reais, pagamentos ou verificação institucional como se ocorressem no servidor.
- Dados reais de identidade e documento (CPF, PDFs, afiliação pessoal sensível) não entram em seed nem localStorage.
- Qualquer mudança em navegação, arquitetura de informação, preços, políticas ou módulos carece de decisão expressa do dono do produto; UX registra recomendações com opções, não impõe.

## Regras de trabalho
- O coordenador escolhe 1 dono de arquivo/área; rotas compartilhadas `shell`, `tokens` e `navigation` têm owner frontend-premium. Nunca dois agentes editam o mesmo arquivo ao mesmo tempo.
- Specialist = domínio e jornadas. UI/UX = decisão sobre hierarquia, fluxos e acessibilidade. Frontend = implementação e polimento. Motion = animação. QA e Security = revisores independentes.
- Começar cada tarefa por medir estado existente e localizar rotas/ações específicas, não refatorar por impulso.
- Contratos de tarefas do repositório seguem `docs/agents/TASK_CONTRACT.md`; usar o modelo instalado como apoio e converter para formato canônico, quando exigido.
- Gestão de risco: R0/R1/R2/R3 conforme projeto; decisões de alto risco exigem autorização humana e evidência de segurança.
- A entrega requer screenshots ou testes de runtime de estados relevantes; screenshots por si só não provam clique.
- Marcar `PASS`, `FAIL`, `BLOCKED` ou `HUMAN_DECISION`; não conceder PASS ao esgotar retries.

## Contrato de interface para migração futura
- Evitar acoplamento do view com state global `SOURCE`; introduzir adaptadores/data interface nos módulos sem construir API duplicada.
- Mock de dados usa nomes sintéticos; separar fixture de lógica. Um botão pode abrir modal/gerar estado demo, mas deve ser rotulado quando a operação não for real.
- Se ação depender de backend (verificação de identidade, entrega de mensagem, pagamento), entregar experiência demonstrativa honesta e contrato a integrar, não imitar sucesso em produção.
