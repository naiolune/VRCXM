class InteropApi {
    constructor() {
        return new Proxy(this, {
            get(target, prop) {
                // Only return undefined on Windows if CefSharp is available (CefSharp build)
                // On Electron build (even on Windows), we need to use Electron interop
                if (WINDOWS && typeof CefSharp !== 'undefined' && CefSharp) {
                    return undefined;
                }
                // If the property is not a method of InteropApi,
                // treat it as a .NET class name
                if (typeof prop === 'string' && !target[prop]) {
                    return new Proxy(
                        {},
                        {
                            get(_, methodName) {
                                // Block access to Promise-like properties to prevent them from being
                                // treated as method calls (e.g., SQLite.then would try to call SQLite.then())
                                const promiseProperties = ['then', 'catch', 'finally', 'constructor'];
                                if (typeof methodName === 'string' && promiseProperties.includes(methodName)) {
                                    return undefined;
                                }
                                
                                // Return a method that calls the .NET method dynamically
                                return async (...args) => {
                                    return await target.callMethod(
                                        prop,
                                        methodName,
                                        ...args
                                    );
                                };
                            }
                        }
                    );
                }
                return target[prop];
            }
        });
    }

    async callMethod(className, methodName, ...args) {
        return window.interopApi
            .callDotNetMethod(className, methodName, args)
            .then((result) => {
                return result;
            });
    }
}

export default new InteropApi();
