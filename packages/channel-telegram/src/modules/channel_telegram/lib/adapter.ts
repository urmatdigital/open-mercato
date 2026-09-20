import type {
  ChannelAdapter,
  ChannelNativeContent,
  ConvertOutboundInput,
  GetMessageStatusInput,
  InboundMessage,
  MessageStatus,
  NormalizedInboundMessage,
  SendMessageInput,
  SendMessageResult,
  ValidateCredentialsInput,
  ValidateCredentialsResult,
  VerifyWebhookInput,
} from '@open-mercato/core/modules/communication_channels/lib/adapter'
import { htmlToText, stringOrUndefined } from '@open-mercato/core/modules/communication_channels/lib/email-mime'
import { telegramCapabilities } from '../capabilities'
import { telegramCredentialsSchema } from './credentials'
import { callTelegram, telegramErrorMessage } from './telegram-api'
import {
  buildExternalMessageId,
  normalizeTelegramMessage,
  pickInboundMessage,
  type TelegramMessage,
  type TelegramUpdate,
} from './normalize-inbound'

export const TELEGRAM_PROVIDER_KEY = 'telegram'
export const TELEGRAM_CHANNEL_TYPE = 'telegram'
/** Telegram lowercases nothing on its side; Next lowercases every header key. */
export const TELEGRAM_SECRET_HEADER = 'x-telegram-bot-api-secret-token'

function headerValue(headers: VerifyWebhookInput['headers'], name: string): string | null {
  const raw = headers[name] ?? headers[name.toLowerCase()]
  if (Array.isArray(raw)) return raw[0] ?? null
  return typeof raw === 'string' ? raw : null
}

function firstRecipient(value: unknown): string | undefined {
  if (Array.isArray(value)) return stringOrUndefined(value[0])
  return stringOrUndefined(value)
}

/**
 * Timing-safe enough for the job without pulling in `crypto` on the edge: both
 * values are compared in full, so the loop does not return early on the first
 * differing character.
 */
