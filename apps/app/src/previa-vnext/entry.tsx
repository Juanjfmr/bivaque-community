import { createRoot } from "react-dom/client"
import { PreviaVNext } from "./PreviaVNext"
import "@/src/styles.css"

/** Entrada exclusiva da compilação estática do laboratório F02.
 * Não registra rota de produção, não monta o shell e não acessa o backend.
 */
const elemento = document.getElementById("root")
if (!elemento) throw new Error("Raiz do laboratório F02 não encontrada")
createRoot(elemento).render(<PreviaVNext />)
