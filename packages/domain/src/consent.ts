// D2 Task 3 — single source for the consent and code-of-conduct versions.
//
// These versions were literals in five places (middleware, the consent page,
// the consent action, the onboarding route and the provision flow). Publishing
// a version 2 meant editing five files and the failure surfaced only as
// "consent is required" in production. The versioned legal documents live in
// docs/legal/ and are rendered from those files; the version numbers here are
// the deployed contract that ties an acceptance row to the text that was shown.
//
// Change one integer here (and the legal document) when the text changes:
// never a literal in an app file.

export const CONSENT_VERSION = 1
export const CODE_OF_CONDUCT_VERSION = 1
