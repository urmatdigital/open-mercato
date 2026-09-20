import type { IntegrationBundle, IntegrationDefinition } from '@open-mercato/shared/modules/integrations/types'

export const integration: IntegrationDefinition = {
  id: 'channel_telegram',
  title: 'Telegram',
  description: 'Two-way Telegram bot channel: webhook inbound, Bot API outbound, optional Business connection.',
  category: 'communication',
  hub: 'communication_channels',
  providerKey: 'telegram',
  icon: 'message-circle',
  docsUrl: 'https://core.telegram.org/bots/api',
  package: '@open-mercato/channel-telegram',
  version: '0.1.0',
  author: 'ASYSTEM',
  company: 'ASYSTEM',
  license: 'MIT',
  tags: ['telegram', 'chat', 'bot', 'business', 'communication'],
  apiVersions: [
    {
      id: 'telegram-bot-api',
      label: 'Telegram Bot API',
      status: 'stable',
      default: true,
      changelog: 'Initial webhook inbound + sendMessage outbound, with business_connection_id support.',
    },
  ],
  healthCheck: { service: 'channelTelegramHealthCheck' },
  credentials: {
    fields: [
      {
        key: 'botToken',
        label: 'Bot token',
        type: 'secret',
        required: true,
        placeholder: '123456789:AA…',
        helpText: 'Issued by @BotFather. To answer from a personal account, connect this bot under Telegram → Settings → Business → Chatbots.',
      },
      {
        key: 'webhookSecret',
        label: 'Webhook secret token',
        type: 'secret',
        required: true,
        helpText: 'The same value passed to setWebhook(secret_token=…). 32-256 chars of A-Z a-z 0-9 _ - . It authenticates every delivery and picks the tenant, so give each channel its own.',
      },
      {
        key: 'defaultChatId',
        label: 'Default chat id',
        type: 'text',
        required: false,
        placeholder: '-1001234567890',
        helpText: 'Where a message with no explicit recipient goes. Leave empty to require a chat id on every send.',
      },
    ],
  },
}

export const integrations: IntegrationDefinition[] = [integration]
export const bundles: IntegrationBundle[] = []
export const bundle: IntegrationBundle | undefined = undefined
