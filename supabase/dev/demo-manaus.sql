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

-- ══════════════════════════════════════════════════════════════════════════
-- 3. Mercado: 22 desapegos e 8 imóveis
--
-- Desapego não leva CEP e a localização publicada é bairro · cidade. Imóvel
-- leva CEP (chave sintética do dono) com localização aproximada e SEM
-- coordenada: coordenada só entra quando o servidor geocodifica o CEP, e aqui
-- não se inventa coordenada de anúncio.
-- ══════════════════════════════════════════════════════════════════════════

insert into public.listings (
  id, owner_user_id, kind, status, title, description, category, condition,
  price_cents, locality_id, neighborhood, published_at, created_at, updated_at
)
values
  ('dd500000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000000002',
   'item', 'active', 'Mesa de jantar de madeira com quatro cadeiras',
   'Mesa usada por três anos, com pequenos sinais de uso na tampa. As cadeiras estão firmes.',
   'casa_moveis', 'used', 48000, '00000000-0000-4000-8000-000000000001', 'Chapada',
   now() - interval '9 days', now() - interval '11 days', now() - interval '9 days'),
  ('dd500000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000000002',
   'item', 'active', 'Bicicleta aro 26 revisada',
   'Freio novo e pneu traseiro trocado no mês passado. Boa para trecho curto e para levar as crianças.',
   'esporte', 'used', 75000, '00000000-0000-4000-8000-000000000001', 'Chapada',
   now() - interval '7 days', now() - interval '9 days', now() - interval '7 days'),
  ('dd500000-0000-4000-8000-000000000003', 'dd000000-0000-4000-8000-000000000003',
   'item', 'active', 'Freezer horizontal de 200 litros',
   'Funciona bem, foi usado na produção de doces. Retirada no local, precisa de duas pessoas.',
   'eletronicos', 'used', 95000, '00000000-0000-4000-8000-000000000001', 'Flores',
   now() - interval '6 days', now() - interval '8 days', now() - interval '6 days'),
  ('dd500000-0000-4000-8000-000000000004', 'dd000000-0000-4000-8000-000000000004',
   'item', 'active', 'Berço desmontável com colchão',
   'Berço de madeira usado por dois anos, colchão incluso. Sem manchas e com todas as peças.',
   'infantil', 'used', 32000, '00000000-0000-4000-8000-000000000001', 'Adrianópolis',
   now() - interval '5 days', now() - interval '7 days', now() - interval '5 days'),
  ('dd500000-0000-4000-8000-000000000005', 'dd000000-0000-4000-8000-000000000004',
   'item', 'active', 'Carrinho de bebê compacto',
   'Dobra sozinho e cabe no porta-malas pequeno. Vai com a capa de chuva.',
   'infantil', 'used', 45000, '00000000-0000-4000-8000-000000000001', 'Adrianópolis',
   now() - interval '4 days', now() - interval '6 days', now() - interval '4 days'),
  ('dd500000-0000-4000-8000-000000000006', 'dd000000-0000-4000-8000-000000000005',
   'item', 'active', 'Esteira elétrica dobrável',
   'Velocidade até dez por hora, com cabo e manual. Dobra para guardar atrás do sofá.',
   'esporte', 'used', 130000, '00000000-0000-4000-8000-000000000001', 'Ponta Negra',
   now() - interval '10 days', now() - interval '12 days', now() - interval '10 days'),
  ('dd500000-0000-4000-8000-000000000007', 'dd000000-0000-4000-8000-000000000006',
   'item', 'active', 'Kit de halteres ajustáveis',
   'Par de halteres com anilhas de dois a dez quilos. Pouco uso, guardado em casa.',
   'esporte', 'used', 60000, '00000000-0000-4000-8000-000000000001', 'Aleixo',
   now() - interval '3 days', now() - interval '5 days', now() - interval '3 days'),
  ('dd500000-0000-4000-8000-000000000008', 'dd000000-0000-4000-8000-000000000007',
   'item', 'active', 'Estante de livros com cinco prateleiras',
   'Madeira maciça, desmonta para transporte. Duas prateleiras têm marca de copo.',
   'casa_moveis', 'used', 55000, '00000000-0000-4000-8000-000000000001', 'Japiim',
   now() - interval '12 days', now() - interval '14 days', now() - interval '12 days'),
  ('dd500000-0000-4000-8000-000000000009', 'dd000000-0000-4000-8000-000000000008',
   'item', 'active', 'Furadeira de impacto com maleta',
   'Nova, ainda na caixa, com jogo de brocas. Comprei duplicada e não usei.',
   'casa_moveis', 'new', 28000, '00000000-0000-4000-8000-000000000001', 'Parque 10 de Novembro',
   now() - interval '2 days', now() - interval '4 days', now() - interval '2 days'),
  ('dd500000-0000-4000-8000-000000000010', 'dd000000-0000-4000-8000-000000000009',
   'item', 'active', 'Cadeira de escritório com apoio de braço',
   'Rodízio em bom estado e ajuste de altura funcionando. Tecido sem rasgo.',
   'casa_moveis', 'used', 38000, '00000000-0000-4000-8000-000000000001', 'São Jorge',
   now() - interval '8 days', now() - interval '10 days', now() - interval '8 days'),
  ('dd500000-0000-4000-8000-000000000011', 'dd000000-0000-4000-8000-000000000011',
   'item', 'active', 'Caixa com vinte e cinco livros infantis',
   'Livros ilustrados, todos inteiros. Alguns com dedicatória na primeira página.',
   'infantil', 'used', 9000, '00000000-0000-4000-8000-000000000001', 'Coroado',
   now() - interval '11 days', now() - interval '13 days', now() - interval '11 days'),
  ('dd500000-0000-4000-8000-000000000012', 'dd000000-0000-4000-8000-000000000012',
   'item', 'active', 'Armário de cozinha em madeira',
   'Duas portas com prateleira interna, feito sob medida. Cabe em parede de dois metros.',
   'casa_moveis', 'used', 62000, '00000000-0000-4000-8000-000000000001', 'Cachoeirinha',
   now() - interval '6 days', now() - interval '8 days', now() - interval '6 days'),
  ('dd500000-0000-4000-8000-000000000013', 'dd000000-0000-4000-8000-000000000013',
   'item', 'active', 'Secador e prancha profissionais',
   'Kit novo, usado só para teste no salão. Vai com bolsa térmica.',
   'eletronicos', 'new', 89000, '00000000-0000-4000-8000-000000000001', 'Redenção',
   now() - interval '1 day', now() - interval '3 days', now() - interval '1 day'),
  ('dd500000-0000-4000-8000-000000000014', 'dd000000-0000-4000-8000-000000000014',
   'item', 'active', 'Cadeirinha de carro para criança',
   'Cadeirinha do grupo um, sem batida. Capa lavável e cinto completo.',
   'infantil', 'used', 21000, '00000000-0000-4000-8000-000000000001', 'Planalto',
   now() - interval '5 days', now() - interval '7 days', now() - interval '5 days'),
  ('dd500000-0000-4000-8000-000000000015', 'dd000000-0000-4000-8000-000000000015',
   'item', 'active', 'Escrivaninha com gaveta',
   'Bancada de estudo com uma gaveta, boa para quarto pequeno. Marca de uso na borda.',
   'casa_moveis', 'used', 27000, '00000000-0000-4000-8000-000000000001', 'Tarumã',
   now() - interval '9 days', now() - interval '11 days', now() - interval '9 days'),
  ('dd500000-0000-4000-8000-000000000016', 'dd000000-0000-4000-8000-000000000016',
   'item', 'active', 'Ventilador de coluna com três velocidades',
   'Funciona bem e a base é pesada, não balança. Cabo em bom estado.',
   'eletronicos', 'used', 12000, '00000000-0000-4000-8000-000000000001', 'Da Paz',
   now() - interval '4 days', now() - interval '6 days', now() - interval '4 days'),
  ('dd500000-0000-4000-8000-000000000017', 'dd000000-0000-4000-8000-000000000017',
   'item', 'active', 'Batedeira planetária com três acessórios',
   'Pouco uso, ideal para quem faz bolo por encomenda. Limpa e guardada na caixa.',
   'eletronicos', 'used', 34000, '00000000-0000-4000-8000-000000000001', 'Educandos',
   now() - interval '3 days', now() - interval '5 days', now() - interval '3 days'),
  ('dd500000-0000-4000-8000-000000000018', 'dd000000-0000-4000-8000-000000000018',
   'item', 'active', 'Fogão de duas bocas',
   'Usado em apartamento, com mangueira inclusa. As duas bocas acendem bem.',
   'casa_moveis', 'used', 25000, '00000000-0000-4000-8000-000000000001', 'Crespo',
   now() - interval '13 days', now() - interval '15 days', now() - interval '13 days'),
  ('dd500000-0000-4000-8000-000000000019', 'dd000000-0000-4000-8000-000000000019',
   'item', 'active', 'Conjunto de cinco panelas antiaderentes',
   'Duas panelas sem uso, as outras com marca de uso normal. Cabos firmes.',
   'casa_moveis', 'used', 18000, '00000000-0000-4000-8000-000000000001', 'Raiz',
   now() - interval '7 days', now() - interval '9 days', now() - interval '7 days'),
  ('dd500000-0000-4000-8000-000000000020', 'dd000000-0000-4000-8000-000000000014',
   'item', 'active', 'Bicicleta infantil aro 20',
   'Vai com as rodinhas removíveis. Quadro em bom estado e pneus cheios.',
   'infantil', 'used', 26000, '00000000-0000-4000-8000-000000000001', 'Planalto',
   now() - interval '2 days', now() - interval '4 days', now() - interval '2 days'),
  ('dd500000-0000-4000-8000-000000000021', 'dd000000-0000-4000-8000-000000000001',
   'item', 'active', 'Máquina de costura doméstica',
   'Máquina simples, revisada no mês passado. Vai com pedal, manual e três bobinas.',
   'casa_moveis', 'used', 40000, '00000000-0000-4000-8000-000000000001', 'Centro',
   now() - interval '1 day', now() - interval '3 days', now() - interval '1 day'),
  ('dd500000-0000-4000-8000-000000000022', 'dd000000-0000-4000-8000-000000000001',
   'item', 'paused', 'Poltrona reclinável em tecido',
   'Reclina em três posições e está no quarto de hóspedes. Pausada enquanto decidimos se fica.',
   'casa_moveis', 'used', 70000, '00000000-0000-4000-8000-000000000001', 'Centro',
   now() - interval '16 days', now() - interval '18 days', now() - interval '2 days')
