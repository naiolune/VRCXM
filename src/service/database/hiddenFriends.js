import { dbVars } from '../database';

import sqliteService from '../sqlite.js';

const hiddenFriends = {
    async hideFriendFromFeed(userId) {
        if (!dbVars.userPrefix || !userId) {
            return;
        }
        await sqliteService.executeNonQuery(
            `INSERT OR REPLACE INTO ${dbVars.userPrefix}_hidden_friends (user_id, hidden_at) VALUES (@user_id, @hidden_at)`,
            {
                '@user_id': userId,
                '@hidden_at': new Date().toISOString()
            }
        );
    },

    async unhideFriendFromFeed(userId) {
        if (!dbVars.userPrefix || !userId) {
            return;
        }
        await sqliteService.executeNonQuery(
            `DELETE FROM ${dbVars.userPrefix}_hidden_friends WHERE user_id = @user_id`,
            {
                '@user_id': userId
            }
        );
    },

    async getHiddenFriends() {
        if (!dbVars.userPrefix) {
            return new Set();
        }
        const hiddenSet = new Set();
        try {
            await sqliteService.execute(
                (row) => {
                    if (row && row[0]) {
                        hiddenSet.add(row[0]);
                    }
                },
                `SELECT user_id FROM ${dbVars.userPrefix}_hidden_friends`
            );
        } catch (e) {
            // Table might not exist yet, return empty set
            console.warn('[Hidden Friends] Table might not exist yet:', e);
            return new Set();
        }
        return hiddenSet;
    },

    async isFriendHidden(userId) {
        if (!dbVars.userPrefix || !userId) {
            return false;
        }
        let isHidden = false;
        await sqliteService.execute(
            (row) => {
                isHidden = row && row[0] > 0;
            },
            `SELECT COUNT(*) FROM ${dbVars.userPrefix}_hidden_friends WHERE user_id = @user_id`,
            {
                '@user_id': userId
            }
        );
        return isHidden;
    }
};

export { hiddenFriends };

