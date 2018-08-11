/**
 * @typedef PlaylistSettings
 * @property {string} [name]
 * @property {number} [position]
 * @property {number} [size]
 */

/**
 * @typedef AlbumSettings
 * @property {string} [name]
 * @property {string} [artist]
 * @property {number} [position]
 * @property {number} [size]
 */

class DownloadSettings {
  /**
   *
   * @param {object} [options]
   * @param {PlaylistSettings} [options.playlist]
   * @param {AlbumSettings} [options.album]
   */
  constructor(options) {
    const opts = options || {}
    this.playlist = opts.playlist
    if (this.playlist && typeof this.playlist.position == 'string')
      this.playlist.position = parseInt(this.playlist.position)
    if (this.playlist && typeof this.playlist.size == 'string')
      this.playlist.size = parseInt(this.playlist.size)
    this.album = opts.album
    if (this.album && typeof this.album.position == 'string')
      this.album.position = parseInt(this.album.position)
    if (this.album && typeof this.album.size == 'string')
      this.album.size = parseInt(this.album.size)
  }

  isPlaylist() {
    return this.playlist != undefined
  }

  isAlbum() {
    return this.album != undefined
  }
}

module.exports = DownloadSettings
