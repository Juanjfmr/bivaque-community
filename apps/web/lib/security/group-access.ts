// Group detail access — the matrix for /groups/[id], mirroring the same
// "Público é relativo ao container" rule that the post scope helper encodes
// in SQL (see spec §4.1). Pure function is unit-tested; the RPC wrapper wires
// the inputs to authenticated helpers so the route stays thin.

export interface GroupAccessDecision {
  visibility: "public" | "private"
  communityId: string | null
  isLocalityMember: boolean
  isCommunityMember: boolean
  isGroupMember: boolean
}

export function canAccessGroup(decision: GroupAccessDecision): boolean {
  if (decision.visibility === "private") {
    return decision.isGroupMember
  }
  if (decision.communityId) {
    return decision.isCommunityMember
  }
  return decision.isLocalityMember
}
