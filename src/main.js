import core from '@actions/core'
import tool from '@actions/tool-cache'
import exec from '@actions/exec'
import path from 'node:path'

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
export async function updatecliDownload() {
  const version = core.getInput('version')

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

  try {
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
  } catch (error) {
    core.setFailed(error.message)
  }
}

export async function updatecliVersion() {
  try {
    core.info('Show Updatecli version')
    await exec.exec('updatecli version')
  } catch (error) {
    core.setFailed(error.message)
  }
}

export async function run() {
  await updatecliDownload()
  await updatecliVersion()
}
