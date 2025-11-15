// requires binding of SQLite

async function waitForSQLite(maxRetries = 50, delay = 100) {
    for (let i = 0; i < maxRetries; i++) {
        if (window.SQLite) {
            return window.SQLite;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
    throw new Error('SQLite is not initialized after waiting');
}

class SQLiteService {
    async execute(callback, sql, args = null) {
        const SQLite = await waitForSQLite();
        // Use ExecuteJson on all platforms to avoid External object issues with node-api-dotnet
        // This ensures data is properly serialized to JSON on the .NET side
        if (args) {
            args = new Map(Object.entries(args));
        }
        var json = await SQLite.ExecuteJson(sql, args);
        var items = JSON.parse(json);
        if (items.status === 'error') {
            throw new Error(items.message);
        }
        items.data.forEach((item) => {
            callback(item);
        });
    }

    async executeNonQuery(sql, args = null) {
        const SQLite = await waitForSQLite();
        if (LINUX && args) {
            args = new Map(Object.entries(args));
        }
        return SQLite.ExecuteNonQuery(sql, args);
    }
}

var self = new SQLiteService();
window.sqliteService = self;

export { self as default, SQLiteService };
