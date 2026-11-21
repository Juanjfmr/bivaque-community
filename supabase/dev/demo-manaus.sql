-- Dados de demonstração de Manaus — SÓ DESENVOLVIMENTO LOCAL.
--
-- Não é seed, não é fixture de pgTAP e não roda em CI. Povoa o banco LOCAL já
-- resetado com seed (`supabase db reset --local`) com conteúdo fictício
-- realista, para o dono ver o app funcionando de verdade no celular.
--
-- Executor: `node scripts/dev/popular-local.mjs` (psql dentro do contêiner
-- supabase_db_bivaque-community). Rodado à mão, nunca por pipeline.
--
-- Contrato deste arquivo:
--   * uma transação só: falhou, não gravou nada;
--   * UUIDs fixos e determinísticos (faixas dd…, longe do seed 20/30/40/70/80
--     e das fixtures de pgTAP 10…), com INSERT … ON CONFLICT DO NOTHING em
--     todas as tabelas — rodar duas vezes não duplica nem quebra;
--   * identidades sintéticas (@bivaque.example.invalid), sem CPF, sem
--     documento, sem OM, sem posto/graduação e sem selo público. A única
--     afirmação "verificada" é o estado privado de verificação, o mesmo que o
--     seed grava para as personas de desenvolvimento;
--   * sem comunidades/vilas: `communities` não é tocada e todo `community_id`
--     fica nulo onde o esquema permite. Os negócios locais entram como ficha
--     de membro (provider_reach escopo cidade + source free), que é o caminho
--     que o ADR de ficha de negócio abriu justamente para não precisar de vila;
--   * sem upload de mídia: `listing_photos`, `post.photo_paths` e afins exigem
--     objeto no Storage com URL assinada, então ficam vazios de propósito.
--
-- Persona principal: demo-ana@bivaque.example.invalid / bivaque-demo-local.
-- A senha sintética é a mesma para todas as contas (públicas por natureza,
-- como no seed).

begin;

-- A data de ocorrência do RSVP é derivada de starts_at pelo gatilho; fixar o
-- fuso da sessão faz a derivação bater com o recorte UTC que o app usa.
set local timezone = 'UTC';

-- ══════════════════════════════════════════════════════════════════════════
-- 1. Pessoas
--
-- 25 contas de Manaus. Nome, bairro e bio são inventados; o CEP é uma chave
-- sintética por pessoa (8 dígitos) e a coordenada do perfil vem da tabela
-- `neighborhoods` do próprio banco — nunca inventada aqui.
-- ══════════════════════════════════════════════════════════════════════════

create temporary table demo_membros (
  i integer primary key,
  id uuid not null unique,
  nome text not null,
  slug text not null unique,
  bairro text not null,
  cep text not null,
  bio text not null,
  dias integer not null
) on commit drop;

