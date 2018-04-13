'use strict'

const jPhidget22 = require('phidget22')

async function connectToPhidget(deferredPositions) {
  // TODO extract config
  const url = 'phid://localhost:5661'

  console.log('connecting to:' + url)
  const conn = new jPhidget22.Connection(url, { name: 'Server Connection', passwd: '' })
  try {
    await conn.connect()
  } catch (err) {
    console.error('Error connecting to phidget:')
    console.error(err)
  }
  openChannelsToEncoders(deferredPositions)
}

async function openChannelsToEncoders(deferredPositions) {
  const channel = new jPhidget22.Encoder()

  channel.onAttach = function () {
    console.log(channel + ' attached')
    channel.setDataInterval(1000)
    channel.setPositionChangeTrigger(1)
    deferredPositions.resolve(getSource(channel))
  }

  channel.onDetach = function (ch) {
    console.log(ch + ' detached')
  }

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

function getPositionsStream() {
  const positions = require('pull-defer').source()
  connectToPhidget(positions)
  return positions
}


module.exports = {
  name: 'phidget',
  version: '1.0.0',
  manifest: {
    getPositionsStream: 'source'
  },
  init: () => ({ getPositionsStream })
}
