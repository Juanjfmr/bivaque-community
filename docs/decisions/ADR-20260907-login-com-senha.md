---
id: ADR-20260907-login-com-senha
status: approved
risk: R2
owner: Juan
approved_at: 2026-09-07
expires_at:
linked_plan:
critic_verdict:
critic_review:
---

# Login com e-mail e senha

## Problem

O Bivaque só entra por link no e-mail. O público mais velho — reserva,
veteranos, pensionistas — não tem facilidade com e-mail nem com login sem
senha, e abrir a caixa de entrada a cada acesso é barreira para exatamente quem
o produto quer alcançar.

## Decision

**E-mail e senha, como no Instagram e no Facebook.** Para todos, nas duas
plataformas.

- Entrar: e-mail, senha, "Entrar". Link "Esqueci minha senha".
- Criar conta: nome, e-mail, senha.
- "Continuar com Google" continua, como nos dois produtos citados.
- Recuperação: e-mail com link para definir nova senha. É o padrão dos dois
  produtos e não há razão para inventar outro.
- **O link mágico sai da tela.** Três formas de entrar na mesma tela é o
  oposto de simples. O mecanismo continua no servidor e na base de código;
  só deixa de ser oferecido.
- Política de senha: a já configurada em `supabase/config.toml` — mínimo 8,
  letras e dígitos. Sem exigir símbolo, maiúscula ou troca periódica.

Uma regra que não é preferência e fica registrada: a mensagem de erro é
**"E-mail ou senha incorretos"**, uma só para os dois casos. Não é rigor extra
— é o texto padrão de banco e do gov.br. Distinguir "senha errada" de "conta
não existe" entrega a lista de membros a quem digitar e-mails, e aqui essa
lista expõe vínculo com a instituição.

## Alternatives considered

1. **Manter só sem senha.** Rejeitado: não atende o público relatado.
2. **Código de 6 dígitos no e-mail.** Continua exigindo abrir a caixa de
   entrada; não resolve a dificuldade relatada.
3. **Senha só para operadores.** Rejeitado explicitamente: "É para todos".

## Market or reference baseline

Instagram, Facebook, gov.br, bancos e planos de saúde: e-mail/usuário e senha
como caminho principal, social como alternativa, recuperação por e-mail.

## Proposed divergence from baseline

Só na mensagem de erro, explicada acima. Instagram distingue conta inexistente
de senha errada; aqui não.

## Evidence and sources

- Instrução do responsável, 07/09/2026: "login tradicional com email e senha",
  "É para todos", "algo simples, e-mail e senha, como no Instagram e Facebook".
- `supabase/config.toml` — política de senha já configurada.
- `tests/unit/auth/passwordless-login.test.ts` — contrato que esta decisão
  substitui.
- `docs/design/visual-guide-2026-09-06/30-mobile-auth-entrada.png` — a prancha
  aprovada em 06/09 não tem campo de senha. Esta instrução é posterior e
  prevalece (§2 do processo de construção); a prancha precisa ser regerada.

## Benefits

Entrada sem depender da caixa de entrada. Familiaridade. Imune a link de uso
único queimado por varredura de e-mail institucional.

## Risks

Senha é credencial roubável e reusada. Senha esquecida vira suporte, e este
público é o mais provável de esquecer. Mitigação: limite de tentativas do
provedor, recuperação funcionando desde o primeiro dia, nada de senha em log.

## Reversal cost

Baixo. As senhas ficam no Auth do Supabase, sem schema próprio. Voltar exige
comunicar a mudança a quem já criou senha.

## Success metric

Entrar com senha funciona nas duas plataformas, e recuperação devolve acesso
sem intervenção de operador.

## Reopen condition

Recuperação virar o maior volume de suporte, ou aparecer preenchimento de
credencial em massa contra a base.

## Approval

**Aprovada pelo responsável pelo produto em 07/09/2026**, nesta sessão, em três
declarações: "eu ainda acho que deveríamos ter um login tradicional com email e
senha", "é para todos" e "eu pedi algo simples, e-mail e senha, como no
Instagram e Facebook".

Frontmatter e corpo dizem a mesma coisa de propósito — ver
`ADR-20260901-mobile-session` §Approval para o que custa quando discordam.
