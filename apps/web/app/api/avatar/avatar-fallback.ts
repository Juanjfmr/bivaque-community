// Client-side counterpart of the avatar endpoint's contract, kept pure so the
// error path can be tested without a browser (RECON-048).
//
// /api/avatar/[userId] answers 404 when the member has no uploaded photo. The
// <Avatar.Image> of HeroUI v3 is Radix underneath, and Radix never mounts the
// <img> while its own pre-load has not reported "loaded": on a 404 the status
// goes straight to "error" and no <img> reaches the DOM, so a native onError on
// the image never fires. The initial therefore cannot key off an error event —
// it stays visible unless the photo actually loaded.
export type AvatarImageStatus = "idle" | "loading" | "loaded" | "error"

export function avatarFallbackVisible(status: AvatarImageStatus): boolean {
  return status !== "loaded"
}
