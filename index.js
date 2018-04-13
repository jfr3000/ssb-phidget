'use strict'

const jPhidget22 = require('phidget22')
const once = require('once')

const connectToIOBoard = once(async function () {
  // TODO extract config
  const url = 'phid://localhost:5661'
  console.log('connecting to:' + url)
  const conn = new jPhidget22.Connection(url, { name: 'Server Connection', passwd: '' })
  return conn.connect()
})

async function setUpDataStream (channelIndex, streamSource) {
  try {
    await connectToIOBoard()
  } catch (err) {
    console.error('Error connecting to phidget:')
    console.error(err)
    return
  }
  openChannelToPhidget(channelIndex, streamSource)
}


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
  let cbForLater = null

  channel.onPositionChange = () => {
    latestPos = channel.getPosition()
    if (cbForLater) {
      const cb = cbForLater
      const lp = latestPos
      cbForLater = null
      latestPos = null
      cb(null, lp)
    }
  }

  let ended = null
  return function read(end, cb) {
    if (end) ended = end
    if (ended) return cb(ended)
    if (latestPos === null) {
      cbForLater = cb
    } else {
      let lp = latestPos
      latestPos = null
      cb(null, lp)
    }
  }
}

function getPositionsStream(channelIndex) {
  const positionsSource = require('pull-defer').source()
  setUpDataStream(channelIndex, positionsSource)
  return positionsSource
}


module.exports = {
  name: 'phidget',
  version: '1.0.0',
  manifest: {
    getPositionsStream: 'source'
  },
  init: () => ({ getPositionsStream })
}