on conflict (id) do nothing;

-- Imóveis: CEP presente e localização aproximada, sem coordenada.
insert into public.listings (
  id, owner_user_id, kind, status, title, description,
  locality_id, neighborhood, cep, localizacao_publica,
  published_at, created_at, updated_at
)
values
  ('dd510000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000000002',
   'property', 'active', 'Casa de três quartos com quintal',
   'Rua tranquila, quintal com árvore frutífera e área de serviço coberta. Perto da escola do bairro.',
   '00000000-0000-4000-8000-000000000001', 'Chapada', '69000002', 'aproximada',
   now() - interval '6 days', now() - interval '8 days', now() - interval '6 days'),
  ('dd510000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000000005',
   'property', 'active', 'Apartamento de dois quartos em Ponta Negra',
   'Prédio com portaria vinte e quatro horas, elevador e piscina. Vaga coberta na garagem.',
   '00000000-0000-4000-8000-000000000001', 'Ponta Negra', '69000005', 'aproximada',
   now() - interval '4 days', now() - interval '6 days', now() - interval '4 days'),
  ('dd510000-0000-4000-8000-000000000003', 'dd000000-0000-4000-8000-000000000008',
   'property', 'active', 'Apartamento de dois quartos no Parque 10',
   'Andar alto, bem ventilado, com armários na cozinha. Condomínio com portaria.',
   '00000000-0000-4000-8000-000000000001', 'Parque 10 de Novembro', '69000008', 'aproximada',
   now() - interval '2 days', now() - interval '4 days', now() - interval '2 days'),
  ('dd510000-0000-4000-8000-000000000004', 'dd000000-0000-4000-8000-000000000001',
   'property', 'reserved', 'Apartamento de dois quartos no Centro',
   'Próximo ao comércio, com vaga na garagem. Reservado para visita na quinta.',
   '00000000-0000-4000-8000-000000000001', 'Centro', '69000001', 'aproximada',
   now() - interval '10 days', now() - interval '12 days', now() - interval '1 day'),
  ('dd510000-0000-4000-8000-000000000005', 'dd000000-0000-4000-8000-000000000010',
   'property', 'active', 'Casa de três quartos com dois banheiros',
   'Duas vagas na frente, cozinha ampliada e quintal nos fundos. Aceita conversa sobre o valor.',
   '00000000-0000-4000-8000-000000000001', 'Compensa', '69000010', 'aproximada',
   now() - interval '8 days', now() - interval '10 days', now() - interval '8 days'),
  ('dd510000-0000-4000-8000-000000000006', 'dd000000-0000-4000-8000-000000000015',
   'property', 'active', 'Terreno plano de trezentos metros',
   'Terreno cercado, com água e luz na rua. Documentação em ordem para financiamento.',
   '00000000-0000-4000-8000-000000000001', 'Tarumã', '69000015', 'aproximada',
   now() - interval '3 days', now() - interval '5 days', now() - interval '3 days'),
  ('dd510000-0000-4000-8000-000000000007', 'dd000000-0000-4000-8000-000000000019',
   'property', 'active', 'Kitnet mobiliada para alugar',
   'Um quarto com cozinha integrada, mobiliada e com ar-condicionado. Conta de água inclusa.',
   '00000000-0000-4000-8000-000000000001', 'Raiz', '69000019', 'aproximada',
   now() - interval '5 days', now() - interval '7 days', now() - interval '5 days'),
  ('dd510000-0000-4000-8000-000000000008', 'dd000000-0000-4000-8000-000000000022',
   'property', 'active', 'Sala comercial com dois banheiros',
   'Sala ampla no térreo, com vitrine para a rua e dois banheiros. Pronta para uso.',
   '00000000-0000-4000-8000-000000000001', 'Nossa Senhora das Graças', '69000022', 'aproximada',
   now() - interval '9 days', now() - interval '11 days', now() - interval '9 days')
