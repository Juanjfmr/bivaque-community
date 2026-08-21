-- 030: Redacao automatica do motivo de denuncia (H-Task 2)
--
-- O motivo da denuncia e o unico texto do produto escrito por um terceiro
-- SOBRE outra pessoa. E o campo mais provavel de carregar CPF e endereco no
-- schema inteiro. D11 proibe persistir os dois.
--
-- A solucao NAO e um check de vocabulario: a D21 derrubou o filtro de
-- vocabulario porque ele proibia "patente" e "OM", e a remedicao escolhida
-- pela onda C foi aviso de PII na UI, nao rejeicao. Um check aqui bloquearia
-- o denunciante que escreve "ele publicou o CPF dele no grupo" — a frase
-- mais util que a fila pode receber.
--
-- A solucao e redigir, nao rejeitar: aplicar a mesma redacao do cliente
-- (packages/domain/src/pii-scrub.ts#scrubReportReason) como cinto de
-- seguranca server-side. O cliente ja aplica; este trigger fecha o bypass
-- via PostgREST direto do browser.
--
-- Nenhum filtro de vocabulario aqui. A D21 e deliberada.
--
-- O PostgreSQL nao suporta \b do Perl como word boundary; usa o POSIX
-- [[:<:]] (inicio de palavra) e [[:>:]] (fim de palavra).

create function private.scrub_report_reason()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_scrubbed text;
begin
  v_scrubbed := new.reason;

  -- Sequencia com formato de CPF (com ou sem pontuacao, inclusive 529.982.247.25)
  v_scrubbed := regexp_replace(
    v_scrubbed,
    '[[:<:]][0-9]{3}[.\s-]?[0-9]{3}[.\s-]?[0-9]{3}[.\s-]?[0-9]{2}[[:>:]]',
    '[documento removido]',
    'gi'
  );

  -- Sequencia de 11 digitos sem pontuacao (CPF cru ou falso positivo aceito)
  v_scrubbed := regexp_replace(
    v_scrubbed,
    '[[:<:]][0-9]{11}[[:>:]]',
    '[documento removido]',
    'gi'
  );

  -- "[documento removido]" tem 20 caracteres e substitui de 11 a 14. O CHECK de
  -- 1000 caracteres de public.reports roda DEPOIS deste trigger, entao um motivo
  -- perto do limite passa a ser rejeitado por reports_reason_check com um erro
  -- que nao explica nada a quem denunciou. E alcancavel pela UI normal, nao so
  -- pelo bypass: o cliente redige antes do insert, entao quem digita perto do
  -- limite ja sai do scrubReportReason acima de 1000. Perder o fim de um motivo
  -- abarrotado de documento e melhor que perder a denuncia inteira.
  new.reason := left(v_scrubbed, 1000);
  return new;
end;
$$;

create trigger reports_scrub_reason_before_insert_or_update
before insert or update of reason on public.reports
for each row
execute function private.scrub_report_reason();
