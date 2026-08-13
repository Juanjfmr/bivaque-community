// Event detail access — mirrors the SQL helper `private.can_access_event`
// (supabase/migrations/20260805214709_community_scope.sql) so the migration
// stays the source of truth and this re-implementation is provably in lock
// step. Three guards compose: locality (the root), community (the container
// if any), group (the leaf). A public group inside a community is reachable
// only to community members — same trap that the post scope rule prevents.

export interface EventAccessDecision {
  localityId: string
  communityId: string | null
  groupId: string | null
  isLocalityMember: boolean
  isCommunityMember: boolean
  isGroupMember: boolean
  groupVisibility: "public" | "private" | null
  groupCommunityId: string | null
}

export function canAccessEvent(decision: EventAccessDecision): boolean {
  if (!decision.isLocalityMember) return false
  if (decision.communityId && !decision.isCommunityMember) return false

  if (!decision.groupId) return true
  if (decision.isGroupMember) return true

  if (decision.groupVisibility === "public") {
    if (!decision.groupCommunityId) return true
    if (decision.isCommunityMember) return true
  }
  return false
}
