// Rodada 28: o que o selo "verificado" significa (referência do Mobbin: folha "Freshness
// guaranteed" da Glovo). As duas primeiras partes seguem o ADR-20260816-forma-da-admissao e o
// plano de localidades (o Estado atesta o vínculo; família entra por convite do titular; nome e
// cidade são declarados). "O anúncio é de quem anuncia" e "Combine com cuidado" são orientação
// de produto, não decisão de ADR.
function verifiedBadgeHtml(label='Perfil verificado'){return `<button type="button" class="pill ok pill-info" data-action="verified-info" aria-haspopup="dialog">${icon('verified_user')}${esc(label)}${icon('info')}</button>`;}
function openVerifiedInfo(){
 const item=(ic,title,text)=>`<div class="vinfo-row">${icon(ic)}<div><b>${title}</b><p>${text}</p></div></div>`;
 showDialog('O que o selo “verificado” significa',`<div class="vinfo">${item('verified_user','Vínculo com as Forças conferido','Antes de entrar, o Bivaque confere em fonte pública oficial (Portal da Transparência) que a pessoa é militar, veterana ou pensionista. Família entra por convite de quem já foi verificado. Os dados consultados não ficam guardados; fica só o resultado.')}${item('person','O resto é declarado pela pessoa','Nome e cidade são informados por quem se cadastrou. O selo não confirma endereço.')}${item('sell','O anúncio é de quem anuncia','Preço, estado do item e condições do imóvel são responsabilidade de quem publica. O selo não é garantia de negócio.')}${item('flag','Combine com cuidado','Prefira ver pessoalmente, em lugar movimentado, e não pague adiantado. Se algo parecer errado, use “Denunciar”.')}<p class="form-note">Neste protótipo, a verificação é simulada.</p></div>`,btn('Entendi','close-dialog','','filled'));
}
