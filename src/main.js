import core from '@actions/core'
import tool from '@actions/tool-cache'
import exec from '@actions/exec'
import path from 'node:path'
import fs from 'node:fs'

const DEFAULT_VERSION = `v0.86.1`

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
  } else if (downloadUrl.endsWith('.zip')) {
    return tool.extractZip(downloadPath)
  } else {
    throw new Error(`Unsupported archive type: ${downloadUrl}`)
  }
}

// download Updatecli retrieve updatecli binary from Github Release
export async function updatecliDownload(version) {
  if (!version) {
    throw new Error(`No supported version was found`)
  }
  const updatecliPackages = [
    {
      arch: 'x64',
      platform: 'linux',
      url: `https://github.com/updatecli/updatecli/releases/download/${version}/updatecli_Linux_x86_64.tar.gz`,
    },
    {
      arch: 'arm64',
      platform: 'linux',
      url: `https://github.com/updatecli/updatecli/releases/download/${version}/updatecli_Linux_arm64.tar.gz`,
    },
    {
      arch: 'x64',
      platform: 'win32',
      url: `https://github.com/updatecli/updatecli/releases/download/${version}/updatecli_Windows_x86_64.zip`,
    },
    {
      arch: 'arm64',
      platform: 'win32',
      url: `https://github.com/updatecli/updatecli/releases/download/${version}/updatecli_Windows_arm64.zip`,
    },
    {
      arch: 'x64',
      platform: 'darwin',
      url: `https://github.com/updatecli/updatecli/releases/download/${version}/updatecli_Darwin_x86_64.tar.gz`,
    },
    {
      arch: 'arm64',
      platform: 'darwin',
      url: `https://github.com/updatecli/updatecli/releases/download/${version}/updatecli_Darwin_arm64.tar.gz`,
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

  core.info(`Downloading ${updatecliPackage.url}`)
  const downloadPath = await tool.downloadTool(updatecliPackage.url)

  core.debug(`Extracting file ${downloadPath} ...`)
  const updatecliExtractedFolder = await updatecliExtract(
    downloadPath,
    updatecliPackage.url
  )
  core.debug(`Extracted file to ${updatecliExtractedFolder} ...`)

  core.debug('Adding to the cache ...')
  const cachedPath = await tool.cacheDir(
    updatecliExtractedFolder,
    'updatecli',
    version,
    process.arch
  )

  if (process.platform == 'linux' || process.platform == 'darwin') {
    await exec.exec('chmod', ['+x', path.join(cachedPath, 'updatecli')])
  }

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
