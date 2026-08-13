import { describe, expect, it } from "vitest"
import { canAccessGroup } from "web/lib/security/group-access"

describe("canAccessGroup", () => {
  describe("public, no community — locality member suffices", () => {
    it("allows a locality member", () => {
      expect(
        canAccessGroup({
          visibility: "public",
          communityId: null,
          isLocalityMember: true,
          isCommunityMember: false,
          isGroupMember: false,
        }),
      ).toBe(true)
    })

    it("denies a non-locality member", () => {
      expect(
        canAccessGroup({
          visibility: "public",
          communityId: null,
          isLocalityMember: false,
          isCommunityMember: false,
          isGroupMember: false,
        }),
      ).toBe(false)
    })

    it("denies even when the caller is a group member of a different locality", () => {
      expect(
        canAccessGroup({
          visibility: "public",
          communityId: null,
          isLocalityMember: false,
          isCommunityMember: false,
          isGroupMember: true,
        }),
      ).toBe(false)
    })
  })

  describe("public, in a community — community member suffices", () => {
    it("allows a community member", () => {
      expect(
        canAccessGroup({
          visibility: "public",
          communityId: "c-1",
          isLocalityMember: true,
          isCommunityMember: true,
          isGroupMember: false,
        }),
      ).toBe(true)
    })

    it("denies a locality member who is not in the community", () => {
      expect(
        canAccessGroup({
          visibility: "public",
          communityId: "c-1",
          isLocalityMember: true,
          isCommunityMember: false,
          isGroupMember: false,
        }),
      ).toBe(false)
    })
  })

  describe("private — group member suffices", () => {
    it("allows a group member", () => {
      expect(
        canAccessGroup({
          visibility: "private",
          communityId: null,
          isLocalityMember: false,
          isCommunityMember: false,
          isGroupMember: true,
        }),
      ).toBe(true)
    })

    it("denies a locality member who is not in the group", () => {
      expect(
        canAccessGroup({
          visibility: "private",
          communityId: null,
          isLocalityMember: true,
          isCommunityMember: false,
          isGroupMember: false,
        }),
      ).toBe(false)
    })

    it("denies even when the caller is in the community but not the group", () => {
      expect(
        canAccessGroup({
          visibility: "private",
          communityId: "c-1",
          isLocalityMember: true,
          isCommunityMember: true,
          isGroupMember: false,
        }),
      ).toBe(false)
    })
  })
})
