const { userSettings } = require('../service/config')
const TrackInfo = require('../model/TrackInfo')

const fixName = (txt) => {
  const regEx = /[\0\/\\:*?"<>|]/g
  return txt.replace(regEx, '_')
}

function antiDot(str) {
	while (str[str.length - 1] == "." || str[str.length - 1] == " " || str[str.length - 1] == '\n') {
		str = str.substring(0, str.length - 1)
	}
	if (str.length < 1) {
		str = 'dot'
	}
	return fixName(str)
}

/**
 * Creates the name of the tracks replacing wildcards to correct metadata
 * @param {TrackInfo} trackInfo
 * @param {string} regex
 * @returns {string|*}
 */
function settingsRegex(trackInfo, regex) {
	regex = regex.replace(/%title%/g, trackInfo.title);
	regex = regex.replace(/%album%/g, trackInfo.album);
	regex = regex.replace(/%artist%/g, trackInfo.artist);
	regex = regex.replace(/%year%/g, trackInfo.year);
	if (trackInfo.position) {
		if (userSettings.read().padtrck) {
			 regex = regex.replace(/%number%/g, pad(splitNumber(trackInfo.position.toString(), false), splitNumber(trackInfo.position.toString(), true)));
		} else {
			regex = regex.replace(/%number%/g, splitNumber(trackInfo.position.toString(), false));
		}
	} else {
		regex = regex.replace(/%number%/g, '');
	}
	return regex;
}

/**
 * Creates the name of the albums folder replacing wildcards to correct metadata
 * @param metadata
 * @param {string} foldername
 * @returns {string}
 */
const settingsRegexAlbum = (metadata, foldername, artist, album) => {
  const result = foldername
    .replace(/%album%/g, album)
    .replace(/%artist%/g, artist)
    .replace(/%year%/g, metadata.year)
		// .replace(/%type%/g, metadata.rtype)
	return result
}

/**
 * I really don't understand what this does ... but it does something
 * @param str
 * @param max
 * @returns {String|string|*}
 */
function pad(str, max) {
	str = str.toString();
	max = max.toString();
  console.log(`str: ${str}\nmax: ${max}\nresult: ${str.length < max.length || str.length == 1 ? pad("0" + str, max) : str}`)
	return str.length < max.length || str.length == 1 ? pad("0" + str, max) : str;
}

/**
 * Splits the %number%
 * @param {string} str
 * @return string
 */
function splitNumber(str, total) {
	str = str.toString();
	var i = str.indexOf("/");
	if (total && i > 0) {
		return str.slice(i + 1, str.length);
	} else if (i > 0) {
		return str.slice(0, i);
	} else {
		return str;
	}
}

module.exports = { fixName, antiDot, settingsRegex, settingsRegexAlbum, pad, splitNumber }
