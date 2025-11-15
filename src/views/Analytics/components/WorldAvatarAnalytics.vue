<template>
    <div class="world-avatar-analytics">
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
                @change="loadAnalytics" />
        </div>
        <div class="analytics-content" v-loading="loading">
            <div class="analytics-section">
                <h3 class="section-title">{{ t('view.analytics.world_analytics.most_visited_worlds.header') }}</h3>
                <div class="chart-container">
                    <div v-if="visitedWorlds.length === 0" class="empty-state">
                        <i class="ri-global-line"></i>
                        <p>{{ t('view.analytics.world_analytics.no_data') }}</p>
                    </div>
                    <div v-else>
                        <div class="data-list">
                            <div
                                v-for="(world, index) in paginatedWorlds"
                                :key="world.worldId"
                                class="data-item"
                                @click="showWorldDialog(world.worldId)">
                                <div class="data-item-rank">#{{ (currentPage - 1) * pageSize + index + 1 }}</div>
                                <div class="data-item-name" v-text="world.worldName || world.worldId"></div>
                                <div class="data-item-value" v-text="world.visitCount + ' visits'"></div>
                            </div>
                        </div>
                        <el-pagination
                            v-if="visitedWorlds.length > pageSize"
                            v-model:current-page="currentPage"
                            v-model:page-size="pageSize"
                            :total="visitedWorlds.length"
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
    import { computed, onMounted, ref } from 'vue';
    import { useI18n } from 'vue-i18n';

    import { database } from '../../../service/database';
    import { useWorldStore } from '../../../stores';

    const { t } = useI18n();
    const { showWorldDialog, cachedWorlds } = useWorldStore();

    const loading = ref(false);
    const dateRange = ref(null);
    const visitedWorlds = ref([]);
    
    // Pagination
    const currentPage = ref(1);
    const pageSize = ref(20);
    
    const paginatedWorlds = computed(() => {
        const start = (currentPage.value - 1) * pageSize.value;
        const end = start + pageSize.value;
        return visitedWorlds.value.slice(start, end);
    });

    async function loadAnalytics() {
        loading.value = true;
        try {
            const worlds = await database.getMostVisitedWorlds(dateRange.value);
            
            // Enhance with cached names
            visitedWorlds.value = worlds.map(item => {
                const cached = cachedWorlds.get(item.worldId);
                return {
                    ...item,
                    worldName: cached?.name || item.worldName || item.worldId
                };
            });
            
            // Reset pagination when data changes
            currentPage.value = 1;
        } catch (e) {
            console.error('[World Analytics] Error loading data:', e);
        } finally {
            loading.value = false;
        }
    }

    onMounted(() => {
        loadAnalytics();
    });
</script>

<style scoped lang="scss">
    .world-avatar-analytics {
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

    // Dark theme rank
    .dark .data-item-rank {
        color: rgba(255, 255, 255, 0.6);
    }

    // Light theme rank
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

    // Dark theme name
    .dark .data-item-name {
        color: rgba(255, 255, 255, 0.9);
    }

    // Light theme name
    html:not(.dark) .data-item-name {
        color: #333333;
    }

    .data-item-value {
        font-size: 14px;
        font-weight: 600;
        margin-left: auto;
    }

    // Dark theme value
    .dark .data-item-value {
        color: rgba(255, 255, 255, 0.7);
    }

    // Light theme value
    html:not(.dark) .data-item-value {
        color: #666666;
    }

    .pagination {
        margin-top: 16px;
        display: flex;
        justify-content: center;
    }
</style>

