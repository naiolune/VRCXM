; Custom NSIS installer script for VRCXM
; This file is included by electron-builder's NSIS installer

!include "LogicLib.nsh"

!macro customInstall
    ; Check if VRCXM is running using tasklist command
    nsExec::ExecToStack 'tasklist /FI "IMAGENAME eq VRCXM.exe" 2>NUL | find /I /N "VRCXM.exe"'
    Pop $0
    Pop $1
    ${If} $0 = 0
        MessageBox MB_YESNO|MB_ICONEXCLAMATION "VRCXM is currently running.$\n$\nWould you like to close it now? (Recommended)" /SD IDYES IDNO skipClose
            nsExec::Exec 'taskkill /IM VRCXM.exe /F'
            Sleep 1000
        skipClose:
    ${EndIf}
    
    ; Note: Visual C++ Redistributable installation removed to avoid NSIS parsing issues
    ; Users should install VC++ Redistributable separately if needed
!macroend

!macro customUnInstall
    ; Check if VRCXM is running using tasklist command
    nsExec::ExecToStack 'tasklist /FI "IMAGENAME eq VRCXM.exe" 2>NUL | find /I /N "VRCXM.exe"'
    Pop $0
    Pop $1
    ${If} $0 = 0
        MessageBox MB_YESNO|MB_ICONEXCLAMATION "VRCXM is currently running.$\n$\nWould you like to close it now? (Required to uninstall)" /SD IDYES IDNO skipUninstallClose
            nsExec::Exec 'taskkill /IM VRCXM.exe /F'
            Sleep 1000
            ; Check again if still running
            nsExec::ExecToStack 'tasklist /FI "IMAGENAME eq VRCXM.exe" 2>NUL | find /I /N "VRCXM.exe"'
            Pop $0
            ${If} $0 = 0
                MessageBox MB_OK|MB_ICONSTOP "VRCXM is still running. Please close it manually and try again."
                Abort
            ${EndIf}
        skipUninstallClose:
        ${If} $0 = 0
            MessageBox MB_OK|MB_ICONSTOP "VRCXM is still running. Please close it manually and try again."
            Abort
        ${EndIf}
    ${EndIf}
!macroend

