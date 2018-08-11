// const NRrequest = require('request');
const request = require('requestretry').defaults({maxAttempts: 5000, retryDelay: 1000, timeout: 8000})
const crypto = require('crypto')
const fs = require('fs-extra')
const { userSettings } = require('./config')
const logger = require('./logger')

class Deezer {
  constructor() {
    this.userId = null
    this.apiUrl = 'http://www.deezer.com/ajax/gw-light.php'
    this.apiQueries = {
      api_version: '1.0',
      api_token: 'null',
      input: '3'
    }
    this.httpHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.75 Safari/537.36',
      'Content-Language': 'en-US',
      'Cache-Control': 'max-age=0',
      'Accept': '*/*',
      'Accept-Charset': 'utf-8,ISO-8859-1;q=0.7,*;q=0.3',
      'Accept-Language': 'de-DE,de;q=0.8,en-US;q=0.6,en;q=0.4'
    }
    this.albumPicturesHost = 'https://e-cdns-images.dzcdn.net/images/cover/'
    this.reqStream = null
	}
	init(username, password) {
		 return init(username, password)
	}
	getMyPlaylists() {
		return getJSON(`https://api.deezer.com/user/${deezer.userId}/playlists?limit=-1`)
	}
	getPlaylist(id) {
		return getJSON(`https://api.deezer.com/playlist/${id}?limit=-1`)
	}
	getAlbum(id) {
		return getJSON(`https://api.deezer.com/album/${id}?limit=-1`)
	}
	getArtist(id) {
		return getJSON(`https://api.deezer.com/artist/${id}`)
	}
	getArtistAlbums(id) {
		return getJSON(`https://api.deezer.com/artist/${id}/albums?limit=-1`)
	}
	getTrack(id) {
		return getTrack(id)
	}
	getATrack(id) {
		return getJSON(`https://api.deezer.com/track/${id}`)
	}
	getChartsTopCountry() {
		return getJSON('https://api.deezer.com/user/637006841/playlists?limit=-1')
		.then(res => res.data)
		.then(data => {
			if (!data) return []
			data.shift()
			return data
		})
	}
	hasTrackAlternative(id) {
		return hasTrackAlternative(id)
	}
	search(text, type) {
		return search(text, type)
	}
	decryptTrack(writePath, track) {
		return decryptTrack(writePath, track)
	}
	cancelDecryptTrack() {
		return cancelDecryptTrack()
	}
	onDownloadProgress(track, progress) {
		return onDownloadProgress(track, progress)
	}
}

const deezer = new Deezer()

const init = async (username, password) => {
	let checkFormLogin = ''
	try {
		const res = await request.get({
			url: deezer.apiUrl,
			headers: deezer.httpHeaders,
			qs: {
				...deezer.apiQueries,
				method: 'deezer.getUserData'
			},
			json: true,
			jar: true,
		})
		checkFormLogin = res.body.results.checkFormLogin
		logger.info(`New token API fetched from Deezer.`)
		deezer.apiQueries.api_token = res.body.results.checkForm
	} catch (err) {
		throw err
	}
	try {
		const res = await request.post({
			url: 'https://www.deezer.com/ajax/action.php',
			headers: deezer.httpHeaders,
			form: {
				type: 'login',
				mail: username,
				password,
				checkFormLogin
			},
			jar: true,
		})
		if (res.statusCode !== 200) throw new Error('Unable to load deezer.com.')
		if (res.body.indexOf('success') == -1) throw new Error('Incorrect email or password.')
		const userIdRes = await request.get({
			url: deezer.apiUrl,
			headers: deezer.httpHeaders,
			qs: {
				...deezer.apiQueries,
				method: 'deezer.getUserData'
			},
			json: true,
			jar: true,
		})
		deezer.userId = userIdRes.body.results.USER.USER_ID
		logger.info(`User id: ${deezer.userId}`)
		return
	} catch (err) {
		throw err
	}
}

function getTrackFormat(json) {
	var format;
	if(userSettings.read().hifi && json['FILESIZE_FLAC'] > 0){
		format = 9;
	} else {
		format = 3;
		if (json['FILESIZE_MP3_320'] <= 0) {
			if (json['FILESIZE_MP3_256'] > 0) {
				format = 5
			} else {
				format = 1
			}
		}
	}
	return format
}