on conflict (id) do nothing;

insert into public.property_details (
  listing_id, deal, property_type, rent_cents, sale_price_cents, condo_fee_cents,
  iptu_cents, bedrooms, suites, parking_spots, area_m2, amenities, available_from
)
values
  ('dd510000-0000-4000-8000-000000000001', 'sale', 'house', null, 52000000, null,
   180000, 3, 1, 2, 140, array['Quintal', 'Área de serviço'], current_date + 30),
  ('dd510000-0000-4000-8000-000000000002', 'rent', 'apartment', 220000, null, 45000,
   12000, 2, 1, 1, 68, array['Portaria 24h', 'Elevador', 'Piscina'], current_date + 15),
  ('dd510000-0000-4000-8000-000000000003', 'rent', 'apartment', 160000, null, 30000,
   9000, 2, 1, 1, 58, array['Portaria 24h', 'Armários na cozinha'], current_date + 20),
  ('dd510000-0000-4000-8000-000000000004', 'sale', 'apartment', null, 38000000, 38000,
   14000, 2, 1, 1, 70, array['Elevador', 'Vaga coberta'], current_date + 45),
  ('dd510000-0000-4000-8000-000000000005', 'rent', 'house', 140000, null, null,
   6000, 3, 2, 2, 110, array['Quintal', 'Cozinha ampliada'], current_date + 10),
  ('dd510000-0000-4000-8000-000000000006', 'sale', 'land', null, 18000000, null,
   3500, null, null, null, 300, array['Cercado', 'Água e luz na rua'], null),
  ('dd510000-0000-4000-8000-000000000007', 'rent', 'studio', 95000, null, 25000,
   5000, 1, 1, 1, 32, array['Mobiliada', 'Ar-condicionado'], current_date + 7),
  ('dd510000-0000-4000-8000-000000000008', 'sale', 'commercial', null, 26000000, 22000,
   16000, null, null, 2, 90, array['Vitrine', 'Dois banheiros'], current_date + 60)
