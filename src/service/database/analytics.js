import { dbVars } from '../database';
import { analyticsCache } from './analyticsCache.js';

import sqliteService from '../sqlite.js';

const analytics = {
    buildDateRangeFilter(dateRange) {
        if (!dateRange || !Array.isArray(dateRange) || dateRange.length !== 2) {
            return '';
        }
        const startDate = dateRange[0] ? new Date(dateRange[0]).toISOString() : null;
        const endDate = dateRange[1] ? new Date(dateRange[1]).toISOString() : null;
        if (startDate && endDate) {
            return `AND created_at >= '${startDate}' AND created_at <= '${endDate}'`;
        } else if (startDate) {
            return `AND created_at >= '${startDate}'`;
        } else if (endDate) {
            return `AND created_at <= '${endDate}'`;
        }
        return '';
    },

    async getWorldTimeBreakdown(dateRange = null) {
        if (!dbVars.userPrefix) {
            return [];
        }
        
        const dateFilter = this.buildDateRangeFilter(dateRange);
        const results = [];
        const worldMap = new Map();

        // Use gamelog_location table which has accurate time tracking
        // time is in milliseconds, convert to seconds
        let query = `SELECT world_id, world_name, SUM(time) as total_time FROM gamelog_location WHERE 1=1`;
        
        if (dateRange && Array.isArray(dateRange) && dateRange.length === 2) {
            const startDate = dateRange[0] ? new Date(dateRange[0]).toISOString() : null;
            const endDate = dateRange[1] ? new Date(dateRange[1]).toISOString() : null;
            if (startDate && endDate) {
                query += ` AND created_at >= '${startDate}' AND created_at <= '${endDate}'`;
            } else if (startDate) {
                query += ` AND created_at >= '${startDate}'`;
            } else if (endDate) {
                query += ` AND created_at <= '${endDate}'`;
            }
        }
        
        query += ` GROUP BY world_id ORDER BY total_time DESC LIMIT 50`;

        await sqliteService.execute(
            (row) => {
                const worldId = row[0] || 'unknown';
                const worldName = row[1] || worldId;
                const timeMs = row[2] || 0;
                const timeSeconds = Math.floor(timeMs / 1000); // Convert milliseconds to seconds
                
                if (worldId && worldId !== 'unknown') {
                    worldMap.set(worldId, { worldId, worldName, time: timeSeconds });
                }
            },
            query
        );

        for (const [worldId, data] of worldMap.entries()) {
            results.push(data);
        }

        return results.sort((a, b) => b.time - a.time);
    },

    async getAvatarTimeBreakdown(dateRange = null) {
        if (!dbVars.userPrefix) {
            return [];
        }
        
        // Use avatar_history table which has accurate time tracking
        // time is in milliseconds (from Date.now()), convert to seconds
        const results = [];
        const avatarMap = new Map();

        let query = `SELECT avatar_id, SUM(time) as total_time FROM ${dbVars.userPrefix}_avatar_history WHERE 1=1`;
        
        if (dateRange && Array.isArray(dateRange) && dateRange.length === 2) {
            const startDate = dateRange[0] ? new Date(dateRange[0]).toISOString() : null;
            const endDate = dateRange[1] ? new Date(dateRange[1]).toISOString() : null;
            if (startDate && endDate) {
                query += ` AND created_at >= '${startDate}' AND created_at <= '${endDate}'`;
            } else if (startDate) {
                query += ` AND created_at >= '${startDate}'`;
            } else if (endDate) {
                query += ` AND created_at <= '${endDate}'`;
            }
        }
        
        query += ` GROUP BY avatar_id ORDER BY total_time DESC LIMIT 50`;

        await sqliteService.execute(
            (row) => {
                const avatarId = row[0] || 'unknown';
                const timeMs = row[1] || 0;
                const timeSeconds = Math.floor(timeMs / 1000); // Convert milliseconds to seconds
                
                if (avatarId && avatarId !== 'unknown') {
                    avatarMap.set(avatarId, { avatarId, avatarName: avatarId, time: timeSeconds });
                }
            },
            query
        );

        for (const [avatarId, data] of avatarMap.entries()) {
            results.push(data);
        }

        return results.sort((a, b) => b.time - a.time);
    },

    async getMostActiveFriends(dateRange = null) {
        if (!dbVars.userPrefix) {
            return [];
        }
        
        // Check if we have cached data and no date filter
        if (!dateRange) {
            try {
                const cached = await analyticsCache.getMostActiveFriends();
                if (cached && cached.length > 0) {
                    return cached;
                }
            } catch (e) {
                console.warn('[Analytics] Error getting cached active friends, falling back to live query:', e);
            }
        }
        
        // Fall back to live query (either cache is empty or date filter is applied)
        return analyticsCache.getMostActiveFriendsLive(dateRange);
    },

    async getMostVisitedWorlds(dateRange = null) {
        if (!dbVars.userPrefix) {
            return [];
        }
        
        // Check if we have cached data and no date filter
        if (!dateRange) {
            try {
                const cached = await analyticsCache.getMostVisitedWorlds();
                if (cached && cached.length > 0) {
                    return cached;
                }
            } catch (e) {
                console.warn('[Analytics] Error getting cached visited worlds, falling back to live query:', e);
            }
        }
        
        // Use gamelog_location table which tracks world visits accurately
        const worldMap = new Map();
        let query = `SELECT world_id, world_name, COUNT(*) as visit_count FROM gamelog_location WHERE 1=1`;
        
        if (dateRange && Array.isArray(dateRange) && dateRange.length === 2) {
            const startDate = dateRange[0] ? new Date(dateRange[0]).toISOString() : null;
            const endDate = dateRange[1] ? new Date(dateRange[1]).toISOString() : null;
            if (startDate && endDate) {
                query += ` AND created_at >= '${startDate}' AND created_at <= '${endDate}'`;
            } else if (startDate) {
                query += ` AND created_at >= '${startDate}'`;
            } else if (endDate) {
                query += ` AND created_at <= '${endDate}'`;
            }
        }
        
        query += ` GROUP BY world_id ORDER BY visit_count DESC LIMIT 50`;

        await sqliteService.execute(
            (row) => {
                const worldId = row[0] || 'unknown';
                const worldName = row[1] || worldId;
                const visitCount = row[2] || 0;
                
                if (worldId && worldId !== 'unknown') {
                    worldMap.set(worldId, { worldId, worldName, visitCount });
                }
            },
            query
        );

        const results = Array.from(worldMap.values());
        return results.sort((a, b) => b.visitCount - a.visitCount);
    },

    async getAvatarUsageStatistics(dateRange = null) {
        if (!dbVars.userPrefix) {
            return [];
        }
        
        // Check if we have cached data and no date filter
        if (!dateRange) {
            try {
                const cached = await analyticsCache.getAvatarUsageStatistics();
                if (cached && cached.length > 0) {
                    return cached;
                }
            } catch (e) {
                console.warn('[Analytics] Error getting cached avatar usage, falling back to live query:', e);
            }
        }
        
        const dateFilter = this.buildDateRangeFilter(dateRange);
        const avatarMap = new Map();

        await sqliteService.execute(
            (row) => {
                const avatarId = row[4] || 'unknown'; // owner_id column
                const avatarName = row[5] || 'unknown'; // avatar_name column
                if (!avatarMap.has(avatarId)) {
                    avatarMap.set(avatarId, { avatarId, avatarName, usageCount: 0 });
                }
                avatarMap.get(avatarId).usageCount += 1;
            },
            `SELECT * FROM ${dbVars.userPrefix}_feed_avatar WHERE 1=1 ${dateFilter}`
        );

        const results = Array.from(avatarMap.values());
        return results.sort((a, b) => b.usageCount - a.usageCount).slice(0, 50);
    }
};

export { analytics };

