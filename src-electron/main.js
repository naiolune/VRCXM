require('hazardous');
const path = require('path');
const {
    BrowserWindow,
    ipcMain,
    app,
    Tray,
    Menu,
    dialog,
    Notification,
    nativeImage
} = require('electron');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const v8 = require('v8');

//app.disableHardwareAcceleration();

const bundledDotNetPath = path.join(process.resourcesPath, 'dotnet-runtime');
if (fs.existsSync(bundledDotNetPath)) {
    // Include bundled .NET runtime
    process.env.DOTNET_ROOT = bundledDotNetPath;
    process.env.PATH = `${bundledDotNetPath}:${process.env.PATH}`;
} else if (process.platform === 'darwin') {
    const dotnetPath = path.join('/usr/local/share/dotnet');
    const dotnetPathArm = path.join('/usr/local/share/dotnet/x64');
    if (fs.existsSync(dotnetPathArm)) {
        process.env.DOTNET_ROOT = dotnetPathArm;
        process.env.PATH = `${dotnetPathArm}:${process.env.PATH}`;
    } else if (fs.existsSync(dotnetPath)) {
        process.env.DOTNET_ROOT = dotnetPath;
        process.env.PATH = `${dotnetPath}:${process.env.PATH}`;
    }
}

if (!isDotNetInstalled()) {
    app.whenReady().then(() => {
        dialog.showErrorBox(
            'VRCXM',
            'Please install .NET 9.0 Runtime "dotnet-runtime-9.0" to run VRCXM.'
        );
        app.quit();
    });
}

const VRCX_URI_PREFIX = 'vrcx';
let isOverlayActive = false;
let appIsQuitting = false;

// Get launch arguments
let appImagePath = process.env.APPIMAGE;
const args = process.argv.slice(1);
const noInstall = args.includes('--no-install');
const x11 = args.includes('--x11');
const noDesktop = args.includes('--no-desktop');
const startup = args.includes('--startup');
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient(VRCX_URI_PREFIX, process.execPath, [
            path.resolve(process.argv[1])
        ]);
    } else {
        app.setAsDefaultProtocolClient(VRCX_URI_PREFIX);
    }
}

const homePath = getHomePath();
tryRelaunchWithArgs(args);
// Migration removed - this is a separate app (VRCXM)

const rootDir = app.getAppPath();
// Load the correct DLL based on process architecture
if (process.arch === 'arm64') {
    require(path.join(rootDir, 'build/Electron/VRCX-Electron-arm64.cjs'));
} else {
    require(path.join(rootDir, 'build/Electron/VRCX-Electron.cjs'));
}

const InteropApi = require('./InteropApi');
const interopApi = new InteropApi();

// Debug flag for verbose IPC logging (set to true for debugging IPC issues)
const IPC_DEBUG_VERBOSE = false;

const WRIST_FRAME_WIDTH = 512;
const WRIST_FRAME_HEIGHT = 512;
const WRIST_FRAME_SIZE = WRIST_FRAME_WIDTH * WRIST_FRAME_HEIGHT * 4;
const WRIST_SHM_PATH = '/dev/shm/vrcx_wrist_overlay';

function createWristOverlayWindowShm() {
    fs.writeFileSync(WRIST_SHM_PATH, Buffer.alloc(WRIST_FRAME_SIZE + 1));
}

const HMD_FRAME_WIDTH = 1024;
const HMD_FRAME_HEIGHT = 1024;
const HMD_FRAME_SIZE = HMD_FRAME_WIDTH * HMD_FRAME_HEIGHT * 4;
const HMD_SHM_PATH = '/dev/shm/vrcx_hmd_overlay';

function createHmdOverlayWindowShm() {
    fs.writeFileSync(HMD_SHM_PATH, Buffer.alloc(HMD_FRAME_SIZE + 1));
}

const version = getVersion();
interopApi.getDotNetObject('ProgramElectron').PreInit(version, args);
interopApi.getDotNetObject('VRCXStorage').Load();
interopApi.getDotNetObject('ProgramElectron').Init();

// Initialize SQLite with error handling
try {
    console.log('[Main] Initializing SQLite database...');
    
    // Get database path for diagnostics
    const appDataPath = app.getPath('userData');
    const vrcxmPath = path.join(app.getPath('appData'), 'VRCXM');
    const dbPath = path.join(vrcxmPath, 'VRCX.sqlite3');
    
    console.log('[Main] Database paths:');
    console.log(`  - AppData: ${app.getPath('appData')}`);
    console.log(`  - VRCXM folder: ${vrcxmPath}`);
    console.log(`  - Database file: ${dbPath}`);
    console.log(`  - VRCXM folder exists: ${fs.existsSync(vrcxmPath)}`);
    console.log(`  - Database file exists: ${fs.existsSync(dbPath)}`);
    
    // Ensure VRCXM directory exists
    if (!fs.existsSync(vrcxmPath)) {
        console.log(`[Main] Creating VRCXM directory: ${vrcxmPath}`);
        fs.mkdirSync(vrcxmPath, { recursive: true });
    }
    
    interopApi.getDotNetObject('SQLite').Init();
    console.log('[Main] SQLite database initialized successfully');
} catch (error) {
    console.error('[Main] Failed to initialize SQLite database:', error);
    console.error('[Main] Error stack:', error.stack);
    
    const errorMessage = `Failed to initialize the database:\n\n${error.message}\n\nPlease check:\n1. The database file location is accessible\n2. You have write permissions to the AppData folder\n3. The .NET runtime is properly installed\n\nError details: ${error.stack || error}`;
    
    console.error('[Main] Showing error dialog...');
    dialog.showErrorBox('Database Initialization Error', errorMessage);
    app.quit();
    return;
}

interopApi.getDotNetObject('AppApiElectron').Init();
interopApi.getDotNetObject('Discord').Init();
interopApi.getDotNetObject('WebApi').Init();
interopApi.getDotNetObject('LogWatcher').Init();

interopApi.getDotNetObject('SystemMonitorElectron').Init();
interopApi.getDotNetObject('AppApiVrElectron').Init();

// Create a completely plain copy with no prototypes, getters, or metadata
function createPlainCopy(value, visited = new WeakSet()) {
    if (value === null || value === undefined) {
        return value;
    }
    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
    ) {
        return value;
    }
    if (Array.isArray(value)) {
        if (visited.has(value)) {
            return [];
        }
        visited.add(value);
        return value.map((item) => createPlainCopy(item, visited));
    }
    if (typeof value === 'object') {
        if (visited.has(value)) {
            return {};
        }
        visited.add(value);
        const plain = {};
        // Only iterate over own enumerable properties
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                try {
                    const val = value[key];
                    if (
                        val !== undefined &&
                        typeof val !== 'function' &&
                        typeof val !== 'symbol'
                    ) {
                        plain[key] = createPlainCopy(val, visited);
                    }
                } catch (e) {
                    // Skip properties that can't be accessed
                }
            }
        }
        return plain;
    }
    return value;
}

/**
 * Logs detailed information about an object's properties for debugging
 */