on conflict (listing_id) do nothing;

-- A persona principal guardou um item e um imóvel de terceiros.
insert into public.listing_saves (id, listing_id, user_id, created_at)
values
  ('dd950000-0000-4000-8000-000000000001', 'dd500000-0000-4000-8000-000000000006',
   'dd000000-0000-4000-8000-000000000001', now() - interval '3 hours'),
  ('dd950000-0000-4000-8000-000000000002', 'dd510000-0000-4000-8000-000000000001',
   'dd000000-0000-4000-8000-000000000001', now() - interval '2 hours')
on conflict (id) do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- 4. Indicações: 15 perguntas com respostas de outros membros
-- ══════════════════════════════════════════════════════════════════════════

insert into public.recommendation_requests (
  id, author_id, locality_id, title, body, category, created_at, updated_at
)
values
  ('dd600000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000001',
   'Alguém indica pediatra que atenda aos sábados?',
   'Minha filha tem três anos e o posto daqui só atende durante a semana.', 'saude_bem_estar',
   now() - interval '6 days', now() - interval '6 days'),
  ('dd600000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000000003',
   '00000000-0000-4000-8000-000000000001',
   'Eletricista para trocar o quadro de luz',
   'O disjuntor desarma toda vez que ligo o chuveiro e o micro-ondas junto.', 'servicos_locais',
   now() - interval '9 days', now() - interval '9 days'),
  ('dd600000-0000-4000-8000-000000000003', 'dd000000-0000-4000-8000-000000000004',
   '00000000-0000-4000-8000-000000000001',
   'Escola com turma de reforço no contraturno',
   'Meu filho está no quinto ano e precisa de apoio em matemática.', 'educacao',
   now() - interval '4 days', now() - interval '4 days'),
  ('dd600000-0000-4000-8000-000000000004', 'dd000000-0000-4000-8000-000000000006',
   '00000000-0000-4000-8000-000000000001',
   'Personal para treino em dupla',
   'Duas pessoas, três vezes por semana, de preferência cedo.', 'esporte_lazer',
   now() - interval '11 days', now() - interval '11 days'),
  ('dd600000-0000-4000-8000-000000000005', 'dd000000-0000-4000-8000-000000000007',
   '00000000-0000-4000-8000-000000000001',
   'Restaurante para almoço de família no domingo',
   'Somos dez pessoas, com duas crianças pequenas.', 'alimentacao',
   now() - interval '3 days', now() - interval '3 days'),
  ('dd600000-0000-4000-8000-000000000006', 'dd000000-0000-4000-8000-000000000009',
   '00000000-0000-4000-8000-000000000001',
   'Ortopedista para dor no joelho',
   'A dor apareceu depois de correr e não passou com repouso.', 'saude_bem_estar',
   now() - interval '8 days', now() - interval '8 days'),
  ('dd600000-0000-4000-8000-000000000007', 'dd000000-0000-4000-8000-000000000011',
   '00000000-0000-4000-8000-000000000001',
   'Costureira para ajustar vestido de festa',
   'Precisa ficar pronto em duas semanas e é um ajuste simples na cintura.', 'servicos_locais',
   now() - interval '5 days', now() - interval '5 days'),
  ('dd600000-0000-4000-8000-000000000008', 'dd000000-0000-4000-8000-000000000013',
   '00000000-0000-4000-8000-000000000001',
   'Manicure que atenda em casa',
   'Duas pessoas, no fim da tarde, uma vez por mês.', 'servicos_locais',
   now() - interval '12 days', now() - interval '12 days'),
  ('dd600000-0000-4000-8000-000000000009', 'dd000000-0000-4000-8000-000000000015',
   '00000000-0000-4000-8000-000000000001',
   'Mudança pequena dentro da cidade',
   'Apartamento de um quarto, sem elevador no destino.', 'transporte',
   now() - interval '7 days', now() - interval '7 days'),
  ('dd600000-0000-4000-8000-000000000010', 'dd000000-0000-4000-8000-000000000016',
   '00000000-0000-4000-8000-000000000001',
   'Professor de reforço de inglês',
   'Nível intermediário, duas aulas por semana, no fim da tarde.', 'educacao',
   now() - interval '14 days', now() - interval '14 days'),
  ('dd600000-0000-4000-8000-000000000011', 'dd000000-0000-4000-8000-000000000018',
   '00000000-0000-4000-8000-000000000001',
   'Chaveiro que atenda à noite',
   'Preciso trocar o segredo da fechadura de casa.', 'servicos_locais',
   now() - interval '2 days', now() - interval '2 days'),
  ('dd600000-0000-4000-8000-000000000012', 'dd000000-0000-4000-8000-000000000020',
   '00000000-0000-4000-8000-000000000001',
   'Peixaria com entrega no sábado',
   'Para comprar peixe fresco sem sair de casa.', 'alimentacao',
   now() - interval '10 days', now() - interval '10 days'),
  ('dd600000-0000-4000-8000-000000000013', 'dd000000-0000-4000-8000-000000000021',
   '00000000-0000-4000-8000-000000000001',
   'Dentista para extração de siso',
   'Dois dentes para tirar e bastante medo de dentista.', 'saude_bem_estar',
   now() - interval '16 days', now() - interval '16 days'),
  ('dd600000-0000-4000-8000-000000000014', 'dd000000-0000-4000-8000-000000000023',
   '00000000-0000-4000-8000-000000000001',
   'Banho e tosa que busque em casa',
   'Dois cachorros de porte médio, uma vez por mês.', 'servicos_locais',
   now() - interval '13 days', now() - interval '13 days'),
  ('dd600000-0000-4000-8000-000000000015', 'dd000000-0000-4000-8000-000000000024',
   '00000000-0000-4000-8000-000000000001',
   'Aula de violão para adolescente',
   'Começando do zero, uma vez por semana.', 'educacao',
   now() - interval '18 days', now() - interval '18 days')
