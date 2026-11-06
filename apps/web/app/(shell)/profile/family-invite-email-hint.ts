// O mascaramento do e-mail convidado vive em `lib/convite`, junto do restante
// do módulo de família (RUN-018). Este caminho continua valendo para a tela
// antiga e para o teste que o importa.
//
// Ficava fora de family-invite-section-actions.ts ("use server") porque Next 16
// exige que todo export de um arquivo "use server" seja uma Server Action
// assíncrona — um helper síncrono ali derruba o build de produção.
export { emailHint } from "../../../lib/convite/hint"
