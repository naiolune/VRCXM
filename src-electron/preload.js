/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { contextBridge, ipcRenderer, app } = require('electron');

contextBridge.exposeInMainWorld('interopApi', {
    callDotNetMethod: (className, methodName, args) => {
        return ipcRenderer
            .invoke('callDotNetMethod', className, methodName, args)
            .catch((error) => {
                // Try to parse JSON error messages from the main process
                let errorMessage = error?.message || String(error);
                try {
                    const parsed = JSON.parse(errorMessage);
                    if (parsed.message) {
                        errorMessage = parsed.message;
                    } else if (parsed.__unexpectedError) {
                        errorMessage = `Unexpected error: ${parsed.message || 'Unknown error'}`;
                    }
                } catch (e) {
                    // Not a JSON error message, use as-is
                }

                // If the error is about cloning, provide a more helpful message
                if (
                    error &&
                    (error.message?.includes('could not be cloned') ||
                        error.message?.includes('clone'))
                ) {
                    console.error(
                        `IPC cloning error in ${className}.${methodName}:`,
                        error
                    );
                    // Re-throw with more context
                    throw new Error(
                        `Failed to communicate with ${className}.${methodName}: The returned data contains non-serializable objects.`
                    );
                }

                // Re-throw with the parsed/improved error message
                const enhancedError = new Error(errorMessage);
                enhancedError.originalError = error;
                throw enhancedError;
            });
    }
});

const validChannels = ['launch-command'];

contextBridge.exposeInMainWorld('electron', {
    getArch: () => ipcRenderer.invoke('app:getArch'),
    setTrayIconNotification: (notify) =>
        ipcRenderer.invoke('app:setTrayIconNotification', notify),
    openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
    openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
    onWindowPositionChanged: (callback) =>
        ipcRenderer.on('setWindowPosition', callback),
    onWindowSizeChanged: (callback) =>
        ipcRenderer.on('setWindowSize', callback),
    onWindowStateChange: (callback) =>
        ipcRenderer.on('setWindowState', callback),
    onBrowserFocus: (callback) => ipcRenderer.on('onBrowserFocus', callback),
    desktopNotification: (title, body, icon) =>
        ipcRenderer.invoke('notification:showNotification', title, body, icon),
    restartApp: () => ipcRenderer.invoke('app:restart'),
    getWristOverlayWindow: () =>
        ipcRenderer.invoke('app:getWristOverlayWindow'),
    getHmdOverlayWindow: () => ipcRenderer.invoke('app:getHmdOverlayWindow'),
    updateVr: (active, hmdOverlay, wristOverlay, menuButton, overlayHand) =>
        ipcRenderer.invoke(
            'app:updateVr',
            active,
            hmdOverlay,
            wristOverlay,
            menuButton,
            overlayHand
        ),
    ipcRenderer: {
        on(channel, func) {
            if (validChannels.includes(channel)) {
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        }
    }
});
