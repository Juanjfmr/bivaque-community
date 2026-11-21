import { scrubEvent } from "@bivaque/domain"
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env["SENTRY_DSN"],
  beforeBreadcrumb(breadcrumb) {
    return scrubEvent(breadcrumb) as typeof breadcrumb
  },
  beforeSend(event) {
    return scrubEvent(event) as typeof event
  },
})
