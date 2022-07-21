import path from 'node:path'
import url from 'node:url'
import {promises as fs} from 'node:fs'
import {
  run,
  updatecliDownload,
  updatecliVersion,
  updatecliExtract,
} from 'src/main'
import {ExitCode} from '@actions/core'

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
    await expect(
      updatecliDownload()
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unsupported platform foo and arch bar"`
    )
    restorePlatformArch()
  })

  it('updatecli not found', async () => {
    const path = process.env['PATH']
    process.env['PATH'] = ''
    await expect(updatecliVersion()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unable to locate executable file: updatecli. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also check the file mode to verify the file is executable."`
    )
    process.env['PATH'] = path
  })

  it('run unknown platform', async () => {
    fakePlatformArch('foo', 'bar')
    await run()
    expect(process.exitCode).toBe(ExitCode.Failure)
    restorePlatformArch()
  })

  it('linux should download', async () => {
    fakePlatformArch('linux', 'x64')
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
    restorePlatformArch()
  })

  it('windows should download', async () => {
    fakePlatformArch('win32', 'x64')
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
    restorePlatformArch()
  })

  it('darwin should download', async () => {
    fakePlatformArch('darwin', 'x64')
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
    restorePlatformArch()
  })
})

afterAll(async () => {
  await fs.rm(temporaryPath, {recursive: true})
  await fs.rm(cachePath, {recursive: true})
})
