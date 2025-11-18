import { dbVars } from '../database';

import sqliteService from '../sqlite.js';

const friendLogHistory = {
    async getFriendLogHistory() {
        var friendLogHistory = [];
        await sqliteService.execute((dbRow) => {
            var row = {
                rowId: dbRow[0],
                created_at: dbRow[1],
                type: dbRow[2],
                userId: dbRow[3],
                displayName: dbRow[4],
                friendNumber: dbRow[8]
            };
            if (row.type === 'DisplayName') {
                row.previousDisplayName = dbRow[5];
            } else if (row.type === 'TrustLevel') {
                row.trustLevel = dbRow[6];
                row.previousTrustLevel = dbRow[7];
            }
            friendLogHistory.unshift(row);
        }, `SELECT * FROM ${dbVars.userPrefix}_friend_log_history`);
        return friendLogHistory;
    },

    addFriendLogHistory(entry) {
        sqliteService.executeNonQuery(
            `INSERT OR IGNORE INTO ${dbVars.userPrefix}_friend_log_history (created_at, type, user_id, display_name, previous_display_name, trust_level, previous_trust_level, friend_number) VALUES (@created_at, @type, @user_id, @display_name, @previous_display_name, @trust_level, @previous_trust_level, @friend_number)`,
            {
                '@created_at': entry.created_at,
                '@type': entry.type,
                '@user_id': entry.userId,
                '@display_name': entry.displayName,
                '@previous_display_name': entry.previousDisplayName,
                '@trust_level': entry.trustLevel,
                '@previous_trust_level': entry.previousTrustLevel,
                '@friend_number': entry.friendNumber
            }
        );
    },

    addFriendLogHistoryArray(inputData) {
        if (inputData.length === 0) {
            return;
        }
        var sqlValues = '';
        var items = [
            'created_at',
            'type',
            'userId',
            'displayName',
            'previousDisplayName',
            'trustLevel',
            'previousTrustLevel',
            'friendNumber'
        ];
        for (var i = 0; i < inputData.length; ++i) {
            var line = inputData[i];
            sqlValues += '(';
            for (var k = 0; k < items.length; ++k) {
                var item = items[k];
                var field = '';
                if (typeof line[item] === 'string') {
                    field = `'${line[item].replace(/'/g, "''")}'`;
                } else {
                    field = null;
                }
                sqlValues += field;
                if (k < items.length - 1) {
                    sqlValues += ', ';
                }
            }
            sqlValues += ')';
            if (i < inputData.length - 1) {
                sqlValues += ', ';
            }
            // sqlValues `('${line.created_at}', '${line.type}', '${line.userId}', '${line.displayName}', '${line.previousDisplayName}', '${line.trustLevel}', '${line.previousTrustLevel}'), `
        }
        sqliteService.executeNonQuery(
            `INSERT OR IGNORE INTO ${dbVars.userPrefix}_friend_log_history (created_at, type, user_id, display_name, previous_display_name, trust_level, previous_trust_level, friend_number) VALUES ${sqlValues}`
        );
    },

    deleteFriendLogHistory(rowId) {
        sqliteService.executeNonQuery(
            `DELETE FROM ${dbVars.userPrefix}_friend_log_history WHERE id = @row_id`,
            {
                '@row_id': rowId
            }
        );
    },

    async lookupFriendLogHistory(search, filters, vipList = [], dateRange = null) {
        var search = search.replaceAll("'", "''");
        let vipQuery = '';
        if (vipList.length > 0) {
            vipQuery = 'AND user_id IN (';
            for (var i = 0; i < vipList.length; i++) {
                vipQuery += `'${vipList[i].replaceAll("'", "''")}'`;
                if (i < vipList.length - 1) {
                    vipQuery += ', ';
                }
            }
            vipQuery += ')';
        }

        let dateRangeFilter = '';
        if (dateRange && Array.isArray(dateRange) && dateRange.length === 2) {
            const startDate = dateRange[0] ? new Date(dateRange[0]).toISOString() : null;
            const endDate = dateRange[1] ? new Date(dateRange[1]).toISOString() : null;
            if (startDate && endDate) {
                dateRangeFilter = `AND created_at >= '${startDate}' AND created_at <= '${endDate}'`;
            } else if (startDate) {
                dateRangeFilter = `AND created_at >= '${startDate}'`;
            } else if (endDate) {
                dateRangeFilter = `AND created_at <= '${endDate}'`;
            }
        }

        var typeFilter = '';
        if (filters.length > 0) {
            typeFilter = "AND type IN (";
            for (var i = 0; i < filters.length; i++) {
                typeFilter += `'${filters[i].replaceAll("'", "''")}'`;
                if (i < filters.length - 1) {
                    typeFilter += ', ';
                }
            }
            typeFilter += ')';
        }

        var searchQuery = '';
        if (search) {
            searchQuery = `AND (display_name LIKE '%${search}%' OR user_id LIKE '%${search}%')`;
        }

        var friendLogHistory = [];
        await sqliteService.execute((dbRow) => {
            var row = {
                rowId: dbRow[0],
                created_at: dbRow[1],
                type: dbRow[2],
                userId: dbRow[3],
                displayName: dbRow[4],
                friendNumber: dbRow[8]
            };
            if (row.type === 'DisplayName') {
                row.previousDisplayName = dbRow[5];
            } else if (row.type === 'TrustLevel') {
                row.trustLevel = dbRow[6];
                row.previousTrustLevel = dbRow[7];
            }
            friendLogHistory.unshift(row);
        }, `SELECT * FROM ${dbVars.userPrefix}_friend_log_history WHERE 1=1 ${typeFilter} ${vipQuery} ${searchQuery} ${dateRangeFilter} ORDER BY id DESC LIMIT ${dbVars.maxTableSize}`);
        return friendLogHistory;
    }
};

export { friendLogHistory };
