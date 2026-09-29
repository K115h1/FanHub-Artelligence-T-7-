// Reproduces the Render build failure on purpose.
//
// The symptom was three errors that looked unrelated:
//
//     error TS2688: Cannot find type definition file for 'vite/client'.
//     tsconfig.app.json(3,5): error TS5102: Option 'baseUrl' has been removed.
//     error TS2688: Cannot find type definition file for 'node'.
//
// baseUrl has been fixed already, so this isolates the other two. The theory
// under test: Render's static-site build installed with NODE_ENV=production, and
// npm's production mode omits devDependencies. Both "types" entries name
// packages that ARE devDependencies - vite and @types/node - so a production
// install cannot resolve either, and TS2688 is the honest consequence rather
// than a bug in the tsconfig.
//
//   node scripts/reproTypesError.mjs
//
// Copies the manifests, the tsconfigs and src/ into a scratch directory OUTSIDE
// the repo, installs with --omit=dev, then runs the project's own tsc against it.
// The real node_modules is never touched.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, copyFileSync, cpSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const scratch = mkdtempSync(join(tmpdir(), 'repro-'))

/**
 * Runs a command and returns its stdout.
 *
 * npm on Windows is npm.cmd, a batch file, which Node cannot spawn without a
 * shell — it fails with EINVAL and the whole reproduction collapses on the
 * install step. Routing through cmd.exe fixes that, and shell:false is kept for
 * everything else so nothing is silently word-split.
 */
const run = (cmd, args, cwd) => {
  const isBatch = /\.(cmd|bat)$/i.test(cmd)
  return isBatch
    ? execFileSync('cmd.exe', ['/d', '/s', '/c', `${cmd} ${args.join(' ')}`], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 64 * 1024 * 1024,
      })
    : execFileSync(cmd, args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 64 * 1024 * 1024,
      })
}

console.log(`  scratch: ${scratch}`)

try {
  // Everything tsc needs to resolve, and nothing that depends on node_modules
  // being pre-populated.
  for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']) {
    copyFileSync(join(root, file), join(scratch, file))
  }
  cpSync(join(root, 'src'), join(scratch, 'src'), { recursive: true })
  cpSync(join(root, 'vite.config.ts'), join(scratch, 'vite.config.ts'))

  console.log('  installing with --omit=dev, which is what NODE_ENV=production does...')
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const log = run(npm, ['ci', '--omit=dev', '--no-audit', '--no-fund'], scratch)
  const added = (log.match(/added (\d+) packages/) || [])[1]
  console.log(`    ${added ?? '?'} packages installed (devDependencies excluded)`)

  const present = (p) => existsSync(join(scratch, 'node_modules', p))
  console.log('')
  console.log('  are the two "types" targets present?')
  console.log(`    vite            (for "vite/client") : ${present('vite')}`)
  console.log(`    @types/node     (for "node")        : ${present('@types/node')}`)
  console.log(`    typescript      (devDep too)        : ${present('typescript')}`)

  // The real tsc, from the project's own install, so the experiment does not
  // depend on the thing it is testing.
  const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc')
  const node = process.execPath

  console.log('\n  running tsc -b against the production-only install:')
  let out
  try {
    out = run(node, [tsc, '-b', '--force'], scratch)
    console.log('    no errors')
  } catch (err) {
    out = `${err.stdout ?? ''}${err.stderr ?? ''}`
    const lines = out.split(/\r?\n/).filter((l) => /error TS/.test(l))
    console.log(`    ${lines.length} error(s):`)
    lines.forEach((l) => console.log(`      ${l.trim()}`))
  }

  const codes = [...out.matchAll(/error (TS\d+)/g)].map((m) => m[1])
  const ts2688 = codes.filter((c) => c === 'TS2688').length

  console.log('')
  console.log(`  TS2688 count: ${ts2688}`)
  if (ts2688 >= 2) {
    console.log('  -> REPRODUCED. The cause is a production-only install, which omits')
    console.log('     devDependencies. vite and @types/node are both devDependencies and')
    console.log('     both are named in a tsconfig "types" array.')
    console.log('')
    console.log('  Fix: make sure the build command installs dev dependencies:')
    console.log('     npm ci --include=dev && npm run build')
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
  console.log(`\n  scratch removed`)
}
