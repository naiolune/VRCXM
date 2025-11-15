import { dbVars } from '../database';

import sqliteService from '../sqlite.js';

const analyticsCache = {
    /**
     * Initialize analytics cache tables
     */
    async initTables() {
        if (!dbVars.userPrefix) {
            return;
        }

        // World time breakdown cache
        await sqliteService.executeNonQuery(
            `CREATE TABLE IF NOT EXISTS ${dbVars.userPrefix}_analytics_world_time (
                world_id TEXT,
                world_name TEXT,
                time_seconds INTEGER DEFAULT 0,
                last_updated TEXT,
                PRIMARY KEY (world_id)
            )`
        );

        // Avatar time breakdown cache
        await sqliteService.executeNonQuery(
            `CREATE TABLE IF NOT EXISTS ${dbVars.userPrefix}_analytics_avatar_time (
                avatar_id TEXT,
                avatar_name TEXT,
                time_seconds INTEGER DEFAULT 0,
                entry_count INTEGER DEFAULT 0,
                last_updated TEXT,
                PRIMARY KEY (avatar_id)
            )`
        );

        // Active friends cache
        await sqliteService.executeNonQuery(
            `CREATE TABLE IF NOT EXISTS ${dbVars.userPrefix}_analytics_active_friends (
                user_id TEXT,
                display_name TEXT,
                activity_count INTEGER DEFAULT 0,
                last_updated TEXT,
                PRIMARY KEY (user_id)
            )`
        );

        // Most visited worlds cache
        await sqliteService.executeNonQuery(
            `CREATE TABLE IF NOT EXISTS ${dbVars.userPrefix}_analytics_visited_worlds (
                world_id TEXT,
                world_name TEXT,
                visit_count INTEGER DEFAULT 0,
                last_updated TEXT,
                PRIMARY KEY (world_id)
            )`
        );

        // Avatar usage cache
        await sqliteService.executeNonQuery(
            `CREATE TABLE IF NOT EXISTS ${dbVars.userPrefix}_analytics_avatar_usage (
                avatar_id TEXT,
                avatar_name TEXT,
                usage_count INTEGER DEFAULT 0,
                last_updated TEXT,
                PRIMARY KEY (avatar_id)
            )`
        );

        // Migration tracking
        await sqliteService.executeNonQuery(
            `CREATE TABLE IF NOT EXISTS ${dbVars.userPrefix}_analytics_migration (
                id INTEGER PRIMARY KEY,
                status TEXT,
                progress REAL DEFAULT 0,
                total_records INTEGER DEFAULT 0,
                processed_records INTEGER DEFAULT 0,
                started_at TEXT,
                completed_at TEXT
            )`
        );

        // Track processed records to prevent duplicates on resume
        await sqliteService.executeNonQuery(
            `CREATE TABLE IF NOT EXISTS ${dbVars.userPrefix}_analytics_migration_processed (
                table_name TEXT,
                record_id INTEGER,
                migration_id INTEGER,
                PRIMARY KEY (table_name, record_id, migration_id)
            )`
        );
    },

    /**
     * Get migration status
     */
    async getMigrationStatus() {
        if (!dbVars.userPrefix) {
            return null;
        }
        let status = null;
        await sqliteService.execute(
            (row) => {
                status = {
                    id: row[0],
                    status: row[1],
                    progress: row[2] || 0,
                    totalRecords: row[3] || 0,
                    processedRecords: row[4] || 0,
                    startedAt: row[5],
                    completedAt: row[6]
                };
            },
            `SELECT * FROM ${dbVars.userPrefix}_analytics_migration ORDER BY id DESC LIMIT 1`
        );
        return status;
    },

    /**
     * Start migration
     */
    async startMigration() {
        if (!dbVars.userPrefix) {
            return;
        }
        await sqliteService.executeNonQuery(
            `INSERT INTO ${dbVars.userPrefix}_analytics_migration (status, progress, started_at) VALUES ('running', 0, @started_at)`,
            {
                '@started_at': new Date().toISOString()
            }
        );
    },

    /**
     * Update migration progress
     */
    async updateMigrationProgress(progress, processedRecords, totalRecords) {
        if (!dbVars.userPrefix) {
            return;
        }
        await sqliteService.executeNonQuery(
            `UPDATE ${dbVars.userPrefix}_analytics_migration 
             SET progress = @progress, processed_records = @processed_records, total_records = @total_records 
             WHERE id = (SELECT MAX(id) FROM ${dbVars.userPrefix}_analytics_migration)`,
            {
                '@progress': progress,
                '@processed_records': processedRecords,
                '@total_records': totalRecords
            }
        );
    },

    /**
     * Complete migration
     */
    async completeMigration() {
        if (!dbVars.userPrefix) {
            return;
        }
        await sqliteService.executeNonQuery(
            `UPDATE ${dbVars.userPrefix}_analytics_migration 
             SET status = 'completed', progress = 1.0, completed_at = @completed_at 
             WHERE id = (SELECT MAX(id) FROM ${dbVars.userPrefix}_analytics_migration)`,
            {
                '@completed_at': new Date().toISOString()
            }
        );
    },

    /**
     * Cancel migration
     */
    async cancelMigration() {
        if (!dbVars.userPrefix) {
            return;
        }
        await sqliteService.executeNonQuery(
            `UPDATE ${dbVars.userPrefix}_analytics_migration 
             SET status = 'cancelled', completed_at = @completed_at 
             WHERE id = (SELECT MAX(id) FROM ${dbVars.userPrefix}_analytics_migration) AND status = 'running'`,
            {
                '@completed_at': new Date().toISOString()
            }
        );
    },

    /**
     * Check if record was already processed in current migration
     */
    async isRecordProcessed(tableName, recordId, migrationId) {
        if (!dbVars.userPrefix) {
            return false;
        }
        let processed = false;
        // Use string interpolation for simple queries (SQLite parameter binding may not work with execute)
        const escapedTableName = tableName.replace(/'/g, "''");
        await sqliteService.execute(
            (row) => {
                processed = (row[0] || 0) > 0;
            },
            `SELECT COUNT(*) FROM ${dbVars.userPrefix}_analytics_migration_processed 
             WHERE table_name = '${escapedTableName}' AND record_id = ${recordId} AND migration_id = ${migrationId}`
        );
        return processed;
    },

    /**
     * Mark record as processed
     */
    async markRecordProcessed(tableName, recordId, migrationId) {
        if (!dbVars.userPrefix) {
            return;
        }
        await sqliteService.executeNonQuery(
            `INSERT OR IGNORE INTO ${dbVars.userPrefix}_analytics_migration_processed (table_name, record_id, migration_id)
             VALUES (@table_name, @record_id, @migration_id)`,
            {
                '@table_name': tableName,
                '@record_id': recordId,
                '@migration_id': migrationId
            }
        );
    },

    /**
     * Get current migration ID
     */
    async getCurrentMigrationId() {
        if (!dbVars.userPrefix) {
            return null;
        }
        let migrationId = null;
        await sqliteService.execute(
            (row) => {
                migrationId = row[0];
            },
            `SELECT MAX(id) FROM ${dbVars.userPrefix}_analytics_migration WHERE status = 'running'`
        );
        return migrationId;
    },

    /**
     * Clear all analytics data
     */
    async clearAnalyticsData() {
        if (!dbVars.userPrefix) {
            return;
        }
        // Clear all analytics cache tables
        await sqliteService.executeNonQuery(`DELETE FROM ${dbVars.userPrefix}_analytics_world_time`);
        await sqliteService.executeNonQuery(`DELETE FROM ${dbVars.userPrefix}_analytics_avatar_time`);
        await sqliteService.executeNonQuery(`DELETE FROM ${dbVars.userPrefix}_analytics_active_friends`);
        await sqliteService.executeNonQuery(`DELETE FROM ${dbVars.userPrefix}_analytics_visited_worlds`);
        await sqliteService.executeNonQuery(`DELETE FROM ${dbVars.userPrefix}_analytics_avatar_usage`);
        await sqliteService.executeNonQuery(`DELETE FROM ${dbVars.userPrefix}_analytics_migration`);
        await sqliteService.executeNonQuery(`DELETE FROM ${dbVars.userPrefix}_analytics_migration_processed`);
    },

    /**
     * Incrementally update world time from a GPS feed entry
     */
    async incrementWorldTime(worldId, worldName, timeSeconds) {
        if (!dbVars.userPrefix || !worldId) {
            return;
        }
        await sqliteService.executeNonQuery(
            `INSERT INTO ${dbVars.userPrefix}_analytics_world_time (world_id, world_name, time_seconds, last_updated)
             VALUES (@world_id, @world_name, @time_seconds, @last_updated)
             ON CONFLICT(world_id) DO UPDATE SET
                time_seconds = time_seconds + @time_seconds,
                world_name = @world_name,
                last_updated = @last_updated`,
            {
                '@world_id': worldId,
                '@world_name': worldName || worldId,
                '@time_seconds': timeSeconds || 0,
                '@last_updated': new Date().toISOString()
            }
        );
    },

    /**
     * Incrementally update avatar time from an avatar feed entry
     */
    async incrementAvatarTime(avatarId, avatarName) {
        if (!dbVars.userPrefix || !avatarId) {
            return;
        }
        // Estimate 1 hour per avatar entry
        const estimatedTime = 3600;
        await sqliteService.executeNonQuery(
            `INSERT INTO ${dbVars.userPrefix}_analytics_avatar_time (avatar_id, avatar_name, time_seconds, entry_count, last_updated)
             VALUES (@avatar_id, @avatar_name, @time_seconds, 1, @last_updated)
             ON CONFLICT(avatar_id) DO UPDATE SET
                time_seconds = time_seconds + @time_seconds,
                entry_count = entry_count + 1,
                avatar_name = @avatar_name,
                last_updated = @last_updated`,
            {
                '@avatar_id': avatarId,
                '@avatar_name': avatarName || avatarId,
                '@time_seconds': estimatedTime,
                '@last_updated': new Date().toISOString()
            }
        );
    },

    /**
     * Incrementally update active friends count
     */
    async incrementActiveFriend(userId, displayName) {
        if (!dbVars.userPrefix || !userId) {
            return;
        }
        await sqliteService.executeNonQuery(
            `INSERT INTO ${dbVars.userPrefix}_analytics_active_friends (user_id, display_name, activity_count, last_updated)
             VALUES (@user_id, @display_name, 1, @last_updated)
             ON CONFLICT(user_id) DO UPDATE SET
                activity_count = activity_count + 1,
                display_name = @display_name,
                last_updated = @last_updated`,
            {
                '@user_id': userId,
                '@display_name': displayName || userId,
                '@last_updated': new Date().toISOString()
            }
        );
    },

    /**
     * Incrementally update visited worlds count
     */
    async incrementVisitedWorld(worldId, worldName) {
        if (!dbVars.userPrefix || !worldId) {
            return;
        }
        await sqliteService.executeNonQuery(
            `INSERT INTO ${dbVars.userPrefix}_analytics_visited_worlds (world_id, world_name, visit_count, last_updated)
             VALUES (@world_id, @world_name, 1, @last_updated)
             ON CONFLICT(world_id) DO UPDATE SET
                visit_count = visit_count + 1,
                world_name = @world_name,
                last_updated = @last_updated`,
            {
                '@world_id': worldId,
                '@world_name': worldName || worldId,
                '@last_updated': new Date().toISOString()
            }
        );
    },

    /**
     * Incrementally update avatar usage count
     */
    async incrementAvatarUsage(avatarId, avatarName) {
        if (!dbVars.userPrefix || !avatarId) {
            return;
        }
        await sqliteService.executeNonQuery(
            `INSERT INTO ${dbVars.userPrefix}_analytics_avatar_usage (avatar_id, avatar_name, usage_count, last_updated)
             VALUES (@avatar_id, @avatar_name, 1, @last_updated)
             ON CONFLICT(avatar_id) DO UPDATE SET
                usage_count = usage_count + 1,
                avatar_name = @avatar_name,
                last_updated = @last_updated`,
            {
                '@avatar_id': avatarId,
                '@avatar_name': avatarName || avatarId,
                '@last_updated': new Date().toISOString()
            }
        );
    },

    /**
     * Get cached world time breakdown (with optional date filter)
     * Falls back to live query from gamelog_location if cache is empty
     */
    async getWorldTimeBreakdown(dateRange = null) {
        if (!dbVars.userPrefix) {
            return [];
        }
        const results = [];
        let query = `SELECT world_id, world_name, time_seconds FROM ${dbVars.userPrefix}_analytics_world_time`;
        
        if (dateRange && Array.isArray(dateRange) && dateRange.length === 2) {
            // For date filtering, fall back to live query
            return this.getWorldTimeBreakdownLive(dateRange);
        }
        
        query += ' ORDER BY time_seconds DESC LIMIT 50';
        
        await sqliteService.execute(
            (row) => {
                results.push({
                    worldId: row[0],
                    worldName: row[1] || row[0],
                    time: row[2] || 0
                });
            },
            query
        );
        
        // If cache is empty, fall back to live query from gamelog_location
        if (results.length === 0) {
            return this.getWorldTimeBreakdownLive(dateRange);
        }
        
        return results;
    },

    /**
     * Live query for world time breakdown from gamelog_location
     */
    async getWorldTimeBreakdownLive(dateRange = null) {
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

    /**
     * Get cached avatar time breakdown
     * Falls back to live query from avatar_history if cache is empty
     */
    async getAvatarTimeBreakdown(dateRange = null) {
        if (!dbVars.userPrefix) {
            return [];
        }
        const results = [];
        let query = `SELECT avatar_id, avatar_name, time_seconds FROM ${dbVars.userPrefix}_analytics_avatar_time`;
        
        if (dateRange && Array.isArray(dateRange) && dateRange.length === 2) {
            // For date filtering, fall back to live query
            return this.getAvatarTimeBreakdownLive(dateRange);
        }
        
        query += ' ORDER BY time_seconds DESC LIMIT 50';
        
        await sqliteService.execute(
            (row) => {
                results.push({
                    avatarId: row[0],
                    avatarName: row[1] || row[0],
                    time: row[2] || 0
                });
            },
            query
        );
        
        // If cache is empty, fall back to live query from avatar_history
        if (results.length === 0) {
            return this.getAvatarTimeBreakdownLive(dateRange);
        }
        
        return results;
    },

    /**
     * Live query for avatar time breakdown from avatar_history
     */
    async getAvatarTimeBreakdownLive(dateRange = null) {
        const results = [];
        const avatarMap = new Map();

        // Use avatar_history table which has accurate time tracking
        // time is in milliseconds (from Date.now()), convert to seconds
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

    /**
     * Get cached active friends
     * Falls back to live query if cache is empty
     */
    async getMostActiveFriends(dateRange = null) {
        if (!dbVars.userPrefix) {
            return [];
        }
        
        // For date filtering, always use live query
        if (dateRange && Array.isArray(dateRange) && dateRange.length === 2) {
            return this.getMostActiveFriendsLive(dateRange);
        }
        
        const results = [];
        let query = `SELECT user_id, display_name, activity_count FROM ${dbVars.userPrefix}_analytics_active_friends`;
        query += ' ORDER BY activity_count DESC LIMIT 50';
        
        await sqliteService.execute(
            (row) => {
                results.push({
                    userId: row[0],
                    displayName: row[1] || row[0],
                    activityCount: row[2] || 0
                });
            },
            query
        );
        
        // If cache is empty, fall back to live query
        if (results.length === 0) {
            return this.getMostActiveFriendsLive(dateRange);
        }
        
        return results;
    },

    /**
     * Build date range filter for SQL queries
     */
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

    /**
     * Live query for most active friends from feed tables
     */
    async getMostActiveFriendsLive(dateRange = null) {
        if (!dbVars.userPrefix) {
            return [];
        }
        
        const dateFilter = this.buildDateRangeFilter(dateRange);
        const friendMap = new Map();

        // Count activities from all feed tables
        const tables = [
            { name: 'feed_gps', userIdCol: 2 },
            { name: 'feed_status', userIdCol: 2 },
            { name: 'feed_bio', userIdCol: 2 },
            { name: 'feed_avatar', userIdCol: 2 },
            { name: 'feed_online_offline', userIdCol: 2 }
        ];

        for (const table of tables) {
            await sqliteService.execute(
                (row) => {
                    const userId = row[table.userIdCol];
                    const displayName = row[3] || userId; // display_name column
                    if (!friendMap.has(userId)) {
                        friendMap.set(userId, { userId, displayName, activityCount: 0 });
                    }
                    friendMap.get(userId).activityCount += 1;
                },
                `SELECT * FROM ${dbVars.userPrefix}_${table.name} WHERE 1=1 ${dateFilter}`
            );
        }

        const results = Array.from(friendMap.values());
        return results.sort((a, b) => b.activityCount - a.activityCount).slice(0, 50);
    },

    /**
     * Get cached visited worlds
     * Falls back to live query from gamelog_location if cache is empty
     */
    async getMostVisitedWorlds(dateRange = null) {
        if (!dbVars.userPrefix) {
            return [];
        }
        
        // Use the cached visit_count from analytics_visited_worlds table
        // This counts total visits (not distinct locations)
        const results = [];
        let query = `SELECT world_id, world_name, visit_count FROM ${dbVars.userPrefix}_analytics_visited_worlds`;
        query += ' ORDER BY visit_count DESC LIMIT 50';
        
        await sqliteService.execute(
            (row) => {
                results.push({
                    worldId: row[0],
                    worldName: row[1] || row[0],
                    visitCount: row[2] || 0
                });
            },
            query
        );
        
        // If cache is empty, fall back to live query from gamelog_location
        if (results.length === 0) {
            return this.getMostVisitedWorldsLive(dateRange);
        }
        
        return results;
    },

    /**
     * Live query for most visited worlds from gamelog_location
     */
    async getMostVisitedWorldsLive(dateRange = null) {
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

    /**
     * Get cached avatar usage
     */
    async getAvatarUsageStatistics(dateRange = null) {
        if (!dbVars.userPrefix) {
            return [];
        }
        const results = [];
        let query = `SELECT avatar_id, avatar_name, usage_count FROM ${dbVars.userPrefix}_analytics_avatar_usage`;
        query += ' ORDER BY usage_count DESC LIMIT 50';
        
        await sqliteService.execute(
            (row) => {
                results.push({
                    avatarId: row[0],
                    avatarName: row[1] || row[0],
                    usageCount: row[2] || 0
                });
            },
            query
        );
        
        return results;
    },

    /**
     * Migrate historical data - process feed entries to populate social analytics cache only
     * Only tracks friend activity (most active friends). World and avatar analytics use existing tables.
     */
    async migrateHistoricalData(progressCallback, abortSignal) {
        if (!dbVars.userPrefix) {
            return;
        }

        // Check if there's an existing running migration
        const existingStatus = await this.getMigrationStatus();
        let migrationId = null;
        
        if (existingStatus && existingStatus.status === 'running') {
            // Resume existing migration
            migrationId = existingStatus.id;
        } else {
            // Start new migration
            await this.startMigration();
            migrationId = await this.getCurrentMigrationId();
        }

        if (!migrationId) {
            throw new Error('Failed to get migration ID');
        }

        // Count total records (only count unprocessed ones if resuming)
        let totalRecords = 0;
        let alreadyProcessed = 0;
        const tables = [
            { name: 'feed_gps', idColumn: 'id' },
            { name: 'feed_status', idColumn: 'id' },
            { name: 'feed_bio', idColumn: 'id' },
            { name: 'feed_avatar', idColumn: 'id' },
            { name: 'feed_online_offline', idColumn: 'id' }
        ];

        for (const table of tables) {
            let count = 0;
            await sqliteService.execute(
                (row) => {
                    count = row[0] || 0;
                },
                `SELECT COUNT(*) FROM ${dbVars.userPrefix}_${table.name}`
            );
            totalRecords += count;

            // Count already processed records for this table
            if (existingStatus && existingStatus.status === 'running') {
                let processed = 0;
                const escapedTableName = table.name.replace(/'/g, "''");
                await sqliteService.execute(
                    (row) => {
                        processed = row[0] || 0;
                    },
                    `SELECT COUNT(*) FROM ${dbVars.userPrefix}_analytics_migration_processed 
                     WHERE table_name = '${escapedTableName}' AND migration_id = ${migrationId}`
                );
                alreadyProcessed += processed;
            }
        }

        // Update total if resuming (use existing total or recalculate)
        if (existingStatus && existingStatus.status === 'running' && existingStatus.totalRecords > 0) {
            totalRecords = existingStatus.totalRecords;
        } else {
            // Starting new migration - reset processed records
            await this.updateMigrationProgress(0, 0, totalRecords);
            if (progressCallback) {
                progressCallback(0, 0, totalRecords);
            }
        }

        let processedRecords = existingStatus?.processedRecords || 0;
        
        // Ensure totalRecords is at least as large as processedRecords to prevent >100% progress
        if (processedRecords > totalRecords) {
            totalRecords = processedRecords;
            // Update the total in the database
            await this.updateMigrationProgress(
                existingStatus?.progress || 0,
                processedRecords,
                totalRecords
            );
        }

        // Helper function to process a record with duplicate checking
        const processRecord = async (tableName, recordId, processFn) => {
            // Check if aborted
            if (abortSignal && abortSignal.aborted) {
                throw new Error('Migration aborted');
            }

            // Check if already processed
            const isProcessed = await this.isRecordProcessed(tableName, recordId, migrationId);
            if (isProcessed) {
                return false; // Skip this record
            }

            // Process the record
            await processFn();

            // Mark as processed
            await this.markRecordProcessed(tableName, recordId, migrationId);
            return true; // Processed
        };

        // Process GPS feed - only select columns needed for social analytics
        const gpsRows = [];
        await sqliteService.execute(
            (row) => {
                gpsRows.push({ id: row[0], userId: row[2], displayName: row[3] });
            },
            `SELECT id, user_id, display_name FROM ${dbVars.userPrefix}_feed_gps ORDER BY id`
        );

        for (const row of gpsRows) {
            if (abortSignal && abortSignal.aborted) {
                throw new Error('Migration aborted');
            }

            const recordId = row.id;
            const wasProcessed = await processRecord('feed_gps', recordId, async () => {
                // Only track friend activity for social analytics
                const userId = row.userId;
                const displayName = row.displayName || userId;

                if (userId) {
                    await this.incrementActiveFriend(userId, displayName);
                }
            });

            if (wasProcessed) {
                processedRecords++;
                // Update totalRecords if it's less than processedRecords (new records added during migration)
                if (processedRecords > totalRecords) {
                    totalRecords = processedRecords;
                }
                // Update progress more frequently: every 10 records for first 100, then every 100
                const updateInterval = processedRecords <= 100 ? 10 : 100;
                if (processedRecords % updateInterval === 0 || processedRecords === 1) {
                    // Cap progress at 1.0 (100%) to prevent showing >100%
                    const progress = totalRecords > 0 ? Math.min(processedRecords / totalRecords, 1.0) : 0;
                    await this.updateMigrationProgress(progress, processedRecords, totalRecords);
                    if (progressCallback) {
                        progressCallback(progress, processedRecords, totalRecords);
                    }
                }
            }
        }

        // Process Status feed - only select columns needed for social analytics
        const statusRows = [];
        await sqliteService.execute(
            (row) => {
                statusRows.push({ id: row[0], userId: row[2], displayName: row[3] });
            },
            `SELECT id, user_id, display_name FROM ${dbVars.userPrefix}_feed_status ORDER BY id`
        );

        for (const row of statusRows) {
            if (abortSignal && abortSignal.aborted) {
                throw new Error('Migration aborted');
            }

            const recordId = row.id;
            const wasProcessed = await processRecord('feed_status', recordId, async () => {
                const userId = row.userId;
                const displayName = row.displayName || userId;

                if (userId) {
                    await this.incrementActiveFriend(userId, displayName);
                }
            });

            if (wasProcessed) {
                processedRecords++;
                // Update totalRecords if it's less than processedRecords (new records added during migration)
                if (processedRecords > totalRecords) {
                    totalRecords = processedRecords;
                }
                // Update progress more frequently: every 10 records for first 100, then every 100
                const updateInterval = processedRecords <= 100 ? 10 : 100;
                if (processedRecords % updateInterval === 0 || processedRecords === 1) {
                    // Cap progress at 1.0 (100%) to prevent showing >100%
                    const progress = totalRecords > 0 ? Math.min(processedRecords / totalRecords, 1.0) : 0;
                    await this.updateMigrationProgress(progress, processedRecords, totalRecords);
                    if (progressCallback) {
                        progressCallback(progress, processedRecords, totalRecords);
                    }
                }
            }
        }

        // Process Bio feed - only select columns needed for social analytics
        const bioRows = [];
        await sqliteService.execute(
            (row) => {
                bioRows.push({ id: row[0], userId: row[2], displayName: row[3] });
            },
            `SELECT id, user_id, display_name FROM ${dbVars.userPrefix}_feed_bio ORDER BY id`
        );

        for (const row of bioRows) {
            if (abortSignal && abortSignal.aborted) {
                throw new Error('Migration aborted');
            }

            const recordId = row.id;
            const wasProcessed = await processRecord('feed_bio', recordId, async () => {
                const userId = row.userId;
                const displayName = row.displayName || userId;

                if (userId) {
                    await this.incrementActiveFriend(userId, displayName);
                }
            });

            if (wasProcessed) {
                processedRecords++;
                // Update totalRecords if it's less than processedRecords (new records added during migration)
                if (processedRecords > totalRecords) {
                    totalRecords = processedRecords;
                }
                // Update progress more frequently: every 10 records for first 100, then every 100
                const updateInterval = processedRecords <= 100 ? 10 : 100;
                if (processedRecords % updateInterval === 0 || processedRecords === 1) {
                    // Cap progress at 1.0 (100%) to prevent showing >100%
                    const progress = totalRecords > 0 ? Math.min(processedRecords / totalRecords, 1.0) : 0;
                    await this.updateMigrationProgress(progress, processedRecords, totalRecords);
                    if (progressCallback) {
                        progressCallback(progress, processedRecords, totalRecords);
                    }
                }
            }
        }

        // Process Avatar feed - only select columns needed for social analytics
        const avatarRows = [];
        await sqliteService.execute(
            (row) => {
                avatarRows.push({ id: row[0], userId: row[2], displayName: row[3] });
            },
            `SELECT id, user_id, display_name FROM ${dbVars.userPrefix}_feed_avatar ORDER BY id`
        );

        for (const row of avatarRows) {
            if (abortSignal && abortSignal.aborted) {
                throw new Error('Migration aborted');
            }

            const recordId = row.id;
            const wasProcessed = await processRecord('feed_avatar', recordId, async () => {
                // Only track friend activity for social analytics
                const userId = row.userId;
                const displayName = row.displayName || userId;

                if (userId) {
                    await this.incrementActiveFriend(userId, displayName);
                }
            });

            if (wasProcessed) {
                processedRecords++;
                // Update totalRecords if it's less than processedRecords (new records added during migration)
                if (processedRecords > totalRecords) {
                    totalRecords = processedRecords;
                }
                // Update progress more frequently: every 10 records for first 100, then every 100
                const updateInterval = processedRecords <= 100 ? 10 : 100;
                if (processedRecords % updateInterval === 0 || processedRecords === 1) {
                    // Cap progress at 1.0 (100%) to prevent showing >100%
                    const progress = totalRecords > 0 ? Math.min(processedRecords / totalRecords, 1.0) : 0;
                    await this.updateMigrationProgress(progress, processedRecords, totalRecords);
                    if (progressCallback) {
                        progressCallback(progress, processedRecords, totalRecords);
                    }
                }
            }
        }

        // Process Online/Offline feed - only select columns needed for social analytics
        const onlineOfflineRows = [];
        await sqliteService.execute(
            (row) => {
                onlineOfflineRows.push({ id: row[0], userId: row[2], displayName: row[3] });
            },
            `SELECT id, user_id, display_name FROM ${dbVars.userPrefix}_feed_online_offline ORDER BY id`
        );

        for (const row of onlineOfflineRows) {
            if (abortSignal && abortSignal.aborted) {
                throw new Error('Migration aborted');
            }

            const recordId = row.id;
            const wasProcessed = await processRecord('feed_online_offline', recordId, async () => {
                // Only track friend activity for social analytics
                const userId = row.userId;
                const displayName = row.displayName || userId;

                if (userId) {
                    await this.incrementActiveFriend(userId, displayName);
                }
            });

            if (wasProcessed) {
                processedRecords++;
                // Update totalRecords if it's less than processedRecords (new records added during migration)
                if (processedRecords > totalRecords) {
                    totalRecords = processedRecords;
                }
                // Update progress more frequently: every 10 records for first 100, then every 100
                const updateInterval = processedRecords <= 100 ? 10 : 100;
                if (processedRecords % updateInterval === 0 || processedRecords === 1) {
                    // Cap progress at 1.0 (100%) to prevent showing >100%
                    const progress = totalRecords > 0 ? Math.min(processedRecords / totalRecords, 1.0) : 0;
                    await this.updateMigrationProgress(progress, processedRecords, totalRecords);
                    if (progressCallback) {
                        progressCallback(progress, processedRecords, totalRecords);
                    }
                }
            }
        }

        // Check if aborted before finalizing
        if (abortSignal && abortSignal.aborted) {
            await this.cancelMigration();
            throw new Error('Migration aborted');
        }

        // Final update - ensure totalRecords is at least processedRecords
        const finalTotal = Math.max(totalRecords, processedRecords);
        await this.updateMigrationProgress(1.0, processedRecords, finalTotal);
        if (progressCallback) {
            progressCallback(1.0, processedRecords, finalTotal);
        }

        await this.completeMigration();
    }
};

export { analyticsCache };

