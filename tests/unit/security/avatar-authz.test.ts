import { describe, expect, it } from "vitest"
import { AVATAR_SIGNED_URL_EXPIRY_SECONDS, canReadAvatar } from "web/lib/security/avatar-authz"

const VIEWER = "11111111-1111-1111-1111-111111111111"
const TARGET = "22222222-2222-2222-2222-222222222222"
const OUTSIDER = "33333333-3333-3333-3333-333333333333"
const LOCALITY = "44444444-4444-4444-4444-444444444444"

describe("canReadAvatar", () => {
  describe("positives", () => {
    it("allows the account holder to read their own avatar", () => {
      expect(
        canReadAvatar({
          viewerId: VIEWER,
          targetUserId: VIEWER,
          targetLocalityId: null,
          viewerIsLocalityMember: false,
        }),
      ).toBe(true)
    })

    it("allows a co-member of the same locality to read the avatar", () => {
      expect(
        canReadAvatar({
          viewerId: VIEWER,
          targetUserId: TARGET,
          targetLocalityId: LOCALITY,
          viewerIsLocalityMember: true,
        }),
      ).toBe(true)
    })
  })

  describe("negatives — denied without leaking existence", () => {
    it("denies an unauthenticated viewer", () => {
      expect(
        canReadAvatar({
          viewerId: null,
          targetUserId: TARGET,
          targetLocalityId: LOCALITY,
          viewerIsLocalityMember: false,
        }),
      ).toBe(false)
    })

    it("denies an authenticated viewer with no locality membership", () => {
      expect(
        canReadAvatar({
          viewerId: VIEWER,
          targetUserId: TARGET,
          targetLocalityId: LOCALITY,
          viewerIsLocalityMember: false,
        }),
      ).toBe(false)
    })

    it("denies a member of a different locality", () => {
      expect(
        canReadAvatar({
          viewerId: VIEWER,
          targetUserId: TARGET,
          targetLocalityId: LOCALITY,
          viewerIsLocalityMember: false,
        }),
      ).toBe(false)
    })

    it("denies when the target has no locality membership", () => {
      expect(
        canReadAvatar({
          viewerId: VIEWER,
          targetUserId: TARGET,
          targetLocalityId: null,
          viewerIsLocalityMember: true,
        }),
      ).toBe(false)
    })

    it("denies when the target has no locality membership, even if the helper would have said yes", () => {
      expect(
        canReadAvatar({
          viewerId: VIEWER,
          targetUserId: OUTSIDER,
          targetLocalityId: null,
          viewerIsLocalityMember: true,
        }),
      ).toBe(false)
    })

    it("denies when the viewer is a member of a different locality from the target", () => {
      expect(
        canReadAvatar({
          viewerId: VIEWER,
          targetUserId: TARGET,
          targetLocalityId: LOCALITY,
          viewerIsLocalityMember: false,
        }),
      ).toBe(false)
    })
  })

  describe("AVATAR_SIGNED_URL_EXPIRY_SECONDS", () => {
    it("is five minutes — short enough to limit a leaked link, long enough to display", () => {
      expect(AVATAR_SIGNED_URL_EXPIRY_SECONDS).toBe(300)
    })
  })
})
