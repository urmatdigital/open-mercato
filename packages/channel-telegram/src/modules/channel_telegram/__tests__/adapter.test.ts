import { TelegramChannelAdapter, TELEGRAM_SECRET_HEADER } from '../lib/adapter'
import { normalizeTelegramMessage, type TelegramMessage } from '../lib/normalize-inbound'

const credentials = {
  botToken: '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw',
  webhookSecret: 'x'.repeat(40),
}

function update(message: Partial<TelegramMessage> & { message_id: number }, key: 'message' | 'business_message' = 'message') {
  return {
    update_id: 1,
    [key]: {
      date: 1_789_000_000,
      chat: { id: 4242, type: 'private' },
      from: { id: 4242, first_name: 'Айгуль', username: 'aigul' },
      ...message,
    },
  }
}

const adapter = new TelegramChannelAdapter()
const scope = { organizationId: 'org', tenantId: 'tenant' }

describe('verifyWebhook', () => {
  it('accepts a delivery whose secret matches the channel', async () => {
    const event = await adapter.verifyWebhook({
      rawBody: JSON.stringify(update({ message_id: 7, text: 'привет' })),
      headers: { [TELEGRAM_SECRET_HEADER]: credentials.webhookSecret },
      credentials,
      scope,
    })
    expect(event.eventType).toBe('message')
  })

  // The hub walks every active telegram channel and takes the first adapter that
  // does not throw, so a wrong secret MUST throw or one tenant ingests another's mail.
  it('rejects a delivery signed with another channel secret', async () => {
    await expect(
      adapter.verifyWebhook({
        rawBody: JSON.stringify(update({ message_id: 7, text: 'привет' })),
        headers: { [TELEGRAM_SECRET_HEADER]: 'y'.repeat(40) },
        credentials,
        scope,
      }),
    ).rejects.toThrow(/secret token does not match/)
  })

  it('rejects a delivery with no secret header at all', async () => {
    await expect(
      adapter.verifyWebhook({ rawBody: '{}', headers: {}, credentials, scope }),
    ).rejects.toThrow(/missing X-Telegram-Bot-Api-Secret-Token/)
  })

  it('parks an update that carries no message', async () => {
    const event = await adapter.verifyWebhook({
      rawBody: JSON.stringify({ update_id: 2, business_connection: { id: 'bc1' } }),
      headers: { [TELEGRAM_SECRET_HEADER]: credentials.webhookSecret },
      credentials,
      scope,
    })
    expect(event.eventType).toBe('other')
  })
})

describe('normalizeTelegramMessage', () => {
  it('composes the message id from chat and message, which is unique per bot', () => {
    const normalized = normalizeTelegramMessage(update({ message_id: 7, text: 'привет' }).message as TelegramMessage)
    expect(normalized.externalMessageId).toBe('4242:7')
    expect(normalized.externalConversationId).toBe('telegram-chat:4242')
    expect(normalized.body).toBe('привет')
    expect(normalized.senderDisplayName).toBe('Айгуль')
    expect(normalized.timestamp.getTime()).toBe(1_789_000_000_000)
  })

  // Two employees, one customer: chat.id is the same on both business
  // connections, so the connection id has to be part of the conversation key.
  it('keeps two business connections to the same customer apart', () => {
    const first = normalizeTelegramMessage(
      update({ message_id: 7, text: 'а', business_connection_id: 'bc_urmat' }, 'business_message')
        .business_message as TelegramMessage,
    )
    const second = normalizeTelegramMessage(
      update({ message_id: 7, text: 'а', business_connection_id: 'bc_aida' }, 'business_message')
        .business_message as TelegramMessage,
    )
    expect(first.externalConversationId).not.toBe(second.externalConversationId)
    expect(first.externalConversationId).toBe('telegram-business:bc_urmat:4242')
  })

  it('falls back to the caption and carries the reply reference', () => {
    const normalized = normalizeTelegramMessage(
      update({ message_id: 9, caption: 'справка.pdf', reply_to_message: { message_id: 7 } }).message as TelegramMessage,
    )
    expect(normalized.body).toBe('справка.pdf')
    expect(normalized.replyToExternalId).toBe('4242:7')
  })
})

describe('sendMessage', () => {
  it('fails legibly when nothing says where to send', async () => {
    const result = await adapter.sendMessage({ content: { text: 'привет' }, credentials, scope })
    expect(result.status).toBe('failed')
    expect(result.error).toMatch(/TELEGRAM_NO_RECIPIENT/)
  })
})
