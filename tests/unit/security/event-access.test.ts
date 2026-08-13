import { describe, expect, it } from "vitest"
import { canAccessEvent } from "web/lib/security/event-access"

const LOCALITY = "00000000-0000-4000-8000-000000000001"
const COMMUNITY = "c-1"
const GROUP = "g-1"

describe("canAccessEvent", () => {
  describe("locality is the root guard", () => {
    it("denies a caller who is not in the locality", () => {
      expect(
        canAccessEvent({
          localityId: LOCALITY,
          communityId: null,
          groupId: null,
          isLocalityMember: false,
          isCommunityMember: false,
          isGroupMember: false,
          groupVisibility: null,
          groupCommunityId: null,
        }),
      ).toBe(false)
    })

    it("allows a locality member when the event is at the locality level", () => {
      expect(
        canAccessEvent({
          localityId: LOCALITY,
          communityId: null,
          groupId: null,
          isLocalityMember: true,
          isCommunityMember: false,
          isGroupMember: false,
          groupVisibility: null,
          groupCommunityId: null,
        }),
      ).toBe(true)
    })
  })

  describe("community container", () => {
    it("denies a locality member who is not in the community", () => {
      expect(
        canAccessEvent({
          localityId: LOCALITY,
          communityId: COMMUNITY,
          groupId: null,
          isLocalityMember: true,
          isCommunityMember: false,
          isGroupMember: false,
          groupVisibility: null,
          groupCommunityId: null,
        }),
      ).toBe(false)
    })

    it("allows a community member", () => {
      expect(
        canAccessEvent({
          localityId: LOCALITY,
          communityId: COMMUNITY,
          groupId: null,
          isLocalityMember: true,
          isCommunityMember: true,
          isGroupMember: false,
          groupVisibility: null,
          groupCommunityId: null,
        }),
      ).toBe(true)
    })
  })

  describe("group container", () => {
    it("denies a non-member of a private group", () => {
      expect(
        canAccessEvent({
          localityId: LOCALITY,
          communityId: null,
          groupId: GROUP,
          isLocalityMember: true,
          isCommunityMember: false,
          isGroupMember: false,
          groupVisibility: "private",
          groupCommunityId: null,
        }),
      ).toBe(false)
    })

    it("allows a member of a private group", () => {
      expect(
        canAccessEvent({
          localityId: LOCALITY,
          communityId: null,
          groupId: GROUP,
          isLocalityMember: true,
          isCommunityMember: false,
          isGroupMember: true,
          groupVisibility: "private",
          groupCommunityId: null,
        }),
      ).toBe(true)
    })

    it("allows a locality member to a public group with no community", () => {
      expect(
        canAccessEvent({
          localityId: LOCALITY,
          communityId: null,
          groupId: GROUP,
          isLocalityMember: true,
          isCommunityMember: false,
          isGroupMember: false,
          groupVisibility: "public",
          groupCommunityId: null,
        }),
      ).toBe(true)
    })

    it("denies a locality member to a public group inside another community", () => {
      expect(
        canAccessEvent({
          localityId: LOCALITY,
          communityId: null,
          groupId: GROUP,
          isLocalityMember: true,
          isCommunityMember: false,
          isGroupMember: false,
          groupVisibility: "public",
          groupCommunityId: "c-other",
        }),
      ).toBe(false)
    })

    it("allows a community member to a public group inside the same community", () => {
      expect(
        canAccessEvent({
          localityId: LOCALITY,
          communityId: null,
          groupId: GROUP,
          isLocalityMember: true,
          isCommunityMember: true,
          isGroupMember: false,
          groupVisibility: "public",
          groupCommunityId: COMMUNITY,
        }),
      ).toBe(true)
    })
  })
})
