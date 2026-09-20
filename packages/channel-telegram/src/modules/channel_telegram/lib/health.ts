import type { IntegrationScope } from '@open-mercato/shared/modules/integrations/types'
import { telegramCredentialsSchema } from './credentials'
import { callTelegram, telegramErrorMessage } from './telegram-api'

type HealthCheckResult = {
  status: 'healthy' | 'unhealthy'
  message: string
  details: Record<string, unknown>
}

export const channelTelegramHealthCheck = {
  async check(
    credentials: Record<string, unknown> | null,
    _scope: IntegrationScope,
  ): Promise<HealthCheckResult> {
    const parsed = telegramCredentialsSchema.safeParse(credentials ?? {})
    if (!parsed.success) {
      return {
        status: 'unhealthy',
        message: `Telegram credentials invalid: ${parsed.error.issues[0]?.message ?? 'unknown validation error'}`,
        details: { reason: 'invalid_credentials' },
      }
    }

    try {
      const response = await callTelegram<{ username?: string }>(parsed.data.botToken, 'getMe', {}, 8_000)
      if (!response.ok) {
        return {
          status: 'unhealthy',
          message: `Telegram rejected the bot token: ${telegramErrorMessage(response)}`,
          details: { reason: 'api_rejected', errorCode: response.error_code ?? null },
        }
      }
      return {
        status: 'healthy',
        message: `Telegram bot token is valid (@${response.result?.username ?? 'unknown'})`,
        details: { endpoint: 'getMe', username: response.result?.username ?? null },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Telegram API request failed'
      return {
        status: 'unhealthy',
        message: `Telegram health check failed: ${message}`,
        details: { reason: 'request_failed' },
      }
    }
  },
}
