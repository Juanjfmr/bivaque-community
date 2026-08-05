/**
 * Single source of truth for the pilot locality identifier.
 *
 * Override at deploy time via BIVAQUE_PILOT_LOCALITY_ID (server) or
 * NEXT_PUBLIC_BIVAQUE_PILOT_LOCALITY_ID (client bundles). When neither
 * is set the hardcoded pilot-locality UUID is used unchanged so existing
 * behaviour is preserved.
 */
const FALLBACK_LOCALITY_ID = "00000000-0000-4000-8000-000000000001"

export const PILOT_LOCALITY_ID: string =
  process.env["NEXT_PUBLIC_BIVAQUE_PILOT_LOCALITY_ID"] ??
  process.env["BIVAQUE_PILOT_LOCALITY_ID"] ??
  FALLBACK_LOCALITY_ID
