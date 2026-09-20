#!/usr/bin/env node
// FORK-ONLY (ASYSTEM). Not an upstream file — do not send it upstream.
//
// `yarn typecheck` cannot be green in this fork, and not because of a bug.
// `packages/core/generated/**` is generated from the modules ENABLED in
// `apps/mercato/src/modules.ts`, while `packages/core` is typechecked whole. A
// module this fork paused therefore loses both its entity ids (`E.catalog`,
// TS2339) and its per-entity generated modules (`#generated/entities/…`,
// TS2307) while its source stays in the tree. Re-enabling the warehouse and
// catalogue stacks to satisfy a typechecker would be the tail wagging the dog,
// and patching core's tsconfig would fight upstream on every release.
//
// So: errors inside `packages/core/src/modules/<id>/` are exempt when `<id>` is
// NOT in the app's enabled list — code the fork does not ship. The list is READ
// FROM `modules.ts` on every run, never hardcoded here: enable a module and its
// errors stop being exempt the same minute, with no one to remember why.
//
// Everything else fails, including any error in an enabled module.
//
// Usage: yarn gate
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'

const STEPS = ['build:packages', 'generate', 'typecheck']
const DOCKERFILE = 'Dockerfile'

/**
 * The image installs dependencies from a hand-written list of workspace
 * manifests (`COPY packages/<name>/package.json …`, twice). A workspace missing
 * from that list is invisible locally and fails the BUILD with a yarn resolver
 * stack trace — `yarn install --immutable` sees a lockfile entry whose manifest
 * is not in the context. channel-telegram cost one failed prod deploy to learn.
 */
export function missingFromDockerfile(workspaces, dockerfile) {
  // BOTH blocks, not one: the deps stage and the runtime stage each copy the
  // manifests, and a package present in only one fails the later stage.
  return workspaces.filter((name) => dockerfile.split(`COPY packages/${name}/package.json`).length - 1 < 2)
}

const MODULES_FILE = 'apps/mercato/src/modules.ts'
// `@open-mercato/core:typecheck: src/modules/<id>/…: error TS…`
const CORE_ERROR = /^@open-mercato\/core:typecheck:\s+(?:\.\.\/core\/)?src\/modules\/([a-z_]+)\/\S*.*error TS/

export function readEnabledModuleIds(source) {
  // Only real entries count; the paused ones live in a comment block above them.
  const ids = new Set()
  for (const line of source.split('\n')) {
    if (line.trimStart().startsWith('//')) continue
    const match = line.match(/\{\s*id:\s*'([a-z_]+)'/)
    if (match) ids.add(match[1])
  }
  return ids
}

export function classify(line, enabled) {
  if (!line.includes('error TS')) return null
  const match = line.match(CORE_ERROR)
  if (!match) return 'fail'
  return enabled.has(match[1]) ? 'fail' : `exempt:${match[1]}`
}

function run(step) {
  return new Promise((resolve) => {
    const child = spawn('yarn', [step], { shell: false })
    let out = ''
    const collect = (chunk) => {
      const text = chunk.toString()
      out += text
      process.stdout.write(text)
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    child.on('close', (code) => resolve({ code, out }))
  })
}

async function main() {
  const enabled = readEnabledModuleIds(readFileSync(MODULES_FILE, 'utf8'))
  const workspaces = readdirSync('packages', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(`packages/${entry.name}/package.json`))
    .map((entry) => entry.name)
  const missing = missingFromDockerfile(workspaces, readFileSync(DOCKERFILE, 'utf8'))
  if (missing.length) {
    console.error(`fork-gate: FAIL — ${DOCKERFILE} does not copy the manifest of: ${missing.join(', ')}`)
    console.error('  The image would fail on `yarn install --immutable`. Add a COPY line in BOTH manifest blocks.')
    process.exit(1)
  }
  if (enabled.size === 0) {
    console.error(`fork-gate: read no enabled modules from ${MODULES_FILE} — refusing to exempt anything.`)
    process.exit(1)
  }
  const exemptedBy = new Map()
  for (const step of STEPS) {
    const { code, out } = await run(step)
    const failures = []
    for (const line of out.split('\n')) {
      const verdict = classify(line, enabled)
      if (verdict === 'fail') failures.push(line)
      else if (typeof verdict === 'string' && verdict.startsWith('exempt:')) {
        const id = verdict.slice('exempt:'.length)
        exemptedBy.set(id, (exemptedBy.get(id) ?? 0) + 1)
      }
    }
    if (failures.length) {
      console.error(`\nfork-gate: FAIL — ${failures.length} error(s) in shipped code during \`yarn ${step}\`:`)
      for (const line of failures.slice(0, 20)) console.error(`  ${line.trim()}`)
      process.exit(1)
    }
    // A non-zero exit with nothing but exempted errors is the expected shape of
    // the typecheck step; anywhere else it means the step itself died.
    if (code !== 0 && !(step === 'typecheck' && exemptedBy.size > 0)) {
      console.error(`\nfork-gate: FAIL — \`yarn ${step}\` exited ${code} with no error lines. Read the output above.`)
      process.exit(code ?? 1)
    }
  }
  if (exemptedBy.size === 0) {
    console.log('\nfork-gate: PASS — and no paused module produced an error. The exemption is dead weight; delete it.')
    return
  }
  const summary = [...exemptedBy.entries()].sort().map(([id, n]) => `${id}:${n}`).join(' ')
  console.log(`\nfork-gate: PASS — errors only in modules this fork does not ship (${summary})`)
}

if (process.argv[1] && process.argv[1].endsWith('fork-gate.mjs')) await main()
