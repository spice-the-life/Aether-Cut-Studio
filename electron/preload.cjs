const { contextBridge } = require('electron');

// Expose safe desktop environment APIs to the React renderer
contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  appVersion: '1.3.0',
  platform: process.platform,
});