function logObjectProperties(obj, label, depth = 0) {
    if (depth > 3) return; // Prevent infinite recursion
    const indent = '  '.repeat(depth);
    
    if (obj === null || obj === undefined) {
        console.log(`${indent}${label}: ${obj}`);
        return;
    }
    
    const type = typeof obj;
    console.log(`${indent}${label}: type=${type}, isArray=${Array.isArray(obj)}`);
    
    if (type === 'object') {
        try {
            const ownProps = Object.getOwnPropertyNames(obj);
            const symbolProps = Object.getOwnPropertySymbols(obj);
            
            console.log(`${indent}  Own properties: ${ownProps.join(', ')}`);
            if (symbolProps.length > 0) {
                console.log(`${indent}  Symbol properties: ${symbolProps.length} symbols`);
            }
            
            // Check for Promise-like properties
            const promiseProps = ['then', 'catch', 'finally'];
            const foundPromiseProps = promiseProps.filter(p => p in obj);
            if (foundPromiseProps.length > 0) {
                console.log(`${indent}  ⚠️  FOUND Promise-like properties: ${foundPromiseProps.join(', ')}`);
                foundPromiseProps.forEach(prop => {
                    const propType = typeof obj[prop];
                    console.log(`${indent}    ${prop}: type=${propType}, isFunction=${typeof obj[prop] === 'function'}`);
                });
            }
            
            // Log property descriptors
            ownProps.slice(0, 10).forEach(prop => { // Limit to first 10 to avoid spam
                try {
                    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
                    if (descriptor) {
                        const hasGetter = !!descriptor.get;
                        const hasSetter = !!descriptor.set;
                        if (hasGetter || hasSetter) {
                            console.log(`${indent}    ${prop}: hasGetter=${hasGetter}, hasSetter=${hasSetter}`);
                        }
                    }
                } catch (e) {
                    // Ignore
                }
            });
            
            // Log sample values for arrays
            if (Array.isArray(obj) && obj.length > 0) {
                console.log(`${indent}  Array length: ${obj.length}`);
                if (obj.length <= 3) {
                    obj.forEach((item, idx) => {
                        logObjectProperties(item, `[${idx}]`, depth + 1);
                    });
                } else {
                    logObjectProperties(obj[0], '[0] (first item)', depth + 1);
                }
            }
        } catch (e) {
            console.log(`${indent}  Error inspecting object: ${e.message}`);
        }
    }
}

/**
 * Strips Promise-like properties (.then, .catch, etc.) from an object
 * to make it serializable through Electron IPC
 */
function stripPromiseProperties(obj, label = 'object') {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj !== 'object') {
        return obj;
    }
    
    // Log before stripping
    console.log(`[stripPromiseProperties] Processing ${label}:`);
    logObjectProperties(obj, 'Before stripping', 1);
    
    // List of Promise-like properties to remove
    const promiseProperties = ['then', 'catch', 'finally', 'constructor'];
    
    // Check what properties exist
    const allProps = Object.getOwnPropertyNames(obj);
    const foundPromiseProps = promiseProperties.filter(p => allProps.includes(p));
    if (foundPromiseProps.length > 0) {
        console.log(`[stripPromiseProperties] Found Promise properties to remove: ${foundPromiseProps.join(', ')}`);
    }
    
    // Use Object.create(null) to create an object without prototype
    const plain = Object.create(null);
    
    // Copy only enumerable, non-Promise properties
    // Check both own properties and inherited properties (using 'in' operator)
    let copiedCount = 0;
    let skippedCount = 0;
    
    // First, get all own property names (including non-enumerable)
    const ownProps = Object.getOwnPropertyNames(obj);
    const ownSymbols = Object.getOwnPropertySymbols(obj);
    
    // Check for Promise properties in both own and prototype chain
    for (const prop of promiseProperties) {
        if (prop in obj) {
            console.log(`[stripPromiseProperties] Found Promise property '${prop}' (in operator check)`);
        }
    }
    
    // Copy enumerable properties
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Skip Promise-like properties
            if (promiseProperties.includes(key)) {
                skippedCount++;
                console.log(`[stripPromiseProperties] Skipping Promise property: ${key}`);
                continue;
            }
            // Skip functions
            if (typeof obj[key] === 'function') {
                skippedCount++;
                console.log(`[stripPromiseProperties] Skipping function property: ${key}`);
                continue;
            }
            plain[key] = obj[key];
            copiedCount++;
        }
    }
    
    // Also check non-enumerable own properties
    for (const key of ownProps) {
        if (!promiseProperties.includes(key) && !(key in plain)) {
            try {
                const descriptor = Object.getOwnPropertyDescriptor(obj, key);
                if (descriptor && descriptor.enumerable && typeof obj[key] !== 'function') {
                    plain[key] = obj[key];
                    copiedCount++;
                }
            } catch (e) {
                // Skip if we can't access it
            }
        }
    }
    
    console.log(`[stripPromiseProperties] After stripping: copied=${copiedCount}, skipped=${skippedCount}`);
    logObjectProperties(plain, 'After stripping', 1);
    
    return plain;
}

function sanitizeValue(value, visited = new WeakSet()) {
    if (value === null || value === undefined) {
        return value;
    }
    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
    ) {
        return value;
    }
    if (typeof value === 'function' || typeof value === 'symbol') {
        return undefined; // Skip functions and symbols
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (value instanceof Map) {
        return Object.fromEntries(
            Array.from(value.entries()).map(([k, v]) => [
                k,
                sanitizeValue(v, visited)
            ])
        );
    }
    if (value instanceof Set) {
        return Array.from(value).map((v) => sanitizeValue(v, visited));
    }
    if (Array.isArray(value)) {
        return value.map((v) => sanitizeValue(v, visited));
    }
    if (typeof value === 'object') {
        // Check for circular references
        if (visited.has(value)) {
            return '[Circular]';
        }
        visited.add(value);

        try {
            // Create a plain object with only serializable properties
            // Use Object.getOwnPropertyNames to get ALL properties (including non-enumerable)
            const result = {};
            const props = Object.getOwnPropertyNames(value);

            for (const key of props) {
                // Skip prototype properties and internal properties
                if (
                    key === '__proto__' ||
                    key === 'constructor' ||
                    key === 'prototype'
                ) {
                    continue;
                }
                
                // Explicitly skip Promise-like properties
                if (key === 'then' || key === 'catch' || key === 'finally') {
                    continue;
                }

                try {
                    const descriptor = Object.getOwnPropertyDescriptor(
                        value,
                        key
                    );
                    if (descriptor && (descriptor.get || descriptor.set)) {
                        // Skip getters/setters - they can't be cloned
                        continue;
                    }

                    const val = value[key];
                    if (
                        val !== undefined &&
                        typeof val !== 'function' &&
                        typeof val !== 'symbol'
                    ) {
                        result[key] = sanitizeValue(val, visited);
                    }
                } catch (e) {
                    // Skip properties that can't be accessed
                    continue;
                }
            }

            return result;
        } catch (e) {
            // If we can't serialize the object, return a string representation
            return String(value);
        }
    }
    return value;
}

