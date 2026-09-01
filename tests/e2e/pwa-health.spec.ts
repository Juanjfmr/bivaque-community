import { expect, test } from "@playwright/test"

test.describe("PWA and health endpoints", () => {
  test("health endpoint returns the operational contract", async ({ request }) => {
    // Given the production Next server

    // When a client requests the health endpoint
    const response = await request.get("/api/health")

    // Then the health contract is respected
    await expect(response).toBeOK()
    expect(await response.text()).toBe('{"status":"ok"}')
  })

  test("manifest is reachable and valid JSON at /api/manifest", async ({ request }) => {
    // Given the production Next server

    // When a client requests the PWA manifest via the API route
    const response = await request.get("/api/manifest")

    // Then the manifest is served with the correct content
    await expect(response).toBeOK()
    const body = await response.json()
    expect(body.name).toBe("Bivaque")
    expect(body.display).toBe("standalone")
    expect(body.theme_color).toBe("#2f7654")
    expect(Array.isArray(body.icons)).toBe(true)
  })

  test("service worker script is reachable at /api/sw", async ({ request }) => {
    // Given the production Next server

    // When a client fetches the service worker via the API route
    const response = await request.get("/api/sw")

    // Then the service worker is accessible
    await expect(response).toBeOK()
    const body = await response.text()
    expect(body).toContain("CACHE_NAME")
    expect(body).toContain('"bivaque-v2"')
    expect(body).toContain('pathname.startsWith("/_next/")')
  })

  test("service worker registers in the browser", async ({ page }) => {
    // Given the production Next server with PWA support

    // When a browser opens the root route and waits for the page to load
    await page.goto("/", { waitUntil: "networkidle" })

    // Then the service worker registration is initiated after the React component mounts
    await expect
      .poll(
        async () => {
          const sw = await page.evaluate(async () => {
            if (!("serviceWorker" in navigator)) {
              return false
            }
            const registration = await navigator.serviceWorker.getRegistration()
            return registration !== undefined
          })
          return sw
        },
        { timeout: 10_000 },
      )
      .toBe(true)
  })
})
