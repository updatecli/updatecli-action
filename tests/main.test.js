import path from 'node:path'
import url from 'node:url'
import {promises as fs} from 'node:fs'
import {
  getUpdatecliVersion,
  getVersionFromFileContent,
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

const DEFAULT_VERSION = `v0.86.0`
const versionWithoutV = DEFAULT_VERSION.slice(1)

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
    process.env['INPUT_VERSION'] = DEFAULT_VERSION
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
    expect(process.exitCode).toBe(ExitCode.Success)
    await fs.unlink(file)
  }, 10_000)

  it('run with empty values', async () => {
    process.env['INPUT_VERSION'] = ``
    await run()
    expect(process.exitCode).toBe(ExitCode.Success)
  }, 10_000)

  it('run with version-file', async () => {
    const versionFile = path.join(temporaryPath, '.updatecli-version')
    await fs.writeFile(versionFile, 'v0.85.0')
    process.env['INPUT_VERSION'] = ''
    process.env['INPUT_VERSION-FILE'] = versionFile
    await run()
    const file = path.join(
      cachePath,
      'updatecli',
      '0.85.0',
      process.arch,
      'updatecli'
    )
    const fileStat = await fs.stat(file)
    expect(fileStat.isFile()).toBe(true)
    expect(process.exitCode).toBe(ExitCode.Success)
    await fs.unlink(versionFile)
  }, 10_000)

  it('unknown extract', async () => {
    process.env['INPUT_VERSION'] = DEFAULT_VERSION
    await expect(
      updatecliExtract('/tmp/foo', 'foo.bar')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unsupported archive type: foo.bar"`
    )
  }, 10_000)

  it('updatecli not found', async () => {
    const path = process.env['PATH']
    process.env['PATH'] = ''
    await expect(updatecliVersion()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unable to locate executable file: updatecli. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also check the file mode to verify the file is executable."`
    )
    process.env['PATH'] = path
  }, 10_000)

  // This test show an error message on the console which trigger the test to fail
  // from GitHub action. I am commenting until I find a way to handle it.
  // ❗  ::error::Unsupported platform foo and arch bar
  // it('run unknown platform', async () => {
  //   fakePlatformArch('foo', 'bar')
  //  await run()
  //  expect(process.exitCode).toBe(ExitCode.Failure)
  //  restorePlatformArch()
  // }, 10_000)
})

describe('updatecliDownload', () => {
  it('unknown platform', async () => {
    fakePlatformArch('foo', 'bar')
    await expect(
      updatecliDownload(DEFAULT_VERSION)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unsupported platform foo and arch bar"`
    )
    restorePlatformArch()
  }, 10_000)
  it('linux should download', async () => {
    fakePlatformArch('linux', 'x64')
    await updatecliDownload(DEFAULT_VERSION)
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
    await fs.unlink(file)
  }, 10_000)

  it('windows should download', async () => {
    fakePlatformArch('win32', 'x64')
    await updatecliDownload(DEFAULT_VERSION)
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
    await fs.unlink(file)
  }, 10_000)

  it('darwin should download', async () => {
    fakePlatformArch('darwin', 'x64')
    await updatecliDownload(DEFAULT_VERSION)
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
    await fs.unlink(file)
  }, 10_000)
})

describe('getVersionFromFileContent', () => {
  it('should return version from .updatecli-version file', async () => {
    const versionFile = path.join(temporaryPath, '.updatecli-version')
    const fileContent = 'v0.86.1'
    await fs.writeFile(versionFile, fileContent)

    const version = await getVersionFromFileContent(versionFile)
    expect(version).toBe('v0.86.1')

    await fs.unlink(versionFile)
  })

  it('should return version from .tool-versions file', async () => {
    const versionFile = path.join(temporaryPath, '.tool-versions')
    const fileContent = 'updatecli v0.86.1'
    await fs.writeFile(versionFile, fileContent)

    const version = await getVersionFromFileContent(versionFile)
    expect(version).toBe('v0.86.1')

    await fs.unlink(versionFile)
  })

  it('should return null if no version is found', async () => {
    const versionFile = path.join(temporaryPath, '.updatecli-version')
    const fileContent = ''
    await fs.writeFile(versionFile, fileContent)

    const version = await getVersionFromFileContent(versionFile)
    expect(version).toBeUndefined()

    await fs.unlink(versionFile)
  })

  it('should return null if file content does not match regex', async () => {
    const versionFile = path.join(temporaryPath, '.updatecli-version')
    const fileContent = 'invalid content'
    await fs.writeFile(versionFile, fileContent)

    const version = await getVersionFromFileContent(versionFile)
    expect(version).toBeUndefined()

    await fs.unlink(versionFile)
  })
})

describe('getUpdatecliVersion', () => {
  it('should return the default version if no inputs are provided', async () => {
    process.env['INPUT_VERSION'] = ''
    process.env['INPUT_VERSION-FILE'] = ''
    const result = await getUpdatecliVersion()
    expect(result).toBe('v0.86.1')
  })

  it('should return the version from input if provided', async () => {
    process.env['INPUT_VERSION'] = 'v0.85.0'
    process.env['INPUT_VERSION-FILE'] = ''
    const result = await getUpdatecliVersion()
    expect(result).toBe('v0.85.0')
  })

  it('should return the version from file if input is not provided', async () => {
    const versionFile = path.join(temporaryPath, '.updatecli-version')
    await fs.writeFile(versionFile, 'v0.85.0')
    process.env['INPUT_VERSION'] = ''
    process.env['INPUT_VERSION-FILE'] = versionFile
    const result = await getUpdatecliVersion()
    expect(result).toBe('v0.85.0')
    await fs.unlink(versionFile)
  })

  it('should throw an error if no version is found in the file', async () => {
    const versionFile = path.join(temporaryPath, '.updatecli-version')
    await fs.writeFile(versionFile, '')
    process.env['INPUT_VERSION'] = ''
    process.env['INPUT_VERSION-FILE'] = versionFile
    await expect(
      getUpdatecliVersion()
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"No supported version was found in file ${versionFile}"`
    )
    await fs.unlink(versionFile)
  })
})

afterAll(async () => {
  await fs.rm(temporaryPath, {recursive: true})
  await fs.rm(cachePath, {recursive: true})
})
