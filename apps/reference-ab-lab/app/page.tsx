import Link from "next/link";
export default function LabIndex(){
return <main style={{maxWidth:900,margin:"8vh auto",padding:28,fontFamily:"Arial"}}>
  <p style={{fontSize:12,fontWeight:700,letterSpacing:2,color:"#65707b"}}>BIVAQUE / LABORATÓRIO ISOLADO</p>
  <h1 style={{fontSize:38,letterSpacing:"-1.6px",margin:"18px 0"}}>Duas implementações independentes.</h1>
  <p style={{maxWidth:650,lineHeight:1.55,color:"#56606a"}}>Ambas usam componentes React reais da 21st.dev com o mesmo briefing e os mesmos dados demonstrativos. O design system anterior não foi importado.</p>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:18,marginTop:36}}>
    <Link href="/a" style={{display:"block",padding:30,border:"1px solid #d9dde2",borderRadius:18,textDecoration:"none",color:"#20242b"}}><b style={{fontSize:28}}>Tela A</b><p>Descoberta, moradias e serviços em primeiro plano.</p><span>Explorar →</span></Link>
    <Link href="/b" style={{display:"block",padding:30,border:"1px solid #d9dde2",borderRadius:18,textDecoration:"none",color:"#20242b"}}><b style={{fontSize:28}}>Tela B</b><p>Conversas da comunidade em primeiro plano.</p><span>Explorar →</span></Link>
  </div>
</main>
}