insert into demo_membros (i, id, nome, slug, bairro, cep, bio, dias)
values
  (1, 'dd000000-0000-4000-8000-000000000001', 'Ana Beatriz Ferreira', 'ana', 'Centro', '69000001',
   'Professora de história, chegou de Belém no começo do ano. Gosta de café na feira e de caminhada no fim da tarde.', 150),
  (2, 'dd000000-0000-4000-8000-000000000002', 'Carlos Eduardo Nunes', 'carlos', 'Chapada', '69000002',
   'Trabalha com manutenção de redes e joga bola com os vizinhos aos domingos.', 140),
  (3, 'dd000000-0000-4000-8000-000000000003', 'Rosângela Martins', 'rosangela', 'Flores', '69000003',
   'Cozinha por encomenda e vive com a família no mesmo quintal há vinte anos.', 138),
  (4, 'dd000000-0000-4000-8000-000000000004', 'Marcelo Tavares', 'marcelo', 'Adrianópolis', '69000004',
   'Pai de dois meninos, corre cedo e coordena o grupo de caminhada do bairro.', 132),
  (5, 'dd000000-0000-4000-8000-000000000005', 'Patrícia Lobo', 'patricia', 'Ponta Negra', '69000005',
   'Fisioterapeuta, adora praia no fim do dia e sempre tem uma dica de alongamento.', 128),
  (6, 'dd000000-0000-4000-8000-000000000006', 'Rafael Guimarães', 'rafael', 'Aleixo', '69000006',
   'Professor de educação física, organiza treinos leves no parque aos sábados.', 125),
  (7, 'dd000000-0000-4000-8000-000000000007', 'Juliana Prado', 'juliana', 'Japiim', '69000007',
   'Cuida da mãe e trabalha em casa com tradução. Sempre tem um livro novo na mão.', 120),
  (8, 'dd000000-0000-4000-8000-000000000008', 'Anderson Maciel', 'anderson', 'Parque 10 de Novembro', '69000008',
   'Encarregado de obra, gosta de churrasco em família e de resolver tudo com ferramenta emprestada.', 118),
  (9, 'dd000000-0000-4000-8000-000000000009', 'Fernanda Beltrão', 'fernanda', 'São Jorge', '69000009',
   'Enfermeira, mãe de três, conhece cada posto da cidade de tanto rodar com os filhos.', 115),
  (10, 'dd000000-0000-4000-8000-000000000010', 'Sérgio Bastos', 'sergio', 'Compensa', '69000010',
   'Aposentado, pesca no fim de semana e não recusa um conserto de torneira.', 105),
  (11, 'dd000000-0000-4000-8000-000000000011', 'Lidia Nakamura', 'lidia', 'Coroado', '69000011',
   'Bibliotecária, troca livros com meio mundo e organiza a feira de trocas do bairro.', 100),
  (12, 'dd000000-0000-4000-8000-000000000012', 'Tiago Moreira', 'tiago', 'Cachoeirinha', '69000012',
   'Carpinteiro, casado com a Elisa, faz móvel sob medida no quintal de casa.', 95),
  (13, 'dd000000-0000-4000-8000-000000000013', 'Bianca Farias', 'bianca', 'Redenção', '69000013',
   'Cabeleireira, atende em casa e adora conversar sobre novela e receita de bolo.', 92),
  (14, 'dd000000-0000-4000-8000-000000000014', 'Everton Pinheiro', 'everton', 'Planalto', '69000014',
   'Motorista de aplicativo, conhece atalho melhor que mapa e vive com a família por perto.', 88),
  (15, 'dd000000-0000-4000-8000-000000000015', 'Camila Andrade', 'camila', 'Tarumã', '69000015',
   'Arquiteta, reformou o apartamento inteiro sozinha e aprendeu a negociar com pedreiro.', 85),
  (16, 'dd000000-0000-4000-8000-000000000016', 'Hugo Salgado', 'hugo', 'Da Paz', '69000016',
   'Trabalha em gráfica, joga basquete com os amigos e monta a horta do quintal.', 80),
  (17, 'dd000000-0000-4000-8000-000000000017', 'Michele Rios', 'michele', 'Educandos', '69000017',
   'Vende doces por encomenda, tem dois gatos e não sai de casa sem guarda-chuva.', 78),
  (18, 'dd000000-0000-4000-8000-000000000018', 'Wagner Freitas', 'wagner', 'Crespo', '69000018',
   'Técnico em refrigeração, atende a vizinhança e ensina o filho a consertar as coisas.', 74),
  (19, 'dd000000-0000-4000-8000-000000000019', 'Sabrina Coelho', 'sabrina', 'Raiz', '69000019',
   'Pedagoga, trabalha com reforço escolar e passa o sábado no campinho com as crianças.', 70),
  (20, 'dd000000-0000-4000-8000-000000000020', 'Otávio Bentes', 'otavio', 'São Raimundo', '69000020',
   'Marceneiro aposentado, cultiva tempero no quintal e gosta de contar causo.', 66),
  (21, 'dd000000-0000-4000-8000-000000000021', 'Larissa Amorim', 'larissa', 'Vila da Prata', '69000021',
   'Estudante de enfermagem, estagia de manhã e estuda à noite com o grupo da cidade.', 60),
  (22, 'dd000000-0000-4000-8000-000000000022', 'Douglas Serrão', 'douglas', 'Nossa Senhora das Graças', '69000022',
   'Eletricista, atende chamado de vizinho antes de tudo e coleciona disco de vinil.', 55),
  (23, 'dd000000-0000-4000-8000-000000000023', 'Kátia Vasconcelos', 'katia', 'Novo Aleixo', '69000023',
   'Dona de pet shop pequeno, resgata cachorro na rua e vive rodeada de bicho.', 50),
  (24, 'dd000000-0000-4000-8000-000000000024', 'Rodrigo Bacelar', 'rodrigo', 'Cidade Nova', '69000024',
   'Trabalha com informática, monta computador para os amigos e ensina o básico de graça.', 45),
  (25, 'dd000000-0000-4000-8000-000000000025', 'Aline Queiroz', 'aline', 'Mauazinho', '69000025',
   'Cozinheira, faz almoço para escritório e testa receita nova todo domingo.', 40);

