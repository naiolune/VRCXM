import { dbVars } from '../database';

import sqliteService from '../sqlite.js';

const tableFixes = {
    async cleanLegendFromFriendLog() {
        var tables = [];
        await sqliteService.execute((dbRow) => {
            if (dbRow && dbRow[0] && typeof dbRow[0] === 'string' && dbRow[0].trim() !== '') {
                tables.push(dbRow[0]);
            }
        }, `SELECT name FROM sqlite_schema WHERE type='table' AND name LIKE '%_friend_log_history'`);
        for (var tableName of tables) {
            if (tableName && typeof tableName === 'string' && tableName.trim() !== '' && !tableName.includes('undefined')) {
                try {
                    await sqliteService.executeNonQuery(
                        `DELETE FROM ${tableName}
                        WHERE type = 'TrustLevel' AND created_at > '2022-05-04T01:00:00.000Z'
                        AND ((trust_level = 'Veteran User' AND previous_trust_level = 'Trusted User') OR (trust_level = 'Trusted User' AND previous_trust_level = 'Veteran User'))`
                    );
                } catch (e) {
                    console.warn(`Error cleaning legend from friend log for table ${tableName}:`, e);
                }
            }
        }
    },

    async fixGameLogTraveling() {
        var travelingList = [];
        await sqliteService.execute((dbRow) => {
            var row = {
                rowId: dbRow[0],
                created_at: dbRow[1],
                type: dbRow[2],
                displayName: dbRow[3],
                location: dbRow[4],
                userId: dbRow[5],
                time: dbRow[6]
            };
            travelingList.unshift(row);
        }, "SELECT * FROM gamelog_join_leave WHERE type = 'OnPlayerLeft' AND location = 'traveling'");
        travelingList.forEach(async (travelingEntry) => {
            await sqliteService.execute(
                (dbRow) => {
                    var onPlayingJoin = {
                        rowId: dbRow[0],
                        created_at: dbRow[1],
                        type: dbRow[2],
                        displayName: dbRow[3],
                        location: dbRow[4],
                        userId: dbRow[5],
                        time: dbRow[6]
                    };
                    sqliteService.executeNonQuery(
                        `UPDATE gamelog_join_leave SET location = @location WHERE id = @rowId`,
                        {
                            '@rowId': travelingEntry.rowId,
                            '@location': onPlayingJoin.location
                        }
                    );
                },
                "SELECT * FROM gamelog_join_leave WHERE type = 'OnPlayerJoined' AND display_name = @displayName AND created_at <= @created_at ORDER BY created_at DESC LIMIT 1",
                {
                    '@displayName': travelingEntry.displayName,
                    '@created_at': travelingEntry.created_at
                }
            );
        });
    },

    async fixNegativeGPS() {
        var gpsTables = [];
        await sqliteService.execute((dbRow) => {
            if (dbRow[0]) {
                gpsTables.push(dbRow[0]);
            }
        }, `SELECT name FROM sqlite_schema WHERE type='table' AND name LIKE '%_gps'`);
        for (const tableName of gpsTables) {
            if (tableName && typeof tableName === 'string') {
                try {
                    await sqliteService.executeNonQuery(
                        `UPDATE ${tableName} SET time = 0 WHERE time < 0`
                    );
                } catch (e) {
                    // Silently handle errors for individual tables
                    console.warn(`Error fixing negative GPS for table ${tableName}:`, e);
                }
            }
        }
    },

    async getBrokenLeaveEntries() {
        var instances = await this.getGameLogInstancesTime();
        var badEntries = [];
        await sqliteService.execute((dbRow) => {
            if (typeof dbRow[1] === 'number') {
                var ref = instances.get(dbRow[0]);
                if (typeof ref !== 'undefined' && dbRow[1] > ref) {
                    badEntries.push(dbRow[2]);
                }
            }
        }, `SELECT location, time, id FROM gamelog_join_leave WHERE type = 'OnPlayerLeft' AND time > 0`);
        return badEntries;
    },

    async fixBrokenLeaveEntries() {
        var badEntries = await this.getBrokenLeaveEntries();
        if (!badEntries || badEntries.length === 0) {
            return; // No broken entries to fix
        }
        var badEntriesList = '';
        var count = badEntries.length;
        badEntries.forEach((entry) => {
            count--;
            if (count === 0) {
                badEntriesList = badEntriesList.concat(entry);
            } else {
                badEntriesList = badEntriesList.concat(`${entry}, `);
            }
        });

        if (badEntriesList) {
            await sqliteService.executeNonQuery(
                `UPDATE gamelog_join_leave SET time = 0 WHERE id IN (${badEntriesList})`
            );
        }
    },

    async fixBrokenGroupInvites() {
        var notificationTables = [];
        await sqliteService.execute((dbRow) => {
            if (dbRow[0]) {
                notificationTables.push(dbRow[0]);
            }
        }, `SELECT name FROM sqlite_schema WHERE type='table' AND name LIKE '%_notifications'`);
        for (const tableName of notificationTables) {
            if (tableName && typeof tableName === 'string') {
                try {
                    await sqliteService.executeNonQuery(
                        `DELETE FROM ${tableName} WHERE type LIKE '%.%'`
                    );
                } catch (e) {
                    console.warn(`Error fixing broken group invites for table ${tableName}:`, e);
                }
            }
        }
    },

    async fixBrokenNotifications() {
        var tables = [];
        await sqliteService.execute((dbRow) => {
            if (dbRow[0]) {
                tables.push(dbRow[0]);
            }
        }, `SELECT name FROM sqlite_schema WHERE type='table' AND name LIKE '%_notifications'`);
        for (var tableName of tables) {
            if (tableName && typeof tableName === 'string') {
                try {
                    await sqliteService.executeNonQuery(
                        `DELETE FROM ${tableName} WHERE (created_at is null or created_at = '')`
                    );
                } catch (e) {
                    console.warn(`Error fixing broken notifications for table ${tableName}:`, e);
                }
            }
        }
    },

    async fixBrokenGroupChange() {
        var tables = [];
        await sqliteService.execute((dbRow) => {
            if (dbRow[0]) {
                tables.push(dbRow[0]);
            }
        }, `SELECT name FROM sqlite_schema WHERE type='table' AND name LIKE '%_notifications'`);
        for (var tableName of tables) {
            if (tableName && typeof tableName === 'string') {
                try {
                    await sqliteService.executeNonQuery(
                        `DELETE FROM ${tableName} WHERE type = 'groupChange' AND created_at < '2024-04-23T03:00:00.000Z'`
                    );
                } catch (e) {
                    console.warn(`Error fixing broken group change for table ${tableName}:`, e);
                }
            }
        }
    },

    async fixCancelFriendRequestTypo() {
        var tables = [];
        await sqliteService.execute((dbRow) => {
            if (dbRow[0]) {
                tables.push(dbRow[0]);
            }
        }, `SELECT name FROM sqlite_schema WHERE type='table' AND name LIKE '%_friend_log_history'`);
        for (var tableName of tables) {
            if (tableName && typeof tableName === 'string') {
                try {
                    await sqliteService.executeNonQuery(
                        `UPDATE ${tableName} SET type = 'CancelFriendRequest' WHERE type = 'CancelFriendRequst'`
                    );
                } catch (e) {
                    console.warn(`Error fixing cancel friend request typo for table ${tableName}:`, e);
                }
            }
        }
    },

    async getBrokenGameLogDisplayNames() {
        var badEntries = [];
        await sqliteService.execute((dbRow) => {
            badEntries.push({
                id: dbRow[0],
                displayName: dbRow[1]
            });
        }, "SELECT id, display_name FROM gamelog_join_leave WHERE display_name LIKE '% (%'");
        return badEntries;
    },

    async fixBrokenGameLogDisplayNames() {
        var badEntries = await this.getBrokenGameLogDisplayNames();
        badEntries.forEach((entry) => {
            var newDisplayName = entry.displayName.split(' (')[0];
            sqliteService.executeNonQuery(
                `UPDATE gamelog_join_leave SET display_name = @new_display_name WHERE id = @id`,
                {
                    '@new_display_name': newDisplayName,
                    '@id': entry.id
                }
            );
        });
    }
};

export { tableFixes };