ipcMain.handle(
    'callDotNetMethod',
    async (event, className, methodName, args) => {
        // Wrap everything in a try-catch to ensure we never let a non-serializable value through
        try {
            try {
                // Sanitize arguments to ensure they're serializable (in case they came with non-cloneable properties)
                let sanitizedArgs = Array.isArray(args)
                    ? args.map((arg, index) => {
                          try {
                              // For SQLite methods, the second argument (index 1) should be a Map if it's an object
                              if (arg !== null && arg !== undefined && typeof arg === 'object' && !(arg instanceof Map) && !Array.isArray(arg)) {
                                  if (className === 'SQLite' && index === 1) {
                                      // Convert plain object to Map for SQLite .NET interop
                                      return new Map(Object.entries(arg));
                                  }
                                  // For WebApi.Execute, recursively convert nested objects to Maps
                                  // This ensures nested objects like headers are also properly converted
                                  if (className === 'WebApi' && methodName === 'Execute' && index === 0) {
                                      const convertToMap = (obj) => {
                                          if (obj === null || obj === undefined || typeof obj !== 'object' || Array.isArray(obj)) {
                                              return obj;
                                          }
                                          const map = new Map();
                                          for (const [key, value] of Object.entries(obj)) {
                                              if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Map)) {
                                                  map.set(key, convertToMap(value));
                                              } else {
                                                  map.set(key, value);
                                              }
                                          }
                                          return map;
                                      };
                                      return convertToMap(arg);
                                  }
                              }
                              // For Maps, pass them directly (they're already in the right format for .NET)
                              if (arg instanceof Map) {
                                  return arg;
                              }
                              // Use JSON round-trip to ensure it's cloneable
                              return JSON.parse(
                                  JSON.stringify(sanitizeValue(arg))
                              );
                          } catch (e) {
                              // If sanitization fails, just pass the original (might be a primitive or special type .NET needs)
                              return arg;
                          }
                      })
                    : args;

                let result = await interopApi.callMethod(
                    className,
                    methodName,
                    sanitizedArgs
                );

                // Log the raw result for SQLite methods
                if (IPC_DEBUG_VERBOSE && className === 'SQLite') {
                    console.log(`\n[IPC] ========================================`);
                    console.log(`[IPC] SQLite.${methodName} called - Raw result:`);
                    logObjectProperties(result, 'Raw result', 0);
                    
                    // Check if result itself is Promise-like (has .then but isn't a Promise)
                    if (result && typeof result === 'object' && 'then' in result && !(result instanceof Promise)) {
                        console.error(`[IPC] ⚠️  WARNING: Result has .then property but is not a Promise!`);
                        console.error(`[IPC] Result type: ${typeof result}, isPromise: ${result instanceof Promise}`);
                        console.error(`[IPC] .then type: ${typeof result.then}`);
                    }
                }

                // Special handling for SQLite and WebApi methods which return data with potentially non-serializable objects
                // node-api-dotnet may wrap results in Promise-like objects that cannot be cloned
                if ((className === 'SQLite' || className === 'WebApi') && result !== null && result !== undefined) {
                    if (IPC_DEBUG_VERBOSE) {
                        console.log(`[IPC] Processing ${className}.${methodName} result...`);
                    }
                    
                    // Handle case where result is an array [Item1, Item2] instead of object {Item1, Item2}
                    // This happens when the Tuple gets serialized as an array
                    let cleanedResult = result;
                    if ((methodName === 'Execute') && Array.isArray(result) && result.length === 2) {
                        cleanedResult = {
                            Item1: result[0],
                            Item2: result[1]
                        };
                    }
                    
                    // Strip any Promise-like properties from the result object itself
                    cleanedResult = stripPromiseProperties(cleanedResult, `${className}.${methodName} result`);
                    
                    if (methodName === 'Execute' && cleanedResult.Item2 !== undefined) {
                        // For SQLite.Execute, Item2 is an array of rows that need sanitization
                        // For WebApi.Execute, Item2 is a string that just needs to be preserved
                        if (className === 'SQLite' && Array.isArray(cleanedResult.Item2)) {
                        // Convert Tuple<Item1, Item2> structure to a plain object
                        // Remove any Promise-like properties that node-api-dotnet might add
                        if (IPC_DEBUG_VERBOSE) {
                            console.log(`[IPC] SQLite.Execute: Processing ${cleanedResult.Item2.length} rows`);
                            if (cleanedResult.Item2.length > 0) {
                                console.log(`[IPC] First row before processing:`, {
                                    isArray: Array.isArray(cleanedResult.Item2[0]),
                                    type: typeof cleanedResult.Item2[0],
                                    keys: Object.keys(cleanedResult.Item2[0] || {}),
                                    length: cleanedResult.Item2[0]?.length,
                                    raw: cleanedResult.Item2[0]
                                });
                            }
                        }
                        const sanitizedItem2 = cleanedResult.Item2.map((row, rowIndex) => {
                            if (Array.isArray(row)) {
                                if (IPC_DEBUG_VERBOSE && rowIndex === 0) {
                                    console.log(`[IPC] Row ${rowIndex} is array with ${row.length} elements:`, row.slice(0, 5));
                                }
                                return row.map((cell) => {
                                    // Convert any remaining non-serializable values
                                    if (cell === null || cell === undefined) {
                                        return null;
                                    }
                                    // Ensure primitives only
                                    const type = typeof cell;
                                    if (
                                        type === 'string' ||
                                        type === 'number' ||
                                        type === 'boolean'
                                    ) {
                                        return cell;
                                    }
                                    // Convert everything else to string (handles DBNull, DateTime, etc.)
                                    try {
                                        return String(cell);
                                    } catch (e) {
                                        return null;
                                    }
                                });
                            }
                            // If row is an object (not an array), try to convert it to an array
                            // This can happen if the row was serialized as an object with numeric keys
                                    // or if it's an External object from .NET that doesn't expose enumerable properties
                                    if (typeof row === 'object' && row !== null) {
                                        if (IPC_DEBUG_VERBOSE && rowIndex === 0) {
                                            // Check if it's an External object without converting to string (which would fail)
                                            let isExternal = false;
                                            try {
                                                const str = String(row);
                                                isExternal = str.includes('[External:');
                                            } catch (e) {
                                                // If String() fails, it's likely an External object
                                                isExternal = true;
                                            }
                                            console.log(`[IPC] Row ${rowIndex} is object:`, {
                                                keys: Object.keys(row),
                                                ownPropertyNames: Object.getOwnPropertyNames(row),
                                                hasLength: 'length' in row,
                                                length: row.length,
                                                raw: row,
                                                isExternal: isExternal
                                            });
                                        }
                                
                                let arrayRow = null;
                                
                                // For External objects or objects with numeric indices, try to access them directly
                                // External objects from .NET don't expose properties via Object.keys() but data is accessible via indices
                                // Try to access row[0] first to see if it's an array-like object
                                let canAccessIndices = false;
                                try {
                                    // Directly try to access index 0 - External objects may support this
                                    // even if they don't support Object.keys() or 'in' operator
                                    const testValue = row[0];
                                    // If we got here without throwing, we can access indices
                                    // Check if we got a value (even if it's null, that's valid)
                                    canAccessIndices = true; // If we can access it, we can use it
                                } catch (e) {
                                    // Can't access indices - this is expected for some External objects
                                    // We'll fall back to other methods
                                    canAccessIndices = false;
                                }
                                
                                if (canAccessIndices) {
                                    // First, try to get length if available
                                    let rowLength = null;
                                    try {
                                        if ('length' in row && typeof row.length === 'number' && row.length > 0) {
                                            rowLength = row.length;
                                        }
                                    } catch (e) {
                                        // length not accessible
                                    }
                                    
                                    // If no length, probe for it by checking indices until we hit undefined
                                    // For SQLite rows, we need to probe more aggressively since External objects
                                    // might not expose all columns immediately
                                    if (rowLength === null) {
                                        // Try to probe up to 200 columns, but be more aggressive about continuing
                                        // even when we hit undefined values (they might be valid null columns)
                                        let lastValidIndex = -1;
                                        for (let probe = 0; probe < 200; probe++) { // Increased limit for wide tables
                                            try {
                                                const testValue = row[probe];
                                                // If we can access this index (even if null or undefined), it's valid
                                                // Only stop if we get an exception when trying to access
                                                lastValidIndex = probe;
                                            } catch (e) {
                                                // Can't access this index, we've reached the end
                                                if (lastValidIndex >= 0) {
                                                    rowLength = lastValidIndex + 1;
                                                }
                                                break;
                                            }
                                        }
                                        // If we made it through all 200 probes without exception, use that as length
                                        if (rowLength === null && lastValidIndex >= 0) {
                                            rowLength = lastValidIndex + 1;
                                        }
                                    }
                                    
                                    // Convert to array
                                    if (rowLength !== null || canAccessIndices) {
                                        // For SQLite rows, if we detected a length of 1 but we're expecting more columns,
                                        // try to force probe more columns (SQLite rows typically have 9+ columns)
                                        // This handles cases where the External object doesn't expose length correctly
                                        let actualMaxIndex = rowLength !== null ? rowLength - 1 : 199;
                                        if (rowLength === 1 && className === 'SQLite') {
                                            // Force probe at least 9 columns for SQLite (typical feed table has 9 columns)
                                            // Continue probing until we hit an exception
                                            actualMaxIndex = 8; // At least 9 columns (0-8)
                                            // Try to probe further if possible
                                            for (let probe = 9; probe < 200; probe++) {
                                                try {
                                                    const testValue = row[probe];
                                                    actualMaxIndex = probe; // This index is accessible
                                                } catch (e) {
                                                    // Can't access this index, stop here
                                                    break;
                                                }
                                            }
                                        }
                                        
                                        if (IPC_DEBUG_VERBOSE && rowIndex === 0) {
                                            console.log(`[IPC] Converting row ${rowIndex} External/object to array, detected length: ${rowLength || 'probing'}, using maxIndex: ${actualMaxIndex}`);
                                        }
                                        arrayRow = [];
                                        for (let i = 0; i <= actualMaxIndex; i++) {
                                            try {
                                                const value = row[i];
                                                // Convert any remaining non-serializable values
                                                if (value === null || value === undefined) {
                                                    arrayRow.push(null);
                                                } else {
                                                    const type = typeof value;
                                                    if (
                                                        type === 'string' ||
                                                        type === 'number' ||
                                                        type === 'boolean'
                                                    ) {
                                                        arrayRow.push(value);
                                                    } else {
                                                        // Convert everything else to string
                                                        try {
                                                            arrayRow.push(String(value));
                                                        } catch (e) {
                                                            arrayRow.push(null);
                                                        }
                                                    }
                                                }
                                            } catch (e) {
                                                // Can't access this index, push null and continue
                                                // (we're forcing a specific length, so we need all indices)
                                                arrayRow.push(null);
                                            }
                                        }
                                        if (arrayRow.length > 0) {
                                            if (IPC_DEBUG_VERBOSE && rowIndex === 0) {
                                                console.log(`[IPC] Successfully converted External row to array with ${arrayRow.length} elements`);
                                            }
                                            return arrayRow;
                                        }
                                    }
                                }
                                
                                // Fallback: Check for numeric keys in own properties (for non-External objects)
                                const keys = Object.keys(row);
                                const ownProps = Object.getOwnPropertyNames(row);
                                const numericKeys = ownProps.filter(k => /^\d+$/.test(k));
                                if (numericKeys.length > 0) {
                                    if (IPC_DEBUG_VERBOSE && rowIndex === 0) {
                                        console.log(`[IPC] Converting row ${rowIndex} object to array, found ${numericKeys.length} numeric keys`);
                                    }
                                    // Convert object with numeric keys to array
                                    const maxIndex = Math.max(...numericKeys.map(k => parseInt(k, 10)));
                                    arrayRow = [];
                                    for (let i = 0; i <= maxIndex; i++) {
                                        const value = row[i];
                                        // Convert any remaining non-serializable values
                                        if (value === null || value === undefined) {
                                            arrayRow.push(null);
                                        } else {
                                            const type = typeof value;
                                            if (
                                                type === 'string' ||
                                                type === 'number' ||
                                                type === 'boolean'
                                            ) {
                                                arrayRow.push(value);
                                            } else {
                                                // Convert everything else to string
                                                try {
                                                    arrayRow.push(String(value));
                                                } catch (e) {
                                                    arrayRow.push(null);
                                                }
                                            }
                                        }
                                    }
                                    return arrayRow;
                                }
                                
                                // If it's not a numeric-keyed object, strip Promise properties
                                return stripPromiseProperties(row);
                            }
                            return row;
                        });

                        // Create a completely plain object to replace the Tuple wrapper
                        // Use Object.create(null) to ensure no prototype chain and no inherited properties
                        const plainResult = Object.create(null);
                        // Ensure Item1 is also a plain value (string or null)
                        plainResult.Item1 =
                            cleanedResult.Item1 == null ? null : String(cleanedResult.Item1);
                        plainResult.Item2 = sanitizedItem2;
                        cleanedResult = plainResult;
                        } else if (className === 'WebApi') {
                            // For WebApi.Execute, Item1 is int (status code), Item2 is string (response body)
                            // Create a plain object to ensure proper serialization
                            const plainResult = Object.create(null);
                            plainResult.Item1 = typeof cleanedResult.Item1 === 'number' ? cleanedResult.Item1 : Number(cleanedResult.Item1) || 0;
                            plainResult.Item2 = cleanedResult.Item2 == null ? null : String(cleanedResult.Item2);
                            cleanedResult = plainResult;
                        }
                    } else if (methodName === 'ExecuteJson') {
                        // ExecuteJson returns a string, but ensure it's a plain string
                        if (typeof cleanedResult !== 'string') {
                            // If somehow it's not a string, convert it
                            cleanedResult = String(cleanedResult);
                        }
                    } else if (methodName === 'ExecuteNonQuery') {
                        // ExecuteNonQuery returns an int, ensure it's a plain number
                        if (typeof cleanedResult !== 'number') {
                            // Convert to number if needed
                            cleanedResult = Number(cleanedResult) || 0;
                        }
                    } else {
                        // For any other SQLite method, strip Promise properties
                        cleanedResult = stripPromiseProperties(cleanedResult);
                    }
                    
                    // Assign the cleaned result back
                    result = cleanedResult;
                    
                    if (IPC_DEBUG_VERBOSE) {
                        console.log(`[IPC] SQLite.${methodName} - After cleaning:`);
                        logObjectProperties(result, 'Cleaned result', 0);
                    }
                }

                // Sanitize return value to ensure it's serializable
                if (IPC_DEBUG_VERBOSE) {
                    console.log(`[IPC] ${className}.${methodName} - Before sanitization:`);
                    logObjectProperties(result, 'Before sanitization', 0);
                }
                const sanitized = sanitizeValue(result);
                if (IPC_DEBUG_VERBOSE) {
                    console.log(`[IPC] ${className}.${methodName} - After sanitization:`);
                    logObjectProperties(sanitized, 'After sanitization', 0);
                }

                // Use JSON round-trip first, then test with v8.serialize (structured clone)
                // v8.serialize uses the same structured clone algorithm as Electron IPC
                try {
                    if (IPC_DEBUG_VERBOSE) {
                        console.log(`[IPC] ${className}.${methodName} - Attempting JSON.stringify...`);
                    }
                    // Handle undefined/null values - JSON.stringify(undefined) returns undefined, not a string
                    if (sanitized === undefined || sanitized === null) {
                        if (IPC_DEBUG_VERBOSE) {
                            console.log(`[IPC] ${className}.${methodName} - Result is ${sanitized}, returning as-is`);
                        }
                        return sanitized;
                    }
                    const jsonString = JSON.stringify(sanitized);
                    if (IPC_DEBUG_VERBOSE) {
                        console.log(`[IPC] ${className}.${methodName} - JSON.stringify succeeded, length: ${jsonString?.length ?? 0}`);
                    }
                    const jsonCloned = JSON.parse(jsonString);
                    if (IPC_DEBUG_VERBOSE) {
                        console.log(`[IPC] ${className}.${methodName} - JSON.parse succeeded`);
                    }

                    // Test with v8.serialize to ensure it's compatible with Electron's structured clone
                    try {
                        if (IPC_DEBUG_VERBOSE) {
                            console.log(`[IPC] ${className}.${methodName} - Attempting v8.serialize...`);
                        }
                        const serialized = v8.serialize(jsonCloned);
                        if (IPC_DEBUG_VERBOSE) {
                            console.log(`[IPC] ${className}.${methodName} - v8.serialize succeeded, length: ${serialized.length}`);
                        }
                        const deserialized = v8.deserialize(serialized);
                        if (IPC_DEBUG_VERBOSE) {
                            console.log(`[IPC] ${className}.${methodName} - v8.deserialize succeeded`);
                        }
                        
                        // Final safety check: ensure the deserialized value can be cloned again
                        // (Electron IPC might clone it one more time when sending)
                        try {
                            if (IPC_DEBUG_VERBOSE) {
                                console.log(`[IPC] ${className}.${methodName} - Final clone check...`);
                            }
                            v8.serialize(deserialized);
                            if (IPC_DEBUG_VERBOSE) {
                                console.log(`[IPC] ${className}.${methodName} - ✅ Successfully serialized, returning result`);
                            }
                            return deserialized;
                        } catch (finalCloneError) {
                            console.error(
                                `[IPC] ${className}.${methodName} - ❌ Final clone check failed:`,
                                finalCloneError
                            );
                            if (IPC_DEBUG_VERBOSE) {
                                console.error(`[IPC] Error details:`, {
                                    message: finalCloneError?.message,
                                    name: finalCloneError?.name,
                                    stack: finalCloneError?.stack
                                });
                                logObjectProperties(deserialized, 'Failed object', 0);
                            }
                            // Use the plain copy instead
                            const finalPlainCopy = createPlainCopy(jsonCloned);
                            v8.serialize(finalPlainCopy);
                            return finalPlainCopy;
                        }
                    } catch (v8Error) {
                        // If v8 serialization fails, try to create an even more plain object
                        console.error(
                            `[IPC] ${className}.${methodName} - ❌ v8 serialization failed:`,
                            v8Error
                        );
                        if (IPC_DEBUG_VERBOSE) {
                            console.error(`[IPC] v8Error details:`, {
                                message: v8Error?.message,
                                name: v8Error?.name,
                                stack: v8Error?.stack
                            });
                            logObjectProperties(jsonCloned, 'Object that failed v8.serialize', 0);
                        }
                        
                        // Create a completely plain object by recursively copying only plain properties
                        const plainCopy = createPlainCopy(jsonCloned);
                        try {
                            if (IPC_DEBUG_VERBOSE) {
                                console.log(`[IPC] ${className}.${methodName} - Trying plainCopy...`);
                            }
                            v8.serialize(plainCopy);
                            if (IPC_DEBUG_VERBOSE) {
                                console.log(`[IPC] ${className}.${methodName} - ✅ plainCopy serialization succeeded`);
                            }
                            return plainCopy;
                        } catch (e2) {
                            // Last resort: return a safe representation
                            console.error(
                                `[IPC] ${className}.${methodName} - ❌ Deep sanitization also failed:`,
                                e2
                            );
                            if (IPC_DEBUG_VERBOSE) {
                                logObjectProperties(plainCopy, 'Object that failed even after plainCopy', 0);
                            }
                            return {
                                __serializationError: true,
                                __error: v8Error?.message || String(v8Error),
                                __type: typeof result,
                                __stringified: String(result)
                            };
                        }
                    }
                } catch (jsonError) {
                    // If JSON round-trip fails, try to convert to a safe format
                    console.error(
                        `[IPC] ${className}.${methodName} - ❌ JSON.stringify/parse failed:`,
                        jsonError
                    );
                    if (IPC_DEBUG_VERBOSE) {
                        console.error(`[IPC] jsonError details:`, {
                            message: jsonError?.message,
                            name: jsonError?.name,
                            stack: jsonError?.stack
                        });
                        logObjectProperties(sanitized, 'Object that failed JSON.stringify', 0);
                    }
                    
                    // Return a safe representation
                    return {
                        __serializationError: true,
                        __error: jsonError?.message || String(jsonError),
                        __type: typeof result,
                        __stringified: String(result)
                    };
                }
            } catch (error) {
                // Log detailed error information
                console.error(
                    `[IPC] ${className}.${methodName} - ❌ Error in callDotNetMethod:`,
                    {
                        className,
                        methodName,
                        errorMessage: error?.message,
                        errorName: error?.name,
                        errorStack: error?.stack,
                        argsLength: Array.isArray(args)
                            ? args.length
                            : 'not-array'
                    }
                );
                
                // Check if it's a cloning error
                if (error?.message?.includes('clone') || error?.message?.includes('could not be cloned')) {
                    console.error(`[IPC] ${className}.${methodName} - This appears to be a cloning error!`);
                    console.error(`[IPC] Full error:`, error);
                }

                // Make sure errors are serializable too
                // Preserve the original error message as much as possible
                const originalMessage = error?.message || String(error);
                const errorObj = {
                    message: originalMessage,
                    name: error?.name || 'Error',
                    stack:
                        typeof error?.stack === 'string'
                            ? error.stack.substring(0, 1000) // Limit stack trace length
                            : undefined,
                    className,
                    methodName
                };

                // Return a serializable error object instead of throwing
                // This prevents "object could not be cloned" errors when Electron tries to serialize the error
                try {
                    // Test that the error object itself is serializable
                    JSON.stringify(errorObj);
                    v8.serialize(errorObj);
                    // If serialization works, throw a new Error with the stringified message
                    // This ensures the error is properly caught by the renderer's promise rejection
                    const errorMessage = JSON.stringify(errorObj);
                    console.error(`[IPC] Throwing serialized error from inner catch:`, errorMessage);
                    throw new Error(errorMessage);
                } catch (serializationError) {
                    // If even the error object can't be serialized, return a minimal safe error
                    console.error(
                        `Failed to serialize error object:`,
                        serializationError
                    );
                    throw new Error(
                        `Error calling ${className}.${methodName}: ${String(error)}`
                    );
                }
            }
        } catch (outerError) {
            // Final safety net: if anything goes wrong, return a guaranteed serializable error
            // This catches any unexpected cloning errors that might occur
            console.error(
                `[IPC] ${className}.${methodName} - ❌❌ Unexpected error in callDotNetMethod handler:`,
                outerError
            );
            console.error(`[IPC] Outer error details:`, {
                message: outerError?.message,
                name: outerError?.name,
                stack: outerError?.stack
            });
            
            // Check if it's a cloning error
            if (outerError?.message?.includes('clone') || outerError?.message?.includes('could not be cloned')) {
                console.error(`[IPC] ${className}.${methodName} - This appears to be a cloning error at the outer level!`);
            }
            try {
                // Try to create a minimal serializable error with the original message
                const originalMessage = outerError?.message || String(outerError);
                const safeError = {
                    __unexpectedError: true,
                    message: originalMessage,
                    className,
                    methodName
                };
                const serialized = JSON.stringify(safeError);
                console.error(`[IPC] Throwing serialized error:`, serialized);
                throw new Error(serialized);
            } catch (e) {
                // Absolute last resort - include original error message if possible
                const originalMessage = outerError?.message || String(outerError);
                console.error(`[IPC] Last resort error - original message:`, originalMessage);
                throw new Error(`Failed to execute ${className}.${methodName}: ${originalMessage.substring(0, 200)}`);
            }
        }
    }
);

