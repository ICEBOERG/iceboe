const {userSettings} = require('./config')
const {fixName, settingsRegex, antiDot, settingsRegexAlbum} = require('../utils/helpers')
const TrackInfo = require('../model/TrackInfo')
const DownloadSettings = require('../model/DownloadSettings')
const path = require('path')

/**
 *
 * @param {TrackInfo} trackInfo
 * @param {DownloadSettings} downloadSettings
 */
const getDownloadFilePath = (trackInfo, downloadSettings) => {
  return path.join(getDownloadFolder(trackInfo, downloadSettings), getFilename(trackInfo, downloadSettings))
}

/**
 *
 * @param {TrackInfo} trackInfo
 * @param {DownloadSettings} downloadSettings
 */
const tempPath = (trackInfo, downloadSettings) => {
  return path.join(getDownloadFolder(trackInfo, downloadSettings), getFilename(trackInfo, downloadSettings))
}

/**
 *
 * @param {TrackInfo} trackInfo
 * @param {DownloadSettings} downloadSettings
 */
const coverPath = (trackInfo, downloadSettings) => {
  return path.join(getDownloadFolder(trackInfo, downloadSettings), getFilename(trackInfo, downloadSettings))
}

/**
 *
 * @param {TrackInfo} trackInfo
 * @param {DownloadSettings} downloadSettings
 */
const lyricsPath = (trackInfo, downloadSettings) => {
  let downloadPath = getDownloadFilePath(trackInfo, downloadSettings)
  if (trackInfo.isFlac()) {
    return downloadPath.substring(0, downloadPath.length - 5) + ".lrc"
  } else {
    return downloadPath.substring(0, downloadPath.length - 4) + ".lrc"
  }
}

/**
 *
 * @param {TrackInfo} trackInfo
 * @param {DownloadSettings} downloadSettings
 */
const getDownloadFolder = (trackInfo, downloadSettings) => {
  const settings = userSettings.read()

  let downloadFolderPath = userSettings.read().downloadLocation + path.sep;
  if (downloadSettings.isPlaylist()) {
    downloadFolderPath += antiDot(fixName(downloadSettings.playlist.name)) + path.sep;
  }
  if (settings.createArtistFolder) {
    downloadFolderPath += antiDot(fixName(trackInfo.artist)) + path.sep;
  }
  if (settings.createAlbumFolder) {
    if (downloadSettings.isAlbum()) {
      downloadFolderPath += antiDot(fixName(settingsRegexAlbum(trackInfo, settings.albumNameTemplate, downloadSettings.album.artist, downloadSettings.album.name))) + path.sep;
    } else {
      downloadFolderPath += antiDot(fixName(settingsRegexAlbum(trackInfo, settings.foldername, trackInfo.artist, trackInfo.album))) + path.sep;
    }
  }
  if (downloadSettings.isAlbum() && !(settings.createArtistFolder || settings.createAlbumFolder)) {
    downloadFolderPath += antiDot(fixName(settingsRegexAlbum(trackInfo, settings.albumNameTemplate, downloadSettings.album.artist, downloadSettings.album.name))) + path.sep;
  }
  return downloadFolderPath
}

/**
 *
 * @param {TrackInfo} trackInfo
 * @param {DownloadSettings} downloadSettings
 */
const getFilename = (trackInfo, downloadSettings) => {
  const settings = userSettings.read()
  let fileName = fixName(`${trackInfo.artist} - ${trackInfo.title}`);
  if (downloadSettings.isAlbum()) {
    fileName = fixName(settingsRegex(trackInfo, settings.playlistTrackNameTemplate))
  } else if (downloadSettings.isPlaylist()) {
    fileName = fixName(settingsRegex(trackInfo, settings.playlistTrackNameTemplate))
  } else {
    fileName = fixName(settingsRegex(trackInfo, settings.trackNameTemplate))
  }
  //
  if (trackInfo.isFlac()) {
    fileName += '.flac'
  } else {
    fileName += '.mp3'
  }
  return fileName
}

module.exports = { getDownloadFilePath, getDownloadFolder, tempPath, coverPath, lyricsPath, getFilename }
