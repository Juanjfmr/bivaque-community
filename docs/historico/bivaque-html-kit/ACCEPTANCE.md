# Matriz de aceite e QA

**Obrigatório em cada módulo:** 1) navegação de origem e retorno, 2) leitura, 3) criação/edição se aplicável, 4) estado vazio, 5) ação inválida/erro, 6) feedback, 7) mobile e desktop, 8) privacidade, 9) acesso por teclado.

| Frente | Fluxo E2E mínimo (demo honesta) | Caso negativo |
|---|---|---|
| Início/Busca | buscar item → filtrar → detalhe → voltar | nenhum resultado; query inválida |
| Onboarding | cadastro demo → consentimento → escolha de localidade → conclusão | elegibilidade pendente/rejeitada sem falsear aprovação |
| Comunidades/Grupos | descobrir → pedir entrada → aguardar → decisão demo autorizada → participar | membro sem acesso não lê conteúdo fechado |
| Memória | perguntar → responder → marcar solução → reencontrar resposta | sem respostas, permissões e solução revertida |
| Desapegos | publicar com imagem → editar → favorito → contato → encerrar | formulário inválido, sem foto, anúncio fechado |
| Imóveis | filtrar por aluguel → detalhe → galeria → solicitar contato/visita | privacidade de localização/endereço |
| Negócios/Serviços | criar negócio → pedido orçamento → resposta → aceitar/rejeitar | sem propostas, expirado, sem permissões |
| Eventos | criar → detalhe → participar → cancelar RSVP | lotação, evento cancelado |
| Conversas | abrir a partir da origem → responder → voltar ao anúncio | erro envio, bloqueado, sem thread |
| Perfil/Família | editar perfil, interesses e verificar convites demo | dados privados não expostos |
| Monetização | distinguir grátis/pago e bloco patrocinado | plano não muda permissões reais |

## Ambiente/viewport
- Verificar: 375px, 768px, 1440px, 2 temas, tamanho texto aumentado, teclado e `prefers-reduced-motion`.
- Capturas com navegador e comparação com baseline; diffs inesperados devem ser aprovados ou revertidos.
- Não afirmar que screenshots foram capturados quando não foi possível executá-los.

## Política de fechamento
- Separar evidência de `static`, `unit`, `e2e`, `visual` e `security`; cada uma cobre propriedade diferente.
- R1+ exige revisor independente e prova runtime; R3 vai à aprovação humana.
- `BLOCKED` é estado válido; não esconder. Não usar PASS por ausência de erros em grep.
