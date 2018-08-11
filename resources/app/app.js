/*
 *  _____                    _                    _
 * |  __ \                  | |                  | |
 * | |  | |  ___   ___  ____| |  ___    __ _   __| |  ___  _ __
 * | |  | | / _ \ / _ \|_  /| | / _ \  / _` | / _` | / _ \| '__|
 * | |__| ||  __/|  __/ / / | || (_) || (_| || (_| ||  __/| |
 * |_____/  \___| \___|/___||_| \___/  \__,_| \__,_| \___||_|
 *
 *
 *
 *  Maintained by ivandelabeldad <https://github.com/ivandelabeldad/>
 *  Original work by ZzMTV <https://boerse.to/members/zzmtv.3378614/>
 * */

const server = require('./server')
const fs = require('fs-extra')
const async = require('async')
const Deezer = require('./service/deezer')
const { userSettings } = require('./service/config')
const paths = require('./utils/paths')
const packageJson = fs.readJSONSync(paths.packageJson)
const logger = require('./service/logger')
const updater = require('./service/updater')
const login = require('./service/login')
const { E } = require('./utils/events')
const fileCreator = require('./service/fileCreator')
const TrackInfo = require('./model/TrackInfo')
const DownloadSettings = require('./model/DownloadSettings')
const downloadPaths = require('./service/downloadPaths')
const request = require('request-promise')

