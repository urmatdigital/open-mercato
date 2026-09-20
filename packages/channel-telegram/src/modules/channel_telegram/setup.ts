import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'
import {
  hasChannelAdapter,
  registerChannelAdapter,
} from '@open-mercato/core/modules/communication_channels/lib/adapter-registry-singleton'
import { getTelegramChannelAdapter, TELEGRAM_PROVIDER_KEY } from './lib/adapter'

/**
 * The registry is process-wide, so the guard silences the duplicate-providerKey
 * error on dev-mode HMR and on repeated test imports.
 */
function ensureTelegramAdapterRegistered(): void {
  if (hasChannelAdapter(TELEGRAM_PROVIDER_KEY)) return
  registerChannelAdapter(getTelegramChannelAdapter())
}

ensureTelegramAdapterRegistered()

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['channel_telegram.view', 'channel_telegram.configure'],
    admin: ['channel_telegram.view', 'channel_telegram.configure'],
  },
  async seedDefaults() {
    // No env preset on purpose: a bot token belongs to a person or a tenant and
    // is connected through Integrations, not seeded from the environment.
    ensureTelegramAdapterRegistered()
  },
}

export default setup
