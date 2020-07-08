const spawn = require('child_process').spawn

const linuxPing = (ip) => {
  return new Promise((resolve, _) => {
    const process = spawn('ping', ['-c', '1', ip])
    process.on('close', (code) => {
      resolve()
    })
  })
}

const windowsPing = (ip) => {
  return new Promise((resolve, _) => {
    const process = spawn('ping', ['-n', '1', ip])
    process.on('close', (code) => {
      resolve()
    })
  })
}

const darwinPing = (ip) => {
  return new Promise((resolve, _) => {
    const process = spawn('ping', ['-c', '1', ip])
    process.on('close', (code) => {
      resolve()
    })
  })
}


module.exports = (ip) => {
  if (process.platform.indexOf('linux') == 0) {
    return linuxPing(ip)
  } else if (process.platform.indexOf('win') == 0) {
    return windowsPing(ip)
  } else if (process.platform.indexOf('darwin') == 0) {
    return darwinPing(ip)
  }
}