on conflict (id) do nothing;

insert into public.recommendation_replies (id, request_id, author_id, body, created_at)
values
  ('dd700000-0000-4000-8000-000000000001', 'dd600000-0000-4000-8000-000000000001',
   'dd000000-0000-4000-8000-000000000005',
   'A Dra. Helena atende no sábado de manhã na clínica do Centro. Vale ligar cedo para pegar horário.',
   now() - interval '5 days'),
  ('dd700000-0000-4000-8000-000000000002', 'dd600000-0000-4000-8000-000000000001',
   'dd000000-0000-4000-8000-000000000009',
   'Também levo meus filhos na pediatra da policlínica e nunca esperei mais de meia hora.',
   now() - interval '4 days'),
  ('dd700000-0000-4000-8000-000000000003', 'dd600000-0000-4000-8000-000000000002',
   'dd000000-0000-4000-8000-000000000022',
   'Faço esse serviço no fim de semana. Posso passar para olhar sem compromisso.',
   now() - interval '8 days'),
  ('dd700000-0000-4000-8000-000000000004', 'dd600000-0000-4000-8000-000000000002',
   'dd000000-0000-4000-8000-000000000010',
   'Usei o serviço do Douglas e ficou bem feito. Ele explica antes de mexer.',
   now() - interval '7 days'),
  ('dd700000-0000-4000-8000-000000000005', 'dd600000-0000-4000-8000-000000000003',
   'dd000000-0000-4000-8000-000000000019',
   'Dou reforço de matemática para o fundamental no contraturno. Posso conversar esta semana.',
   now() - interval '3 days'),
  ('dd700000-0000-4000-8000-000000000006', 'dd600000-0000-4000-8000-000000000004',
   'dd000000-0000-4000-8000-000000000007',
   'Tem treino em dupla na academia do Aleixo, com horário de seis da manhã.',
   now() - interval '10 days'),
  ('dd700000-0000-4000-8000-000000000007', 'dd600000-0000-4000-8000-000000000005',
   'dd000000-0000-4000-8000-000000000017',
   'Faço almoço por encomenda e entrego pronto no domingo. Fecho o cardápio na quinta.',
   now() - interval '2 days'),
  ('dd700000-0000-4000-8000-000000000008', 'dd600000-0000-4000-8000-000000000006',
   'dd000000-0000-4000-8000-000000000005',
   'O Dr. Marcelo atende ortopedia perto do hospital e é bem atencioso. Leva o exame anterior.',
   now() - interval '7 days'),
  ('dd700000-0000-4000-8000-000000000009', 'dd600000-0000-4000-8000-000000000007',
   'dd000000-0000-4000-8000-000000000013',
   'Faço ajuste de festa e consigo entregar em uma semana.',
   now() - interval '4 days'),
  ('dd700000-0000-4000-8000-000000000010', 'dd600000-0000-4000-8000-000000000009',
   'dd000000-0000-4000-8000-000000000014',
   'Tenho carro grande e faço frete pequeno no fim de semana.',
   now() - interval '6 days'),
  ('dd700000-0000-4000-8000-000000000011', 'dd600000-0000-4000-8000-000000000010',
   'dd000000-0000-4000-8000-000000000021',
   'Sou estudante de letras e dou aula de inglês intermediário.',
   now() - interval '13 days'),
  ('dd700000-0000-4000-8000-000000000012', 'dd600000-0000-4000-8000-000000000011',
   'dd000000-0000-4000-8000-000000000022',
   'Atendo chamado à noite até as dez. Troca de segredo no mesmo dia.',
   now() - interval '1 day'),
  ('dd700000-0000-4000-8000-000000000013', 'dd600000-0000-4000-8000-000000000013',
   'dd000000-0000-4000-8000-000000000009',
   'Fiz extração com o Dr. Lima e não senti nada. Ele explica tudo antes de começar.',
   now() - interval '15 days'),
  ('dd700000-0000-4000-8000-000000000014', 'dd600000-0000-4000-8000-000000000014',
   'dd000000-0000-4000-8000-000000000023',
   'Busco em casa e trago de volta no mesmo dia.',
   now() - interval '12 days'),
  ('dd700000-0000-4000-8000-000000000015', 'dd600000-0000-4000-8000-000000000015',
   'dd000000-0000-4000-8000-000000000024',
   'Dou aula de violão para iniciante, uma vez por semana.',
   now() - interval '17 days')
