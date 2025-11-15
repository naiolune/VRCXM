# VRCXM Installer

This directory contains installer configuration for VRCXM.

## Building the Installer

The installer is built automatically when you run the Electron build command:

```bash
npm run build-electron
```

This will create a Windows NSIS installer at `build/VRCXM_Setup_[version].exe`.

## Installer Features

The installer includes:

- **Custom installation directory** - Users can choose where to install VRCXM
- **Desktop shortcut** - Automatically creates a desktop shortcut
- **Start menu shortcut** - Adds VRCXM to the Start menu
- **Process detection** - Checks if VRCXM is running and offers to close it
- **Visual C++ Redistributable** - Automatically installs VC++ Redistributable if needed
- **Uninstaller** - Full uninstaller included in Windows Add/Remove Programs

## Configuration

The installer configuration is in `package.json` under the `build.win.nsis` section. Custom installer logic is in `Installer/custom-installer.nsh`.

## Manual Build (Alternative Method)

If you want to use the standalone NSIS installer (for the old CEF build), you can use:

```bash
cd Installer
build-installer.bat
```

This requires NSIS to be installed at `C:\Program Files (x86)\NSIS\makensis.exe`.

## Notes

- The installer requires administrator privileges
- The installer will check for running instances and offer to close them
- Visual C++ Redistributable will be downloaded and installed if not already present

