'use strict'

const jPhidget22 = require('phidget22')
const once = require('once')

const connectToPhidgetServer = once(async function (phidgetServerConfig) {
  try {
    const connection = new jPhidget22.Connection(phidgetServerConfig)
    await connection.connect()
  } catch (err) {
    console.error('Error connecting to phidget:')
    console.error(err)
    return
  }
})

async function openChannelToPhidget(channelIndex, streamSource) {
  const channel = new jPhidget22.Encoder()

  channel.channel = channelIndex

  channel.onAttach = function () {
    console.log(channel.getChannel() + ' opened')
    channel.setDataInterval(1000)
    channel.setPositionChangeTrigger(1)
    streamSource.resolve(getSource(channel))
  }

  channel.onDetach = function (ch) {
    console.log(ch + ' detached')
  }

  console.log('attempting to open channel ' + channelIndex)
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

function getStream(channelIndex, phidgetServerConfig) {
  const streamSource = require('pull-defer').source()
  connectToPhidgetServer(phidgetServerConfig)
  openChannelToPhidget(channelIndex, streamSource)
  return streamSource
}

module.exports = {
  name: 'phidget',
  version: '1.0.0',
  manifest: {
    getStream: 'source'
  },
  init: () => ({ getStream })
}
