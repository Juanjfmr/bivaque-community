// PORT-002 (lote 4 da entrada): a decisão do "mostrar/ocultar" do campo de
// senha, fora do JSX. O protótipo troca três coisas de uma vez — o `type` do
// campo, o nome acessível do botão e o glifo — e mantém as três em sincronia
// pelo mesmo booleano (`entry-pass-toggle` em account.js). Deixar a regra aqui
// permite provar as três sem navegador: o adaptador só a consome.
export function passwordFieldType(visible: boolean): "password" | "text" {
  return visible ? "text" : "password"
}

// O rótulo diz o que o botão FAZ no estado atual, como o protótipo: com a senha
// escondida ele mostra "Mostrar senha", e com a senha à vista, "Esconder senha".
export function passwordToggleLabel(visible: boolean): string {
  return visible ? "Esconder senha" : "Mostrar senha"
}

// A fonte Material Symbols usa ligaduras; estes são os dois nomes do protótipo.
export function passwordToggleIcon(visible: boolean): "visibility" | "visibility_off" {
  return visible ? "visibility_off" : "visibility"
}
