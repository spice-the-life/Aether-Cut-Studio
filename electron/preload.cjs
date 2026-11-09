const { contextBridge } = require('electron');

// Expose safe desktop environment APIs to the React renderer
contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  appVersion: '1.0.0',
  platform: process.platform,
});