/** @type {BrowserWindow} */
let mainWindow = undefined;

const VRCXStorage = interopApi.getDotNetObject('VRCXStorage');
const hasAskedToMoveAppImage =
    VRCXStorage.Get('VRCX_HasAskedToMoveAppImage') === 'true';

function getCloseToTray() {
    if (process.platform === 'darwin') {
        return true;
    }
    return VRCXStorage.Get('VRCX_CloseToTray') === 'true';
}

const gotTheLock = app.requestSingleInstanceLock();
const strip_vrcx_prefix_regex = new RegExp('^' + VRCX_URI_PREFIX + '://');

if (!gotTheLock) {
    console.log('Another instance is already running. Exiting.');
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow && commandLine.length >= 2) {
            try {
                mainWindow.webContents.send(
                    'launch-command',
                    commandLine
                        .pop()
                        .trim()
                        .replace(strip_vrcx_prefix_regex, '')
                );
            } catch (err) {
                console.error('Error processing second-instance command:', err);
            }
        }
    });

    app.on('open-url', (event, url) => {
        if (mainWindow && url) {
            mainWindow.webContents.send(
                'launch-command',
                url.replace(strip_vrcx_prefix_regex, '')
            );
        }
    });
}

ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png'] }]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('notification:showNotification', (event, title, body, icon) => {
    const notification = {
        title,
        body,
        icon
    };
    new Notification(notification).show();
});

