// Client-side adapter for a loopback-only upstream service, never exposed in Bivaque member routes.
export function upstreamBase(value = process.env.MIROFISH_URL || 'http://127.0.0.1:5000') {
  let url;
  try { url = new URL(value); } catch { throw new Error('MIROFISH_URL inválida.'); }
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Por segurança o MiroFish só pode ser acessado via loopback (localhost / 127.0.0.1 / ::1).');
  }
  return url.origin;
}

export function createClient({base = upstreamBase(), fetchImpl = fetch} = {}) {
  base = upstreamBase(base);
  async function request(path, {method = 'GET', json, form} = {}) {
    if (!/^\/api\/(graph|simulation|report)\/[a-zA-Z0-9/_-]+$/.test(path) && path !== '/health') throw new Error('Endpoint não autorizado no adaptador.');
    const options = {method, signal: AbortSignal.timeout(30_000)};
    if (json !== undefined) {options.headers = {'Content-Type': 'application/json'}; options.body = JSON.stringify(json);}
    if (form) options.body = form;
    let response;
    try { response = await fetchImpl(base + path, options); }
    catch { throw new Error('MiroFish indisponível no endereço local configurado.'); }
    let payload;
    try { payload = await response.json(); }
    catch { throw new Error(`MiroFish retornou resposta não JSON (${response.status}).`); }
    if (!response.ok || payload?.success === false) throw new Error(`MiroFish falhou (${response.status}): ${String(payload?.error || 'erro desconhecido').slice(0,240)}`);
    return payload.data ?? payload;
  }
  return {request};
}
