const path = require('path')
const { app, Menu, Tray, dialog } = require('electron')
const wififox = require('./wififox')

let tray = null
let isConnected = false
let isConnecting = false
let hasNetwork = false

function updateMenu() {
  const status = hasNetwork ?
    (isConnected ?
      'Connected' :
      (isConnecting ? 'Connecting...' : 'Ready to Connect')) :
    'Not Connected to Any Open Network'
  const contextMenu = Menu.buildFromTemplate([
    {
      label: status,
      type: 'normal',
      enabled: false
    },
    {
      label: isConnected ? 'Disconnect' : 'Connect', type: 'normal', enabled: !isConnecting && hasNetwork,
      click: () => {
        if (!isConnected && !isConnecting) {
          isConnecting = true
          wififox.connect().then(() => {
            isConnected = true
            isConnecting = false
            updateMenu()
          }).catch((err) => {
            isConnected = false
            isConnecting = false
            dialog.showErrorBox('Could Not Connect', err.message)
            updateMenu()
          })
          updateMenu()
        } else if (isConnected) {
          wififox.reset()
          isConnected = false
          isConnecting = false
          updateMenu()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Options', type: 'submenu', submenu: []
    },
    { type: 'separator' },
    {
      label: 'Quit WiFiFox', type: 'normal', click: async () => {
        await wififox.reset()
        app.quit()
      }
    }
  ])
  tray.setContextMenu(contextMenu)
}

app.whenReady().then(async () => {
  tray = new Tray(path.join(__dirname, 'assets/icon-white.png'))
  hasNetwork = await wififox.isOnOpenNetwork()
  updateMenu()
  setInterval(async () => {
    const newHasNetwork = await wififox.isOnOpenNetwork()
    if (newHasNetwork !== hasNetwork) {
      hasNetwork = newHasNetwork
      updateMenu()
    }
  }, 1000)
})
