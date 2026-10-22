import { expect, test } from "@playwright/test"

test("serves the home page", async ({ page }) => {
  // Given the production Next server

  // When a browser opens the root route
  await page.goto("/")

  // Then the public landing surface is observable. PORT-001 (R73): a raiz
  // passou a ser a landing v8 do protótipo, cujo h1 é "Juntos somos mais
  // fortes." — o antigo "Bivaque" era o título da landing anterior.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Juntos somos mais fortes.")
})

test("serves the health endpoint", async ({ request }) => {
  // Given the production Next server

  // When a client requests the health endpoint
  const response = await request.get("/api/health")

  // Then the endpoint returns the health contract
  await expect(response).toBeOK()
  expect(await response.text()).toBe('{"status":"ok"}')
})
