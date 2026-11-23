import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("plataformas registram o retorno de autenticação", () => {
  const manifest = readFileSync("apps/app/android/app/src/main/AndroidManifest.xml", "utf8")
  const filtros = manifest.match(/<intent-filter>[\s\S]*?<\/intent-filter>/g) ?? []
  assert.ok(
    filtros.some(
      (filtro) =>
        /android.intent.action.VIEW/.test(filtro) &&
        /android.intent.category.DEFAULT/.test(filtro) &&
        /android.intent.category.BROWSABLE/.test(filtro) &&
        /android:scheme="bivaque"\s+android:host="auth-callback"/.test(filtro),
    ),
  )
  const plist = readFileSync("apps/app/ios/App/App/Info.plist", "utf8")
  assert.match(plist, /<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>bivaque<\/string>/)
})