on conflict (id) do nothing;

-- Perguntas que a comunidade já resolveu (a marca é sempre da pergunta, nunca
-- um ranking de quem respondeu).
update public.recommendation_requests
   set is_resolved = true,
       resolved_reply_id = 'dd700000-0000-4000-8000-000000000001',
       resolved_at = now() - interval '4 days',
       resolved_by = author_id
 where id = 'dd600000-0000-4000-8000-000000000001';
update public.recommendation_requests
   set is_resolved = true,
       resolved_reply_id = 'dd700000-0000-4000-8000-000000000003',
       resolved_at = now() - interval '7 days',
       resolved_by = author_id
 where id = 'dd600000-0000-4000-8000-000000000002';
update public.recommendation_requests
   set is_resolved = true,
       resolved_reply_id = 'dd700000-0000-4000-8000-000000000007',
       resolved_at = now() - interval '1 day',
       resolved_by = author_id
 where id = 'dd600000-0000-4000-8000-000000000005';
update public.recommendation_requests
   set is_resolved = true,
       resolved_reply_id = 'dd700000-0000-4000-8000-000000000013',
       resolved_at = now() - interval '14 days',
       resolved_by = author_id
 where id = 'dd600000-0000-4000-8000-000000000013';

-- ══════════════════════════════════════════════════════════════════════════
-- 5. Negócios locais com catálogo
--
-- Ficha de membro (ADR da ficha de negócio): o dono é membro admitido, o
-- alcance é a cidade com source free e ativo. Nenhuma linha em
-- provider_accounts — aquela tabela exige comunidade (NOT NULL) e o produto
-- não tem vila.
-- ══════════════════════════════════════════════════════════════════════════

