<template>
    <div class="social-statistics">
        <div class="analytics-controls">
            <el-date-picker
                v-model="dateRange"
                type="datetimerange"
                range-separator="To"
                start-placeholder="Start date"
                end-placeholder="End date"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
                class="date-range-picker"
                size="default"
                clearable
                @change="loadStatistics" />
            <el-input
                v-model="searchQuery"
                placeholder="Search friends..."
                clearable
                class="search-input"
                size="default">
                <template #prefix>
                    <el-icon><Search /></el-icon>
                </template>
            </el-input>
        </div>
        <div class="analytics-content" v-loading="loading">
            <div class="analytics-section">
                <h3 class="section-title">{{ t('view.analytics.social_statistics.most_active_friends.header') }}</h3>
                <div class="chart-container">
                    <div v-if="activeFriends.length === 0" class="empty-state">
                        <i class="ri-user-line"></i>
                        <p>{{ t('view.analytics.social_statistics.no_data') }}</p>
                    </div>
                    <div v-else-if="filteredFriends.length === 0" class="empty-state">
                        <i class="ri-search-line"></i>
                        <p>No friends found matching "{{ searchQuery }}"</p>
                    </div>
                    <div v-else>
                        <div class="data-list">
                            <div
                                v-for="(friend, index) in paginatedFriends"
                                :key="friend.userId"
                                class="data-item"
                                @click="showUserDialog(friend.userId)">
                                <div class="data-item-rank">#{{ (currentPage - 1) * pageSize + index + 1 }}</div>
                                <div class="data-item-name" v-text="friend.displayName"></div>
                                <div class="data-item-value" v-text="friend.activityCount + ' activities'"></div>
                            </div>
                        </div>
                        <el-pagination
                            v-if="filteredFriends.length > pageSize"
                            v-model:current-page="currentPage"
                            v-model:page-size="pageSize"
                            :total="filteredFriends.length"
                            :page-sizes="[10, 20, 50, 100]"
                            layout="sizes, prev, pager, next, total"
                            small
                            class="pagination"
                            @size-change="currentPage = 1" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed, onMounted, ref, watch } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { Search } from '@element-plus/icons-vue';

    import { database } from '../../../service/database';
    import { useUserStore } from '../../../stores';

    const { t } = useI18n();
    const { showUserDialog, cachedUsers } = useUserStore();

    const loading = ref(false);
    const dateRange = ref(null);
    const activeFriends = ref([]);
    const searchQuery = ref('');
    
    // Pagination
    const currentPage = ref(1);
    const pageSize = ref(20);
    
    // Filter friends based on search query
    const filteredFriends = computed(() => {
        if (!searchQuery.value.trim()) {
            return activeFriends.value;
        }
        
        const query = searchQuery.value.toLowerCase().trim();
        return activeFriends.value.filter(friend => {
            const displayName = (friend.displayName || '').toLowerCase();
            const userId = (friend.userId || '').toLowerCase();
            return displayName.includes(query) || userId.includes(query);
        });
    });
    
    const paginatedFriends = computed(() => {
        const start = (currentPage.value - 1) * pageSize.value;
        const end = start + pageSize.value;
        return filteredFriends.value.slice(start, end);
    });
    
    // Reset pagination when search query changes
    watch(searchQuery, () => {
        currentPage.value = 1;
    });

    async function loadStatistics() {
        loading.value = true;
        try {
            const data = await database.getMostActiveFriends(dateRange.value);
            
            // Enhance with cached user names
            activeFriends.value = data.map(item => {
                const cached = cachedUsers.get(item.userId);
                return {
                    ...item,
                    displayName: cached?.displayName || item.displayName || item.userId
                };
            });
            
            // Reset pagination when data changes
            currentPage.value = 1;
        } catch (e) {
            console.error('[Social Statistics] Error loading data:', e);
        } finally {
            loading.value = false;
        }
    }

    onMounted(() => {
        loadStatistics();
    });
</script>

<style scoped lang="scss">
    .social-statistics {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 20px;
        padding: 20px;
        overflow-y: auto;
    }

    .analytics-controls {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        border-radius: 12px;
    }

    // Dark theme controls
    .dark .analytics-controls {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    // Light theme controls
    html:not(.dark) .analytics-controls {
        background: #f0f0f0;
        border: 1px solid #e0e0e0;
    }

    .date-range-picker {
        width: 360px;
    }

    .search-input {
        flex: 1;
        max-width: 300px;
    }

    .analytics-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 24px;
        min-height: 0;
    }

    .analytics-section {
        border-radius: 12px;
        padding: 20px;
    }

    // Dark theme section
    .dark .analytics-section {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    // Light theme section
    html:not(.dark) .analytics-section {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
    }

    .section-title {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
    }

    // Dark theme section title
    .dark .section-title {
        color: rgba(255, 255, 255, 0.9);
    }

    // Light theme section title
    html:not(.dark) .section-title {
        color: #333333;
    }

    .chart-container {
        min-height: 200px;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        text-align: center;

        i {
            font-size: 48px;
            margin-bottom: 12px;
            opacity: 0.5;
        }

        p {
            margin: 0;
            font-size: 14px;
        }
    }

    // Dark theme empty state
    .dark .empty-state {
        color: rgba(255, 255, 255, 0.5);
    }

    // Light theme empty state
    html:not(.dark) .empty-state {
        color: #999999;
    }

    .data-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .data-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 8px;
        transition: background 0.2s ease;
        cursor: pointer;
    }

    // Dark theme data item
    .dark .data-item {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);

        &:hover {
            background: rgba(255, 255, 255, 0.06);
        }
    }

    // Light theme data item
    html:not(.dark) .data-item {
        background: #ffffff;
        border: 1px solid #e0e0e0;

        &:hover {
            background: #f0f0f0;
        }
    }

    .data-item-rank {
        font-size: 14px;
        font-weight: 600;
        min-width: 30px;
    }

    // Dark theme data item rank
    .dark .data-item-rank {
        color: rgba(255, 255, 255, 0.6);
    }

    // Light theme data item rank
    html:not(.dark) .data-item-rank {
        color: #999999;
    }

    .data-item-name {
        font-weight: 500;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    // Dark theme data item name
    .dark .data-item-name {
        color: rgba(255, 255, 255, 0.9);
    }

    // Light theme data item name
    html:not(.dark) .data-item-name {
        color: #333333;
    }

    .data-item-value {
        font-size: 14px;
        font-weight: 600;
        margin-left: auto;
    }

    // Dark theme data item value
    .dark .data-item-value {
        color: rgba(255, 255, 255, 0.7);
    }

    // Light theme data item value
    html:not(.dark) .data-item-value {
        color: #666666;
    }

    .pagination {
        margin-top: 16px;
        display: flex;
        justify-content: center;
    }
</style>

