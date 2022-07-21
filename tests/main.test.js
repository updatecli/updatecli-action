import path from 'node:path'
import url from 'node:url'
import {promises as fs} from 'node:fs'
import {
  run,
  updatecliDownload,
  updatecliVersion,
  updatecliExtract,
} from 'src/main'

const directory = path.dirname(url.fileURLToPath(import.meta.url))

const cachePath = path.join(directory, 'CACHE')
const temporaryPath = path.join(directory, 'TEMP')
// Set temp and tool directories before importing (used to set global state)
process.env['RUNNER_TEMP'] = temporaryPath
process.env['RUNNER_TOOL_CACHE'] = cachePath

const version = 'v0.28.0'
const versionWithoutV = version.slice(1)

process.env['INPUT_VERSION'] = version
const originalPlatform = process.platform
const originalArch = process.arch

const restorePlatformArch = () => {
  Object.defineProperty(process, 'platform', {
    value: originalPlatform,
  })
  Object.defineProperty(process, 'arch', {
    value: originalArch,
  })
}
const fakePlatformArch = (fakePlatform, fakeArch) => {
  Object.defineProperty(process, 'platform', {
    value: fakePlatform,
  })
  Object.defineProperty(process, 'arch', {
    value: fakeArch,
  })
}

describe('main', () => {
  it('run', async () => {
    await run()
    const file = path.join(
      cachePath,
      'updatecli',
      versionWithoutV,
      process.arch,
      'updatecli'
    )
    const fileStat = await fs.stat(file)
    expect(fileStat.isFile()).toBe(true)
  })

  it('unknown extract', async () => {
    await expect(
      updatecliExtract('/tmp/foo', 'foo.bar')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unsupported archive type: foo.bar"`
    )
  })

  it('unknown platform', async () => {
    fakePlatformArch('foo', 'bar')
    await updatecliDownload()
    expect(process.exitCode).not.toBe(0)
    restorePlatformArch()
  })

  it('updatecli not found', async () => {
    const path = process.env['PATH']
    process.env['PATH'] = ''
    await updatecliVersion()
    expect(process.exitCode).not.toBe(0)
    process.env['PATH'] = path
  })

  describe('linux', () => {
    beforeEach(() => {
      fakePlatformArch('linux', 'x64')
    })
    it('should download', async () => {
      await updatecliDownload()
      const file = path.join(
        cachePath,
        'updatecli',
        versionWithoutV,
        process.arch,
        'updatecli'
      )
      const fileStat = await fs.stat(file)
      expect(fileStat.isFile()).toBe(true)
    })
    afterEach(() => {
      restorePlatformArch()
    })
  })
  describe('windows', () => {
    beforeEach(() => {
      fakePlatformArch('win32', 'x64')
    })
    it('should download', async () => {
      await updatecliDownload()
      const file = path.join(
        cachePath,
        'updatecli',
        versionWithoutV,
        process.arch,
        'updatecli.exe'
      )
      const fileStat = await fs.stat(file)
      expect(fileStat.isFile()).toBe(true)
    })
    afterEach(() => {
      restorePlatformArch()
    })
  })
  describe('darwin', () => {
    beforeEach(() => {
      fakePlatformArch('darwin', 'x64')
    })
    it('should download', async () => {
      await updatecliDownload()
      const file = path.join(
        cachePath,
        'updatecli',
        versionWithoutV,
        process.arch,
        'updatecli'
      )
      const fileStat = await fs.stat(file)
      expect(fileStat.isFile()).toBe(true)
    })
    afterEach(() => {
      restorePlatformArch()
    })
  })
})

// afterAll(async () => {
//   await fs.rm(temporaryPath, {recursive: true})
//   await fs.rm(cachePath, {recursive: true})
// })
