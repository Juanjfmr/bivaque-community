import { scrubEvent } from "@bivaque/domain"
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  integrations: [
    Sentry.httpIntegration({
      ignoreIncomingRequestBody(url) {
        const path = url.split("?")[0]?.replace(/\/+$/, "") ?? ""
        return (
          path.startsWith("/api/app/sessao/") ||
          path === "/api/app/sessao" ||
          path === "/api/app/entry/otp/verify" ||
          path === "/api/app/voce/sair"
        )
      },
    }),
  ],
  dsn: process.env["SENTRY_DSN"],
  beforeBreadcrumb(breadcrumb) {
    return scrubEvent(breadcrumb) as typeof breadcrumb
  },
  beforeSend(event) {
    return scrubEvent(event) as typeof event
  },
})