ipcMain.handle('app:restart', () => {
    if (process.platform === 'linux') {
        const options = {
            execPath: process.execPath,
            args: process.argv.slice(1)
        };
        if (appImagePath) {
            options.execPath = appImagePath;
            if (!x11 && !options.args.includes('--appimage-extract-and-run')) {
                options.args.unshift('--appimage-extract-and-run');
            }
        }
        app.relaunch(options);
        app.exit(0);
    } else {
        app.relaunch();
        app.quit();
    }
});

ipcMain.handle('app:getWristOverlayWindow', () => {
    if (wristOverlayWindow && wristOverlayWindow.webContents) {
        return (
            !wristOverlayWindow.webContents.isLoading() &&
            wristOverlayWindow.webContents.isPainting()
        );
    }
    return false;
});

ipcMain.handle('app:getHmdOverlayWindow', () => {
    if (hmdOverlayWindow && hmdOverlayWindow.webContents) {
        return (
            !hmdOverlayWindow.webContents.isLoading() &&
            hmdOverlayWindow.webContents.isPainting()
        );
    }
    return false;
});

ipcMain.handle(
    'app:updateVr',
    (event, active, hmdOverlay, wristOverlay, menuButton, overlayHand) => {
        if (!active) {
            disposeOverlay();
            return;
        }
        isOverlayActive = true;

        if (!hmdOverlay) {
            destroyHmdOverlayWindow();
        } else if (active && !hmdOverlayWindow) {
            createHmdOverlayWindowOffscreen();
        }

        if (!wristOverlay) {
            destroyWristOverlayWindow();
        } else if (active && !wristOverlayWindow) {
            createWristOverlayWindowOffscreen();
        }
    }
);

