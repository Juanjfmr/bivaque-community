import { expect, test } from "@playwright/test"

test("serves the home page", async ({ page }) => {
  // Given the production Next server

  // When a browser opens the root route
  await page.goto("/")

  // Then the public landing surface is observable
  await expect(page.getByRole("heading", { name: "Bivaque" })).toBeVisible()
})

test("serves the health endpoint", async ({ request }) => {
  // Given the production Next server

  // When a client requests the health endpoint
  const response = await request.get("/api/health")

  // Then the endpoint returns the health contract
  await expect(response).toBeOK()
  expect(await response.text()).toBe('{"status":"ok"}')
})
