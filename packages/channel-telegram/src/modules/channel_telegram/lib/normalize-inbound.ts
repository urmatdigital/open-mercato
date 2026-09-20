import type {
  NormalizedInboundMessage,
} from '@open-mercato/core/modules/communication_channels/lib/adapter'

export const TELEGRAM_CHANNEL_CONTENT_TYPE = 'telegram'

export type TelegramUser = {
  id: number
  is_bot?: boolean
  first_name?: string
  last_name?: string
  username?: string
}

export type TelegramChat = {
  id: number
  type?: string
  title?: string
  username?: string
  first_name?: string
  last_name?: string
}

export type TelegramMessage = {
  message_id: number
  date: number
  chat: TelegramChat
  from?: TelegramUser
  text?: string
  caption?: string
  business_connection_id?: string
  reply_to_message?: { message_id: number }
}

export type TelegramUpdate = {
  update_id?: number
  message?: TelegramMessage
  business_message?: TelegramMessage
  edited_message?: TelegramMessage
  edited_business_message?: TelegramMessage
  business_connection?: Record<string, unknown>
  deleted_business_messages?: Record<string, unknown>
  message_reaction?: Record<string, unknown>
}

/** The message an update carries, if it carries one we ingest. */
export function pickInboundMessage(update: TelegramUpdate): TelegramMessage | null {
  return update.business_message ?? update.message ?? null
}

/**
 * A Telegram `message_id` is unique per chat, not per bot, so it is composed
 * with the chat id. The hub dedupes inbound on this value.
 */
export function buildExternalMessageId(chatId: number | string, messageId: number | string): string {
  return `${chatId}:${messageId}`
}

/**
 * The business connection id is part of the conversation key, not decoration.
 * Under a business connection `chat.id` is the CUSTOMER's user id, and the same
 * customer writing to two employees of the same tenant produces the same chat id
 * twice. Without the connection in the key, the two private conversations would
 * be threaded into one and each employee would read the other's mail.
 */
export function buildExternalConversationId(message: TelegramMessage): string {
  return message.business_connection_id
    ? `telegram-business:${message.business_connection_id}:${message.chat.id}`
    : `telegram-chat:${message.chat.id}`
}

export function buildDisplayName(user: TelegramUser | undefined, chat: TelegramChat): string | undefined {
  const parts = [user?.first_name, user?.last_name].filter(Boolean)
  if (parts.length) return parts.join(' ')
  if (user?.username) return `@${user.username}`
  if (chat.title) return chat.title
  return undefined
}

export function normalizeTelegramMessage(message: TelegramMessage): NormalizedInboundMessage {
  const chatId = message.chat.id
  // `from` is absent on channel posts; the chat itself is then the counterpart.
  const senderId = message.from?.id ?? chatId
  return {
    externalMessageId: buildExternalMessageId(chatId, message.message_id),
    externalConversationId: buildExternalConversationId(message),
    senderIdentifier: String(senderId),
    senderDisplayName: buildDisplayName(message.from, message.chat),
    body: message.text ?? message.caption ?? '',
    bodyFormat: 'text',
    timestamp: new Date(message.date * 1000),
    ...(message.reply_to_message
      ? { replyToExternalId: buildExternalMessageId(chatId, message.reply_to_message.message_id) }
      : {}),
    channelPayload: message as unknown as Record<string, unknown>,
    channelContentType: TELEGRAM_CHANNEL_CONTENT_TYPE,
    channelMetadata: {
      chatId: String(chatId),
      chatType: message.chat.type ?? null,
      messageId: message.message_id,
      businessConnectionId: message.business_connection_id ?? null,
      senderUsername: message.from?.username ?? null,
    },
  }
}