function secretsMatch(expected: string, received: string): boolean {
  if (expected.length !== received.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ received.charCodeAt(i)
  return diff === 0
}

class TelegramChannelAdapter implements ChannelAdapter {
  readonly providerKey = TELEGRAM_PROVIDER_KEY
  readonly channelType = TELEGRAM_CHANNEL_TYPE
  readonly capabilities = telegramCapabilities

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const parsed = telegramCredentialsSchema.safeParse(input.credentials)
    if (!parsed.success) {
      return {
        externalMessageId: '',
        status: 'failed',
        error: `TELEGRAM_CREDENTIALS_INVALID: ${parsed.error.issues[0]?.message ?? 'unknown validation error'}`,
      }
    }
    const credentials = parsed.data
    const meta = (input.metadata ?? {}) as Record<string, unknown>
    // `metadata.to` is untrusted operator input under `provider-native`, so it is
    // read as an opaque string and handed to Telegram, never interpolated into a URL.
    const chatId = firstRecipient(meta.to) ?? credentials.defaultChatId
    if (!chatId) {
      return {
        externalMessageId: '',
        status: 'failed',
        error: 'TELEGRAM_NO_RECIPIENT: no chat id on the message and no defaultChatId on the channel',
      }
    }
    const text = input.content.text ?? (input.content.html ? htmlToText(input.content.html) : '')
    if (!text.trim()) {
      return { externalMessageId: '', status: 'failed', error: 'TELEGRAM_EMPTY_BODY: Telegram rejects an empty message' }
    }

    // Sending ON BEHALF of a connected Telegram Business account rather than as
    // the bot itself is one field. The hub carries it on the conversation it
    // came in on, so a reply leaves from the same identity the customer wrote to.
    const businessConnectionId = stringOrUndefined(meta.businessConnectionId)
    const replyTo = stringOrUndefined(meta.replyToMessageId)

    let response
    try {
      response = await callTelegram<TelegramMessage>(credentials.botToken, 'sendMessage', {
        chat_id: chatId,
        text,
        ...(businessConnectionId ? { business_connection_id: businessConnectionId } : {}),
        ...(replyTo ? { reply_parameters: { message_id: Number(replyTo) } } : {}),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Telegram API request failed'
      return { externalMessageId: '', status: 'failed', error: `TELEGRAM_SEND_FAILED: ${message}` }
    }
    if (!response.ok || !response.result) {
      return { externalMessageId: '', status: 'failed', error: `TELEGRAM_SEND_FAILED: ${telegramErrorMessage(response)}` }
    }
    const sent = response.result
    return {
      externalMessageId: buildExternalMessageId(sent.chat?.id ?? chatId, sent.message_id),
      conversationId: input.conversationId,
      status: 'sent',
      metadata: { chatId: String(sent.chat?.id ?? chatId), messageId: sent.message_id },
    }
  }

  /**
   * The hub's webhook route is unauthenticated by design and walks EVERY active
   * telegram channel, asking each one to verify with its own credentials. The
   * first adapter that does not throw decides the tenant — so a mismatched
   * secret MUST throw, and only the channel whose `setWebhook` secret Telegram
   * echoed back may return an event.
   */
  async verifyWebhook(input: VerifyWebhookInput): Promise<InboundMessage> {
    const parsed = telegramCredentialsSchema.safeParse(input.credentials)
    if (!parsed.success) throw new Error('Telegram webhook rejected: channel credentials are incomplete')

    const received = headerValue(input.headers, TELEGRAM_SECRET_HEADER)
    if (!received) throw new Error('Telegram webhook rejected: missing X-Telegram-Bot-Api-Secret-Token')
    if (!secretsMatch(parsed.data.webhookSecret, received)) {
      throw new Error('Telegram webhook rejected: secret token does not match this channel')
    }

    const body = typeof input.rawBody === 'string' ? input.rawBody : input.rawBody.toString('utf8')
    let update: TelegramUpdate
    try {
      update = JSON.parse(body) as TelegramUpdate
    } catch {
      throw new Error('Telegram webhook rejected: body is not valid JSON')
    }

    const message = pickInboundMessage(update)
    if (message) {
      return {
        raw: update as unknown as Record<string, unknown>,
        eventType: 'message',
        metadata: { businessConnectionId: message.business_connection_id ?? null },
      }
    }
    // Everything else — edits, deletions, connection changes, reactions — is
    // accepted (the secret proved it is ours) and parked as 'other', which the
    // route answers 202 to instead of queueing.
    return { raw: update as unknown as Record<string, unknown>, eventType: 'other' }
  }

  /** The Bot API reports no delivery or read state; a successful send is all there is. */
  async getStatus(_input: GetMessageStatusInput): Promise<MessageStatus> {
    return { status: 'sent' }
  }

  async convertOutbound(input: ConvertOutboundInput): Promise<ChannelNativeContent> {
    const meta = (input.channelMetadata ?? {}) as Record<string, unknown>
    // Capabilities declare 'text' only, so anything richer is flattened here
    // rather than sent as markup Telegram would answer with a 400.
    const text = input.bodyFormat === 'html' ? htmlToText(input.body) : input.body
    return {
      content: { text, bodyFormat: 'text' },
      metadata: {
        businessConnectionId: stringOrUndefined(meta.businessConnectionId),
        replyToMessageId: stringOrUndefined(meta.replyToMessageId),
      },
    }
  }

  async normalizeInbound(raw: InboundMessage): Promise<NormalizedInboundMessage> {
    const message = pickInboundMessage(raw.raw as TelegramUpdate)
    if (!message) throw new Error('[internal] Telegram update carries no message to normalize')
    return normalizeTelegramMessage(message)
  }

  async validateCredentials(input: ValidateCredentialsInput): Promise<ValidateCredentialsResult> {
    const parsed = telegramCredentialsSchema.safeParse(input.credentials)
    if (!parsed.success) {
      const errors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? 'botToken')
        if (!errors[field]) errors[field] = issue.message
      }
      return { ok: false, errors, errorCodes: { botToken: 'invalid_format' } }
    }
    try {
      const response = await callTelegram<{ username?: string }>(parsed.data.botToken, 'getMe')
      if (!response.ok) {
        return {
          ok: false,
          errors: { botToken: `Telegram rejected the bot token: ${telegramErrorMessage(response)}` },
          errorCodes: { botToken: 'rejected_by_provider' },
        }
      }
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Telegram API request failed'
      return {
        ok: false,
        errors: { botToken: `Could not reach the Telegram API: ${message}` },
        errorCodes: { botToken: 'request_failed' },
      }
    }
  }
}

const adapter = new TelegramChannelAdapter()

export function getTelegramChannelAdapter(): ChannelAdapter {
  return adapter
}

export { TelegramChannelAdapter }