const getTrack = async (id) => {
	var scopedid = id;
	try {
		const res = await request.get({url: `https://www.deezer.com/track/${id}`, headers: deezer.httpHeaders, jar: true})
		var regex = new RegExp(/<script>window\.__DZR_APP_STATE__ = (.*)<\/script>/g);
		var rexec = regex.exec(res.body);
		var _data;
		try {
			_data = rexec[1];
		} catch(e) {
			if (deezer.apiQueries.api_token == 'null') throw new Error('Unable to get Track')
			try {
				return getTrackAlternative(scopedid)
			} catch (err) {
				throw err
			}
		}
		if (res.statusCode != 200 || typeof JSON.parse(_data)['DATA'] == 'undefined') {
			throw new Error(`Unable to get Track ${id}`)
		}
		var json = JSON.parse(_data)['DATA'];
		var lyrics = JSON.parse(_data)['LYRICS'];
		if (lyrics) {
			json['LYRICS_TEXT'] = lyrics['LYRICS_TEXT'];
			json['LYRICS_SYNC_JSON'] = lyrics['LYRICS_SYNC_JSON'];
			json['LYRICS_COPYRIGHTS'] = lyrics['LYRICS_COPYRIGHTS'];
			json['LYRICS_WRITERS'] = lyrics['LYRICS_WRITERS'];
		}
		if(json['TOKEN']) {
			throw new Error('Uploaded Files are currently not supported')
		}
		var id = json['SNG_ID'];
		var md5Origin = json['MD5_ORIGIN'];
		json.format = getTrackFormat(json)
		var mediaVersion = parseInt(json['MEDIA_VERSION']);
		json.downloadUrl = getDownloadUrl(md5Origin, id, json.format, mediaVersion);
		return json
	} catch (err) {
		throw err
	}
}

const getTrackAlternative = async (id) => {
	try {
		const res = await request.post({
			url: deezer.apiUrl,
			headers: deezer.httpHeaders,
			qs: deezer.apiQueries,
			body: "[{\"method\":\"song.getListData\",\"params\":{\"sng_ids\":[" + id + "]}}]",
			jar: true
		})
		if (res.statusCode != 200) throw new Error(`Unable to get Track ${id}. Status code ${res.statusCode}`)
		if (!JSON.parse(res.body)[0].results) throw new Error('Unable to get Track. No Results.')
		const json = JSON.parse(res.body)[0].results.data[0];
		if (json.TOKEN) throw new Error('Uploaded Files are currently not supported')

		fs.writeFileSync('catchResponse.html', res.body)
		var id = json['SNG_ID'];
		var md5Origin = json['MD5_ORIGIN'];
		json.format = getTrackFormat(json)
		var mediaVersion = parseInt(json['MEDIA_VERSION']);
		json.downloadUrl = getDownloadUrl(md5Origin, id, json.format, mediaVersion);
		return json
	} catch (err) {
		throw err
	}
}

const search = (text, type) => {
	return request.get({
		url: `https://api.deezer.com/search/${type}?q=${text}`,
		headers: deezer.httpHeaders,
		jar: true,
	})
		.then(res => {
			if (res.statusCode !== 200) throw new Error('Unable to reach Deezer API')
			return res
		})
		.then(res => res.body)
		.then(body => JSON.parse(body))
		.then(json => {
			if (json.error) new Error('Wrong search type/text: ' + text)
			return json
		})
}

const hasTrackAlternative = (id) => {
	return request.get({
		url: `https://www.deezer.com/track/${id}`,
		headers: deezer.httpHeaders,
		jar: true,
	})
		.then(res => {
			if (res.statusCode !== 200) throw new Error(`Unable to get track: ${scopedid}. Status code ${res.statusCode}`)
			return res.body
		})
		.then(body => {
			const regex = new RegExp(/<script>window\.__DZR_APP_STATE__ = (.*)<\/script>/g)
			const rexec = regex.exec(body)
			if (rexec.length <= 1) throw new Error(`Unable to get Track ${scopedid}. No content.`)
			return rexec
		})
		.then(data => JSON.parse(data)['DATA'])
		.then(json => {
			if (!json.FALLBACK) throw new Error(`Unable to get Track ${scopedid}. No Fallback.`)
			return json.FALLBACK
		})
}

const decryptTrack = async (writePath, track) => {
	var chunkLength = 0;
	try {
		const req = request.get({
			url: track.downloadUrl,
			headers: deezer.httpHeaders,
			jar: true,
			encoding: null
		})
		deezer.reqStream = req.on('data', (data) => {
			chunkLength += data.length
			deezer.onDownloadProgress(track, chunkLength)
		}).on('abort', () => {
			logger.error('Decryption aborted.')
			throw new Error('aborted')
		})
		const res = await req
		var decryptedSource = decryptDownload(res.body, track)
		await fs.outputFile(writePath, decryptedSource)
	} catch (err) {
		logger.error(err)
		return err
	}
}

const decryptTrack2 = function(writePath, track, callback) {
	var chunkLength = 0;
	deezer.reqStream = request.get({url: track.downloadUrl, headers: deezer.httpHeaders, jar: true, encoding: null}, function(err, res, body) {
		if(!err && res.statusCode == 200) {
			var decryptedSource = decryptDownload(new Buffer(body, 'binary'), track);
			fs.outputFile(writePath,decryptedSource,function(err){
				if(err){callback(err);return;}
				callback();
			});
		} else {
			logger.error('Decryption error.')
			callback(err || new Error(`Can't download the track`));
		}
	}).on('data', function(data) {
		chunkLength += data.length;
		deezer.onDownloadProgress(track, chunkLength);
	}).on('abort', function() {
		logger.error('Decryption aborted.')
		callback(new Error('aborted'));
	});
}

