const dotnet = require('node-api-dotnet/net9.0');

// Debug flag for verbose IPC logging (set to true for debugging IPC issues)
const IPC_DEBUG_VERBOSE = false;

class InteropApi {
    constructor() {
        // Cache for .NET objects, might be problematic if we require a new instance every time
        this.createdObjects = {};
    }

    getDotNetObject(className) {
        if (!this.createdObjects[className]) {
            if (IPC_DEBUG_VERBOSE) {
                console.log(`Creating new instance of ${className}`);
            }
            this.createdObjects[className] = new dotnet.VRCX[className]();
        }
        return this.createdObjects[className];
    }

    callMethod(className, methodName, args) {
        try {
            const obj = this.getDotNetObject(className);
            if (typeof obj[methodName] !== 'function') {
                throw new Error(
                    `Method ${methodName} does not exist on class ${className}`
                );
            }
            if (IPC_DEBUG_VERBOSE) {
                console.log(`[InteropApi] Calling ${className}.${methodName} with args:`, args);
            }
            const result = obj[methodName](...args);
            if (IPC_DEBUG_VERBOSE) {
                console.log(`[InteropApi] ${className}.${methodName} returned:`, result, typeof result);
            }
            return result;
        } catch (e) {
            console.error(
                `[InteropApi] Error calling .NET method ${className}.${methodName}:`,
                {
                    message: e?.message,
                    name: e?.name,
                    stack: e?.stack,
                    error: e
                }
            );
            throw e;
        }
    }
}

module.exports = InteropApi;
