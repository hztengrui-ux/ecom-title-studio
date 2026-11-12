'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  platform: process.platform,
  getInfo: () => ipcRenderer.invoke('desktop:info'),
  selectDirectory: (payload) => ipcRenderer.invoke('desktop:select-directory', payload),
  saveTextFile: (payload) => ipcRenderer.invoke('desktop:save-text', payload),
  saveExcel: (payload) => ipcRenderer.invoke('desktop:save-excel', payload),
  saveBatchPackage: (payload) => ipcRenderer.invoke('desktop:save-package', payload),
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return '';
    }
  },
  openPath: (target) => ipcRenderer.invoke('desktop:open-path', target),
  menuAction: (action) => ipcRenderer.invoke('desktop:menu-action', action),
});