insert into public.provider_profiles (
  id, owner_user_id, display_name, category, bio, contact_is_public, contact_phone
)
values
  ('dd800000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000000003',
   'Cantina da Rosa', 'alimentacao',
   'Almoço caseiro por encomenda, com entrega na região central. Cardápio fechado na quinta.',
   true, '92991010001'),
  ('dd800000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000000002',
   'Marcenaria Rio Negro', 'casa_e_reformas',
   'Móvel sob medida, montagem e pequenos reparos em madeira. Orçamento sem compromisso.',
   true, '92991020002'),
  ('dd800000-0000-4000-8000-000000000003', 'dd000000-0000-4000-8000-000000000009',
   'Frio Certo Refrigeração', 'assistencia_tecnica',
   'Instalação e limpeza de ar-condicionado, com atendimento agendado.',
   true, '92991030003'),
  ('dd800000-0000-4000-8000-000000000004', 'dd000000-0000-4000-8000-000000000014',
   'Mudança Fácil Manaus', 'mudanca_e_transporte',
   'Frete pequeno e mudança dentro da cidade, com carro fechado.',
   true, '92991040004'),
  ('dd800000-0000-4000-8000-000000000005', 'dd000000-0000-4000-8000-000000000013',
   'Studio Bella Vista', 'beleza',
   'Corte, escova e maquiagem com hora marcada, em espaço próprio.',
   true, '92991050005'),
  ('dd800000-0000-4000-8000-000000000006', 'dd000000-0000-4000-8000-000000000019',
   'Reforço Escolar Amazonas', 'educacao_e_aulas',
   'Acompanhamento de matemática e português para o fundamental, em turma pequena.',
   true, '92991060006'),
  ('dd800000-0000-4000-8000-000000000007', 'dd000000-0000-4000-8000-000000000023',
   'Pet Amigo da Chapada', 'pets',
   'Banho, tosa e busca em casa para cães de porte pequeno e médio.',
   true, '92991070007'),
  ('dd800000-0000-4000-8000-000000000008', 'dd000000-0000-4000-8000-000000000022',
   'Oficina do Zé', 'automotivo',
   'Revisão simples, troca de óleo e elétrica automotiva, com orçamento na hora.',
   true, '92991080008')
on conflict (id) do nothing;

insert into public.provider_reach (provider_id, scope_type, scope_id, source, active)
values
  ('dd800000-0000-4000-8000-000000000001', 'locality', '00000000-0000-4000-8000-000000000001', 'free', true),
  ('dd800000-0000-4000-8000-000000000002', 'locality', '00000000-0000-4000-8000-000000000001', 'free', true),
  ('dd800000-0000-4000-8000-000000000003', 'locality', '00000000-0000-4000-8000-000000000001', 'free', true),
  ('dd800000-0000-4000-8000-000000000004', 'locality', '00000000-0000-4000-8000-000000000001', 'free', true),
  ('dd800000-0000-4000-8000-000000000005', 'locality', '00000000-0000-4000-8000-000000000001', 'free', true),
  ('dd800000-0000-4000-8000-000000000006', 'locality', '00000000-0000-4000-8000-000000000001', 'free', true),
  ('dd800000-0000-4000-8000-000000000007', 'locality', '00000000-0000-4000-8000-000000000001', 'free', true),
  ('dd800000-0000-4000-8000-000000000008', 'locality', '00000000-0000-4000-8000-000000000001', 'free', true)
on conflict (provider_id, scope_type, scope_id) do nothing;

