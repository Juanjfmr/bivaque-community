# Plano: BrasilAPI e outras APIs públicas no Bivaque

Data: 14/10/2026. Complementa [ADAPTERS.md](ADAPTERS.md). É um **plano**; nada foi
integrado ainda.

As rotas da BrasilAPI foram conferidas no código do repositório oficial
(`BrasilAPI/BrasilAPI`, `pages/api`) nesta data. Os itens marcados com **(verificar)**
não foram confirmados nesta sessão.

## 1. Princípios (valem para toda API pública)

1. **Nunca chamar direto do navegador do usuário.** As chamadas passam por uma função no
   backend (Supabase Edge Function), por quatro motivos:
   - **privacidade:** o IP e o padrão de uso da pessoa não vão para terceiros;
   - **disponibilidade:** com cache, a API fora do ar não derruba a tela;
   - **termos:** a BrasilAPI está em **beta, sem termos de uso finalizados**, e pede
     volume "semelhante ao de uma pessoa";
   - **controle:** uma lista fechada de rotas permitidas.
2. **Cache com prazo por tipo de dado** e **tentativa alternativa** (fallback) quando
   houver uma segunda fonte.
3. **Tempo máximo de 3 s**, com erro claro na interface ("não foi possível consultar o
   CEP agora, preencha manualmente"). A API é sempre ajuda, nunca bloqueio.
4. **Sem dado pessoal em log.** Não enviar CPF a terceiros.
5. **No protótipo, só dados de exemplo (fixtures).** As provas exigem zero requisições
   externas, e o HTML precisa funcionar offline.

## 2. BrasilAPI: o que usar e onde

| Prioridade | Rota | Uso no Bivaque | Cache | Observação |
| --- | --- | --- | --- | --- |
| **P1** | `cep/v2/{cep}` | Preencher bairro e cidade no anúncio de imóvel e na página do negócio; validar bairro | 30 dias | Fallback: ViaCEP. A v2 traz coordenadas: usar só **aproximadas** (privacidade do endereço) |
| **P1** | `ibge/uf/v1`, `ibge/municipios/v1/{uf}` | Lista de cidades e destino da mudança, com nome oficial; ligar `localities` ao código IBGE | 30 dias | Fonte primária alternativa: API do IBGE |
| **P1** | `feriados/v1/{ano}` | Popular `national_holidays` (**mesmo formato**: data, nome, tipo); mostrar feriados na Agenda | 1 ano (job anual) | Só feriados **nacionais** |
| **P1** | `ddd/v1/{ddd}` | Avisar no cadastro do negócio se o DDD do WhatsApp não é da cidade | 30 dias | Aviso, não bloqueio |
| **P2** | `diasuteis/v1` | Prazo da mudança em dias úteis no checklist de chegada e saída | 1 dia | Ignora feriados **estaduais e municipais** (TODO no código deles) e tem um bug de fuso conhecido; preferir calcular no backend com `national_holidays` |
| **P2** | `cptec/v1` (clima) | Clima da cidade de destino no Guia de chegada e na home de quem está "chegando" | 1 hora | Fonte INPE/CPTEC |
| **P2** | `hospitais/v1/proximos` (e `ciatox`) | "Saúde perto de você" no Guia de chegada | 24 h | A fonte (CNES?) não ficou confirmada no código **(verificar)** |
| **P2** | `cnpj/v1/{cnpj}` | Selo "CNPJ ativo" ao **assumir a página** do negócio; conferir a atividade (CNAE) com a categoria | 7 dias | **R3:** traz sócios e, em MEI, o nome da pessoa. Guardar só situação e CNAE; exige ADR |
| **P3** | `fipe` | Preço de referência se houver categoria **veículos** nos desapegos (mudança costuma envolver carro) | 7 dias | Decisão de produto: a categoria não existe hoje |
| **P3** | `universities/v1` | Guia para dependentes (faculdades na cidade) | 30 dias | — |

**Não usar:**
- `cpf/v1`: validar o dígito localmente basta, e enviar CPF a terceiros é R3 sem
  necessidade.
- `geolocation/v1`: repassa as coordenadas à BigDataCloud, um terceiro; CEP e IBGE
  resolvem.
- `cambio`, `taxas`, `tickers/b3`, `cvm`, `ncm`, `tuss`, `cid10`, `eleicoes`: sem valor
  para o produto.
- `pix/v1` e `banks/v1`: só se houver pagamento, que é R3.

## 3. Outras APIs públicas gratuitas com valor

| API | Valor para quem se muda | Condições |
| --- | --- | --- |
| **IBGE — servicodados** (localidades, população, malhas) | Fonte oficial de municípios; população e área para o Guia da cidade | Sem chave |
| **ViaCEP** | Segunda fonte de CEP | Sem chave; uso moderado |
| **OpenStreetMap — Overpass API** | Escolas, farmácias, mercados, academias e parques **perto do bairro ou da base**: o "mapa da rotina" que hoje vem só de indicações | Sem chave; uso justo; atribuição ODbL; cachear |
| **OpenStreetMap — Nominatim** | Converter bairro ou endereço em coordenada aproximada | Máximo de 1 requisição/s, User-Agent identificado, só no servidor; para volume, hospedar próprio |
| **INEP — dados abertos / catálogo de escolas** | Lista de escolas por município, com rede (pública/privada) e etapas. **Escola é a dúvida número 1 de família em mudança** | Arquivos para importar periodicamente, não API em tempo real **(verificar formato atual)** |
| **Ministério da Saúde — dados abertos (CNES)** | Estabelecimentos de saúde, se a rota da BrasilAPI não bastar | **(verificar)** disponibilidade e limites |
| **Open-Meteo** | Previsão e alertas de chuva/calor mais ricos que o CPTEC | Gratuito **só para uso não comercial**; com monetização, exige plano pago **(verificar licença)** |
| **Wikipedia / Wikidata** | Resumo e foto livre da cidade no Guia | Atribuição CC BY-SA |
| **INMET — alertas meteorológicos** | Alerta de tempestade na cidade | **(verificar)** se há API estável |

## 4. Arquitetura proposta

- **Edge Function `public-data`** com lista fechada de rotas (`cep`, `ibge`, `feriados`,
  `ddd`, `clima`, `saude`, `poi`), tempo máximo de 3 s, fallback e limite por usuário.
- **Tabela de cache** (`chave`, `dados`, `obtido_em`, `expira_em`), sem dado pessoal.
- **Jobs agendados** (o repositório já habilita `pg_cron`): feriados todo ano, IBGE todo
  mês, escolas do INEP a cada importação.
- **Dados que viram tabela própria**, em vez de consulta a cada uso:
  - feriados, em `national_holidays`, que já existe;
  - municípios, com uma coluna de código IBGE em `localities`;
  - escolas e pontos de interesse, por cidade.
- **Página de atribuição** das fontes (OSM, IBGE, INEP, Wikipedia).

## 5. Protótipo (pode começar já, R2)

Uma camada `data/public/` no protótipo, com **dados de exemplo** das cidades da
demonstração e a mesma forma de resposta do backend:

1. **CEP preenche bairro e cidade** no editor de imóvel e de negócio, com o caso
   "CEP não encontrado".
2. **Feriados na Agenda** e no checklist de chegada.
3. **Aviso de DDD** diferente da cidade no cadastro do negócio.
4. **Clima e "perto de você"** (saúde, escolas, mercados) no Guia de chegada.

Cada item terá prova de uso **e de falha** (API fora do ar, sem resultado), sempre
offline.

## 6. Governança

| Item | Risco | O que exige |
| --- | --- | --- |
| Camada de exemplo no protótipo | R2 | Contrato de tarefa |
| Edge Function, tabela de cache, coluna IBGE em `localities` | **R3** (migrations e políticas) | ADR aprovado por pessoa |
| Consulta de CNPJ (sócios, MEI) | **R3** (dado pessoal, LGPD) | ADR aprovado por pessoa |
| Open-Meteo com app monetizado | **R3** (licença comercial) | Decisão e, se for o caso, contratação |
