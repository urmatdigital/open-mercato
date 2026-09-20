import type { ChannelCapabilities } from '@open-mercato/core/modules/communication_channels/lib/adapter'

/** `sendMessage` rejects anything longer; the hub trims against this before it calls us. */
export const TELEGRAM_MAX_BODY_LENGTH = 4096

/**
 * Deliberately conservative for the first slice: every flag below is either what
 * the Bot API cannot do at all, or what this adapter does not implement yet.
 *
 * `conversationHistory: false` is the structural one and it is not a slice
 * boundary — a bot, including one connected to a Telegram Business account, is
 * handed messages from the moment it is connected and is given no method that
 * returns what came before (core.telegram.org/api/bots/connected-business-bots).
 * Importing an account's own past conversations needs MTProto, which is a
 * separate service feeding `importHistory`, not this transport.
 *
 * `richText: false` with `supportedBodyFormats: ['text']`: Telegram's MarkdownV2
 * needs every reserved character escaped and answers a malformed body with a 400
 * on send, so plain text is the honest first contract. Widening it means an
 * escaper and its test, not just flipping the flag.
 */
export const telegramCapabilities: ChannelCapabilities = {
  // Chat ids and business connection ids, never email addresses.
  recipientFormat: 'provider-native',

  threading: false,
  richText: false,
  fileSharing: false,
  readReceipts: false,
  deliveryReceipts: false,
  typingIndicators: false,

  reactions: false,
  multiReactionPerUser: false,
  editMessage: false,
  deleteMessage: false,
  presence: false,
  richBlocks: false,
  interactiveComponents: false,
  inlineImages: false,
  conversationHistory: false,
  contactCards: false,
  locationSharing: false,
  voiceNotes: false,
  stickers: false,

  supportedBodyFormats: ['text'],
  maxBodyLength: TELEGRAM_MAX_BODY_LENGTH,

  realtimePush: true,
}
