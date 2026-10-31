# Postmortem — contato oculto na ficha legada

## 1. Identificação
- ID: PM-20260926-CONTACT
- Data: 2026-09-26
- Severidade: alta
- Categoria: privacidade
- Aberto por: Codex, revisão BIZ-002; auditor independente Sagan

## 2. Linha do tempo
| Quando | Fato | Evidência |
|---|---|---|
| 26/09/2026 | Auditor detecta SELECT de tabela sem restrição de coluna para telefone legado | 20260825185327_provider_showcase.sql grants/policy; contact_is_public não é consultado pela policy de linha |
| 26/09/2026 | Registro antes de qualquer correção; reprodução local transacional com número de fixture programada | Stack isolado bivaque-biz-001-test; sem contato real em saída |
| 26/09/2026 | Grant legado reproduzido e correção validada por REST real: dono e outro membro recebem 403/42501 ao selecionar telefone; RPC pública mascara contato oculto | .visual/biz-002/contact-api.mjs; somente fixtures descartáveis |
| 26/09/2026 | Regressão final e descarte de dados privados passam após todas as migrations | pgTAP: 133 arquivos / 1819 testes; revisão independente final ainda pendente |

## 3. Causa raiz
RLS protege a linha, enquanto o grant de SELECT permite ler também contact_phone. A opção contact_is_public na interface não controla a permissão dessa coluna.

## 4. Impacto
Pode atingir contatos civis preenchidos nas fichas legíveis, mesmo com opção pública desativada. Não foi consultada produção nem medida quantidade de usuários; não afirmar acesso real por terceiros ou vazamento em produção. A correção precisa impedir leitura direta além de mascarar a página.

## 5. Ações
| Ação | Dono | Prazo | Estado | Prova |
|---|---|---|---|---|
| Migrar contatos a schema privado e negar leitura direta da coluna | Codex | 26/09/2026 | implementada localmente | 20260927010529; pgTAP confirma ausência de grant SELECT da coluna |
| Reconciliar leitores civis e manter escrita/convite/revogação | Codex | 26/09/2026 | implementada localmente | leitores owner-only, RPC de contato; regressão pgTAP intermediária 133 arquivos / 1808 testes e gate geral PASS |
| Provar owner/public/oculto/fora de alcance e suspensão/exclusão | Verificador independente | 26/09/2026 | aberta | pgTAP business-page-details |
| Implantação e conferência de produção | Operação/dono | antes de publicar | aberta | não realizada neste lote |

## 6. Prevenção
- [ ] Ações com prova independente concluídas.
- [x] Data API nega coluna privada mesmo sem interface, no banco isolado.
- [x] Regressão automática de privacidade adicionada.
- [x] Dívida e limites de publicação registrados no status.

## 7. Verificação de fechamento
Aberta. Assinatura humana ainda não realizada; agente não fecha postmortem.
