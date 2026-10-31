# Páginas de negócio — revisão de 26/09/2026

Branch: claude/app-visual-comparison-bivaque-1110a9. Base: 0b853f23015be432b30cf0223624e3e2b06279ef. Alterações locais ainda sem commit.

## Direção e contrato

ADRs de página do negócio (D1–D13 e primeira fatia) e Bivaque+ lidos. O primeiro foco continua sendo a página do negócio; marcação em indicações, orçamento aberto e Explorar seguem posteriores. Bivaque+ não ganha tela antes dos acordos externos exigidos no ADR.

Referências inspecionadas no Mobbin: [Nextdoor — perfil do negócio](https://mobbin.com/flows/3c5a68e8-7886-4458-ad9f-403304ed73ec) e [Fresha — prévia da página](https://mobbin.com/flows/ef0e19c8-6f36-4f5a-8fc7-bfddff4943cc). Separar apresentação de edição e ações de completar o conteúdo; adaptar aos componentes ui do Início recente desta branch.

Gestão: resumo do negócio, edição explícita com cancelamento, catálogo/fotos e página para membros. Ficha: identidade, foto real quando disponível, descrição, catálogo com descrições e orçamento direto. Dono vê acesso à gestão, sem conversa consigo mesmo. Sem foto não há mais um bloco vazio de proporção 4:5.

Nenhuma migration ou autorização alterada. Nome/categoria/bio continuam sendo os únicos campos da criação/edição nesta fatia. Telefone, horário, bairro, Mercado vinculado e reputação por marcações não foram implementados por este ajuste. A gestão não promete alcance na cidade atual após transferência.

## Evidência

- Build de produção e TypeScript web passaram na árvore local final.
- Biome dos arquivos tocados, contrato BIZ-001, 8 testes unitários de prestadores, 9 testes de kanban e 9 de arquitetura passaram.
- Primeira prova do browser passou nos três viewports; suíte foi ampliada para erro de edição, cancelar, persistência após reload, catálogo, foto privada, ficha vista por outro membro e abertura do pedido direto. A execução independente final será registrada abaixo.
- Capturas autenticadas de criação: .visual/biz-redesign-2026-09-26-create/ (375/768/1440, HTTP200, identidade válida, zero achados). Gestão e ficha são recapturadas após a prova final.
- Revisão independente de código: dois P2 encontrados (alcance após transferência e texto longo); ambos corrigidos e reavaliados PASS restrito a esses achados. Aparência e runtime não eram parte desse PASS.

## Fechamento

G-TASK-3 reaberto como repo após rejeição visual do dono. Capturas e auditoria mecânica não substituem aceitação visual. Prova do orçamento limitada à abertura do formulário: envio, recebimento e resposta do negócio do membro permanecem fora da prova desta revisão.

Verificação runtime independente (Parfit): PASS restrito ao E2E, 3/3 projetos em 25,5s; confirmou criação/edição/cancelamento/erros/persistência/catálogo/foto/entradas e abertura do pedido. Comparou seis capturas ao Início: coerência de sistema visual; busca do shell comprimida em tablet e capturas E2E parciais limitaram julgamento abaixo da dobra. O rótulo genérico com ícone de localização foi removido da gestão. Não rodou CI, pgTAP ou negações de autorização; BIZ-001 inteiro não certificado.

Capturas finais autenticadas da árvore após a correção do rótulo: criação, gestão e ficha, 3 viewports cada (9 estados), HTTP200, identidade válida e zero achados mecânicos. Diretórios .visual/biz-redesign-2026-09-26-create/, .visual/biz-redesign-2026-09-26-owner/ e .visual/biz-redesign-2026-09-26-public/. Build final passou. A prova independente E2E precede apenas a remoção desse rótulo decorativo.

## Ampliação posterior — BIZ-002

As limitações desta nota descrevem apenas o ajuste visual inicial. O lote posterior implementou bairro, área, horário, contato privado com opção explícita, galeria navegável, preço, produtos vinculados, desconto e fila de pedidos do dono. Migrations e fronteiras de fechamento agora estão em [business-page-complete-2026-09-26.md](business-page-complete-2026-09-26.md). Não considerar o escopo inicial desta nota uma redefinição do ADR ou uma prova de conclusão do lote ampliado.
