import { fetchWithTimeout } from '@open-mercato/shared/lib/http/fetchWithTimeout'

const API_ROOT = 'https://api.telegram.org'
const DEFAULT_TIMEOUT_MS = 10_000

export type TelegramResponse<T> = {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
}

/**
 * One call against the Bot API. Never throws on a Telegram-level failure — the
 * `ok: false` envelope is returned as-is, because both callers (send and
 * credential validation) have to turn it into a message a human reads rather
 * than into an exception the queue retries forever.
 *
 * Transport failures DO throw: those are worth a retry, and the caller decides.
 */
export async function callTelegram<T>(
  botToken: string,
  method: string,
  payload?: Record<string, unknown>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<TelegramResponse<T>> {
  const response = await fetchWithTimeout(`${API_ROOT}/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
    timeoutMs,
  })
  // A 4xx from Telegram still carries a JSON envelope with `description`, which
  // is the only useful part of the failure; a proxy error page does not.
  const parsed = (await response.json().catch(() => null)) as TelegramResponse<T> | null
  if (!parsed) {
    return { ok: false, description: `Telegram API returned ${response.status} with a non-JSON body` }
  }
  return parsed
}

export function telegramErrorMessage(response: TelegramResponse<unknown>): string {
  const code = response.error_code ? ` (${response.error_code})` : ''
  return `${response.description ?? 'Telegram API call failed'}${code}`
}
