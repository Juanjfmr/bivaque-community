import { scrubEvent } from "@bivaque/domain"
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env["SENTRY_DSN"],
  beforeSend(event) {
    return scrubEvent(event) as typeof event
  },
})
