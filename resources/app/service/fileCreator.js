/** @type{*} */
const ID3Writer = require('../lib/browser-id3-writer')
/** @type{*} */
const mflac = require('flac-metadata')
const fs = require('fs-extra')
const { splitNumber } = require('../utils/helpers')
const { userSettings } = require('./config')
const TrackInfo = require('../model/TrackInfo')

/**
 *
 * @param {TrackInfo} trackInfo
 * @param {string} tempPath
 * @param {string} writePath
 * @return {void}
 */
const track = (trackInfo, tempPath, writePath) => {
  if (trackInfo.isFlac()) {
    return createFLAC(trackInfo, tempPath, writePath)
  } else {
    return createMP3(trackInfo, tempPath, writePath)
  }
}

/**
 *
 * @param {TrackInfo} trackInfo
 * @param {string} tempPath
 * @return {void}
 */
const createMP3 = (trackInfo, tempPath, writePath) => {
  const songBuffer = fs.readFileSync(tempPath);

  const writer = new ID3Writer(songBuffer);
  writer.setFrame('TIT2', trackInfo.title)
    .setFrame('TPE1', [trackInfo.artist])
    .setFrame('TALB', trackInfo.album)

    // ERROR HERE!!!

    .setFrame('TPE2', trackInfo.artist)
    .setFrame('TRCK', trackInfo.trackNumber)
    .setFrame('TPOS', trackInfo.partOfSet)
    .setFrame('TLEN', trackInfo.length)
    .setFrame('TSRC', trackInfo.isrc)
    // .setFrame('TXXX', {
    //   description: 'BARCODE',
    //   value: trackInfo.BARCODE
    // })
  if (trackInfo.imagePath) {
    const coverBuffer = fs.readFileSync(trackInfo.imagePath);
    writer.setFrame('APIC', {
      type: 3,
      data: coverBuffer,
      description: 'front cover'
    });
  }
  if (trackInfo.unsynchronisedLyrics) {
    writer.setFrame('USLT', trackInfo.unsynchronisedLyrics);
  }
  if (trackInfo.contributors.musicpublisherTag) {
    writer.setFrame('TPUB', trackInfo.contributors.musicpublisherTag);
  }
  if (trackInfo.genre) {
    writer.setFrame('TCON', [trackInfo.genre]);
  }
  if (trackInfo.copyright) {
    writer.setFrame('TCOP', trackInfo.copyright);
  }
  if (0 < parseInt(trackInfo.year)) {
    writer.setFrame('TDAT', trackInfo.date);
    writer.setFrame('TYER', trackInfo.year);
  }
  if (0 < parseInt(trackInfo.bpm)) {
    writer.setFrame('TBPM', trackInfo.bpm);
  }
  if (trackInfo.contributors.composerTag) {
    writer.setFrame('TCOM', [trackInfo.contributors.composerTag]);
  }
  if (trackInfo.trackgain) {
    writer.setFrame('TXXX', {
      description: 'REPLAYGAIN_TRACK_GAIN',
      value: trackInfo.trackgain
    });
  }
  writer.addTag();

  const taggedSongBuffer = Buffer.from(writer.arrayBuffer);
  fs.writeFileSync(writePath, taggedSongBuffer)
  fs.remove(tempPath)
}

/**
 *
 * @param {TrackInfo} trackInfo
 * @param {string} tempPath
 * @return {void}
 */
