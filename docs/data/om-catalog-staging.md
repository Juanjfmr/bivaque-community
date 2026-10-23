# Cadastro nacional de OMs — staging técnico (21/10/2026)

Fonte inicial auditada: 1.416 registros (FAB 322, EB 771, MB 323), coletados em 20/10/2026. Material preparado localmente em `bivaque_om_pipeline_entrega_2026-10-21.zip` entregue na conversa, **ainda não importado nesta branch**.

Os registros foram normalizados com um executor local e quatro testes unitários aprovados: 1.416 chaves candidatas de organização; 739 agrupamentos por endereço textual e 3.370 sinalizações de revisão. Os 739 agrupamentos **não são instalações confirmadas**. Nenhuma latitude/longitude é verificada.

## Regras de implantação

1. Catalogar OMs e instalações separadamente, pois OMs podem compartilhar o mesmo quartel.
2. Respeitar `localities` e código IBGE para o município; não assumir Manaus como limite.
3. Não vincular esse catálogo à lotação/perfil do militar: é uma busca de instalações, e a decisão de afiliação ainda exige controle de privacidade.
4. Não mostrar distância até OM, rota ou mapa sem coordenadas de **acesso público** conferidas.
5. Não marcar as 1.416 organizações como vigentes; verificar Tiros de Guerra, histórico, UGs e siglas duplicadas.
6. Fazer testes de migração/RLS em ambiente isolado antes de ativar qualquer leitura no aplicativo.
7. Não alterar o protótipo HTML R68 nem a navegação nesta etapa.

Esta branch documenta o contrato e a migration de staging. A ingestão do CSV requer revisão dos dados e execução administrativa controlada; não se fez insert no Supabase de produção.

**Evidência de teste local:** `python -m unittest discover -s tests/om-catalog -v` — 4/4 no pacote entregue (fora do GitHub).
