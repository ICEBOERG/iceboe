const request = require('request-promise')
const queue = require('./queue').configure({ maxItems: 50, ms: 5000 })
const requestQueue = {}

requestQueue.get = (uri, options = {}) => {
  return queue.add(async () => {
    return request.get(uri, options)
  })
}

module.exports = requestQueue
