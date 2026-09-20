import { z } from 'zod'

/**
 * `webhookSecret` is what `setWebhook(secret_token=…)` was called with. Telegram
 * echoes it back on every delivery in `X-Telegram-Bot-Api-Secret-Token`, and it
 * is the ONLY thing that tells the hub which tenant a webhook belongs to: the
 * route walks every active `telegram` channel and asks each adapter to verify,
 * so a weak or shared secret means another tenant's channel matches first.
 * Telegram allows 1–256 chars of `A-Z a-z 0-9 _ -`; 32 is this adapter's floor,
 * the width of a hex-encoded 16-byte random value.
 */
export const telegramCredentialsSchema = z
  .object({
    botToken: z
      .string()
      .min(1, 'Bot token required')
      .regex(/^\d+:[A-Za-z0-9_-]{20,}$/, 'Bot token must look like 123456:ABC-DEF… as issued by @BotFather'),
    webhookSecret: z
      .string()
      .min(32, 'Webhook secret must be at least 32 characters')
      .max(256, 'Webhook secret must be at most 256 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Webhook secret may only contain A-Z, a-z, 0-9, _ and -'),
    // Where an outbound message with no recipient goes. `recipientFormat:
    // 'provider-native'` lets the hub forward a send with no `metadata.to`, and
    // the adapter owes it a target or a legible failure.
    defaultChatId: z.string().optional(),
  })
  .passthrough()

export type TelegramCredentials = z.infer<typeof telegramCredentialsSchema>
