#!/usr/bin/env electron

const path = require('path')
const { app, Menu, Tray, dialog } = require('electron')
const wififox = require('./lib/wififox')
const isRoot = (process.getuid && process.getuid() === 0)

if (!isRoot) {
  console.log('WiFiFox must run as root.')
  process.exit(0)
} else {
  let tray = null
  let isConnected = false
  let isConnecting = false
  let hasNetwork = false
  let validMacs = []
  let silentMode = false
  let isScanning = false

  function updateMenu() {
    const status = hasNetwork ?
      (isConnected ?
        'Gateway Bypassed' :
        (isConnecting ? 'Bypassing...' : 'Ready to Bypassed')) :
      'Not Connected to Any Open Network'
    const contextMenu = Menu.buildFromTemplate([
      {
        label: status,
        type: 'normal',
        enabled: false
      },
      {
        label: isConnected ? 'Undo Bypass' : 'Bypass', type: 'normal', enabled: !isConnecting && hasNetwork,
        click: () => {
          if (!isConnected && !isConnecting) {
            isConnecting = true
            wififox.connect(silentMode).then(() => {
              isConnected = true
              isConnecting = false
              updateMenu()
            })
              .then(async () => {
                validMacs = await wififox.listValidMacs()
                updateMenu()
              })
              .catch((err) => {
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
        type: 'submenu',
        label: 'Network Scan',
        submenu: [
          {
            type: 'normal', label: isScanning ? 'Scanning...' : (silentMode ? "Scan Disabled in Silent Mode" : 'Scan'), enabled: !silentMode && !isScanning, click: () => {
              wififox.manualScan()
                .then(async () => {
                  isScanning = false
                  updateMenu()
                  validMacs = await wififox.listValidMacs()
                  updateMenu()
                })
                .catch(err => {
                  console.error(err)
                  isScanning = false
                  updateMenu()
                })
              isScanning = true
              updateMenu()
            }
          },
          { type: 'separator' }
        ].concat(validMacs.length > 0 ? validMacs.map(mac => {
          return {
            type: 'normal',
            label: mac,
            enabled: false
          }
        }) : [
            {
              type: 'normal',
              label: 'No Clients',
              enabled: false
            }
          ])
      },
      {
        type: 'checkbox',
        label: 'Silent Mode',
        checked: silentMode,
        click: () => {
          silentMode = !silentMode
          updateMenu()
        }
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
      hasNetwork = await wififox.isOnOpenNetwork()
      updateMenu()
    }, 5000)
  })
}