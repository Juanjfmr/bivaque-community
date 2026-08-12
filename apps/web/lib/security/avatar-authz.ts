// Pure authorization helper for `/api/avatar/[userId]`. The route is the only
// caller; it gathers (a) the viewer's id, (b) the target user's locality and
// (c) whether the viewer is a member of that locality, then asks this
// function whether the read is allowed. Separating the decision lets the unit
// suite exercise the matrix without spinning the database up.
//
// 404 must be returned for every denial so the endpoint cannot be used as an
// oracle to confirm whether a given user id exists. This function only emits
// the boolean — the status code is the caller's responsibility.

export const AVATAR_SIGNED_URL_EXPIRY_SECONDS = 300

export interface AuthorizeAvatarReadInput {
  viewerId: string | null | undefined
  targetUserId: string
  targetLocalityId: string | null | undefined
  viewerIsLocalityMember: boolean
}

export function canReadAvatar(input: AuthorizeAvatarReadInput): boolean {
  if (!input.viewerId) return false
  if (input.viewerId === input.targetUserId) return true
  if (!input.targetLocalityId) return false
  return input.viewerIsLocalityMember
}
