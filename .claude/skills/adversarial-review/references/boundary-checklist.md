# Checklist de fronteira — leia os dois lados

Um build verde prova que cada lado compila. Não prova que os dois concordam.
Esta é a classe de bug que já chegou em produção neste repositório.

## Pares que precisam ser lidos juntos

| Produtor | Consumidor | O que checar |
|---|---|---|
| rota (`app/**/page.tsx`) | `href`/`redirect` que aponta para ela | o caminho existe, o param tem o nome certo, o segmento dinâmico casa |
| query / RPC | componente que consome o retorno | shape, `null` possível, e **se o `error` é lido** |
| migration (coluna) | código que lê a coluna | tipo, nullability, default, e a policy que filtra |
| migration (coluna de escopo) | policy que a usa | **mesma migration** — Padrão 6 |
| Server Action | formulário que a chama | estado de erro renderizado, não engolido |
| máquina de estado | mutações que a movem | todo estado alcançável tem UI; nenhum estado é órfão |
| tipo gerado (`database.generated.ts`) | código que o importa | regenerado depois da migration, só schema `public` |
| token de design | componente que o usa | valor cru não substitui token |

## Dois casos reais deste repo

**PostgREST só resolve embed onde existe foreign key.**
`select("a, perfil:profiles!inner(x)")` falha silenciosamente sem FK entre as tabelas —
e várias tabelas deste schema referenciam `auth.users` separadamente, sem FK entre si
(`group_memberships` × `profiles` é o caso conhecido). Se o código descarta o `error`,
a tela renderiza vazia e ninguém percebe. **Leia o `error` de toda consulta**, não só
das que decidem acesso.

**`notFound()` no Next 16 responde 200, não 404.**
Com streaming, o shell é commitado antes de a página decidir. Asserção sobre status
falha; a negação funciona. Verifique a **UI**: ausência do conteúdo protegido e presença
da página de não encontrado.

## Perguntas que costumam achar bug

- O caminho triste renderiza alguma coisa, ou some?
- Estado vazio, carregando e erro: existem os três?
- O que acontece com quem **não** tem permissão? Existe teste negativo?
- A mudança tem consumidor? Código sem consumidor é dead code, não feature.
- Alguém depende do comportamento antigo e não foi atualizado?
