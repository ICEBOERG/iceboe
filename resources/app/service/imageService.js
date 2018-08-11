const logger = require('./logger')
const request = require('requestretry').defaults({maxAttempts: 5000, retryDelay: 1000, timeout: 8000})
const fs = require('fs-extra')
const paths = require('../utils/paths')
const { userSettings } = require('./config')
const { fixName } = require('../utils/helpers')

function downloadImage(trackInfo, downloadPath, condownload) {
  const settings = userSettings.read()
  // guessing
  const filepath = downloadPath

  //Get image
  if (trackInfo.image) {
    let imgPath
    //If its not from an album but a playlist.
    if (!settings.tagPosition && !settings.createAlbumFolder) {
      imgPath = paths.tmp + fixName(trackInfo.isrc) + '.jpg'
    } else {
      imgPath = `${filepath}folder.jpg`;
    }
    if (fs.existsSync(imgPath) && imgPath.indexOf(paths.tmp) === -1) {
      trackInfo.imagePath = (imgPath).replace(/\\/g, "/");
      logger.info(`Starting the download process CODE:1.`)
      condownload();
    } else {
      request.get(trackInfo.image, { encoding: 'binary' })
        .then(res =>  fs.outputFile(imgPath, res.body, { encoding: 'binary' }))
        .then(() => {
          trackInfo.imagePath = (imgPath).replace(/\\/g, "/")
          logger.info('Image found.')
          condownload()
        })
        .catch(err => {
          logger.error(`${err.stack}.`)
          trackInfo.image = undefined
          trackInfo.imagePath = undefined
        })

    }
  } else {
    logger.info('Image not found.')
    trackInfo.image = undefined
  }
}

module.exports = {
  downloadImage
}