ipcMain.handle('app:getArch', () => {
    return process.arch.toString();
});

ipcMain.handle('app:setTrayIconNotification', (event, notify) => {
    setTrayIconNotification(notify);
});

function tryRelaunchWithArgs(args) {
    if (
        process.platform !== 'linux' ||
        x11 ||
        args.includes('--ozone-platform-hint=auto')
    ) {
        return;
    }

    const fullArgs = ['--ozone-platform-hint=auto', ...args];

    let execPath = process.execPath;

    if (appImagePath) {
        execPath = appImagePath;
        fullArgs.unshift('--appimage-extract-and-run');
    }

    console.log('Relaunching with args:', fullArgs);

    const child = spawn(execPath, fullArgs, {
        detached: true,
        stdio: 'inherit'
    });

    child.unref();

    app.exit(0);
}

function createWindow() {
    app.commandLine.appendSwitch('enable-speech-dispatcher');

    const x = parseInt(VRCXStorage.Get('VRCX_LocationX')) || 0;
    const y = parseInt(VRCXStorage.Get('VRCX_LocationY')) || 0;
    const width = parseInt(VRCXStorage.Get('VRCX_SizeWidth')) || 1920;
    const height = parseInt(VRCXStorage.Get('VRCX_SizeHeight')) || 1080;
    mainWindow = new BrowserWindow({
        x,
        y,
        width,
        height,
        title: 'VRCXM',
        icon: path.join(rootDir, 'VRCX.png'),
        autoHideMenuBar: true,
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Set CSP via Electron's session API to suppress the warning
    // This acknowledges we're intentionally using unsafe-eval for Vue.js
    const csp =
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:; worker-src 'self' blob:;";
    mainWindow.webContents.session.webRequest.onHeadersReceived(
        (details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [csp]
                }
            });
        }
    );

    // Also set it directly in the session to suppress the warning
    mainWindow.webContents.session.setPermissionRequestHandler(() => {
        // Allow all permissions for local content
    });

    applyWindowState();
    
    // Check if we're in dev mode (when NODE_ENV is 'development' or DEV env var is set)
    const isDev = process.env.NODE_ENV === 'development' || process.env.DEV === 'true';
    
    if (isDev) {
        // Load from Vite dev server
        const devServerUrl = 'http://localhost:9000';
        console.log(`[DEV] Loading from Vite dev server: ${devServerUrl}`);
        
        // Retry loading if the dev server isn't ready yet
        let retryCount = 0;
        const maxRetries = 30; // 30 seconds max wait
        
        const tryLoadDevServer = () => {
            mainWindow.loadURL(devServerUrl);
        };
        
        // Handle failed loads and retry
        const failLoadHandler = (event, errorCode, errorDescription, validatedURL) => {
            if (validatedURL === devServerUrl && retryCount < maxRetries) {
                retryCount++;
                console.log(`[DEV] Dev server not ready, retrying... (${retryCount}/${maxRetries})`);
                setTimeout(tryLoadDevServer, 1000);
            } else if (retryCount >= maxRetries) {
                console.error('[DEV] Dev server failed to start, falling back to built files');
                mainWindow.webContents.removeListener('did-fail-load', failLoadHandler);
                const indexPath = path.join(rootDir, 'build/html/index.html');
                mainWindow.loadFile(indexPath);
            }
        };
        
        mainWindow.webContents.on('did-fail-load', failLoadHandler);
        
        // Remove listener on successful load
        mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.removeListener('did-fail-load', failLoadHandler);
            console.log('[DEV] Successfully loaded from dev server');
        });
        
        tryLoadDevServer();
        
        // Open DevTools in dev mode
        mainWindow.webContents.openDevTools();
    } else {
        // Load from built files
        const indexPath = path.join(rootDir, 'build/html/index.html');
        mainWindow.loadFile(indexPath);
    }

    // add proxy config, doesn't work, thanks electron
    // const proxy = VRCXStorage.Get('VRCX_Proxy');
    // if (proxy) {
    //     session.setProxy(
    //         { proxyRules: proxy.replaceAll('://', '=') },
    //         function () {
    //             mainWindow.loadFile(indexPath);
    //         }
    //     );
    //     session.setProxy({
    //         proxyRules: proxy.replaceAll('://', '=')
    //     });
    // }

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.key === '=') {
            mainWindow.webContents.setZoomLevel(
                mainWindow.webContents.getZoomLevel() + 1
            );
        }
    });

    mainWindow.webContents.on('zoom-changed', (event, zoomDirection) => {
        const currentZoom = mainWindow.webContents.getZoomLevel();
        if (zoomDirection === 'in') {
            mainWindow.webContents.setZoomLevel(currentZoom + 1);
        } else {
            mainWindow.webContents.setZoomLevel(currentZoom - 1);
        }
    });
    mainWindow.webContents.setVisualZoomLevelLimits(1, 5);

    mainWindow.on('close', (event) => {
        if (getCloseToTray() && !appIsQuitting) {
            event.preventDefault();
            mainWindow.hide();
        } else {
            app.quit();
        }
    });

    mainWindow.on('resize', () => {
        const [width, height] = mainWindow
            .getSize()
            .map((size) => size.toString());
        mainWindow.webContents.send('setWindowSize', { width, height });
    });

    mainWindow.on('move', () => {
        const [x, y] = mainWindow
            .getPosition()
            .map((coord) => coord.toString());
        mainWindow.webContents.send('setWindowPosition', { x, y });
    });

    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('setWindowState', '2');
    });

    mainWindow.on('minimize', () => {
        mainWindow.webContents.send('setWindowState', '1');
    });

    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('setWindowState', '0');
    });

    mainWindow.on('restore', () => {
        mainWindow.webContents.send('setWindowState', '0');
    });

    mainWindow.on('focus', () => {
        mainWindow.webContents.send('onBrowserFocus');
    });
}

let wristOverlayWindow = undefined;