const createFLAC = (trackInfo, tempPath, writePath) => {
  let flacComments = [
    'TITLE=' + trackInfo.title,
    'ALBUM=' + trackInfo.album,
    'ALBUMARTIST=' + trackInfo.performerInfo,
    'ARTIST=' + trackInfo.artist,
    'TRACKNUMBER=' + splitNumber(trackInfo.trackNumber, false),
    'DISCNUMBER=' + splitNumber(trackInfo.partOfSet, false),
    'TRACKTOTAL=' + splitNumber(trackInfo.trackNumber, true),
    'DISCTOTAL=' + splitNumber(trackInfo.partOfSet, true),
    'LENGTH=' + trackInfo.length,
    'ISRC=' + trackInfo.ISRC,
    'BARCODE=' + trackInfo.BARCODE,
    'ITUNESADVISORY=' + trackInfo.explicit
  ];
  if (trackInfo.unsynchronisedLyrics) {
    flacComments.push('LYRICS=' + trackInfo.unsynchronisedLyrics.lyrics);
  }
  if (trackInfo.genre) {
    flacComments.push('GENRE=' + trackInfo.genre);
  }
  if (trackInfo.copyright) {
    flacComments.push('COPYRIGHT=' + trackInfo.copyright);
  }
  if (0 < parseInt(trackInfo.year)) {
    flacComments.push('DATE=' + trackInfo.date);
    flacComments.push('YEAR=' + trackInfo.year);
  }
  if (0 < parseInt(trackInfo.bpm)) {
    flacComments.push('BPM=' + trackInfo.bpm);
  }
  if (trackInfo.composer) {
    flacComments.push('COMPOSER=' + trackInfo.composer);
  }
  if (trackInfo.publisher) {
    flacComments.push('ORGANIZATION=' + trackInfo.publisher);
  }
  if (trackInfo.mixer) {
    flacComments.push('MIXER=' + trackInfo.mixer);
  }
  if (trackInfo.author) {
    flacComments.push('AUTHOR=' + trackInfo.author);
  }
  if (trackInfo.writer) {
    flacComments.push('WRITER=' + trackInfo.writer);
  }
  if (trackInfo.engineer) {
    flacComments.push('ENGINEER=' + trackInfo.engineer);
  }
  if (trackInfo.producer) {
    flacComments.push('PRODUCER=' + trackInfo.producer);
  }
  if (trackInfo.trackgain) {
    flacComments.push('REPLAYGAIN_TRACK_GAIN=' + trackInfo.trackgain);
  }
  const reader = fs.createReadStream(tempPath);
  const writer = fs.createWriteStream(writePath);
  /** @type{*} */
  let processor = new mflac.Processor({
    parseMetaDataBlocks: true
  });

  let vendor = 'reference libFLAC 1.2.1 20070917';
  let cover = null;
  if (trackInfo.imagePath) {
    cover = fs.readFileSync(trackInfo.imagePath);
  }
  let mdbVorbisPicture;
  let mdbVorbisComment;
  processor.on('preprocess', (mdb) => {
    // Remove existing VORBIS_COMMENT and PICTURE blocks, if any.
    if (mflac.Processor.MDB_TYPE_VORBIS_COMMENT === mdb.type) {
      mdb.remove();
    } else if (mflac.Processor.MDB_TYPE_PICTURE === mdb.type) {
      mdb.remove();
    }

    if (mdb.isLast) {
      var res = 0;
      if (userSettings.read().artworkSize.includes("1400")) {
        res = 1400;
      } else if (userSettings.read().artworkSize.includes("1200")) {
        res = 1200;
      } else if (userSettings.read().artworkSize.includes("1000")) {
        res = 1000;
      } else if (userSettings.read().artworkSize.includes("800")) {
        res = 800;
      } else if (userSettings.read().artworkSize.includes("500")) {
        res = 500;
      }
      if (cover) {
        mdbVorbisPicture = mflac.data.MetaDataBlockPicture.create(true, 3, 'image/jpeg', '', res, res, 24, 0, cover);
      }
      mdbVorbisComment = mflac.data.MetaDataBlockVorbisComment.create(false, vendor, flacComments);
      mdb.isLast = false;
    }
  });

  processor.on('postprocess', (mdb) => {
    if (mflac.Processor.MDB_TYPE_VORBIS_COMMENT === mdb.type && null !== mdb.vendor) {
      vendor = mdb.vendor;
    }

    if (mdbVorbisPicture && mdbVorbisComment) {
      processor.push(mdbVorbisComment.publish());
      processor.push(mdbVorbisPicture.publish());
    } else if (mdbVorbisComment) {
      processor.push(mdbVorbisComment.publish());
    }
  });

  reader.on('end', () => {
    fs.remove(tempPath);
  });

  reader.pipe(processor).pipe(writer);
}

/**
 *
 * @param {TrackInfo} trackInfo
 */
const lyrics = (trackInfo, path) => {
  const settings = userSettings.read()
  if (trackInfo.lyricsSyncJSON && settings.syncedlyrics) {
    var lyricsbuffer = "";
    for (var i = 0; i < trackInfo.lyricsSyncJSON.length; i++) {
      if (trackInfo.lyricsSyncJSON[i].lrc_timestamp) {
        lyricsbuffer += trackInfo.lyricsSyncJSON[i].lrc_timestamp + trackInfo.lyricsSyncJSON[i].line + "\r\n";
      } else if (i + 1 < trackInfo.lyricsSyncJSON.length) {
        lyricsbuffer += trackInfo.lyricsSyncJSON[i + 1].lrc_timestamp + trackInfo.lyricsSyncJSON[i].line + "\r\n";
      }
    }
    fs.outputFile(path, lyricsbuffer, function () {});
  }
}

module.exports = { track, lyrics }
