const path = require('path')
const fs = require('fs-extra')
const os = require('os')
const dateformat = require('dateformat')

let userData = ''
let homeData = os.homedir()

switch (process.platform) {
  case 'win32':
    userData = path.join(process.env.APPDATA, 'Deezloader Remaster')
    break
  case 'darwin':
    userData = path.join(homeData, 'Library', 'Application Support', 'Deezloader Remaster')
    break
  case 'android':
    homeData = path.join(homeData, 'storage', 'shared')
    userData = path.join(homeData, 'Deezloader Remaster')
    break
  default:
    userData = path.join(homeData, '.config', 'Deezloader Remaster')
    break
}

const config = path.join(userData, 'config.json')
const autoLogin = path.join(userData, 'autologin')
const defaultDownload = path.join(homeData, 'Music', 'Deezloader')
const tmp = path.join(os.tmpdir(), 'deezloader-imgs')
const defaultConfig = path.join(__dirname, '..', 'default.json')
const logDir = path.join(userData, 'logs')
const log = path.join(logDir, `${dateformat(new Date(), 'yyyy-mm-dd')}.txt`)
const packageJson = path.join(__dirname, '..', 'package.json')

fs.ensureDirSync(userData)
fs.ensureDirSync(homeData)
fs.ensureDirSync(defaultDownload)
fs.ensureDirSync(tmp)
fs.ensureDirSync(logDir)

module.exports = {
  userData,
  homeData,
  config,
  defaultConfig,
  autoLogin,
  defaultDownload,
  tmp,
  log,
  packageJson,
}
