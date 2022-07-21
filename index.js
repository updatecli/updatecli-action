const core = require('@actions/core')
const tool = require('@actions/tool-cache')
const exec = require('@actions/exec')
const path = require('path')

const version = core.getInput('version')

async function extractUpdatecli(downloadPath) {
  if (process.platform == 'win32') {
    return tool.extractZip(downloadPath, undefined)
  } else if (process.platform == 'darwin') {
    return tool.extractXar(downloadPath, undefined)
  } else if (process.platform == 'linux') {
    return tool.extractTar(downloadPath, undefined)
  } else {
    throw new Error(`Unsupported platform: ${process.platform}`)
  }
}

// download Updatecli retrieve updatecli binary from Github Release
async function updatecliDownload() {
  const updatecliPackages = [
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
  ]

  try {
    const platform = process.platform
    const arch = process.arch

    const updatecliPackage = updatecliPackages.find(
      x => x.platform === platform && x.arch === arch
    )
    if (!updatecliPackage) {
      throw new Error(`Unsupported platform ${platform} and arch ${arch}`)
    }

    core.info(`Downloading ${updatecliPackage.url}`)
    const downloadPath = await tool.downloadTool(updatecliPackage.url)

    core.debug(`Extracting file ${downloadPath} ...`)
    const updatecliExtractedFolder = await extractUpdatecli(downloadPath)
    core.debug(`Extracted file to ${updatecliExtractedFolder} ...`)

    core.debug('Adding to the cache ...')
    const cachedPath = await tool.cacheDir(
      updatecliExtractedFolder,
      'updatecli',
      version,
      platform == 'linux' ? arch : undefined
    )

    if (platform == 'linux' || platform == 'darwin') {
      await exec.exec('chmod', ['+x', path.join(cachedPath, 'updatecli')])
    }

    core.addPath(cachedPath)

    core.info(`Downloaded to ${cachedPath}`)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function updatecliVersion() {
  try {
    core.info('Show Updatecli version')
    const updatecliDirectory = tool.find('updatecli', version, process.arch)
    core.addPath(updatecliDirectory)
    await exec.exec('updatecli version')
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function run() {
  await updatecliDownload()
  await updatecliVersion()
  process.exit(0)
}

run()
