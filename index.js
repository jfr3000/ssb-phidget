'use strict'

const jPhidget22 = require('phidget22')

async function openChannelToPhidget(channelIndex, streamSource, opts) {
  if (!opts) opts = {}
  const channel = new jPhidget22.Encoder()

  channel.setChannel(channelIndex)

  channel.onAttach = function () {
    console.log(channel.getChannel() + ' opened')
    if (opts.dataInterval) channel.setDataInterval(opts.dataInterval)
    if (opts.positionChangeTrigger) channel.setPositionChangeTrigger(opts.positionChangeTrigger)
    streamSource.resolve(getSource(channel))
  }

  channel.onDetach = function () {
    console.log(channel.getChannel() + ' detached')
  }

  console.log('attempting to open channel ' + channel.getChannel())
  channel.open()
}

function getSource(channel) {
  let latestPos = null
  let cbQueue = []

  channel.onPositionChange = () => {
    latestPos = channel.getPosition()
    if (cbQueue.length) {
      const cb = cbQueue.shift()
      const lp = latestPos
      latestPos = null
      cb(null, lp)
    }
  }

  let ended = null
  return function read(end, cb) {
    if (end) ended = end
    if (ended) return cb(ended)
    if (latestPos === null) {
      cbQueue.push(cb)
    } else {
      let lp = latestPos
      latestPos = null
      cb(null, lp)
    }
  }
}

function getStream(channelIndex, streamOptions) {
  const streamSource = require('pull-defer').source()
  openChannelToPhidget(channelIndex, streamSource, streamOptions)
  return streamSource
}

async function connectToServer(phidgetServerConfig, cb) {
  if (typeof phidgetServerConfig === 'function') {
    cb = phidgetServerConfig
    phidgetServerConfig = undefined
  }
  const connection = new jPhidget22.Connection(phidgetServerConfig)
  try {
    await connection.connect()
    console.log('connected to server')
    cb(null)
  } catch (err) {
    cb(err)
  }
}

module.exports = {
  name: 'phidget',
  version: '1.0.0',
  manifest: {
    getStream: 'source',
    connectToServer: 'async'
  },
  init: () => ({ getStream, connectToServer })
}
