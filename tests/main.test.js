import path from 'node:path'
import url from 'node:url'
import {promises as fs} from 'node:fs'
import {
  getExpectedChecksum,
  getUpdatecliVersion,
  getVersionFromFileContent,
  isPreChecksumsVersion,
  run,
  updatecliDownload,
  updatecliVersion,
  updatecliExtract,
  verifyChecksum,
} from 'src/main'
import {ExitCode} from '@actions/core'

const directory = path.dirname(url.fileURLToPath(import.meta.url))

const cachePath = path.join(directory, 'CACHE')
const temporaryPath = path.join(directory, 'TEMP')
// Set temp and tool directories before importing (used to set global state)
process.env['RUNNER_TEMP'] = temporaryPath
process.env['RUNNER_TOOL_CACHE'] = cachePath

const DEFAULT_VERSION = `v0.122.1`
const versionWithoutV = DEFAULT_VERSION.slice(1)

const originalPlatform = process.platform
const originalArch = process.arch

const restorePlatformArch = () => {
  Object.defineProperties(process, {
    platform: {
      value: originalPlatform,
    },
    arch: {
      value: originalArch,
    },
  })
}
const fakePlatformArch = (fakePlatform, fakeArch) => {
  Object.defineProperties(process, {
    platform: {
      value: fakePlatform,
    },
    arch: {
      value: fakeArch,
    },
  })
}

// Updatecli is looked up in the tool cache before downloading,
// so each test starts from an empty cache
beforeEach(async () => {
  await fs.rm(cachePath, {recursive: true, force: true})
  await fs.mkdir(temporaryPath, {recursive: true})
})

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
  }, 10_000)
})

describe('updatecliDownload cache', () => {
  it('should use the tool cache instead of downloading', async () => {
    // this version doesn't exist on GitHub, so downloading it would fail
    const version = 'v0.0.1-cached'
    const toolPath = path.join(cachePath, 'updatecli', '0.0.1-cached')
    await fs.mkdir(path.join(toolPath, process.arch), {recursive: true})
    await fs.writeFile(path.join(toolPath, process.arch, 'updatecli'), '')
    await fs.writeFile(path.join(toolPath, `${process.arch}.complete`), '')

    await expect(updatecliDownload(version)).resolves.toBeUndefined()
  })
})

describe('getExpectedChecksum', () => {
  it('should return the checksum from checksums.txt', async () => {
    const checksum = await getExpectedChecksum(
      'v0.122.1',
      'updatecli_Linux_x86_64.tar.gz'
    )
    expect(checksum).toBe(
      '8ca11bfa6dae1c0c3aba5df00d7d40ff23e2dc979c966b8d3fc715470b68a0dc'
    )
  }, 10_000)

  it('should return undefined if the release has no checksums.txt', async () => {
    const checksum = await getExpectedChecksum(
      'v0.10.0',
      'updatecli_Linux_x86_64.tar.gz'
    )
    expect(checksum).toBeUndefined()
  }, 10_000)

  it('should throw if a recent release has no checksums.txt', async () => {
    await expect(
      getExpectedChecksum('v99.0.0', 'updatecli_Linux_x86_64.tar.gz')
    ).rejects.toThrow(/404/)
  }, 10_000)

  it('should throw if the archive is not listed', async () => {
    await expect(
      getExpectedChecksum('v0.122.1', 'updatecli_foo.tar.gz')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"No checksum found for updatecli_foo.tar.gz in checksums.txt"`
    )
  }, 10_000)
})

describe('isPreChecksumsVersion', () => {
  it.each([
    ['v0.10.0', true],
    ['v0.40.1', true],
    ['0.39.9', true],
    ['v0.40.2', false],
    ['v0.41.0', false],
    ['v0.122.1', false],
    ['v1.0.0', false],
    ['latest', false],
  ])('%s -> %s', (version, expected) => {
    expect(isPreChecksumsVersion(version)).toBe(expected)
  })
})

describe('verifyChecksum', () => {
  const file = path.join(temporaryPath, 'checksum-test')
  // sha256 of 'updatecli'
  const checksum =
    '46d2bc24e680f0dfeaf0bd267cd03f294b2d90e82f5cec487511400c2466d6b4'

  beforeEach(async () => {
    await fs.writeFile(file, 'updatecli')
  })

  it('should accept a matching checksum', async () => {
    await expect(verifyChecksum(file, checksum)).resolves.toBeUndefined()
  })

  it('should reject a mismatching checksum', async () => {
    await expect(verifyChecksum(file, '0'.repeat(64))).rejects.toThrow(
      /^Checksum mismatch/
    )
  })
})

describe('getVersionFromFileContent', () => {
  it('should return version from .updatecli-version file', async () => {
    const versionFile = path.join(temporaryPath, '.updatecli-version')
    const fileContent = DEFAULT_VERSION
    await fs.writeFile(versionFile, fileContent)

    const version = await getVersionFromFileContent(versionFile)
    expect(version).toBe(DEFAULT_VERSION)

    await fs.unlink(versionFile)
  })

  it('should return version from .tool-versions file', async () => {
    const versionFile = path.join(temporaryPath, '.tool-versions')
    const fileContent = 'updatecli ' + DEFAULT_VERSION
    await fs.writeFile(versionFile, fileContent)

    const version = await getVersionFromFileContent(versionFile)
    expect(version).toBe(DEFAULT_VERSION)

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
    expect(result).toBe(DEFAULT_VERSION)
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
  await fs.rm(temporaryPath, {recursive: true, force: true})
  await fs.rm(cachePath, {recursive: true, force: true})
})
