import assert from "node:assert/strict"
import test from "node:test"
import { startCapture } from "./capture-support.mjs"

test("shared capture startup serves the original bytes and opens a real browser", async () => {
  const html = Buffer.from("<!doctype html><title>Captura</title><h1>Bivaque</h1>")
  const { server, url, browser } = await startCapture(html)
  try {
    const response = await fetch(url)
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), html)
    const page = await browser.newPage()
    await page.goto(url)
    assert.equal(await page.locator("h1").innerText(), "Bivaque")
  } finally {
    await browser.close()
    await new Promise((resolve) => server.close(resolve))
  }
})
