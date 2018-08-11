const logger = require('./logger')
let maxItems = 10
let ms = 1000
/** @type {QueueItem[]} */
let queueWaiting = []
let executing = 0

class Timer {

  /**
   *
   * @param {object} [options]
   * @param {number} [options.interval]
   */
  constructor(options) {
    const opts = options || {}
    this.interval = opts.interval || 100
  }

  start() {
    if (this.clock) return
    logger.info('Starting queue.')
    this.clock = setInterval(this.check.bind(this), this.interval)
  }

  stop() {
    if (!this.clock) return
    logger.info('Queue cleared.')
    clearInterval(this.clock)
    this.clock = undefined
  }

  check() {
    while (shouldExecute()) {
      execute()
    }
    if (this.hasFinished()) {
      this.stop()
    }
  }

  hasFinished() {
    return executing === 0 && queueWaiting.length === 0
  }

}

class QueueItem {
  constructor(handler) {
    this.handler = handler
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

const timer = new Timer({ interval: 100 })

const shouldExecute = () => {
  if (queueWaiting.length === 0) return false
  if (executing >= maxItems) return false
  return true
}

const execute = async () => {
  const queueItem = queueWaiting.shift()
  executing++
  queueItem.handler()
    .then(result => {
      queueItem.resolve(result)
      setTimeout(() => {
        executing--
      }, ms)
    })
    .catch(error => {
      queueItem.reject(error)
      setTimeout(() => {
        executing--
      }, ms)
    })
}

/**
 *
 * @param {function} handler Async function that will be called
 * @return {Promise} Triggered after async function is finished
 */
const add = async (handler) => {
  timer.start()
  const queueItem = new QueueItem(handler)
  queueWaiting.push(queueItem)
  return queueItem.promise
}

/**
 *
 * @param {object} options
 * @param {number} [options.maxItems] Number of items to execute in the designed time. Default 10.
 * @param {number} [options.ms] Limit of time for execute the items. Default 1000.
 */
const configure = (options) => {
  options = options || {}
  if (options.maxItems) maxItems = options.maxItems
  if (options.ms) ms = options.ms
  return queue
}

const queue = { add, configure }

module.exports = queue
