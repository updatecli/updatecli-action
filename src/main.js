import * as core from '@actions/core'
import * as tool from '@actions/tool-cache'
import * as exec from '@actions/exec'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'

const DEFAULT_VERSION = `v0.122.1`
const RELEASE_URL = 'https://github.com/updatecli/updatecli/releases/download'
// first Updatecli release publishing a checksums.txt
const FIRST_CHECKSUMS_VERSION = [0, 40, 2]

// get the Updatecli version from the action inputs
export async function getUpdatecliVersion() {
  const versionInput = core.getInput('version', {required: false})
  const versionFile = core.getInput('version-file', {required: false})

  let version = versionInput
  if (!versionInput && !versionFile) {
    core.info(`Set default value for version to ${DEFAULT_VERSION}`)
    version = DEFAULT_VERSION
  }

  if (!version && versionFile) {
    version = await getVersionFromFileContent(versionFile)
    if (!version) {
      throw new Error(`No supported version was found in file ${versionFile}`)
    }
  }
  return version
}

export async function updatecliExtract(downloadPath, downloadUrl) {
  if (downloadUrl.endsWith('.tar.gz')) {
    return tool.extractTar(downloadPath)
  }
  if (downloadUrl.endsWith('.zip')) {
    return tool.extractZip(downloadPath)
  }
  throw new Error(`Unsupported archive type: ${downloadUrl}`)
}

// whether a release predates checksums.txt; unparsable versions are treated
// as recent so that a missing checksums.txt fails instead of being skipped
export function isPreChecksumsVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version)
  if (!match) {
    return false
  }
  const parts = match.slice(1).map(Number)
  for (const [index, part] of parts.entries()) {
    if (part !== FIRST_CHECKSUMS_VERSION[index]) {
      return part < FIRST_CHECKSUMS_VERSION[index]
    }
  }
  return false
}

// get the expected sha256 of an archive from the release checksums.txt
// returns undefined only for releases older than v0.40.2, which don't publish one
export async function getExpectedChecksum(version, archive) {
  let checksumsPath
  try {
    checksumsPath = await tool.downloadTool(
      `${RELEASE_URL}/${version}/checksums.txt`
    )
  } catch (error) {
    if (
      error instanceof tool.HTTPError &&
      error.httpStatusCode === 404 &&
      isPreChecksumsVersion(version)
    ) {
      core.warning(
        `No checksums.txt published for Updatecli ${version}, skipping checksum verification`
      )
      return
    }
    throw error
  }

  const content = await fs.promises.readFile(checksumsPath, 'utf8')
  for (const line of content.split('\n')) {
    const [checksum, name] = line.trim().split(/\s+/, 2)
    // sha256sum prefixes the file name with '*' in binary mode
    if (name?.replace(/^\*/, '') === archive) {
      return checksum.toLowerCase()
    }
  }
  throw new Error(`No checksum found for ${archive} in checksums.txt`)
}

export async function verifyChecksum(filePath, expected) {
  const content = await fs.promises.readFile(filePath)
  const actual = crypto.createHash('sha256').update(content).digest('hex')
  if (actual !== expected) {
    throw new Error(
      `Checksum mismatch for ${filePath}: expected ${expected}, got ${actual}`
    )
  }
  core.info(`Checksum verified: ${actual}`)
}

// download Updatecli retrieve updatecli binary from Github Release
export async function updatecliDownload(version) {
  if (!version) {
    throw new Error(`No supported version was found`)
  }
  const updatecliPackages = [
    {arch: 'x64', platform: 'linux', archive: 'updatecli_Linux_x86_64.tar.gz'},
    {arch: 'arm64', platform: 'linux', archive: 'updatecli_Linux_arm64.tar.gz'},
    {arch: 'x64', platform: 'win32', archive: 'updatecli_Windows_x86_64.zip'},
    {arch: 'arm64', platform: 'win32', archive: 'updatecli_Windows_arm64.zip'},
    {
      arch: 'x64',
      platform: 'darwin',
      archive: 'updatecli_Darwin_x86_64.tar.gz',
    },
    {
      arch: 'arm64',
      platform: 'darwin',
      archive: 'updatecli_Darwin_arm64.tar.gz',
    },
  ]

  const updatecliPackage = updatecliPackages.find(
    x => x.platform == process.platform && x.arch == process.arch
  )
  if (!updatecliPackage) {
    throw new Error(
      `Unsupported platform ${process.platform} and arch ${process.arch}`
    )
  }

  const cachedTool = tool.find('updatecli', version, process.arch)
  if (cachedTool) {
    core.info(`Found Updatecli ${version} in the tool cache: ${cachedTool}`)
    core.addPath(cachedTool)
    return
  }

  const url = `${RELEASE_URL}/${version}/${updatecliPackage.archive}`
  core.info(`Downloading ${url}`)
  const downloadPath = await tool.downloadTool(url)

  const expectedChecksum = await getExpectedChecksum(
    version,
    updatecliPackage.archive
  )
  if (expectedChecksum) {
    await verifyChecksum(downloadPath, expectedChecksum)
  }

  core.debug(`Extracting file ${downloadPath} ...`)
  const updatecliExtractedFolder = await updatecliExtract(downloadPath, url)
  core.debug(`Extracted file to ${updatecliExtractedFolder} ...`)

  // chmod before caching: cacheDir marks the entry complete, and a cached
  // entry is reused as-is by tool.find on later runs
  if (process.platform == 'linux' || process.platform == 'darwin') {
    await exec.exec('chmod', [
      '+x',
      path.join(updatecliExtractedFolder, 'updatecli'),
    ])
  }

  core.debug('Adding to the cache ...')
  const cachedPath = await tool.cacheDir(
    updatecliExtractedFolder,
    'updatecli',
    version,
    process.arch
  )

  core.addPath(cachedPath)

  core.info(`Downloaded to ${cachedPath}`)
}

export async function updatecliVersion() {
  core.info('Show Updatecli version')
  await exec.exec('updatecli version')
}

export async function run() {
  try {
    const version = await getUpdatecliVersion()
    await updatecliDownload(version)
    await updatecliVersion()
    process.exitCode = core.ExitCode.Success
  } catch (error) {
    core.setFailed(error.message)
  }
}

export async function getVersionFromFileContent(versionFile) {
  if (!versionFile) {
    return
  }

  let versionRegExp
  const versionFileName = path.basename(versionFile)
  if (versionFileName == '.tool-versions') {
    versionRegExp = /^(updatecli\s+)(?:\S*-)?(?<version>v(\d+)(\.\d+)(\.\d+))$/m
  } else if (versionFileName) {
    versionRegExp = /(?<version>(v\d+\S*))(\s|$)/
  } else {
    return
  }

  try {
    const content = fs.readFileSync(versionFile).toString().trim()
    let fileContent = ''
    if (content.match(versionRegExp)?.groups?.version) {
      fileContent = content.match(versionRegExp)?.groups?.version
    }
    if (!fileContent) {
      return
    }
    core.debug(`Version from file '${fileContent}'`)
    return fileContent
  } catch (error) {
    if (error.code === 'ENOENT') {
      return
    }
    throw error
  }
}
