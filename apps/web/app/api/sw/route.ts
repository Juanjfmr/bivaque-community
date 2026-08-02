export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SW_CONTENT = `const CACHE_NAME = "bivaque-v1"

const STATIC_ASSET_EXTENSIONS = new Set([
  ".js",
  ".css",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".json",
  ".webmanifest",
])

function isNavigation(request) {
  return request.mode === "navigate"
}

function isStaticAsset(url) {
  const path = new URL(url).pathname
  const ext = path.slice(path.lastIndexOf("."))
  return STATIC_ASSET_EXTENSIONS.has(ext)
}

function isSupabaseRequest(url) {
  try {
    const host = new URL(url).hostname
    return host.includes("supabase")
  } catch {
    return false
  }
}

function isApiRoute(url) {
  try {
    return new URL(url).pathname.startsWith("/api/")
  } catch {
    return false
  }
}

function shouldSkipCache(request) {
  const url = request.url
  return isSupabaseRequest(url) || isApiRoute(url)
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request

  if (request.method !== "GET") {
    return
  }

  if (shouldSkipCache(request)) {
    return
  }

  if (isNavigation(request)) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request)
          return networkResponse
        } catch {
          const cached = await caches.match(request)
          return cached || new Response("Offline", { status: 503 })
        }
      })(),
    )
    return
  }

  if (isStaticAsset(request.url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) {
          return cached
        }
        try {
          const networkResponse = await fetch(request)
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME)
            cache.put(request, networkResponse.clone())
          }
          return networkResponse
        } catch {
          return new Response("Offline", { status: 503 })
        }
      })(),
    )
  }
})
`

export function GET() {
  return new Response(SW_CONTENT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  })
}