insert into public.provider_catalog_items (id, provider_id, title, description, price_cents, position)
values
  ('dd810000-0000-4000-8000-000000000001', 'dd800000-0000-4000-8000-000000000001',
   'Marmita completa', 'Arroz, feijão, carne, salada e farofa. Entrega no almoço.', 2200, 0),
  ('dd810000-0000-4000-8000-000000000002', 'dd800000-0000-4000-8000-000000000001',
   'Almoço para dez pessoas', 'Buffet simples para reunião de família, com duas opções de carne.', 32000, 1),
  ('dd810000-0000-4000-8000-000000000003', 'dd800000-0000-4000-8000-000000000001',
   'Bolo de macaxeira', 'Bolo de um quilo, encomenda com dois dias de antecedência.', 6500, 2),
  ('dd810000-0000-4000-8000-000000000004', 'dd800000-0000-4000-8000-000000000002',
   'Prateleira sob medida', 'Instalação em parede de alvenaria, com acabamento em madeira.', 18000, 0),
  ('dd810000-0000-4000-8000-000000000005', 'dd800000-0000-4000-8000-000000000002',
   'Porta de armário', 'Troca de porta com dobradiça e puxador inclusos.', 12000, 1),
  ('dd810000-0000-4000-8000-000000000006', 'dd800000-0000-4000-8000-000000000002',
   'Mesa de estudo infantil', 'Mesa com altura ajustável, feita em madeira maciça.', 45000, 2),
  ('dd810000-0000-4000-8000-000000000007', 'dd800000-0000-4000-8000-000000000003',
   'Limpeza de ar-condicionado', 'Higienização completa da evaporadora, com filtro lavado.', 15000, 0),
  ('dd810000-0000-4000-8000-000000000008', 'dd800000-0000-4000-8000-000000000003',
   'Instalação de split', 'Instalação com suporte e até três metros de tubulação.', 35000, 1),
  ('dd810000-0000-4000-8000-000000000009', 'dd800000-0000-4000-8000-000000000003',
   'Recarga de gás', 'Conferência de pressão e recarga quando necessário.', 22000, 2),
  ('dd810000-0000-4000-8000-000000000010', 'dd800000-0000-4000-8000-000000000004',
   'Frete pequeno', 'Até dez caixas, dentro da cidade, com ajuda para carregar.', 18000, 0),
  ('dd810000-0000-4000-8000-000000000011', 'dd800000-0000-4000-8000-000000000004',
   'Mudança de um quarto', 'Apartamento de um quarto, com desmontagem de cama.', 60000, 1),
  ('dd810000-0000-4000-8000-000000000012', 'dd800000-0000-4000-8000-000000000004',
   'Retirada de móvel usado', 'Busca e descarte de móvel grande, com agenda no mesmo dia.', 25000, 2),
  ('dd810000-0000-4000-8000-000000000013', 'dd800000-0000-4000-8000-000000000005',
   'Corte e escova', 'Corte feminino com escova, com hora marcada.', 9000, 0),
  ('dd810000-0000-4000-8000-000000000014', 'dd800000-0000-4000-8000-000000000005',
   'Maquiagem para festa', 'Maquiagem com cílios, feita no estúdio.', 18000, 1),
  ('dd810000-0000-4000-8000-000000000015', 'dd800000-0000-4000-8000-000000000005',
   'Corte infantil', 'Corte para criança, com paciência e sem pressa.', 6000, 2),
  ('dd810000-0000-4000-8000-000000000016', 'dd800000-0000-4000-8000-000000000006',
   'Reforço de matemática', 'Duas aulas por semana, em turma de até seis alunos.', 30000, 0),
  ('dd810000-0000-4000-8000-000000000017', 'dd800000-0000-4000-8000-000000000006',
   'Acompanhamento de leitura', 'Leitura guiada para o fundamental, uma vez por semana.', 18000, 1),
  ('dd810000-0000-4000-8000-000000000018', 'dd800000-0000-4000-8000-000000000006',
   'Preparação para prova', 'Revisão de conteúdo e simulados antes da prova da escola.', 25000, 2),
  ('dd810000-0000-4000-8000-000000000019', 'dd800000-0000-4000-8000-000000000007',
   'Banho e tosa pequeno', 'Cães de até dez quilos, com secagem completa.', 7000, 0),
  ('dd810000-0000-4000-8000-000000000020', 'dd800000-0000-4000-8000-000000000007',
   'Banho e tosa médio', 'Cães de dez a vinte e cinco quilos, com hidratação.', 10000, 1),
  ('dd810000-0000-4000-8000-000000000021', 'dd800000-0000-4000-8000-000000000007',
   'Busca em casa', 'Busca e devolução no mesmo dia, com agendamento.', 3000, 2),
  ('dd810000-0000-4000-8000-000000000022', 'dd800000-0000-4000-8000-000000000008',
   'Troca de óleo', 'Óleo, filtro e conferência de níveis, com nota.', 19000, 0),
  ('dd810000-0000-4000-8000-000000000023', 'dd800000-0000-4000-8000-000000000008',
   'Revisão de suspensão', 'Conferência completa da suspensão, com orçamento antes do serviço.', 28000, 1),
  ('dd810000-0000-4000-8000-000000000024', 'dd800000-0000-4000-8000-000000000008',
   'Serviço de elétrica', 'Farol, bateria e alternador, com teste na hora.', 15000, 2)
on conflict (id) do nothing;


commit;
