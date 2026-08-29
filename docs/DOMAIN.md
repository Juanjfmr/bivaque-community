# Bivaque — domínio canônico

> Registro factual do domínio da marca e dos usos operacionais associados. Este documento
> não afirma que o produto está publicado; o estado implementado continua em
> [`PRODUCT_STATUS.md`](PRODUCT_STATUS.md).

## Domínio oficial

| Campo | Valor |
|---|---|
| Marca | **Bivaque** |
| Domínio canônico | **`bivaque.app`** |
| URL canônica | **`https://bivaque.app`** |
| Status do domínio | **registrado** |
| Data registrada na documentação | **2026-08-29** |

`bivaque.app` é o domínio oficial da marca Bivaque para presença pública, aplicação e
infraestrutura que dependa de um domínio próprio.

**Registro do domínio não significa implantação.** Enquanto DNS, hospedagem e ambiente de
produção não estiverem configurados e validados, a documentação não deve descrever
`https://bivaque.app` como site disponível ao público.

## Usos previstos

O domínio passa a ser a referência canônica para:

- origem pública da aplicação em produção;
- links externos e materiais institucionais da marca;
- endereços de e-mail oficiais `@bivaque.app`, quando o serviço transacional for ativado;
- configuração e validação de domínio do Resend, incluindo SPF/DKIM conforme o provedor;
- `Site URL` e redirect URLs de autenticação em produção, quando a aplicação migrar para o
  domínio;
- URLs permitidas de OAuth e demais integrações que validem origem/redirect;
- presença pública usada em processos futuros de verificação de serviços, inclusive
  WhatsApp Cloud API quando os demais requisitos jurídicos e operacionais estiverem
  satisfeitos.

## Regras de consistência

1. **Não introduzir outro domínio principal** em documentação, UI, e-mails ou configuração
   sem decisão explícita que substitua este documento.
2. Subdomínios são permitidos quando houver necessidade técnica, mas continuam sob
   `bivaque.app`.
3. Ambientes locais e de preview (`localhost`, URLs de preview da hospedagem e equivalentes)
   não alteram o domínio canônico.
4. Não documentar credenciais do registrador, tokens DNS, chaves de API ou dados pessoais do
   titular do registro.
5. Alterações de DNS, autenticação, e-mail ou produção devem ser registradas como estado
   implementado somente depois de efetivamente configuradas e verificadas.

## Próximas dependências operacionais

O registro remove a dependência **"obter domínio próprio"**, mas não fecha automaticamente
as tarefas que dependem dele. Permanecem independentes:

- configurar DNS e hospedagem;
- conectar o domínio ao ambiente de produção;
- configurar domínio de envio e autenticação de e-mail;
- atualizar callbacks/redirects de autenticação;
- definir os endereços oficiais de suporte e privacidade;
- validar HTTPS e redirecionamento canônico antes do lançamento.
