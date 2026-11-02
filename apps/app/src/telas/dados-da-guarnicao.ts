/**
 * Recorte de consulta para Manaus, derivado dos CSVs públicos da auditoria
 * feat/om-catalog-staging-20261021, consultados em 02/11/2026.
 * Isso NÃO é importação nacional, validação de coordenadas ou cadastro homologado.
 * Ao conectar o catálogo real, substitua esta lista pelo repositório de dados.
 */
export type OmDoGuia = {
  id: string
  sigla: string
  nome: string
  forca: "FAB" | "EB" | "MB"
  bairro?: string
  status: string
  fonte: string
}
export const OMS_MANAUS: readonly OmDoGuia[] = [
  {
    id: "16a9e9ce4c34099a679c0ac7",
    sigla: "CMA",
    nome: "Comando Militar da Amazônia",
    forca: "EB",
    bairro: "Ponta Negra",
    status: "Endereço documental corroborado; ponto não homologado",
    fonte: "https://licitacoeseb.12rm.eb.mil.br/server/api/core/bitstreams/6db36000-0a35-4113-8260-c0f7f52a4ae0/content",
  },
  {
    id: "07324fe1c063a619db1d5948",
    sigla: "12º B Sup",
    nome: "12º Batalhão de Suprimento",
    forca: "EB",
    bairro: "Compensa",
    status: "Endereço documental corroborado; ponto não homologado",
    fonte: "https://licitacoeseb.12rm.eb.mil.br/bitstreams/85ab0e46-ed62-4522-8c40-a5f50d6fc7ef/download",
  },
  {
    id: "c52395dc502ff8be0ca673d7",
    sigla: "1º BtlOpRib",
    nome: "1º Batalhão de Operações Ribeirinhas",
    forca: "MB",
    bairro: "Distrito Industrial",
    status: "Endereço documental corroborado; ponto não homologado",
    fonte: "https://www.marinha.mil.br/om/1o-batalhao-de-operacoes-ribeirinhas",
  },
  {
    id: "FAB-CAT-20261020-015",
    sigla: "BAMN",
    nome: "Base Aérea de Manaus",
    forca: "FAB",
    bairro: "Crespo",
    status: "Endereço publicado; divergência de numeração a conferir",
    fonte: "https://www.fab.mil.br/?omdir_pdf=1",
  },
  {
    id: "FAB-CAT-20261020-054",
    sigla: "CINDACTA IV",
    nome: "Quarto Centro Integrado de Defesa Aérea e Controle de Tráfego Aéreo",
    forca: "FAB",
    bairro: "Tarumã",
    status: "Endereços institucionais divergentes; ponto não homologado",
    fonte: "https://www2.fab.mil.br/cindacta4/index.php/formulario-de-contato",
  },
  {
    id: "FAB-CAT-20261020-203",
    sigla: "7º ETA",
    nome: "Sétimo Esquadrão de Transporte Aéreo",
    forca: "FAB",
    status: "Organização no catálogo oficial; endereço ainda não confirmado",
    fonte: "https://www.fab.mil.br/?omdir_pdf=1",
  },
]
export const BAIRROS_MANAUS = [
  { nome: "Ponta Negra", apoio: "Orla e opções residenciais; confira o trajeto para sua OM." },
  { nome: "Flores", apoio: "Compare moradia e escolas próximas; confirme valores nos anúncios." },
  { nome: "Planalto", apoio: "Consulte a oferta de serviços locais e as indicações dos moradores." },
  { nome: "Parque 10", apoio: "Pesquise escolas, comércio e deslocamento nos horários de pico." },
  { nome: "Dom Pedro", apoio: "Compare rotinas de bairro e alternativas de transporte." },
] as const
