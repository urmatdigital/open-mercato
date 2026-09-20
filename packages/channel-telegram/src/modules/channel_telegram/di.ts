import { asValue } from 'awilix'
import type { AppContainer } from '@open-mercato/shared/lib/di/container'
import {
  hasChannelAdapter,
  registerChannelAdapter,
} from '@open-mercato/core/modules/communication_channels/lib/adapter-registry-singleton'
import { getTelegramChannelAdapter, TELEGRAM_PROVIDER_KEY } from './lib/adapter'
import { channelTelegramHealthCheck } from './lib/health'

export function register(container: AppContainer): void {
  if (!hasChannelAdapter(TELEGRAM_PROVIDER_KEY)) {
    registerChannelAdapter(getTelegramChannelAdapter())
  }
  container.register({
    channelTelegramAdapter: asValue(getTelegramChannelAdapter()),
    // Registered under the exact service name `integration.ts` names in
    // `healthCheck.service`; without it the hub's resolve throws and the channel
    // reports permanently unhealthy.
    channelTelegramHealthCheck: asValue(channelTelegramHealthCheck),
  })
}
