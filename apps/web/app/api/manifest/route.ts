export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET() {
  const manifest = {
    name: "Bivaque",
    short_name: "Bivaque",
    description: "Comunidade privada Bivaque.",
    start_url: "/",
    display: "standalone" as const,
    background_color: "#f7f6ef",
    theme_color: "#2f7654",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable" as const,
      },
    ],
    lang: "pt-BR",
  }

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  })
}