server.onConnection((socket) => {

	socket.emit(E.BACK.VERSION, packageJson.version)
	socket.downloadQueue = [];
	socket.currentItem = null;
	socket.lastQueueId = null;
	updater.check().then(status => {
		if (!status.updated) {
			socket.emit(E.BACK.NEWUPDATE, status.latestVersion, status.link)
		}
	}).catch(e => logger.error(e))

	socket.on(E.FRONT.LOGIN, (username, password, autoLoginChecked) => {
		login.login(socket, username, password, autoLoginChecked)
	})

	socket.on(E.FRONT.AUTOLOGIN, () => login.autoLogin(socket))

	socket.on(E.FRONT.LOGOUT, login.logout)

	socket.on(E.FRONT.DOWNLOADTRACK, (data) => {
		let queueId = `id${Math.random().toString(36).substring(2)}`
		Deezer.getATrack(data.id)
			.then(track => {
				let _track = {
					name: track.title,
					size: 1,
					downloaded: 0,
					failed: 0,
					queueId: queueId,
					id: track.id,
					type: "track"
				}
				if (track.version) _track.name = `${_track.name} ${track.version}`
				_track.settings = data.settings || {}
				addToQueue(_track)
			})
			.catch(e => {
				logger.error(e)
				throw new Error(e)
			})
	})

	socket.on(E.FRONT.DOWNLOADPLAYLIST, (data) => {
		Deezer.getPlaylist(data.id)
			.then(playlist => {
				logger.info(`Downloading playlist ${playlist.title}. Size: ${playlist.tracks.data.length}`)
				const size = playlist.tracks.data.length
				let queueId = `id${Math.random().toString(36).substring(2)}`;
				let _playlist = {
					name: playlist.title,
					size: size,
					downloaded: 0,
					failed: 0,
					queueId: queueId,
					id: playlist.id,
					type: 'playlist',
					tracks: playlist.tracks,
				};
				_playlist.settings = data.settings || {};
				addToQueue(_playlist);
			})
			.catch(e => {
				logger.error(e)
				throw new Error(e)
			})
	})

	socket.on(E.FRONT.DOWNLOADALBUM, (data) => {
		Deezer.getAlbum(data.id)
			.then(album => {
				let queueId = "id" + Math.random().toString(36).substring(2);
				let _album = {
					name: album["title"],
					label: album["label"],
					artist: album["artist"].name,
					size: album.tracks.data.length,
					downloaded: 0,
					failed: 0,
					queueId: queueId,
					id: album["id"],
					type: "album",
					tracks: album.tracks,
				};
				_album.settings = data.settings || {}
				addToQueue(_album)
			})
			.catch(e => {
				logger.error(e)
				throw new Error(e)
			})
	})

	socket.on(E.FRONT.DOWNLOADARTIST, (data) => {
		let artist
		Deezer.getArtist(data.id)
			.then(a => {
				artist = a
				return Deezer.getArtistAlbums(data.id)
			})
			.then(albums => {
				for (let i = 0; i < albums.data.length; i++) {
					Deezer.getAlbum(albums.data[i].id)
						.then(album => {
							let queueId = `id${Math.random().toString(36).substring(2)}`
							let _album = {
								name: album.title,
								artist: artist.name,
								size: album.tracks.data.length,
								downloaded: 0,
								failed: 0,
								queueId: queueId,
								id: album.id,
								type: 'album',
								countPerAlbum: true,
								tracks: album.tracks,
							};
							_album.settings = data.settings || {}
							addToQueue(_album);
						})
						.catch(e => {
							logger.error(e)
							throw new Error(e)
						})
				}
			})
			.catch(e => {
				logger.error(e)
				throw new Error(e)
			})
	})

	socket.on(E.FRONT.GETCHARTSCOUNTRYLIST, (data) => {
		Deezer.getChartsTopCountry()
			.then(charts => {
				let countries = [];
				for (let i = 0; i < charts.length; i++) {
					let obj = {
						country: charts[i].title.replace("Top ", ""),
						picture_small: charts[i].picture_small,
						picture_medium: charts[i].picture_medium,
						picture_big: charts[i].picture_big
					};
					countries.push(obj);
				}
				socket.emit(E.BACK.GETCHARTSCOUNTRYLIST, {
					countries: countries,
					selected: data.selected
				});
			})
			.catch(e => {
				logger.error(e)
				throw new Error(e)
			})
	})

	socket.on(E.FRONT.GETCHARTSTRACKLISTBYCOUNTRY, (data) => {
		if (!data.country) {
			socket.emit(E.BACK.GETCHARTSTRACKLISTBYCOUNTRY, {
				err: "No country passed"
			});
			return;
		}

		let charts
		let countries = []
		Deezer.getChartsTopCountry()
			.then(c => {
				charts = c
				for (let i = 0; i < charts.length; i++) {
					countries.push(charts[i].title.replace("Top ", ""));
				}
				if (countries.indexOf(data.country) == -1) {
					socket.emit(E.BACK.GETCHARTSTRACKLISTBYCOUNTRY, {
						err: "Country not found"
					});
					return;
				}
				let playlistId = charts[countries.indexOf(data.country)].id;
				return Deezer.getPlaylist(playlistId)
			})
			.then(playlist => {
				socket.emit(E.BACK.GETCHARTSTRACKLISTBYCOUNTRY, {
					playlist: charts[countries.indexOf(data.country)],
					tracks: playlist.tracks.data
				})
			})
			.catch(e => {
				logger.error(e)
				socket.emit(E.BACK.GETCHARTSTRACKLISTBYCOUNTRY, { error: e })
			})
	})

	socket.on(E.FRONT.MYPLAYLISTS, () => {
		Deezer.getMyPlaylists()
			.then(searchObject => {
				socket.emit(E.BACK.MYPLAYLISTS, searchObject.data)
			})
			.catch(e => logger.error(e))
	})

	socket.on(E.FRONT.SEARCH, (data) => {
		Deezer.search(encodeURIComponent(data.text), data.type)
			.then(searchObject => {
				socket.emit(E.BACK.SEARCH, {
					type: data.type,
					items: searchObject.data
				})
			})
			.catch(e => {
				logger.error(e)
				socket.emit(E.BACK.SEARCH, {
					type: data.type,
					items: []
				})
			})
	})

	socket.on(E.FRONT.GETTRACKLIST, (data) => {
		switch(data.type) {
			case 'artist':
				Deezer.getArtistAlbums(data.id)
					.then(albums => {
						socket.emit(E.BACK.GETTRACKLIST, {
							response: albums,
							id: data.id,
							reqType: data.type
						})
					})
					.catch(e => {
						logger.error(e)
						socket.emit(E.BACK.GETTRACKLIST, {
							err: 'wrong id',
							response: {},
							id: data.id,
							reqType: data.type
						})
					})
				break;
			case 'album':
			Deezer.getAlbum(data.id)
					.then(album => {
						socket.emit(E.BACK.GETTRACKLIST, {
							response: album.tracks,
							id: data.id,
							reqType: data.type
						})
					})
					.catch(e => {
						logger.error(e)
						socket.emit(E.BACK.GETTRACKLIST, {
							err: 'wrong id',
							response: {},
							id: data.id,
							reqType: data.type
						})
					})
				break;
			case 'playlist':
				Deezer.getPlaylist(data.id)
					.then(playlist => {
						socket.emit(E.BACK.GETTRACKLIST, {
							response: playlist.tracks,
							id: data.id,
							reqType: data.type
						})
					})
					.catch(e => {
						logger.error(e)
						socket.emit(E.BACK.GETTRACKLIST, {
							err: 'wrong id',
							response: {},
							id: data.id,
							reqType: data.type
						})
					})
				break;
			default:
				logger.error(`Cannot get track list of type ${data.type}`)
				socket.emit(E.BACK.GETTRACKLIST, {
					err: `Cannot get track list of type ${data.type}`
				})
		}
	})

	socket.on(E.FRONT.CANCELDOWNLOAD, (data) => {
		if (!data.queueId) {
			return
		}

		let cancel = false
		let cancelSuccess

		for (let i = 0; i < socket.downloadQueue.length; i++) {
			if (data.queueId == socket.downloadQueue[i].queueId) {
				socket.downloadQueue.splice(i, 1)
				i--
				cancel = true
			}
		}

		if (socket.currentItem && socket.currentItem.queueId == data.queueId) {
			cancelSuccess = Deezer.cancelDecryptTrack()
			cancel = cancel || cancelSuccess
		}

		if (cancelSuccess && socket.currentItem) {
			socket.currentItem.cancelFlag = true
		}
		if (cancel) {
			socket.emit(E.BACK.CANCELDOWNLOAD, { queueId: data.queueId })
		}
	})

	socket.on(E.FRONT.GETUSERSETTINGS, () => {
		let settings = userSettings.read()
		socket.emit(E.BACK.GETUSERSETTINGS, { settings })
	})

	socket.on(E.FRONT.SAVESETTINGS, userSettings.update)

	function addToQueue(object) {
		socket.downloadQueue.push(object);
		socket.emit(E.BACK.ADDTOQUEUE, object);

		queueDownload(getNextDownload());
	}

	function getNextDownload() {
		if (socket.currentItem != null || socket.downloadQueue.length == 0) {
			if (socket.downloadQueue.length == 0 && socket.currentItem == null) {
				socket.emit(E.BACK.EMPTYDOWNLOADQUEUE, {});
				// socket.emit('playmusic', 'D:\\Music\\Deezer\\Serenity - Wings of Madness.mp3') // PLAYER
			}
			return null;
		}
		socket.currentItem = socket.downloadQueue[0];
		return socket.currentItem;
	}

	//currentItem: the current item being downloaded at that moment such as a track or an album
	//downloadQueue: the tracks in the queue to be downloaded
	//lastQueueId: the most recent queueID
	//queueId: random number generated when user clicks download on something
	function queueDownload(downloading) {
		if (!downloading) return;

		// New batch emits new message
		if (socket.lastQueueId != downloading.queueId) {
			socket.emit(E.BACK.DOWNLOADSTARTED, {
				queueId: downloading.queueId
			});
			socket.lastQueueId = downloading.queueId;
		}

		if (downloading.type == "track") {
			logger.info(`Registered a track: ${downloading.id}.`)
			downloadTrack([downloading.id, 0], new DownloadSettings(), function (err) {
				if (err) {
					downloading.failed++;
				} else {
					downloading.downloaded++;
				}
				socket.emit(E.BACK.UPDATEQUEUE, downloading);
				if (socket.downloadQueue[0] && (socket.downloadQueue[0].queueId == downloading.queueId)) {
					socket.downloadQueue.shift();
				}
				socket.currentItem = null;
				queueDownload(getNextDownload());
			});
		} else if (downloading.type == "playlist") {
			logger.info(`Registered a playlist: ${downloading.id}.`)

			const afterEach = (err) => {
				logger.info(`Playlist finished ${downloading.name}.`)
				if (typeof socket.downloadQueue[0] != 'undefined') {
					socket.emit(E.BACK.DOWNLOADPROGRESS, {
						queueId: socket.downloadQueue[0].queueId,
						percentage: 100
					})
				}
				if (downloading && socket.downloadQueue[0] && socket.downloadQueue[0].queueId == downloading.queueId) socket.downloadQueue.shift()
				socket.currentItem = null
				queueDownload(getNextDownload())
			}

			downloading.playlistContent = downloading.tracks.data.map((t) => {
				if (t.FALLBACK && t.FALLBACK.SNG_ID) {
					return [t.id, t.FALLBACK.SNG_ID]
				}
				return [t.id, 0]
			})
			async.eachSeries(downloading.playlistContent, function (id, callback) {
				if (downloading.cancelFlag) {
					logger.info(`Stopping the playlist queue.`)
					callback('stop')
					return;
				}
				const downloadSettings = new DownloadSettings({
					playlist: {
						name: downloading.name,
						position: downloading.playlistContent.indexOf(id) + 1,
						size: downloading.playlistContent.length,
					}
				})
				logger.info(`Starting download of: ${id}.`)
				downloadTrack(id, downloadSettings, function (err) {
					if (!err) {
						downloading.downloaded++
					} else {
						downloading.failed++
					}
					socket.emit(E.BACK.UPDATEQUEUE, downloading)
					callback()
				});
			}, afterEach)

		} else if (downloading.type == "album") {
			logger.info(`Registered an album: ${downloading.id}.`)

			downloading.albumContent = downloading.tracks.data.map((t) => {
				if (t.FALLBACK && t.FALLBACK.SNG_ID) {
					return [t.id, t.FALLBACK.SNG_ID]
				}
				return [t.id, 0]
			})

			async.eachSeries(downloading.albumContent, function (id, callback) {
				if (downloading.cancelFlag) {
					logger.info('Stopping the album queue.')
					callback('')
					return
				}
				const downloadSettings = new DownloadSettings({
					album: {
						name: downloading.name,
						artist: downloading.artist,
						position: downloading.albumContent.indexOf(id) + 1,
						size: downloading.albumContent.length,
					}
				})
				downloadTrack(id, downloadSettings, function (err) {
					if (!err) {
						downloading.downloaded++
					} else {
						downloading.failed++
					}
					socket.emit(E.BACK.UPDATEQUEUE, downloading)
					callback()
				});
			}, function (err) {
				if (downloading.countPerAlbum) {
					if (socket.downloadQueue.length > 1 && socket.downloadQueue[1].queueId == downloading.queueId) {
						socket.downloadQueue[1].download = downloading.downloaded;
					}
					socket.emit(E.BACK.UPDATEQUEUE, downloading)
				}
				logger.info(`Album finished: ${downloading.name}.`)
				if (typeof socket.downloadQueue[0] != 'undefined') {
					socket.emit(E.BACK.DOWNLOADPROGRESS, {
						queueId: socket.downloadQueue[0].queueId,
						percentage: 100
					})
				}
				if (downloading && socket.downloadQueue[0] && socket.downloadQueue[0].queueId == downloading.queueId) socket.downloadQueue.shift()
				socket.currentItem = null
				queueDownload(getNextDownload())
			})

		}
	}

	// NEED DOWNLOAD SETTINGS WHEN DOWNLOADING A PLAYLIST FOR EXAMPLE
	/**
	 *
	 * @param {*} id
	 * @param {DownloadSettings} downloadSettings
	 * @param {*} callback
	 */
	function downloadTrack(id, downloadSettings, callback) {
		const settings = userSettings.read()
		logger.info('Getting track data.')

		Deezer.getTrack(id[0])
			.then(track => {
				track.trackSocket = socket;
				let trackInfo = new TrackInfo(track)
				if (downloadSettings.isAlbum()) {
					trackInfo.position = downloadSettings.album.position
				}
				if (downloadSettings.isPlaylist()) {
					trackInfo.position = downloadSettings.playlist.position
				}

				const filename = downloadPaths.getFilename(trackInfo, downloadSettings)
				const downloadFolder = downloadPaths.getDownloadFolder(trackInfo, downloadSettings)
				const downloadFilePath = downloadPaths.getDownloadFilePath(trackInfo, downloadSettings)

				// DOWNLOAD LYRICS
				if (trackInfo.lyricsSyncJSON && settings.syncedlyrics) {
					const lyricsPath = downloadPaths.lyricsPath(trackInfo, downloadSettings)
					fileCreator.lyrics(trackInfo, lyricsPath)
				}

				logger.info(`Downloading file to: ${downloadFilePath}.`)
				if (fs.existsSync(downloadFilePath)) {
					logger.info(`Already downloaded: ${trackInfo.artist} - ${trackInfo.title}.`)
					callback();
					return;
				}


				// ADD IMAGE
				const imageService = require('./service/imageService')
				imageService.downloadImage(trackInfo, downloadFilePath, condownload)


				function condownload() {
					logger.info('Starting the download process.')
					var tempPath = downloadFilePath + ".temp";
					logger.info('Downloading and decrypting.')

					Deezer.decryptTrack(tempPath, track)
						.then(() => {
							// ADD M3U
							if (settings.createM3UFile && downloadSettings.isPlaylist()) {
								fs.appendFileSync(downloadFolder + "playlist.m3u", `${filename}\r\n`)
							}
							logger.info(`Downloaded: ${trackInfo.artist} - ${trackInfo.title}.`)
							trackInfo.artist = '';
							var first = true;
							track['ARTISTS'].forEach(function (artist) {
								if (first) {
									trackInfo.artist = artist['ART_NAME'];
									first = false;
								} else {
									if (trackInfo.artist.indexOf(artist['ART_NAME']) == -1)
										trackInfo.artist += ', ' + artist['ART_NAME'];
								}
							});

							// CALL FILECREATOR
							fileCreator.track(trackInfo, tempPath, downloadFilePath)
							callback()
						})
						.catch(err => {
							if (err.message == 'aborted') {
								socket.currentItem.cancelFlag = true
								logger.info('Track got aborted.')
								return callback()
							}
							Deezer.hasTrackAlternative(id[0])
								.then(alternative => {
									if (!alternative) throw new Error(`Failed to download: ${trackInfo.artist} - ${trackInfo.title}.`)
									logger.warn(`Failed to downloaded: ${trackInfo.artist} - ${trackInfo.title}, falling on alternative.`)
									downloadTrack([alternative.SNG_ID, 0], undefined, callback)
								})
								.catch(e => {
									logger.warn(`Failed to downloaded: ${trackInfo.artist} - ${trackInfo.title}.`)
									callback(e)
								})
						})

				}
			})
			.catch(err => {
				if (id[1] == 0) {
					logger.error('Failed to download track.')
					return callback(err)
				}
				logger.warn('Failed to download track, falling on alternative.')
				downloadTrack([id[1], 0], undefined, function (err) {
					callback(err)
				})
			})

	}

})

// Show crash error in console for debugging
process.on('uncaughtException', function (err) {
	logger.error(`${err.stack}.`)
})

// Exporting vars
module.exports.defaultSettings = userSettings.read()
module.exports.defaultDownloadDir = paths.defaultDownload