-- Token columns go as '' and never NULL: GoTrue reads them as Go `string` and a
-- NULL breaks the password grant with HTTP 500 (same reason as seed.sql).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token,
  created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  m.id,
  'authenticated',
  'authenticated',
  'demo-' || m.slug || '@bivaque.example.invalid',
  extensions.crypt('bivaque-demo-local', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  '', '', '', '', '', '', '', '',
  now() - make_interval(days => m.dias),
  now()
from demo_membros m
on conflict (id) do nothing;

-- Estado de verificação no schema privado (nunca exposto pela Data API). Sem
-- ele a conta não é "aprovada" no produto; os valores são só a classe interna.
insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
select
  m.id,
  'verified',
  (array['active_federal_military', 'veteran', 'military_pensioner'])[1 + (m.i % 3)]::private.eligibility_class,
  now() - make_interval(days => m.dias)
from demo_membros m
on conflict (user_id) do nothing;

insert into public.locality_memberships (user_id, locality_id, joined_at)
select m.id, '00000000-0000-4000-8000-000000000001', now() - make_interval(days => m.dias)
from demo_membros m
on conflict (user_id, locality_id) do nothing;

-- A coordenada é dado de cálculo privado (nunca sai para outro membro) e vem
-- do centro do bairro que o próprio banco já cadastrou. Bairro sem linha em
-- `neighborhoods` deixa CEP sem coordenada, que o esquema aceita.
insert into public.profiles (
  user_id, display_name, visibility, consent_version, consented_at,
  bio, cep, latitude, longitude, neighborhood, show_neighborhood
)
select
  m.id,
  m.nome,
  'locality_members',
  1,
  now() - make_interval(days => m.dias),
  m.bio,
  m.cep,
  n.center_lat,
  n.center_lng,
  m.bairro,
  true
from demo_membros m
left join public.neighborhoods n
  on n.locality_id = '00000000-0000-4000-8000-000000000001'
 and n.name = m.bairro
on conflict (user_id) do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- 2. Família
--
-- Familiares são contas do Auth independentes, ligadas por convite aceito —
-- o modelo do produto. Como no seed, eles não recebem profile nem membership:
-- o vínculo é o que precisa existir.
-- ══════════════════════════════════════════════════════════════════════════

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token,
  created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'dd100000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'demo-marta@bivaque.example.invalid',
   extensions.crypt('bivaque-demo-local', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   '', '', '', '', '', '', '', '',
   now() - interval '115 days', now()),
  ('00000000-0000-0000-0000-000000000000', 'dd100000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'demo-elisa@bivaque.example.invalid',
   extensions.crypt('bivaque-demo-local', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   '', '', '', '', '', '', '', '',
   now() - interval '90 days', now()),
  ('00000000-0000-0000-0000-000000000000', 'dd100000-0000-4000-8000-000000000003',
   'authenticated', 'authenticated', 'demo-lucas@bivaque.example.invalid',
   extensions.crypt('bivaque-demo-local', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   '', '', '', '', '', '', '', '',
   now() - interval '70 days', now())
on conflict (id) do nothing;

-- Convite já 'accepted': inserir aceito não dispara o gatilho de aviso, que só
-- roda em UPDATE.
insert into private.family_invitations (
  id, inviter_user_id, token_digest, invitee_email_digest, status,
  expires_at, accepted_by_user_id, accepted_at, created_at
)
values
  ('dd110000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000000007',
   sha256(convert_to('demo-familia-juliana', 'UTF8')),
   sha256(convert_to('demo-marta@bivaque.example.invalid', 'UTF8')),
   'accepted', now() + interval '30 days', 'dd100000-0000-4000-8000-000000000001',
   now() - interval '110 days', now() - interval '113 days'),
  ('dd110000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000000012',
   sha256(convert_to('demo-familia-tiago', 'UTF8')),
   sha256(convert_to('demo-elisa@bivaque.example.invalid', 'UTF8')),
   'accepted', now() + interval '30 days', 'dd100000-0000-4000-8000-000000000002',
   now() - interval '85 days', now() - interval '88 days'),
  ('dd110000-0000-4000-8000-000000000003', 'dd000000-0000-4000-8000-000000000002',
   sha256(convert_to('demo-familia-carlos', 'UTF8')),
   sha256(convert_to('demo-lucas@bivaque.example.invalid', 'UTF8')),
   'accepted', now() + interval '30 days', 'dd100000-0000-4000-8000-000000000003',
   now() - interval '65 days', now() - interval '68 days')
on conflict (id) do nothing;

insert into private.family_account_links (invitation_id, holder_user_id, family_user_id, linked_at)
values
  ('dd110000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000000007',
   'dd100000-0000-4000-8000-000000000001', now() - interval '110 days'),
  ('dd110000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000000012',
   'dd100000-0000-4000-8000-000000000002', now() - interval '85 days'),
  ('dd110000-0000-4000-8000-000000000003', 'dd000000-0000-4000-8000-000000000002',
   'dd100000-0000-4000-8000-000000000003', now() - interval '65 days')
on conflict do nothing;


commit;
