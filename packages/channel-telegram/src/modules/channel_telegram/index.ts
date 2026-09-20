export const metadata = {
  id: 'channel_telegram',
  name: 'Telegram Channel',
  description:
    'Two-way Telegram channel over the Bot API. Inbound arrives on the hub webhook route and is authenticated by the per-channel secret token; outbound goes through sendMessage, optionally on behalf of a Telegram Business account the bot is connected to.',
  version: '0.1.0',
  requires: ['communication_channels', 'integrations'],
}

export default metadata
