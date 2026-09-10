// Purge de estado autenticado após signOut.
//
// Decisao documentada em ADR-20260901-mobile-session §Decision
// (Revogação): ao sair da conta, zerar qualquer estado local que
// carregava informação do membro:
//   - rascunhos de posts (AsyncStorage em @bivaque/drafts)
//   - uploads pendentes em expo-file-system (fila de midia offline)
//
// Nao apagamos nada do servidor — o servidor ja foi limpo pelo
// /auth/v1/logout no signOut.ts. Apenas o que vive no aparelho.
//
// API de expo-file-system 19.x (SDK 54): substituiu documentDirectory
// (string) por Paths.document (Directory). Diretorios sao objetos
// com metodos .exists(), .delete(), .create(), .uri, etc.

import AsyncStorage from "@react-native-async-storage/async-storage"
import { Directory, Paths } from "expo-file-system"

const DRAFT_KEYS = ["bivaque.draft.post.v1", "bivaque.draft.poll.v1"]

const UPLOADS_DIRNAME = "bivaque-uploads"

export async function purge(): Promise<void> {
  // 1. Rascunhos (AsyncStorage). best-effort — cada chave roda
  //    independentemente; uma falha em uma nao impede as outras nem
  //    impede o passo 2 (uploads.delete()).
  await Promise.allSettled(DRAFT_KEYS.map((key) => AsyncStorage.removeItem(key)))

  // 2. Uploads pendentes em bivaque-uploads/ dentro do document dir.
  //    best-effort — se o diretorio não existir, no-op.
  try {
    const uploadsDir = new Directory(Paths.document, UPLOADS_DIRNAME)
    if (uploadsDir.exists) {
      uploadsDir.delete()
    }
  } catch {
    // best-effort; uploads podem persistir em estado orfao.
  }
}
