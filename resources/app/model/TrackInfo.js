const {userSettings} = require('../service/config')

const FLAC = 'flac'
const MP3 = 'mp3'
const DEEZER_COVERS_URL = 'https://e-cdns-images.dzcdn.net/images/cover/'


class TrackInfo {
  /**
   *
   * @param {object} [options]
   * @param {object} [options.SNG_CONTRIBUTORS]
   * @param {string} [options.SNG_TITLE]
   * @param {string} [options.VERSION]
   * @param {string} [options.ART_NAME]
   * @param {string} [options.ALB_TITLE]
   * @param {string} [options.ISRC]
   * @param {string} [options.DURATION]
   * @param {string} [options.EXPLICIT_LYRICS]
   * @param {string} [options.COPYRIGHT]
   * @param {string} [options.GAIN]
   * @param {number} [options.format]
   * @param {string} [options.LYRICS_SYNC_JSON]
   * @param {string} [options.BPM]
   * @param {string} [options.LYRICS_TEXT]
   * @param {string} [options.PHYSICAL_RELEASE_DATE]
   * @param {string} [options.ALB_PICTURE]
   * @param {string} [options.GENRE_ID]
   * @param {string} [options.TRACK_NUMBER]
   * @param {string} [options.DISK_NUMBER]
   * @param {number} [options.position]
   */
  constructor(options) {
    const opts = options || {}
    this.contributors = new Contributors(opts.SNG_CONTRIBUTORS)
    this.title = opts.SNG_TITLE
    if (opts.VERSION) this.title += ` ${opts.VERSION}`
    this.artist = opts.ART_NAME || ''
    this.album = opts.ALB_TITLE || ''
    this.isrc = opts.ISRC || ''
    this.length = opts.DURATION || ''
    this.explicit = opts.EXPLICIT_LYRICS || ''
    this.copyright = opts.COPYRIGHT || ''
    this.format = opts.format == 9 ? FLAC : MP3
    this.trackgain = opts.GAIN || ''
    this.lyricsSyncJSON = opts.LYRICS_SYNC_JSON || ''
    this.bpm = opts.BPM ? opts.BPM : ''
    this.genreID = opts.GENRE_ID ? opts.GENRE_ID : ''
    this.diskNumber = opts.DISK_NUMBER ? opts.DISK_NUMBER : '1'
    this.trackNumber = opts.TRACK_NUMBER ? opts.TRACK_NUMBER : '1'
    this.partOfSet = '1/1'
    this.unsynchronisedLyrics = !opts.LYRICS_TEXT ? undefined : {
      description: "",
      lyrics: opts.LYRICS_TEXT
    }
    if (opts.PHYSICAL_RELEASE_DATE) {
      this.year = opts.PHYSICAL_RELEASE_DATE.slice(0, 4)
      this.date = opts.PHYSICAL_RELEASE_DATE
    }
    if (opts.ALB_PICTURE) {
      this.image = `${DEEZER_COVERS_URL}${opts.ALB_PICTURE}${userSettings.read().artworkSize}`
    }
    this.position = opts.position || undefined
  }

  isFlac() {
    return this.format === FLAC
  }

  isMP3() {
    return this.format !== MP3
  }
}


class Contributors {
    /**
   *
   * @param {object} [options]
   */
  constructor(options) {
    const opts = options || {}
    this.composer = opts.composer instanceof Array ? opts.composer : []
    this.composerTag = this.composer.join(', ')
    this.musicpublisher = opts.musicpublisher instanceof Array ? opts.musicpublisher : []
    this.musicpublisherTag = this.musicpublisher.join(', ')
    this.producer = opts.producer instanceof Array ? opts.producer : []
    this.producerTag = this.producer.join(', ')
    this.engineer = opts.engineer instanceof Array ? opts.engineer : []
    this.engineerTag = this.engineer.join(', ')
    this.writer = opts.writer instanceof Array ? opts.writer : []
    this.writerTag = this.writer.join(', ')
    this.author = opts.author instanceof Array ? opts.author : []
    this.authorTag = this.author.join(', ')
    this.mixer = opts.mixer instanceof Array ? opts.mixer : []
    this.mixerTag = this.mixer.join(', ')
  }
}

module.exports = TrackInfo
