global.Promise = require('bluebird')
const request = require('request-promise')
const User = require('../model/User')
const Genre = require('../model/Genre')
const Artist = require('../model/Artist')
const Album = require('../model/Album')
const Playlist = require('../model/Playlist')
const Track = require('../model/Track')
const requestQueue = require('./requestQueue')

class DeezerService {

  async getAlbum(id) {
    return new Album(await req(Album.generateURL(id)))
  }

  async getArtist(id) {
    return new Artist(await req(Artist.generateURL(id)))
  }

  async getTrack(id) {
    return new Track(await req(Track.generateURL(id)))
  }

  async getAlbumQueue(id) {
    return new Album(await reqQueue(Album.generateURL(id)))
  }
  async getTrackQueue(id) {
    return new Track(await reqQueue(Track.generateURL(id)))
  }

  // NEW MODE
  async getPlaylistTrackAlbumNewQueue(id) {
    const start = new Date()
    const p = new Playlist(await reqQueue(Playlist.generateURL(id)))
    p.tracks = await Promise.map(p.tracks, async (track) => {
      const r = await this.getTrackQueue(track.id)
      console.log(`Track ${track.id}`)
      return r
    })
    p.tracks = await Promise.map(p.tracks, async (track) => {
      track.album = await this.getAlbumQueue(track.album.id)
      console.log(`Album ${track.album.id}`)
      return track
    })
    const end = new Date()
    console.log(`Time: ${end.getTime() - start.getTime()}`)
    return p
  }

  // THROW ERROR DUE TO OVER CALL
  async getPlaylistTrackAlbum(id) {
    const start = new Date()
    const p = new Playlist(await req(Playlist.generateURL(id)))
    p.tracks = await Promise.map(p.tracks, async (track) => await this.getTrack(track.id))
    p.tracks = await Promise.map(p.tracks, async (track) => {
      track.album = await this.getAlbum(track.album.id)
      return track
    })
    const end = new Date()
    console.log(`Time: ${end.getTime() - start.getTime()}`)
    return p
  }

  async getPlaylistTrack(id) {
    const start = new Date()
    const p = new Playlist(await req(Playlist.generateURL(id)))
    p.tracks = await Promise.map(p.tracks, async (track) => await this.getTrack(track.id))
    const end = new Date()
    console.log(`Time: ${end.getTime() - start.getTime()}`)
    return p
  }

  async getPlaylist(id) {
    const start = new Date()
    const p = new Playlist(await req(Playlist.generateURL(id)))
    const end = new Date()
    console.log(`Time: ${end.getTime() - start.getTime()}`)
    return p
  }

  async getUser(id) {
    return new User(await req(User.generateURL(id)))
  }

  async getGenre(id) {
    return new Genre(await req(Genre.generateURL(id)))
  }

}

const req = async (url) => {
  const res = await request.get(url, {json: true, resolveWithFullResponse: true})
  if (res.statusCode !== 200) {
    console.log(`ERROR HERE ${res.statusCode}`)
    process.exit()
  }
  if (res.body.error) {
    console.log(url)
    console.log(res.body.error)
    if (res.body.error.code !== 800) {
      process.exit()
    }
  }
  return res.body
}

const reqQueue = async (url) => {
  const body = await requestQueue.get(url, {json: true})
  if (body.error) {
    throw new Error(body.error.message)
  }
  return body
}

// this will require the track information
const getAlternativeTrack = async (id, track) => {
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
  const scopedid = id
	const qs = deezer.apiQueries
	qs.method = 'search.music'
	const body = {
		QUERY: 'artist:"U.D.O." track:"Man And Machine"',
		FILTER: 0,
		OUTPUT: "TRACK",
		NB: 5
	}
	const headers = deezer.httpHeaders
	headers.Accept = 'application/json'

	request.post({
		url: 'https://www.deezer.com/ajax/gw-light.php',
		headers: deezer.httpHeaders,
		qs: qs,
		jar: true,
		body: JSON.stringify(body),
	})
		.then(response => {
			const body = response.body
			const bodyJSON = JSON.parse(body)
			const data = bodyJSON.results.data
			console.log(data)
		})
		.catch(err => {
			console.log(err)
		})

}

const deezerService = new DeezerService()

module.exports = deezerService