function createWristOverlayWindowOffscreen() {
    if (!fs.existsSync(WRIST_SHM_PATH)) {
        createWristOverlayWindowShm();
    }

    const x = parseInt(VRCXStorage.Get('VRCX_LocationX')) || 0;
    const y = parseInt(VRCXStorage.Get('VRCX_LocationY')) || 0;
    const width = WRIST_FRAME_WIDTH;
    const height = WRIST_FRAME_HEIGHT;

    wristOverlayWindow = new BrowserWindow({
        x,
        y,
        width,
        height,
        icon: path.join(rootDir, 'VRCX.png'),
        autoHideMenuBar: true,
        transparent: true,
        frame: false,
        show: false,
        webPreferences: {
            offscreen: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    wristOverlayWindow.webContents.setFrameRate(2);

    const indexPath = path.join(rootDir, 'build/html/vr.html');
    const fileUrl = `file://${indexPath}?wrist`;
    wristOverlayWindow.loadURL(fileUrl, { userAgent: version });

    // Use paint event for offscreen rendering
    wristOverlayWindow.webContents.on('paint', (event, dirty, image) => {
        const buffer = image.toBitmap();
        //console.log('Captured wrist frame via paint event, size:', buffer.length);
        writeWristFrame(buffer);
    });
}

function writeWristFrame(imageBuffer) {
    try {
        const fd = fs.openSync(WRIST_SHM_PATH, 'r+');
        const buffer = Buffer.alloc(WRIST_FRAME_SIZE + 1);
        buffer[0] = 0; // not ready
        imageBuffer.copy(buffer, 1, 0, WRIST_FRAME_SIZE);
        buffer[0] = 1; // ready
        fs.writeSync(fd, buffer);
        fs.closeSync(fd);
        //console.log('Wrote wrist frame to shared memory');
    } catch (err) {
        console.error('Error writing wrist frame to shared memory:', err);
    }
}

function destroyWristOverlayWindow() {
    if (wristOverlayWindow && !wristOverlayWindow.isDestroyed()) {
        wristOverlayWindow.close();
    }
    wristOverlayWindow = undefined;
}

let hmdOverlayWindow = undefined;

function createHmdOverlayWindowOffscreen() {
    if (!fs.existsSync(HMD_SHM_PATH)) {
        createHmdOverlayWindowShm();
    }

    const x = parseInt(VRCXStorage.Get('VRCX_LocationX')) || 0;
    const y = parseInt(VRCXStorage.Get('VRCX_LocationY')) || 0;
    const width = HMD_FRAME_WIDTH;
    const height = HMD_FRAME_HEIGHT;

    hmdOverlayWindow = new BrowserWindow({
        x,
        y,
        width,
        height,
        icon: path.join(rootDir, 'VRCX.png'),
        autoHideMenuBar: true,
        transparent: true,
        frame: false,
        show: false,
        webPreferences: {
            offscreen: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    hmdOverlayWindow.webContents.setFrameRate(48);

    const indexPath = path.join(rootDir, 'build/html/vr.html');
    const fileUrl = `file://${indexPath}?hmd`;
    hmdOverlayWindow.loadURL(fileUrl, { userAgent: version });

    // Use paint event for offscreen rendering
    hmdOverlayWindow.webContents.on('paint', (event, dirty, image) => {
        const buffer = image.toBitmap();
        //console.log('Captured HMD frame via paint event, size:', buffer.length);
        writeHmdFrame(buffer);
    });
}

function writeHmdFrame(imageBuffer) {
    try {
        const fd = fs.openSync(HMD_SHM_PATH, 'r+');
        const buffer = Buffer.alloc(HMD_FRAME_SIZE + 1);
        buffer[0] = 0; // not ready
        imageBuffer.copy(buffer, 1, 0, HMD_FRAME_SIZE);
        buffer[0] = 1; // ready
        fs.writeSync(fd, buffer);
        fs.closeSync(fd);
        //console.log('Wrote HMD frame to shared memory');
    } catch (err) {
        console.error('Error writing HMD frame to shared memory:', err);
    }
}

function destroyHmdOverlayWindow() {
    if (hmdOverlayWindow && !hmdOverlayWindow.isDestroyed()) {
        hmdOverlayWindow.close();
    }
    hmdOverlayWindow = undefined;
}

let tray = null;
let trayIcon = null;
let trayIconNotify = null;
function createTray() {
    if (process.platform === 'darwin') {
        const image = nativeImage.createFromPath(
            path.join(rootDir, 'images/VRCX.png')
        );
        trayIcon = image.resize({ width: 16, height: 16 });

        const imageNotify = nativeImage.createFromPath(
            path.join(rootDir, 'images/VRCX_notify.png')
        );
        trayIconNotify = imageNotify.resize({ width: 16, height: 16 });
    } else if (process.platform === 'linux') {
        const image = nativeImage.createFromPath(
            path.join(rootDir, 'images/VRCX.png')
        );
        trayIcon = image.resize({ width: 64, height: 64 });

        const imageNotify = nativeImage.createFromPath(
            path.join(rootDir, 'images/VRCX_notify.png')
        );
        trayIconNotify = imageNotify.resize({ width: 64, height: 64 });
    } else {
        trayIcon = path.join(rootDir, 'images/VRCX.ico');
        trayIconNotify = path.join(rootDir, 'images/VRCX_notify.ico');
    }
    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open',
            type: 'normal',
            click: function () {
                mainWindow.show();
            }
        },
        {
            label: 'DevTools',
            type: 'normal',
            click: function () {
                mainWindow.webContents.openDevTools();
            }
        },
        {
            label: 'Quit VRCXM',
            type: 'normal',
            click: function () {
                appIsQuitting = true;
                app.quit();
            }
        }
    ]);
    tray.setToolTip('VRCXM');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.show();
    });
}

function setTrayIconNotification(notify) {
    tray.setImage(notify ? trayIconNotify : trayIcon);
}

async function installVRCX() {
    console.log('Home path:', homePath);
    console.log('AppImage path:', appImagePath);
    if (!appImagePath) {
        console.error('AppImage path is not available!');
        return;
    }
    if (noInstall) {
        interopApi.getDotNetObject('Update').Init(appImagePath);
        console.log('Skipping installation.');
        return;
    }

    // rename AppImage to VRCXM.AppImage
    const currentName = path.basename(appImagePath);
    const expectedName = 'VRCXM.AppImage';
    if (currentName !== expectedName) {
        const newPath = path.join(path.dirname(appImagePath), expectedName);
        try {
            // remove existing VRCXM.AppImage
            if (fs.existsSync(newPath)) {
                fs.unlinkSync(newPath);
            }
            fs.renameSync(appImagePath, newPath);
            console.log('AppImage renamed to:', newPath);
            appImagePath = newPath;
        } catch (err) {
            console.error(`Error renaming AppImage ${newPath}`, err);
            dialog.showErrorBox('VRCXM', `Failed to rename AppImage ${newPath}`);
            return;
        }
    }

    // ask to move AppImage to ~/Applications
    const appImageHomePath = `${homePath}/Applications/VRCXM.AppImage`;
    if (!hasAskedToMoveAppImage && appImagePath !== appImageHomePath) {
        const result = dialog.showMessageBoxSync(mainWindow, {
            type: 'question',
            title: 'VRCXM',
            message: 'Do you want to install VRCXM?',
            detail: 'VRCXM will be moved to your ~/Applications folder.',
            buttons: ['No', 'Yes']
        });
        if (result === 0) {
            console.log('Cancel AppImage move to ~/Applications');
            // don't ask again
            VRCXStorage.Set('VRCX_HasAskedToMoveAppImage', 'true');
            VRCXStorage.Save();
        }
        if (result === 1) {
            console.log('Moving AppImage to ~/Applications');
            try {
                const applicationsPath = path.join(homePath, 'Applications');
                // create ~/Applications if it doesn't exist
                if (!fs.existsSync(applicationsPath)) {
                    fs.mkdirSync(applicationsPath);
                }
                // remove existing VRCXM.AppImage
                if (fs.existsSync(appImageHomePath)) {
                    fs.unlinkSync(appImageHomePath);
                }
                fs.renameSync(appImagePath, appImageHomePath);
                appImagePath = appImageHomePath;
                console.log('AppImage moved to:', appImageHomePath);
            } catch (err) {
                console.error(`Error moving AppImage ${appImageHomePath}`, err);
                dialog.showErrorBox(
                    'VRCXM',
                    `Failed to move AppImage ${appImageHomePath}`
                );
                return;
            }
        }
    }

    // inform .NET side about AppImage path
    interopApi.getDotNetObject('Update').Init(appImagePath);

    await createDesktopFile();
}

async function createDesktopFile() {
    if (noDesktop) {
        console.log('Skipping desktop file creation.');
        return;
    }

    // Download the icon and save it to the target directory
    const iconPath = path.join(homePath, '.local/share/icons/VRCX.png');
    if (!fs.existsSync(iconPath)) {
        const iconDir = path.dirname(iconPath);
        if (!fs.existsSync(iconDir)) {
            fs.mkdirSync(iconDir, { recursive: true });
        }
        const iconUrl =
            'https://raw.githubusercontent.com/naiolune/VRCXM/master/VRCX.png';
        await downloadIcon(iconUrl, iconPath)
            .then(() => {
                console.log('Icon downloaded and saved to:', iconPath);
            })
            .catch((err) => {
                console.error('Error downloading icon:', err);
                dialog.showErrorBox('VRCXM', 'Failed to download the icon.');
            });
    }

    // Create the desktop file
    const desktopFilePath = path.join(
        homePath,
        '.local/share/applications/VRCX.desktop'
    );

    const dotDesktop = {
        Name: 'VRCXM',
        Version: version,
        Comment: 'Friendship management tool for VRChat',
        Exec: `${appImagePath} --ozone-platform-hint=auto %U`,
        Icon: 'VRCX',
        Type: 'Application',
        Categories: 'Network;InstantMessaging;Game;',
        Terminal: 'false',
        StartupWMClass: 'VRCXM',
        MimeType: 'x-scheme-handler/vrcx;'
    };
    const desktopFile =
        '[Desktop Entry]\n' +
        Object.entries(dotDesktop)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
    try {
        // Create the applications directory if it doesn't exist
        const desktopDir = path.dirname(desktopFilePath);
        if (!fs.existsSync(desktopDir)) {
            fs.mkdirSync(desktopDir, { recursive: true });
        }

        // Create/update the desktop file when needed
        let existingDesktopFile = '';
        if (fs.existsSync(desktopFilePath)) {
            existingDesktopFile = fs.readFileSync(desktopFilePath, 'utf8');
        }
        if (existingDesktopFile !== desktopFile) {
            fs.writeFileSync(desktopFilePath, desktopFile);
            console.log('Desktop file created at:', desktopFilePath);

            const result = spawnSync(
                'xdg-mime',
                ['default', 'VRCX.desktop', 'x-scheme-handler/vrcx'],
                {
                    encoding: 'utf-8'
                }
            );
            if (result.error) {
                console.error('Error setting MIME type:', result.error);
            } else {
                console.log('MIME type set x-scheme-handler/vrcx');
            }
        }
    } catch (err) {
        console.error('Error creating desktop file:', err);
                dialog.showErrorBox('VRCXM', 'Failed to create desktop entry.');
        return;
    }
}

function downloadIcon(url, targetPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(targetPath);
        https
            .get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(
                        new Error(
                            `Failed to download icon, status code: ${response.statusCode}`
                        )
                    );
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            })
            .on('error', (err) => {
                fs.unlink(targetPath, () => reject(err)); // Delete the file if error occurs
            });
    });
}

