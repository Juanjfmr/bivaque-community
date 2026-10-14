# Pendências após a navegação global

Este documento organiza o inventário completo, sem declarar concluídos os domínios.
`NAVIGATION_BEFORE.json` conserva emissores originais; `NAVIGATION_AFTER.json`
registra handlers e provas do candidato. A categoria 4 também identifica operações
existentes que ainda exigem verificação própria; presença de função não é aprovação.

| Prioridade | Responsável | Próximo fechamento concreto | Limite da Rodada 01 |
| --- | --- | --- | --- |
| P1 | Encontros/Eventos | Criação, edição, presença, capacidade, cancelamento e negativas com persistência demo comprovada | Agenda e leitura do detalhe; operações futuras explicadas com consulta/retorno |
| P1 | Segurança/Comunidades | Tratamento de denúncia, decisões de admissão e claims de aprovação humana; revisar recusa e privacidade | Dependência de moderação explícita; nenhum registro/envio alegado |
| P1 | Comunidades/Grupos | Provar pedidos, publicação, comentários, administração e retorno em sua matriz própria | Abas e acesso contextual; nenhum novo CRUD de domínio |
| P1 | Desapegos/Imóveis | Jornada completa anunciar, editar, contato, encerramento e filtros do domínio | Salvos e Meus anúncios/filtros; editores existentes acessíveis |
| P2 | Negócios/Serviços | Portfólio, pedidos, propostas e conclusão; autorizações e estados negativos | Leitura contextual e acesso às informações existentes de planos |
| P2 | Monetização | Aprovar e provar pagamento, entrega de benefícios, limites e destaque | Preços já existentes e modo teste; nenhuma cobrança real |
| P2 | Memória/Indicações | Provar busca, resolução e preservação de conhecimento | Guia e busca contextual existentes ligados |
| P2 | Perfil/Acesso | Contratos de convites distribuídos, aceite de família e verificação real | Códigos fictícios locais, preferências e feedback; nenhuma pessoa real convidada |
| P1 técnico | Coordenador do repositório | Resolver lint dos dois JSONs, tipo `yargs` mobile e falso positivo do scanner nos assets/fonts congelados, em lote próprio | Falhas preservadas; sem alteração da régua ou aprovação geral |

Backend, Supabase, políticas, migrations, telas Next.js, Figma, publicação e merge
continuam fora deste protótipo. Mudanças na navegação principal, preços ou regras
comerciais precisam decisão de produto explícita. As próximas rodadas devem usar
o ownership de `MODULE_MAP.md`, revisão e runtime independentes por lote.
