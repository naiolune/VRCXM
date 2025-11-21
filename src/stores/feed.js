import { ref, watch } from 'vue';
import { defineStore } from 'pinia';

import { database } from '../service/database';
import { useFriendStore } from './friend';
import { useNotificationStore } from './notification';
import { useSharedFeedStore } from './sharedFeed';
import { useUiStore } from './ui';
import { useVrcxStore } from './vrcx';
import { watchState } from '../service/watchState';

import configRepository from '../service/config';

// Set to true to enable verbose debug logging for feed store operations
const DEBUG_FEED_STORE = false;

export const useFeedStore = defineStore('Feed', () => {
    const friendStore = useFriendStore();
    const notificationStore = useNotificationStore();
    const UiStore = useUiStore();
    const vrcxStore = useVrcxStore();
    const sharedFeedStore = useSharedFeedStore();

    const feedTable = ref({
        data: [],
        search: '',
        vip: false,
        loading: false,
        filter: [],
        dateRange: null,
        currentPage: 1,
        tableProps: {
            stripe: true,
            size: 'small',
            defaultSort: {
                prop: 'created_at',
                order: 'descending'
            }
        },
        pageSize: 15,
        pageSizeLinked: true,
        paginationProps: {
            small: true,
            layout: 'sizes,prev,pager,next,total',
            pageSizes: [10, 15, 20, 25, 50, 100]
        }
    });

    const feedSessionTable = ref([]);

    watch(
        () => watchState.isLoggedIn,
        (isLoggedIn) => {
            feedTable.value.data = [];
            feedSessionTable.value = [];
            if (isLoggedIn) {
                initFeedTable();
            }
        },
        { flush: 'sync' }
    );

    watch(
        () => watchState.isFavoritesLoaded,
        (isFavoritesLoaded) => {
            if (isFavoritesLoaded && feedTable.value.vip) {
                feedTableLookup(); // re-apply VIP filter after friends are loaded
            }
        }
    );

    async function init() {
        feedTable.value.filter = JSON.parse(
            await configRepository.getString('VRCX_feedTableFilters', '[]')
        );
        feedTable.value.vip = await configRepository.getBool(
            'VRCX_feedTableVIPFilter',
            false
        );
        const dateRangeStr = await configRepository.getString('VRCX_feedTableDateRange', '');
        if (dateRangeStr) {
            try {
                feedTable.value.dateRange = JSON.parse(dateRangeStr);
            } catch (e) {
                feedTable.value.dateRange = null;
            }
        }
    }

    init();

    function feedSearch(row) {
        const value = feedTable.value.search.toUpperCase();
        if (!value) {
            return true;
        }
        if (
            (value.startsWith('wrld_') || value.startsWith('grp_')) &&
            String(row.location).toUpperCase().includes(value)
        ) {
            return true;
        }
        switch (row.type) {
            case 'GPS':
                if (String(row.displayName).toUpperCase().includes(value)) {
                    return true;
                }
                if (String(row.worldName).toUpperCase().includes(value)) {
                    return true;
                }
                return false;
            case 'Online':
                if (String(row.displayName).toUpperCase().includes(value)) {
                    return true;
                }
                if (String(row.worldName).toUpperCase().includes(value)) {
                    return true;
                }
                return false;
            case 'Offline':
                if (String(row.displayName).toUpperCase().includes(value)) {
                    return true;
                }
                if (String(row.worldName).toUpperCase().includes(value)) {
                    return true;
                }
                return false;
            case 'Status':
                if (String(row.displayName).toUpperCase().includes(value)) {
                    return true;
                }
                if (String(row.status).toUpperCase().includes(value)) {
                    return true;
                }
                if (
                    String(row.statusDescription).toUpperCase().includes(value)
                ) {
                    return true;
                }
                return false;
            case 'Avatar':
                if (String(row.displayName).toUpperCase().includes(value)) {
                    return true;
                }
                if (String(row.avatarName).toUpperCase().includes(value)) {
                    return true;
                }
                return false;
            case 'Bio':
                if (String(row.displayName).toUpperCase().includes(value)) {
                    return true;
                }
                if (String(row.bio).toUpperCase().includes(value)) {
                    return true;
                }
                if (String(row.previousBio).toUpperCase().includes(value)) {
                    return true;
                }
                return false;
        }
        return true;
    }

    async function feedTableLookup() {
        if (DEBUG_FEED_STORE) {
            console.log('[Feed] feedTableLookup called', {
                search: feedTable.value.search,
                filter: feedTable.value.filter,
                vip: feedTable.value.vip,
                dateRange: feedTable.value.dateRange
            });
        }
        await configRepository.setString(
            'VRCX_feedTableFilters',
            JSON.stringify(feedTable.value.filter)
        );
        await configRepository.setBool(
            'VRCX_feedTableVIPFilter',
            feedTable.value.vip
        );
        if (feedTable.value.dateRange) {
            await configRepository.setString(
                'VRCX_feedTableDateRange',
                JSON.stringify(feedTable.value.dateRange)
            );
        } else {
            await configRepository.setString('VRCX_feedTableDateRange', '');
        }
        feedTable.value.loading = true;
        let vipList = [];
        if (feedTable.value.vip) {
            vipList = Array.from(friendStore.localFavoriteFriends.values());
            if (DEBUG_FEED_STORE) {
                console.log('[Feed] VIP filter enabled, vipList length:', vipList.length);
            }
        }
        
        if (DEBUG_FEED_STORE) {
            console.log('[Feed] Calling database.lookupFeedDatabase...');
        }
        const result = await database.lookupFeedDatabase(
            feedTable.value.search,
            feedTable.value.filter,
            vipList,
            feedTable.value.dateRange
        );
        if (DEBUG_FEED_STORE) {
            console.log('[Feed] database.lookupFeedDatabase returned', {
                resultLength: result?.length || 0,
                firstFew: result?.slice(0, 3) || []
            });
        }
        
        feedTable.value.data = result;
        feedTable.value.loading = false;
        
        if (DEBUG_FEED_STORE) {
            console.log('[Feed] feedTableLookup complete, feedTable.data.length:', feedTable.value.data.length);
        }
    }

    function addFeed(feed) {
        if (DEBUG_FEED_STORE) {
            console.log('[Feed] addFeed called', {
                type: feed.type,
                userId: feed.userId,
                displayName: feed.displayName,
                created_at: feed.created_at,
                currentDataLength: feedTable.value.data.length,
                currentPage: feedTable.value.currentPage,
                filter: feedTable.value.filter,
                vip: feedTable.value.vip
            });
        }
        notificationStore.queueFeedNoty(feed);
        feedSessionTable.value.push(feed);
        feedSessionTable.value.shift();
        sharedFeedStore.updateSharedFeed(false);
        
        if (
            feedTable.value.filter.length > 0 &&
            !feedTable.value.filter.includes(feed.type)
        ) {
            if (DEBUG_FEED_STORE) {
                console.log('[Feed] Feed item filtered out by type filter:', feed.type);
            }
            return;
        }
        if (
            feedTable.value.vip &&
            !friendStore.localFavoriteFriends.has(feed.userId)
        ) {
            if (DEBUG_FEED_STORE) {
                console.log('[Feed] Feed item filtered out by VIP filter:', feed.userId);
            }
            return;
        }
        if (!feedSearch(feed)) {
            if (DEBUG_FEED_STORE) {
                console.log('[Feed] Feed item filtered out by search filter');
            }
            return;
        }
        
        // Add new feed items at the beginning (newest first)
        feedTable.value.data.unshift(feed);
        if (DEBUG_FEED_STORE) {
            console.log('[Feed] Feed item added, new data length:', feedTable.value.data.length);
        }
        
        // Re-sort to ensure proper order (newest first)
        feedTable.value.data.sort((a, b) => {
            const aTime = new Date(a.created_at).getTime();
            const bTime = new Date(b.created_at).getTime();
            return bTime - aTime; // Descending (newest first)
        });
        if (DEBUG_FEED_STORE) {
            console.log('[Feed] Feed data sorted, keeping page:', feedTable.value.currentPage);
        }
        
        // Keep user on current page - don't reset to page 1
        sweepFeed();
        UiStore.notifyMenu('feed');
    }

    function sweepFeed() {
        let limit;
        const { data } = feedTable.value;
        const j = data.length;
        if (j > vrcxStore.maxTableSize) {
            data.splice(0, j - vrcxStore.maxTableSize);
        }

        const date = new Date();
        date.setDate(date.getDate() - 1); // 24 hour limit
        limit = date.toJSON();
        let i = 0;
        const k = feedSessionTable.value.length;
        while (i < k && feedSessionTable.value[i].created_at < limit) {
            ++i;
        }
        if (i === k) {
            feedSessionTable.value = [];
        } else if (i) {
            feedSessionTable.value.splice(0, i);
        }
    }

    async function initFeedTable() {
        if (DEBUG_FEED_STORE) {
            console.log('[Feed] initFeedTable called', {
                currentDataLength: feedTable.value.data.length,
                loading: feedTable.value.loading
            });
        }
        // requires dbVars.userPrefix to be already set
        const { dbVars } = await import('../service/database');
        if (!dbVars.userPrefix) {
            if (DEBUG_FEED_STORE) {
                console.log('[Feed] Skipping feed table initialization: user not logged in yet');
            }
            feedTable.value.loading = false;
            return;
        }
        if (DEBUG_FEED_STORE) {
            console.log('[Feed] User prefix found:', dbVars.userPrefix);
        }
        feedTable.value.loading = true;

        await feedTableLookup();

        if (DEBUG_FEED_STORE) {
            console.log('[Feed] Getting feed database for session table...');
        }
        const getFeedDatabaseResult = await database.getFeedDatabase();
        if (DEBUG_FEED_STORE) {
            console.log('[Feed] getFeedDatabase returned', {
                resultLength: getFeedDatabaseResult?.length || 0,
                firstFew: getFeedDatabaseResult?.slice(0, 3) || []
            });
        }
        
        if (getFeedDatabaseResult && getFeedDatabaseResult.length > 0) {
            // rough, maybe 100 is enough
            feedSessionTable.value = getFeedDatabaseResult.slice(-100);
            if (DEBUG_FEED_STORE) {
                console.log('[Feed] feedSessionTable set, length:', feedSessionTable.value.length);
            }
        } else {
            feedSessionTable.value = [];
            if (DEBUG_FEED_STORE) {
                console.log('[Feed] feedSessionTable empty');
            }
        }
        
        feedTable.value.loading = false;
        if (DEBUG_FEED_STORE) {
            console.log('[Feed] initFeedTable complete', {
                finalDataLength: feedTable.value.data.length,
                sessionTableLength: feedSessionTable.value.length
            });
        }
    }

    return {
        feedTable,
        feedSessionTable,
        initFeedTable,
        feedTableLookup,
        addFeed
    };
});
