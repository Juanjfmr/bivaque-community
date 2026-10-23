// PORT-002 (lote 4 da entrada) — correção da revisão independente: a decisão de
// ressincronizar um elemento controlado.
//
// O React não controla elemento desconhecido como controla `<input>`: quando o
// pai recusa a mudança (o `onChange` não atualiza o estado, ou atualiza para
// outro valor), a prop não muda e nenhum efeito preso a ela roda. Sem uma
// checagem depois do evento e a cada render, `value="123"` com um `onChange`
// que remove letras deixa `123x` na tela e `123` no estado.
//
// A regra é pura de propósito: não toca em DOM, então o vitest prova os três
// casos (o pai aceitou, o pai recusou, o valor já era igual) sem jsdom.
export function valueToRestore<T>(elementValue: T, controlledValue: T): T | undefined {
  // `Object.is` cobre string, booleano e também `NaN`, que `===` recusaria.
  return Object.is(elementValue, controlledValue) ? undefined : controlledValue
}
