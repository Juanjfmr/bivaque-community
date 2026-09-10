# Dossie interno de revisao legal para lancamento

> Documento interno. Nao renderizar no onboarding, nao importar em componente de produto e nao
> apresentar ao membro como termo aceito.
>
> Este arquivo existe para preparar a revisao do dono e da assessoria juridica. O membro deve ver
> somente os artefatos publicaveis: politica de privacidade, codigo de conduta, consentimento
> versionado e canal oficial de contato.

## Objetivo

Fechar as decisoes necessarias para que a entrada do Bivaque deixe de aceitar textos em estado de
rascunho. O resultado esperado desta revisao nao e publicar este dossie; e produzir versoes
publicaveis de:

- `docs/legal/PRIVACIDADE.md`
- `docs/legal/CODIGO_DE_CONDUTA.md`
- versoes canonicas de consentimento no dominio
- canal oficial para suporte, direitos do titular e incidentes

## Fronteira com o onboarding

O onboarding pode exibir apenas:

- politica de privacidade aprovada;
- codigo de conduta aprovado;
- versao do aceite;
- acao clara de concordancia ou saida.

O onboarding nao deve exibir:

- parecer juridico;
- matriz de risco;
- perguntas internas;
- notas editoriais de rascunho;
- decisoes pendentes;
- este dossie.

## Decisoes humanas pendentes

| Tema | Decisao necessaria | Por que bloqueia |
|---|---|---|
| Controlador | Nome juridico ou pessoa responsavel pelo tratamento | A politica nao pode dizer "[a definir]" para quem responde pelos dados. |
| Canal oficial | E-mail, formulario ou outro canal monitorado | O titular precisa saber onde pedir acesso, correcao, exclusao e informacoes. |
| Encarregado | Nomear encarregado ou documentar dispensa aplicavel | O canal com titulares/ANPD precisa existir mesmo quando houver dispensa formal de DPO. |
| Codigo de conduta | Dono aprova o texto e a regra de suspensao | Suspensao de conta precisa de base operacional assinada. |
| Privacidade | Advogado revisa bases legais, compartilhamentos e retencao | O aceite precisa corresponder ao comportamento real do produto. |
| Terceiros | Confirmar quais provedores entram no MVP | Resend, Sentry, PostHog, WhatsApp, Asaas e IA nao devem aparecer como ativos se nao estiverem ativos. |
| Direitos do titular | Prazo, responsavel e procedimento interno | O app precisa conseguir responder pedidos, nao apenas prometer resposta. |
| Incidente | Quem decide, quem comunica e em qual prazo | Comunidade fechada com verificacao estatal tem risco reputacional alto se houver vazamento. |

## Fatos do produto que a revisao deve considerar

- A entrada confere elegibilidade nacional de militar federal, veterano ou pensionista.
- O CPF e enviado server-side ao Portal da Transparencia e nao deve ser persistido em texto claro.
- O caminho de excecao usa documento privado com TTL curto.
- Dependentes entram por convite do titular, com conta propria e e-mail alvo conferido.
- Prestadores civis nao sao membros; quando a onda G fechar, terao conta propria e acesso limitado.
- Membros publicam posts, comentarios, pedidos, respostas, grupos, eventos e RSVPs dentro de escopos.
- Denuncias e moderacao geram registros que podem sobreviver a exclusao de conta.
- O produto nao deve expor selo publico de verificacao.
- A afiliacao militar declarada continua bloqueada enquanto o ADR R3 estiver apenas proposto.

## Red flags nos textos atuais

Estes pontos devem ser resolvidos antes de os textos irem ao onboarding como aceite publicavel:

1. `PRIVACIDADE.md` ainda declara que precisa de revisao juridica e contem placeholders de
   controlador, endereco, canal oficial e encarregado.
2. `CODIGO_DE_CONDUTA.md` ainda declara que precisa de revisao do dono.
3. `PRIVACIDADE.md` fala de afiliacao declarada como opcional, mas o contrato vigente ainda proibe
   persistir organizacao militar ate aprovacao do ADR R3.
4. A lista de terceiros deve separar provedores ativos no MVP de provedores planejados ou
   condicionais.
5. WhatsApp saiu da decisao de MVP automatico do dono nesta conversa; se ficar apenas como suporte
   manual, a politica nao deve descreve-lo como canal normal de notificacao.
6. PostHog, IA e Asaas exigem governanca propria antes de ativacao.
7. O texto de direitos do titular deve confirmar o fluxo real de atendimento e se ha exigencia de
   tentativa previa pelo canal oficial antes de peticionar a ANPD.
8. A regra "continuar usando conta como aceite" deve ser revisada para mudancas materiais de
   tratamento de dados ou conduta.

## Pacote para enviar a revisao

Enviar ao dono e a assessoria juridica:

- este dossie;
- `docs/legal/PRIVACIDADE.md`;
- `docs/legal/CODIGO_DE_CONDUTA.md`;
- `docs/BIVAQUE.md` secoes 4, 5, 7, 10, 11 e 12;
- `docs/PRODUCT_STATUS.md` secoes de entrada, convites, moderacao e infraestrutura;
- ADRs vigentes relacionados a conta de prestador, alcance pago, suspensao e localidades;
- ADRs propostos ou bloqueados: afiliacao declarada, IA/curadoria e governanca de terceiros.

## Saidas esperadas da revisao

| Saida | Criterio de pronto |
|---|---|
| Politica de privacidade publicavel | Sem notas internas, sem placeholders, descreve somente comportamento ativo ou claramente condicionado. |
| Codigo de conduta publicavel | Dono aprova o texto que justifica denuncia, ocultacao, suspensao e recurso. |
| Canal oficial | Endereco publicado e monitorado para suporte, direitos do titular e incidente. |
| Registro de decisao | Data, aprovador e versao que sera gravada no aceite. |
| Diff de produto | Se a revisao exigir mudar comportamento, abrir card antes de publicar o texto. |

## Fontes externas de referencia

- ANPD: Guia orientativo sobre seguranca da informacao para agentes de tratamento de pequeno porte
  `https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte`
- ANPD: Direitos dos titulares
  `https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares`
- ANPD: Resolucao CD/ANPD n. 2/2022
  `https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022`

## Nao fazer

- Nao substituir os textos de aceite por este documento.
- Nao colocar este documento em rota publica.
- Nao resolver placeholders juridicos por suposicao tecnica.
- Nao ativar IA, PostHog, WhatsApp automatico ou Asaas apenas porque aparecem em documento.
- Nao publicar texto que prometa comportamento que o codigo ainda nao entrega.
