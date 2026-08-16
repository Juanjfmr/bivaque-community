import type { ChannelAdapter, OutboxChannel } from "@bivaque/domain"

function unavailableAdapter(channel: OutboxChannel): ChannelAdapter {
  return {
    async send() {
      return {
        ok: false,
        error: `${channel} adapter is not configured`,
      }
    },
  }
}

// The concrete email and WhatsApp adapters land in D1 Tasks 4 and 5, which are
// blocked on a Resend account and a dedicated disposable chip. Until they
// exist, no row is ever marked `sent` by a pretend provider: an unconfigured
// channel returns a failure and the worker retries/fails according to policy.
export function createChannelAdapters(): Record<OutboxChannel, ChannelAdapter> {
  return {
    email: unavailableAdapter("email"),
    whatsapp: unavailableAdapter("whatsapp"),
  }
}
