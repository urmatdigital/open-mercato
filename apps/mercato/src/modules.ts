// Central place to enable modules and their source.
// - id: module id (plural snake_case; special cases: 'auth')
// - from: '@open-mercato/core' | '@app' | custom alias/path in future
// - overrides: optional unified per-app override surface — replace or
//   disable any contract a module presents: AI, routes, events, workers,
//   widgets, notifications, interceptors, setup, ACL, DI, encryption, etc.
//   See `.ai/specs/implemented/2026-05-04-modules-ts-unified-overrides.md` and
//   `apps/docs/docs/framework/modules/overrides.mdx`.
import { parseBooleanWithDefault } from '@open-mercato/shared/lib/boolean'
import type { ModuleOverrides } from '@open-mercato/shared/modules/overrides'
import { officialModuleEntries } from './official-modules.generated'

export type ModuleEntry = {
  id: string
  from?: '@open-mercato/core' | '@app' | string
  overrides?: ModuleOverrides
}

/**
 * Copyable examples for every wired `entry.overrides` domain.
 *
 * This object is intentionally not assigned to any enabled module. Use it as
 * a reference when a downstream app needs to disable or replace contracts
 * from a package-backed module without editing that module's source.
 */
export const moduleOverrideExamples: ModuleOverrides = {
  ai: {
    agents: { 'catalog.catalog_assistant': null },
    tools: { inbox_ops_accept_action: null },
  },
  routes: {
    api: { 'DELETE /api/example/items': null },
    pages: { '/backend/example/reports': null },
  },
  events: {
    subscribers: { 'example.todo.audit': null },
  },
  workers: { 'example:sync': null },
  widgets: {
    injection: { 'example.sidebar': null },
    components: { 'page:/backend/example': null },
    dashboard: { 'example.kpi': null },
  },
  notifications: {
    types: { 'example.notice': null },
    handlers: { 'example.notice.toast': null },
  },
  interceptors: { 'example.items.interceptor': null },
  commandInterceptors: { 'example.command.interceptor': null },
  enrichers: { 'example.items.enricher': null },
  guards: { 'example.backend.guard': null },
  cli: { 'example seed': null },
  setup: {
    seedExamples: false,
  },
  acl: {
    features: { 'example.manage': null },
  },
  di: { exampleService: null },
  encryption: {
    maps: { 'example:item': null },
  },
}

// ── Приостановленные модули ──────────────────────────────────────────────
// Выключены 2026-08-20: интерфейс показывал ролям три десятка разделов, из
// которых в работе ни один. Данные и таблицы на месте — модуль просто не
// подключается, включение обратно = вернуть строку в enabledModules.
//
// Порядок выключения учитывает зависимости из манифестов (`requires`):
//   sales → catalog, customers, dictionaries · wms → catalog, sales, feature_toggles
//   staff → planner, resources · portal → customer_accounts
// customers, dictionaries, planner и feature_toggles остаются — они в работе.
//
//   catalog                 Категории, товары и услуги
//   sales                   Заказы, каналы продаж, коммерческие предложения
//   wms                     Склад: операционная панель, ресурсы склада
//   checkout                Оформление заказа
//   payment_gateways        Платёжные шлюзы, ссылки на оплату, транзакции
//   gateway_stripe          Stripe
//   shipping_carriers       Перевозчики и доставка
//   sync_akeneo             Синхронизация с Akeneo PIM
//   currencies              Справочник валют — нужен продажам
//   content                 CMS-страницы
//   portal                  Клиентский портал
//   customer_accounts       Личные кабинеты клиентов — основа портала
//   resources               Планирование ресурсов, типы ресурсов
//   staff                   Сотрудники, команды, табели, отпуска
//   messages                Сообщения
//   communication_channels  Каналы связи (Slack, WhatsApp, почта)
//   channel_imap            Почтовый канал IMAP
//   channel_gmail           Почтовый канал Gmail
//   inbox_ops               ИИ-действия из почты
//   integrations            Интеграции
//   webhooks                Вебхуки
//   data_sync               Синхронизация данных
//   sync_excel              Импорт и выгрузка Excel
//   business_rules          Бизнес-правила и наборы правил
//   ai_assistant            ИИ-ассистент — провайдер не настроен
//   api_docs                Обозреватель API
//   onboarding              Самостоятельный онбординг — отключён и вручную
//   translations            Редактор переводов интерфейса
//   example                 Демонстрационный модуль ядра (фазы A–H, витрина)
//   ratelimit_probe         Проба ограничителя запросов
// ─────────────────────────────────────────────────────────────────────────

export const enabledModules: ModuleEntry[] = [
  { id: 'dashboards', from: '@open-mercato/core' },
  { id: 'auth', from: '@open-mercato/core' },
  { id: 'directory', from: '@open-mercato/core' },
  { id: 'customers', from: '@open-mercato/core' },
  { id: 'perspectives', from: '@open-mercato/core' },
  { id: 'entities', from: '@open-mercato/core' },
  { id: 'configs', from: '@open-mercato/core' },
  { id: 'query_index', from: '@open-mercato/core' },
  { id: 'audit_logs', from: '@open-mercato/core' },
  { id: 'attachments', from: '@open-mercato/core' },
  { id: 'api_keys', from: '@open-mercato/core' },
  { id: 'dictionaries', from: '@open-mercato/core' },
  { id: 'feature_toggles', from: '@open-mercato/core' },
  { id: 'workflows', from: '@open-mercato/core' },
  { id: 'search', from: '@open-mercato/search' },
  { id: 'planner', from: '@open-mercato/core' },
  { id: 'events', from: '@open-mercato/events' },
  { id: 'notifications', from: '@open-mercato/core' },
  { id: 'progress', from: '@open-mercato/core' },
  { id: 'scheduler', from: '@open-mercato/scheduler' },
  // Имя продукта на экране входа. Стоит последним намеренно: словари модулей
  // мержатся по порядку, и побеждает тот, кто объявлен позже ядра.
  { id: 'asystem_brand', from: '@app' },
]

// Official modules activated via official-modules.json / official-modules.local.json
// (managed by `yarn official-modules`; backed by the external/official-modules submodule).
for (const entry of officialModuleEntries) {
  if (!enabledModules.some((existing) => existing.id === entry.id)) enabledModules.push(entry)
}

if (parseBooleanWithDefault(process.env.OM_ENABLE_STORAGE_S3, false)) {
  enabledModules.push({ id: 'storage_s3', from: '@open-mercato/storage-s3' })
}

const enterpriseModulesEnabled = parseBooleanWithDefault(process.env.OM_ENABLE_ENTERPRISE_MODULES, false)
const enterpriseSsoEnabled = parseBooleanWithDefault(process.env.OM_ENABLE_ENTERPRISE_MODULES_SSO, false)
const enterpriseSecurityEnabled = parseBooleanWithDefault(process.env.OM_ENABLE_ENTERPRISE_MODULES_SECURITY, false)

if (enterpriseModulesEnabled) {
  enabledModules.push(
    { id: 'record_locks', from: '@open-mercato/enterprise' },
    { id: 'system_status_overlays', from: '@open-mercato/enterprise' },
  )
}

if (enterpriseModulesEnabled && enterpriseSsoEnabled) {
  enabledModules.push({ id: 'sso', from: '@open-mercato/enterprise' })
}

if (enterpriseModulesEnabled && enterpriseSecurityEnabled) {
  enabledModules.push({ id: 'security', from: '@open-mercato/enterprise' })
}
