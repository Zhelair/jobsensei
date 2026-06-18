import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, readdir, rm, stat, copyFile, writeFile } from 'node:fs/promises'

const execFileAsync = promisify(execFile)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const sourceDir = path.join(rootDir, 'extension')
const distDir = path.join(rootDir, 'dist')
const stageDir = path.join(distDir, 'chrome-extension-store')
const zipPath = path.join(distDir, 'jobsensei-capture-extension-store.zip')

const PROD_HOST_PERMISSIONS = ['https://jobsensei.app/*']
const DEV_HOST_PATTERNS = new Set([
  'https://*.vercel.app/*',
  'http://localhost/*',
  'http://127.0.0.1/*',
])

function toPowerShellLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

async function copyDirectory(source, target) {
  await mkdir(target, { recursive: true })
  const entries = await readdir(source, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name)
    const targetPath = path.join(target, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath)
      continue
    }

    if (entry.isFile()) {
      await copyFile(sourcePath, targetPath)
    }
  }
}

async function rewriteManifest() {
  const manifestPath = path.join(stageDir, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

  manifest.host_permissions = PROD_HOST_PERMISSIONS
  manifest.optional_host_permissions = Array.from(
    new Set((manifest.optional_host_permissions || []).filter(Boolean)),
  )

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

async function assertStageReady() {
  const manifestPath = path.join(stageDir, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const badHosts = (manifest.host_permissions || []).filter(value => DEV_HOST_PATTERNS.has(value))

  if (badHosts.length > 0) {
    throw new Error(`Production manifest still contains dev host permissions: ${badHosts.join(', ')}`)
  }

  await stat(path.join(stageDir, 'background.js'))
  await stat(path.join(stageDir, 'popup.js'))
  await stat(path.join(stageDir, 'popup.html'))
  await stat(path.join(stageDir, 'icons', 'icon-128.png'))
}

async function zipStage() {
  const command = [
    `if (Test-Path ${toPowerShellLiteral(zipPath)}) { Remove-Item ${toPowerShellLiteral(zipPath)} -Force }`,
    `Compress-Archive -Path ${toPowerShellLiteral(path.join(stageDir, '*'))} -DestinationPath ${toPowerShellLiteral(zipPath)} -Force`,
  ].join('; ')

  await execFileAsync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
    { cwd: rootDir },
  )
}

async function main() {
  await mkdir(distDir, { recursive: true })
  await rm(stageDir, { recursive: true, force: true })
  await copyDirectory(sourceDir, stageDir)
  await rewriteManifest()
  await assertStageReady()
  await zipStage()

  console.log(`Store-ready extension folder: ${path.relative(rootDir, stageDir)}`)
  console.log(`Store-ready extension zip: ${path.relative(rootDir, zipPath)}`)
  console.log(`Production host permissions: ${PROD_HOST_PERMISSIONS.join(', ')}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
