import { dbVars } from '../database';
import { hiddenFriends } from './hiddenFriends.js';
import { analyticsCache } from './analyticsCache.js';

import sqliteService from '../sqlite.js';

const feed = {
    async getHiddenFriendsFilter() {
        if (!dbVars.userPrefix) {
            return '';
        }
        try {
            const hiddenSet = await hiddenFriends.getHiddenFriends();
            if (hiddenSet.size === 0) {
                return '';
            }
            const userIds = Array.from(hiddenSet).map(id => `'${id.replace(/'/g, "''")}'`).join(',');
            return `AND user_id NOT IN (${userIds})`;
        } catch (e) {
            // If table doesn't exist or any error occurs, just return empty filter (show all)
            console.warn('[Feed DB] Error getting hidden friends filter, showing all:', e);
            return '';
        }
    },

    async getFeedDatabase() {
        console.log('[Feed DB] getFeedDatabase called', {
            userPrefix: dbVars.userPrefix,
            maxTableSize: dbVars.maxTableSize
        });
        if (!dbVars.userPrefix) {
            console.log('[Feed DB] No userPrefix, returning empty array');
            return [];
        }
        const hiddenFilter = await this.getHiddenFriendsFilter();
        
        // First, check if tables exist and have any data at all
        try {
            let totalCount = 0;
            await sqliteService.execute((dbRow) => {
                totalCount = dbRow[0] || 0;
            }, `SELECT COUNT(*) FROM ${dbVars.userPrefix}_feed_gps`);
            console.log('[Feed DB] Total GPS feed items in database:', totalCount);
            
            await sqliteService.execute((dbRow) => {
                totalCount = dbRow[0] || 0;
            }, `SELECT COUNT(*) FROM ${dbVars.userPrefix}_feed_online_offline`);
            console.log('[Feed DB] Total Online/Offline feed items in database:', totalCount);
            
            await sqliteService.execute((dbRow) => {
                totalCount = dbRow[0] || 0;
            }, `SELECT COUNT(*) FROM ${dbVars.userPrefix}_feed_status`);
            console.log('[Feed DB] Total Status feed items in database:', totalCount);
        } catch (e) {
            console.warn('[Feed DB] Error checking table counts:', e);
        }
        
        var feedDatabase = [];
        var date = new Date();
        date.setDate(date.getDate() - 1); // 24 hour limit
        var dateOffset = date.toJSON();
        console.log('[Feed DB] Querying feeds from date:', dateOffset);
        
            console.log('[Feed DB] Querying GPS feed...');
        try {
            let gpsCount = 0;
            let queryError = null;
            await sqliteService.execute((dbRow) => {
                if (!dbRow || !Array.isArray(dbRow)) {
                    console.warn('[Feed DB] GPS dbRow is not an array:', {
                        isArray: Array.isArray(dbRow),
                        type: typeof dbRow,
                        dbRow: dbRow
                    });
                    return;
                }
                if (gpsCount === 0 && dbRow.length > 0) {
                    console.log('[Feed DB] GPS dbRow sample structure:', {
                        isArray: Array.isArray(dbRow),
                        length: dbRow.length,
                        firstFewValues: dbRow.slice(0, 5)
                    });
                }
                var row = {
                    rowId: dbRow[0],
                    created_at: dbRow[1],
                    userId: dbRow[2],
                    displayName: dbRow[3],
                    type: 'GPS',
                    location: dbRow[4],
                    worldName: dbRow[5],
                    previousLocation: dbRow[6],
                    time: dbRow[7],
                    groupName: dbRow[8]
                };
                if (gpsCount < 3) {
                    console.log('[Feed DB] GPS row sample:', {
                        rowId: row.rowId,
                        type: row.type,
                        userId: row.userId,
                        displayName: row.displayName,
                        location: row.location,
                        created_at: row.created_at
                    });
                }
                feedDatabase.unshift(row);
                gpsCount++;
                }, `SELECT * FROM ${dbVars.userPrefix}_feed_gps WHERE created_at >= date('${dateOffset}') ${hiddenFilter} ORDER BY id DESC`).catch((e) => {
                    queryError = e;
                    console.error('[Feed DB] GPS query error:', e);
                });
                if (queryError) {
                    throw queryError;
                }
                console.log('[Feed DB] GPS feed query complete, feedDatabase length:', feedDatabase.length, 'GPS items:', gpsCount);
            } catch (e) {
                console.error('[Feed DB] Error fetching GPS feed:', e);
                console.error('[Feed DB] Error stack:', e.stack);
            }
            
            console.log('[Feed DB] Querying Status feed...');
            try {
                let statusCount = 0;
                await sqliteService.execute((dbRow) => {
                var row = {
                    rowId: dbRow[0],
                    created_at: dbRow[1],
                    userId: dbRow[2],
                    displayName: dbRow[3],
                    type: 'Status',
                    status: dbRow[4],
                    statusDescription: dbRow[5],
                    previousStatus: dbRow[6],
                    previousStatusDescription: dbRow[7]
                };
                if (statusCount < 3) {
                    console.log('[Feed DB] Status row sample:', {
                        rowId: row.rowId,
                        type: row.type,
                        userId: row.userId,
                        displayName: row.displayName,
                        status: row.status,
                        created_at: row.created_at
                    });
                }
                feedDatabase.unshift(row);
                statusCount++;
                }, `SELECT * FROM ${dbVars.userPrefix}_feed_status WHERE created_at >= date('${dateOffset}') ${hiddenFilter} ORDER BY id DESC`);
                console.log('[Feed DB] Status feed query complete, feedDatabase length:', feedDatabase.length, 'Status items:', statusCount);
            } catch (e) {
                console.warn('[Feed DB] Error fetching Status feed:', e);
            }
            
            console.log('[Feed DB] Querying Bio feed...');
            try {
                let bioCount = 0;
                await sqliteService.execute((dbRow) => {
                var row = {
                    rowId: dbRow[0],
                    created_at: dbRow[1],
                    userId: dbRow[2],
                    displayName: dbRow[3],
                    type: 'Bio',
                    bio: dbRow[4],
                    previousBio: dbRow[5]
                };
                if (bioCount < 3) {
                    console.log('[Feed DB] Bio row sample:', {
                        rowId: row.rowId,
                        type: row.type,
                        userId: row.userId,
                        displayName: row.displayName,
                        created_at: row.created_at
                    });
                }
                feedDatabase.unshift(row);
                bioCount++;
                }, `SELECT * FROM ${dbVars.userPrefix}_feed_bio WHERE created_at >= date('${dateOffset}') ${hiddenFilter} ORDER BY id DESC`);
                console.log('[Feed DB] Bio feed query complete, feedDatabase length:', feedDatabase.length, 'Bio items:', bioCount);
            } catch (e) {
                console.warn('[Feed DB] Error fetching Bio feed:', e);
            }
            
            console.log('[Feed DB] Querying Avatar feed...');
            try {
                let avatarCount = 0;
                await sqliteService.execute((dbRow) => {
                var row = {
                    rowId: dbRow[0],
                    created_at: dbRow[1],
                    userId: dbRow[2],
                    displayName: dbRow[3],
                    type: 'Avatar',
                    ownerId: dbRow[4],
                    avatarName: dbRow[5],
                    currentAvatarImageUrl: dbRow[6],
                    currentAvatarThumbnailImageUrl: dbRow[7],
                    previousCurrentAvatarImageUrl: dbRow[8],
                    previousCurrentAvatarThumbnailImageUrl: dbRow[9]
                };
                if (avatarCount < 3) {
                    console.log('[Feed DB] Avatar row sample:', {
                        rowId: row.rowId,
                        type: row.type,
                        userId: row.userId,
                        displayName: row.displayName,
                        avatarName: row.avatarName,
                        created_at: row.created_at
                    });
                }
                feedDatabase.unshift(row);
                avatarCount++;
                }, `SELECT * FROM ${dbVars.userPrefix}_feed_avatar WHERE created_at >= date('${dateOffset}') ${hiddenFilter} ORDER BY id DESC`);
                console.log('[Feed DB] Avatar feed query complete, feedDatabase length:', feedDatabase.length, 'Avatar items:', avatarCount);
            } catch (e) {
                console.warn('[Feed DB] Error fetching Avatar feed:', e);
            }
            
            console.log('[Feed DB] Querying Online/Offline feed...');
            try {
                let onlineOfflineCount = 0;
                let onlineCount = 0;
                let offlineCount = 0;
                let undefinedTypeCount = 0;
                await sqliteService.execute((dbRow) => {
                var originalType = dbRow[4];
                
                // Detailed logging for first few rows to debug column mapping
                if (onlineOfflineCount < 3) {
                    const dbRowArray = Array.isArray(dbRow) ? Array.from(dbRow) : [];
                    console.log('[Feed DB] Online/Offline dbRow raw:');
                    console.log('  isArray:', Array.isArray(dbRow));
                    console.log('  length:', dbRow?.length);
                    console.log('  dbRow[0] (id):', dbRow[0], typeof dbRow[0]);
                    console.log('  dbRow[1] (created_at):', dbRow[1], typeof dbRow[1]);
                    console.log('  dbRow[2] (user_id):', dbRow[2], typeof dbRow[2]);
                    console.log('  dbRow[3] (display_name):', dbRow[3], typeof dbRow[3]);
                    console.log('  dbRow[4] (type):', dbRow[4], typeof dbRow[4]);
                    console.log('  dbRow[5] (location):', dbRow[5], typeof dbRow[5]);
                    console.log('  dbRow[6] (world_name):', dbRow[6], typeof dbRow[6]);
                    console.log('  dbRow[7] (time):', dbRow[7], typeof dbRow[7]);
                    console.log('  dbRow[8] (group_name):', dbRow[8], typeof dbRow[8]);
                    console.log('  Full array:', JSON.stringify(dbRowArray));
                }
                
                var row = {
                    rowId: dbRow[0],
                    created_at: dbRow[1],
                    userId: dbRow[2],
                    displayName: dbRow[3],
                    type: originalType || 'Online', // Fallback to 'Online' if undefined
                    location: dbRow[5],
                    worldName: dbRow[6],
                    time: dbRow[7],
                    groupName: dbRow[8]
                };
                if (!originalType || originalType === null || originalType === undefined) {
                    undefinedTypeCount++;
                    if (undefinedTypeCount <= 3) {
                        const dbRowArray = Array.isArray(dbRow) ? Array.from(dbRow) : [];
                        console.warn('[Feed DB] Online/Offline row with undefined type:');
                        console.warn('  rowId:', row.rowId);
                        console.warn('  dbRow[4] (type):', dbRow[4], typeof dbRow[4]);
                        console.warn('  dbRow length:', dbRow.length);
                        console.warn('  All dbRow values:', JSON.stringify(dbRowArray));
                        console.warn('  Mapped row:', JSON.stringify(row));
                    }
                }
                if (row.type === 'Online') onlineCount++;
                if (row.type === 'Offline') offlineCount++;
                if (onlineOfflineCount < 3) {
                    console.log('[Feed DB] Online/Offline row sample:');
                    console.log('  rowId:', row.rowId);
                    console.log('  type:', row.type);
                    console.log('  originalType:', originalType);
                    console.log('  userId:', row.userId);
                    console.log('  displayName:', row.displayName);
                    console.log('  created_at:', row.created_at);
                    console.log('  location:', row.location);
                    console.log('  Full mapped row:', JSON.stringify(row));
                }
                feedDatabase.unshift(row);
                onlineOfflineCount++;
                }, `SELECT * FROM ${dbVars.userPrefix}_feed_online_offline WHERE created_at >= date('${dateOffset}') ${hiddenFilter} ORDER BY id DESC`);
                console.log('[Feed DB] Online/Offline feed query complete, feedDatabase length:', feedDatabase.length, 
                    'Online/Offline items:', onlineOfflineCount, 
                    'Online:', onlineCount, 
                    'Offline:', offlineCount,
                    'Undefined types:', undefinedTypeCount);
            } catch (e) {
                console.warn('[Feed DB] Error fetching Online/Offline feed:', e);
            }
            
            console.log('[Feed DB] All queries complete, total feedDatabase length before sort:', feedDatabase.length);
            
            var compareByCreatedAt = function (a, b) {
                // Sort descending (newest first)
                var A = new Date(a.created_at).getTime();
                var B = new Date(b.created_at).getTime();
                return B - A; // Descending order (newest first)
            };
            
            feedDatabase.sort(compareByCreatedAt);
            console.log('[Feed DB] getFeedDatabase returning', feedDatabase.length, 'items (sorted descending, newest first)');
            if (feedDatabase.length > 0) {
                console.log('[Feed DB] First item:', {
                    type: feedDatabase[0].type,
                    displayName: feedDatabase[0].displayName,
                    created_at: feedDatabase[0].created_at
                });
                console.log('[Feed DB] Last item:', {
                    type: feedDatabase[feedDatabase.length - 1].type,
                    displayName: feedDatabase[feedDatabase.length - 1].displayName,
                    created_at: feedDatabase[feedDatabase.length - 1].created_at
                });
            }
            return feedDatabase;
    },

    addGPSToDatabase(entry) {
        if (!dbVars.userPrefix) {
            return;
        }
        sqliteService.executeNonQuery(
            `INSERT OR IGNORE INTO ${dbVars.userPrefix}_feed_gps (created_at, user_id, display_name, location, world_name, previous_location, time, group_name) VALUES (@created_at, @user_id, @display_name, @location, @world_name, @previous_location, @time, @group_name)`,
            {
                '@created_at': entry.created_at,
                '@user_id': entry.userId,
                '@display_name': entry.displayName,
                '@location': entry.location,
                '@world_name': entry.worldName,
                '@previous_location': entry.previousLocation,
                '@time': entry.time,
                '@group_name': entry.groupName
            }
        );
        // Update analytics cache incrementally (only friend activity)
        if (entry.userId) {
            analyticsCache.incrementActiveFriend(entry.userId, entry.displayName);
        }
    },

    addStatusToDatabase(entry) {
        sqliteService.executeNonQuery(
            `INSERT OR IGNORE INTO ${dbVars.userPrefix}_feed_status (created_at, user_id, display_name, status, status_description, previous_status, previous_status_description) VALUES (@created_at, @user_id, @display_name, @status, @status_description, @previous_status, @previous_status_description)`,
            {
                '@created_at': entry.created_at,
                '@user_id': entry.userId,
                '@display_name': entry.displayName,
                '@status': entry.status,
                '@status_description': entry.statusDescription,
                '@previous_status': entry.previousStatus,
                '@previous_status_description': entry.previousStatusDescription
            }
        );
        // Update analytics cache incrementally
        if (entry.userId) {
            analyticsCache.incrementActiveFriend(entry.userId, entry.displayName);
        }
    },

    addBioToDatabase(entry) {
        if (!dbVars.userPrefix) {
            return;
        }
        sqliteService.executeNonQuery(
            `INSERT OR IGNORE INTO ${dbVars.userPrefix}_feed_bio (created_at, user_id, display_name, bio, previous_bio) VALUES (@created_at, @user_id, @display_name, @bio, @previous_bio)`,
            {
                '@created_at': entry.created_at,
                '@user_id': entry.userId,
                '@display_name': entry.displayName,
                '@bio': entry.bio,
                '@previous_bio': entry.previousBio
            }
        );
    },

    addAvatarToDatabase(entry) {
        if (!dbVars.userPrefix) {
            return;
        }
        sqliteService.executeNonQuery(
            `INSERT OR IGNORE INTO ${dbVars.userPrefix}_feed_avatar (created_at, user_id, display_name, owner_id, avatar_name, current_avatar_image_url, current_avatar_thumbnail_image_url, previous_current_avatar_image_url, previous_current_avatar_thumbnail_image_url) VALUES (@created_at, @user_id, @display_name, @owner_id, @avatar_name, @current_avatar_image_url, @current_avatar_thumbnail_image_url, @previous_current_avatar_image_url, @previous_current_avatar_thumbnail_image_url)`,
            {
                '@created_at': entry.created_at,
                '@user_id': entry.userId,
                '@display_name': entry.displayName,
                '@owner_id': entry.ownerId,
                '@avatar_name': entry.avatarName,
                '@current_avatar_image_url': entry.currentAvatarImageUrl,
                '@current_avatar_thumbnail_image_url':
                    entry.currentAvatarThumbnailImageUrl,
                '@previous_current_avatar_image_url':
                    entry.previousCurrentAvatarImageUrl,
                '@previous_current_avatar_thumbnail_image_url':
                    entry.previousCurrentAvatarThumbnailImageUrl
            }
        );
        // Update analytics cache incrementally (only friend activity)
        if (entry.userId) {
            analyticsCache.incrementActiveFriend(entry.userId, entry.displayName);
        }
    },

    addOnlineOfflineToDatabase(entry) {
        if (!dbVars.userPrefix) {
            return;
        }
        sqliteService.executeNonQuery(
            `INSERT OR IGNORE INTO ${dbVars.userPrefix}_feed_online_offline (created_at, user_id, display_name, type, location, world_name, time, group_name) VALUES (@created_at, @user_id, @display_name, @type, @location, @world_name, @time, @group_name)`,
            {
                '@created_at': entry.created_at,
                '@user_id': entry.userId,
                '@display_name': entry.displayName,
                '@type': entry.type,
                '@location': entry.location,
                '@world_name': entry.worldName,
                '@time': entry.time,
                '@group_name': entry.groupName
            }
        );
        // Update analytics cache incrementally (only friend activity)
        if (entry.userId) {
            analyticsCache.incrementActiveFriend(entry.userId, entry.displayName);
        }
    },

        async lookupFeedDatabase(search, filters, vipList, dateRange = null) {
            console.log('[Feed DB] lookupFeedDatabase called', {
                search,
                filters,
                vipListLength: vipList?.length || 0,
                userPrefix: dbVars.userPrefix
            });
            
            if (!dbVars.userPrefix) {
                console.log('[Feed DB] No userPrefix, returning empty array');
                return [];
            }
            
            const hiddenFilter = await this.getHiddenFriendsFilter();
            
            // Build date range filter
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
            
            // Check if tables have any data at all
            try {
                let gpsCount = 0;
                await sqliteService.execute((dbRow) => {
                    gpsCount = dbRow[0] || 0;
                }, `SELECT COUNT(*) FROM ${dbVars.userPrefix}_feed_gps`);
                console.log('[Feed DB] Total GPS items in database:', gpsCount);
                
                let onlineOfflineCount = 0;
                await sqliteService.execute((dbRow) => {
                    onlineOfflineCount = dbRow[0] || 0;
                }, `SELECT COUNT(*) FROM ${dbVars.userPrefix}_feed_online_offline`);
                console.log('[Feed DB] Total Online/Offline items in database:', onlineOfflineCount);
                
                let statusCount = 0;
                await sqliteService.execute((dbRow) => {
                    statusCount = dbRow[0] || 0;
                }, `SELECT COUNT(*) FROM ${dbVars.userPrefix}_feed_status`);
                console.log('[Feed DB] Total Status items in database:', statusCount);
                
                let bioCount = 0;
                await sqliteService.execute((dbRow) => {
                    bioCount = dbRow[0] || 0;
                }, `SELECT COUNT(*) FROM ${dbVars.userPrefix}_feed_bio`);
                console.log('[Feed DB] Total Bio items in database:', bioCount);
                
                let avatarCount = 0;
                await sqliteService.execute((dbRow) => {
                    avatarCount = dbRow[0] || 0;
                }, `SELECT COUNT(*) FROM ${dbVars.userPrefix}_feed_avatar`);
                console.log('[Feed DB] Total Avatar items in database:', avatarCount);
            } catch (e) {
                console.warn('[Feed DB] Error checking table counts in lookup:', e);
            }
        var search = search.replaceAll("'", "''");
        if (search.startsWith('wrld_') || search.startsWith('grp_')) {
            return this.getFeedByInstanceId(search, filters, vipList);
        }
        var vipQuery = '';
        if (vipList.length > 0) {
            vipQuery = 'AND user_id IN (';
            vipList.forEach((vip, i) => {
                vipQuery += `'${vip.replaceAll("'", "''")}'`;
                if (i < vipList.length - 1) {
                    vipQuery += ', ';
                }
            });
            vipQuery += ')';
        }
        var gps = true;
        var status = true;
        var bio = true;
        var avatar = true;
        var online = true;
        var offline = true;
        var aviPublic = search.includes('public');
        var aviPrivate = search.includes('private');
        if (filters.length > 0) {
            gps = false;
            status = false;
            bio = false;
            avatar = false;
            online = false;
            offline = false;
            filters.forEach((filter) => {
                switch (filter) {
                    case 'GPS':
                        gps = true;
                        break;
                    case 'Status':
                        status = true;
                        break;
                    case 'Bio':
                        bio = true;
                        break;
                    case 'Avatar':
                        avatar = true;
                        break;
                    case 'Online':
                        online = true;
                        break;
                    case 'Offline':
                        offline = true;
                        break;
                }
            });
        }
            var feedDatabase = [];
            console.log('[Feed DB] Starting queries, filters:', { gps, status, bio, avatar, online, offline });
            
            if (gps) {
                try {
                    console.log('[Feed DB] Querying GPS feed...');
                    await sqliteService.execute((dbRow) => {
                    var row = {
                        rowId: dbRow[0],
                        created_at: dbRow[1],
                        userId: dbRow[2],
                        displayName: dbRow[3],
                        type: 'GPS',
                        location: dbRow[4],
                        worldName: dbRow[5],
                        previousLocation: dbRow[6],
                        time: dbRow[7],
                        groupName: dbRow[8]
                    };
                    feedDatabase.unshift(row);
                    }, `SELECT * FROM ${dbVars.userPrefix}_feed_gps WHERE (display_name LIKE '%${search}%' OR world_name LIKE '%${search}%' OR group_name LIKE '%${search}%') ${vipQuery} ${hiddenFilter} ${dateRangeFilter} ORDER BY id DESC LIMIT ${dbVars.maxTableSize}`);
                    console.log('[Feed DB] GPS feed query complete, feedDatabase length:', feedDatabase.length);
                } catch (e) {
                    console.warn('[Feed DB] Error fetching GPS feed in lookup:', e);
                }
            }
            if (status) {
                try {
                    console.log('[Feed DB] Querying Status feed...');
                    await sqliteService.execute((dbRow) => {
                    var row = {
                        rowId: dbRow[0],
                        created_at: dbRow[1],
                        userId: dbRow[2],
                        displayName: dbRow[3],
                        type: 'Status',
                        status: dbRow[4],
                        statusDescription: dbRow[5],
                        previousStatus: dbRow[6],
                        previousStatusDescription: dbRow[7]
                    };
                    feedDatabase.unshift(row);
                    }, `SELECT * FROM ${dbVars.userPrefix}_feed_status WHERE (display_name LIKE '%${search}%' OR status LIKE '%${search}%' OR status_description LIKE '%${search}%') ${vipQuery} ${hiddenFilter} ${dateRangeFilter} ORDER BY id DESC LIMIT ${dbVars.maxTableSize}`);
                    console.log('[Feed DB] Status feed query complete, feedDatabase length:', feedDatabase.length);
                } catch (e) {
                    console.warn('[Feed DB] Error fetching Status feed in lookup:', e);
                }
            }
            if (bio) {
                try {
                    console.log('[Feed DB] Querying Bio feed...');
                    await sqliteService.execute((dbRow) => {
                    var row = {
                        rowId: dbRow[0],
                        created_at: dbRow[1],
                        userId: dbRow[2],
                        displayName: dbRow[3],
                        type: 'Bio',
                        bio: dbRow[4],
                        previousBio: dbRow[5]
                    };
                    feedDatabase.unshift(row);
                    }, `SELECT * FROM ${dbVars.userPrefix}_feed_bio WHERE (display_name LIKE '%${search}%' OR bio LIKE '%${search}%') ${vipQuery} ${hiddenFilter} ${dateRangeFilter} ORDER BY id DESC LIMIT ${dbVars.maxTableSize}`);
                    console.log('[Feed DB] Bio feed query complete, feedDatabase length:', feedDatabase.length);
                } catch (e) {
                    console.warn('[Feed DB] Error fetching Bio feed in lookup:', e);
                }
            }
            if (avatar) {
                console.log('[Feed DB] Querying Avatar feed...');
            var query = '';
            if (aviPrivate) {
                query = 'OR user_id = owner_id';
            } else if (aviPublic) {
                query = 'OR user_id != owner_id';
            }
            try {
                await sqliteService.execute((dbRow) => {
                    var row = {
                        rowId: dbRow[0],
                        created_at: dbRow[1],
                        userId: dbRow[2],
                        displayName: dbRow[3],
                        type: 'Avatar',
                        ownerId: dbRow[4],
                        avatarName: dbRow[5],
                        currentAvatarImageUrl: dbRow[6],
                        currentAvatarThumbnailImageUrl: dbRow[7],
                        previousCurrentAvatarImageUrl: dbRow[8],
                        previousCurrentAvatarThumbnailImageUrl: dbRow[9]
                    };
                    feedDatabase.unshift(row);
                    }, `SELECT * FROM ${dbVars.userPrefix}_feed_avatar WHERE ((display_name LIKE '%${search}%' OR avatar_name LIKE '%${search}%') ${query}) ${vipQuery} ${hiddenFilter} ${dateRangeFilter} ORDER BY id DESC LIMIT ${dbVars.maxTableSize}`);
                    console.log('[Feed DB] Avatar feed query complete, feedDatabase length:', feedDatabase.length);
                } catch (e) {
                    console.warn('[Feed DB] Error fetching Avatar feed in lookup:', e);
                }
            }
            if (online || offline) {
                console.log('[Feed DB] Querying Online/Offline feed...');
            var query = '';
            if (!online || !offline) {
                if (online) {
                    query = "AND type = 'Online'";
                } else if (offline) {
                    query = "AND type = 'Offline'";
                }
            }
            try {
                let rowCount = 0;
                await sqliteService.execute((dbRow) => {
                    if (rowCount < 3) {
                        console.log('[Feed DB] Online/Offline dbRow sample in lookup:', {
                            isArray: Array.isArray(dbRow),
                            length: dbRow?.length,
                            dbRow0: dbRow[0],
                            dbRow1: dbRow[1],
                            dbRow2: dbRow[2],
                            dbRow3: dbRow[3],
                            dbRow4: dbRow[4],
                            allValues: Array.isArray(dbRow) ? dbRow : 'not an array'
                        });
                    }
                    var row = {
                        rowId: dbRow[0],
                        created_at: dbRow[1],
                        userId: dbRow[2],
                        displayName: dbRow[3],
                        type: dbRow[4] || 'Online', // Fallback to 'Online' if undefined
                        location: dbRow[5],
                        worldName: dbRow[6],
                        time: dbRow[7],
                        groupName: dbRow[8]
                    };
                    if (rowCount < 3) {
                        console.log('[Feed DB] Online/Offline mapped row sample:', row);
                    }
                    feedDatabase.unshift(row);
                    rowCount++;
                    }, `SELECT * FROM ${dbVars.userPrefix}_feed_online_offline WHERE ((display_name LIKE '%${search}%' OR world_name LIKE '%${search}%' OR group_name LIKE '%${search}%') ${query}) ${vipQuery} ${hiddenFilter} ${dateRangeFilter} ORDER BY id DESC LIMIT ${dbVars.maxTableSize}`);
                    console.log('[Feed DB] Online/Offline feed query complete, feedDatabase length:', feedDatabase.length);
                } catch (e) {
                    console.warn('[Feed DB] Error fetching Online/Offline feed in lookup:', e);
                }
            }
            
            console.log('[Feed DB] All queries complete, total feedDatabase length before sort:', feedDatabase.length);
            
            var compareByCreatedAt = function (a, b) {
                // Sort descending (newest first)
                var A = new Date(a.created_at).getTime();
                var B = new Date(b.created_at).getTime();
                return B - A; // Descending order (newest first)
            };
            
            feedDatabase.sort(compareByCreatedAt);
            console.log('[Feed DB] After sort (descending), feedDatabase length:', feedDatabase.length);
            
            // Keep only the newest items (first maxTableSize items after descending sort)
            if (feedDatabase.length > dbVars.maxTableSize) {
                feedDatabase.splice(dbVars.maxTableSize);
            }
            console.log('[Feed DB] After splice (maxTableSize:', dbVars.maxTableSize, '), final feedDatabase length:', feedDatabase.length);
            
            // Log type distribution
            const typeCounts = {};
            feedDatabase.forEach(item => {
                const type = item.type || 'undefined';
                typeCounts[type] = (typeCounts[type] || 0) + 1;
            });
            console.log('[Feed DB] Type distribution:', typeCounts);
            
            if (feedDatabase.length > 0) {
                console.log('[Feed DB] First item in result:', {
                    type: feedDatabase[0].type,
                    displayName: feedDatabase[0].displayName,
                    created_at: feedDatabase[0].created_at
                });
                console.log('[Feed DB] Last item in result:', {
                    type: feedDatabase[feedDatabase.length - 1].type,
                    displayName: feedDatabase[feedDatabase.length - 1].displayName,
                    created_at: feedDatabase[feedDatabase.length - 1].created_at
                });
            }
            
            return feedDatabase;
        },

    async getFeedByInstanceId(instanceId, filters, vipList) {
        if (!dbVars.userPrefix) {
            return [];
        }
        var feedDatabase = [];
        const hiddenFilter = await this.getHiddenFriendsFilter();
        var vipQuery = '';
        if (vipList.length > 0) {
            vipQuery = 'AND user_id IN (';
            vipList.forEach((vip, i) => {
                vipQuery += `'${vip.replaceAll("'", "''")}'`;
                if (i < vipList.length - 1) {
                    vipQuery += ', ';
                }
            });
            vipQuery += ')';
        }
        var gps = true;
        var online = true;
        var offline = true;
        if (filters.length > 0) {
            gps = false;
            online = false;
            offline = false;
            filters.forEach((filter) => {
                switch (filter) {
                    case 'GPS':
                        gps = true;
                        break;
                    case 'Online':
                        online = true;
                        break;
                    case 'Offline':
                        offline = true;
                        break;
                }
            });
        }
        if (gps) {
            try {
                await sqliteService.execute((dbRow) => {
                    var row = {
                        rowId: dbRow[0],
                        created_at: dbRow[1],
                        userId: dbRow[2],
                        displayName: dbRow[3],
                        type: 'GPS',
                        location: dbRow[4],
                        worldName: dbRow[5],
                        previousLocation: dbRow[6],
                        time: dbRow[7],
                        groupName: dbRow[8]
                    };
                    feedDatabase.unshift(row);
                }, `SELECT * FROM ${dbVars.userPrefix}_feed_gps WHERE location LIKE '%${instanceId}%' ${vipQuery} ${hiddenFilter} ORDER BY id DESC LIMIT ${dbVars.maxTableSize}`);
            } catch (e) {
                console.warn('Error fetching GPS feed by instance:', e);
            }
        }
        if (online || offline) {
            var query = '';
            if (!online || !offline) {
                if (online) {
                    query = "AND type = 'Online'";
                } else if (offline) {
                    query = "AND type = 'Offline'";
                }
            }
            try {
                await sqliteService.execute((dbRow) => {
                    var row = {
                        rowId: dbRow[0],
                        created_at: dbRow[1],
                        userId: dbRow[2],
                        displayName: dbRow[3],
                        type: dbRow[4] || 'Online', // Fallback to 'Online' if undefined
                        location: dbRow[5],
                        worldName: dbRow[6],
                        time: dbRow[7],
                        groupName: dbRow[8]
                    };
                    feedDatabase.unshift(row);
                }, `SELECT * FROM ${dbVars.userPrefix}_feed_online_offline WHERE (location LIKE '%${instanceId}%' ${query}) ${vipQuery} ${hiddenFilter} ORDER BY id DESC LIMIT ${dbVars.maxTableSize}`);
            } catch (e) {
                console.warn('Error fetching Online/Offline feed by instance:', e);
            }
        }
        var compareByCreatedAt = function (a, b) {
            var A = a.created_at;
            var B = b.created_at;
            if (A < B) {
                return -1;
            }
            if (A > B) {
                return 1;
            }
            return 0;
        };
        feedDatabase.sort(compareByCreatedAt);
        feedDatabase.splice(0, feedDatabase.length - dbVars.maxTableSize);
        return feedDatabase;
    }
};

export { feed };