function getVRCXPath() {
    if (process.platform === 'win32') {
        return path.join(process.env.APPDATA, 'VRCXM');
    } else if (process.platform === 'linux') {
        return path.join(process.env.HOME, '.config/VRCXM');
    } else if (process.platform === 'darwin') {
        return path.join(process.env.HOME, 'Library/Application Support/VRCXM');
    }
    return '';
}

function getHomePath() {
    const relativeHomePath = path.join(app.getPath('home'));
    try {
        const absoluteHomePath = fs.realpathSync(relativeHomePath);
        return absoluteHomePath;
    } catch (err) {
        console.error('Error resolving absolute home path:', err);
        return relativeHomePath;
    }
}

function getVersion() {
    try {
        const versionFile = fs
            .readFileSync(path.join(rootDir, 'Version'), 'utf8')
            .trim();

        // look for trailing git hash "-22bcd96" to indicate nightly build
        const version = versionFile.split('-');
        console.log('Version:', versionFile);
        
        // Detect platform
        const platform = process.platform === 'linux' ? 'Linux' : 
                        process.platform === 'win32' ? 'Windows' :
                        process.platform === 'darwin' ? 'macOS' : 'Unknown';
        
        if (version.length > 0 && version[version.length - 1].length == 7) {
            return `VRCXM (${platform}) Nightly ${versionFile}`;
        } else {
            return `VRCXM (${platform}) ${versionFile}`;
        }
    } catch (err) {
        console.error('Error reading Version:', err);
        const platform = process.platform === 'linux' ? 'Linux' : 
                        process.platform === 'win32' ? 'Windows' :
                        process.platform === 'darwin' ? 'macOS' : 'Unknown';
        return `VRCXM (${platform}) Nightly Build`;
    }
}

function isDotNetInstalled() {
    let dotnetPath;

    if (process.env.DOTNET_ROOT) {
        dotnetPath = path.join(process.env.DOTNET_ROOT, 'dotnet');
        if (!fs.existsSync(dotnetPath)) {
            // fallback to command
            dotnetPath = 'dotnet';
        }
    } else {
        // fallback to command
        dotnetPath = 'dotnet';
    }

    console.log('Checking for .NET installation at:', dotnetPath);

    // Fallback to system .NET runtime
    const result = spawnSync(dotnetPath, ['--list-runtimes'], {
        encoding: 'utf-8'
    });
    if (result.error) {
        console.error('Error checking .NET runtimes:', result.error);
        return false;
    }
    return result.stdout?.includes('.NETCore.App 9.0');
}

// Migration function removed - this is a separate app (VRCXM), no migration from VRCX needed
function tryCopyFromWinePrefix() {
    // Migration disabled - VRCXM is a separate app with its own data folder
    // No migration from VRCX to VRCXM
    return;
}

function applyWindowState() {
    if (VRCXStorage.Get('VRCX_StartAsMinimizedState') === 'true' && startup) {
        if (getCloseToTray()) {
            mainWindow.hide();
            return;
        }
        mainWindow.minimize();
        return;
    }
    const windowState = parseInt(VRCXStorage.Get('VRCX_WindowState')) || -1;
    switch (windowState) {
        case -1:
            break;
        case 0:
            mainWindow.restore();
            break;
        case 1:
            mainWindow.minimize();
            break;
        case 2:
            mainWindow.maximize();
            break;
    }
}

app.whenReady().then(() => {
    createWindow();
    createTray();

    if (process.platform === 'linux') {
        try {
            createWristOverlayWindowOffscreen();
            createHmdOverlayWindowOffscreen();
        } catch (err) {
            console.error('Error creating overlay windows:', err);
        }
    }

    installVRCX();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else {
            // Ensure main window shows when clicking Dock icon (critical for macOS)
            if (mainWindow && !mainWindow.isVisible()) {
                mainWindow.show();
            }
        }
    });
});

function disposeOverlay() {
    if (!isOverlayActive) {
        return;
    }
    isOverlayActive = false;
    if (wristOverlayWindow) {
        wristOverlayWindow.close();
        wristOverlayWindow = undefined;
    }
    if (hmdOverlayWindow) {
        hmdOverlayWindow.close();
        hmdOverlayWindow = undefined;
    }

    if (fs.existsSync(WRIST_SHM_PATH)) {
        fs.unlinkSync(WRIST_SHM_PATH);
    }
    if (fs.existsSync(HMD_SHM_PATH)) {
        fs.unlinkSync(HMD_SHM_PATH);
    }
}

app.on('before-quit', function () {
    // Mark it as a quitting state to make macOS Dock's "Quit" action take effect.
    appIsQuitting = true;
    disposeOverlay();
});

app.on('window-all-closed', function () {
    disposeOverlay();

    if (process.platform !== 'darwin') {
        app.quit();
    }
});