const cancelDecryptTrack = function() {
	if(deezer.reqStream) {
		deezer.reqStream.abort();
		deezer.reqStream = null;
		return true;
	} else {
		false;
	}
}

const onDownloadProgress = function (track, progress) {
	if (!track.trackSocket) {
		return;
	}
	if (track.trackSocket.currentItem.type == "track") {
		let complete;
		if (!track.trackSocket.currentItem.percentage) {
			track.trackSocket.currentItem.percentage = 0;
		}
		if (userSettings.read().hifi) {
			complete = track.FILESIZE_FLAC;
		} else {
			if (track.FILESIZE_MP3_320) {
				complete = track.FILESIZE_MP3_320;
			} else if (track.FILESIZE_MP3_256) {
				complete = track.FILESIZE_MP3_256;
			} else {
				complete = track.FILESIZE_MP3_128 || 0;
			}
		}

		let percentage = (progress / complete) * 100;

		if ((percentage - track.trackSocket.currentItem.percentage > 1) || (progress == complete)) {
			track.trackSocket.currentItem.percentage = percentage;
			track.trackSocket.emit("downloadProgress", {
				queueId: track.trackSocket.currentItem.queueId,
				percentage: track.trackSocket.currentItem.percentage
			});
		}
	} else if (track.trackSocket.currentItem.type == "album") {
		let numTracks = track.trackSocket.currentItem.size;
		let downloaded = track.trackSocket.currentItem.downloaded;

		let percentage = (downloaded / (numTracks)) * 100;
		track.trackSocket.emit("downloadProgress", {
			queueId: track.trackSocket.currentItem.queueId,
			percentage: percentage
		});
	}
}

function decryptDownload(source, track) {
	var chunk_size = 2048;
	var part_size = 0x1800;
	var blowFishKey = getBlowfishKey(track['SNG_ID']);
	var i = 0;
	var position = 0;

	var destBuffer = new Buffer(source.length);
	destBuffer.fill(0);

	while(position < source.length) {
		var chunk;
		if ((source.length - position) >= 2048) {
			chunk_size = 2048;
		} else {
			chunk_size = source.length - position;
		}
		chunk = new Buffer(chunk_size);
		let chunkString
		chunk.fill(0);
		source.copy(chunk, 0, position, position + chunk_size);
		if(i % 3 > 0 || chunk_size < 2048){
			chunkString = chunk.toString('binary')
		}else{
			var cipher = crypto.createDecipheriv('bf-cbc', blowFishKey, new Buffer([0, 1, 2, 3, 4, 5, 6, 7]));
			cipher.setAutoPadding(false);
			chunkString = cipher.update(chunk, 'binary', 'binary') + cipher.final()
		}
		destBuffer.write(chunkString, position, chunkString.length, 'binary');
		position += chunk_size
		i++;
	}
	return destBuffer;
}

function getDownloadUrl(md5Origin, id, format, mediaVersion) {
	var urlPart = md5Origin + '¤' + format + '¤' + id + '¤' + mediaVersion;
	var md5sum = crypto.createHash('md5');
	md5sum.update(new Buffer(urlPart, 'binary'));
	let md5val = md5sum.digest('hex');
	urlPart = md5val + '¤' + urlPart + '¤';
	var cipher = crypto.createCipheriv('aes-128-ecb', new Buffer('jo6aey6haid2Teih'), new Buffer(''));
	var buffer = Buffer.concat([cipher.update(urlPart, 'binary'), cipher.final()]);
	return 'https://e-cdns-proxy-' + md5Origin.substring(0, 1) + '.dzcdn.net/mobile/1/' + buffer.toString('hex').toLowerCase();
}

function getBlowfishKey(trackInfos) {
	const SECRET = 'g4el58wc0zvf9na1';

	const idMd5 = crypto.createHash('md5').update(trackInfos.toString(), 'ascii').digest('hex');
	let bfKey = '';

	for (let i = 0; i < 16; i++) {
		bfKey += String.fromCharCode(idMd5.charCodeAt(i) ^ idMd5.charCodeAt(i + 16) ^ SECRET.charCodeAt(i));
	}

	return bfKey;
}

async function getJSON(url) {
	const res = await request.get({
		url: url,
		headers: deezer.httpHeaders,
		jar: true,
	})
	if(res.statusCode != 200 || !res.body) throw new Error('Unable to initialize Deezer API.')
	var json = JSON.parse(res.body);
	if (json.error) {
		logger.error(`Wrong id. Message: ${json.error.message}. Code: ${json.error.code}. URL: ${url}`)
		throw new Error('Wrong id.')
	}
	return json
}

module.exports = deezer
