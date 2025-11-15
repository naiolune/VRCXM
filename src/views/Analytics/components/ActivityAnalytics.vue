<template>
    <div class="activity-analytics">
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
                <h3 class="section-title">{{ t('view.analytics.activity_analytics.time_per_world.header') }}</h3>
                <div class="chart-container">
                    <div v-if="worldTimeData.length === 0" class="empty-state">
                        <i class="ri-bar-chart-line"></i>
                        <p>{{ t('view.analytics.activity_analytics.no_data') }}</p>
                    </div>
                    <div v-else>
                        <div class="data-list">
                            <div
                                v-for="(item, index) in paginatedWorldData"
                                :key="item.worldId"
                                class="data-item"
                                @click="showWorldDialog(item.worldId)">
                                <div class="data-item-rank">#{{ (worldCurrentPage - 1) * worldPageSize + index + 1 }}</div>
                                <div class="data-item-name" v-text="item.worldName || item.worldId"></div>
                                <div class="data-item-value" v-text="formatDuration(item.time)"></div>
                            </div>
                        </div>
                        <el-pagination
                            v-if="worldTimeData.length > worldPageSize"
                            v-model:current-page="worldCurrentPage"
                            v-model:page-size="worldPageSize"
                            :total="worldTimeData.length"
                            :page-sizes="[10, 20, 50, 100]"
                            layout="sizes, prev, pager, next, total"
                            small
                            class="pagination"
                            @size-change="worldCurrentPage = 1" />
                    </div>
                </div>
            </div>
            <div class="analytics-section">
                <h3 class="section-title">{{ t('view.analytics.activity_analytics.time_per_avatar.header') }}</h3>
                <div class="chart-container">
                    <div v-if="avatarTimeData.length === 0" class="empty-state">
                        <i class="ri-bar-chart-line"></i>
                        <p>{{ t('view.analytics.activity_analytics.no_data') }}</p>
                    </div>
                    <div v-else>
                        <div class="data-list">
                            <div
                                v-for="(item, index) in paginatedAvatarData"
                                :key="item.avatarId"
                                class="data-item"
                                @click="showAvatarDialog(item.avatarId)">
                                <div class="data-item-rank">#{{ (avatarCurrentPage - 1) * avatarPageSize + index + 1 }}</div>
                                <div class="data-item-name" v-text="item.avatarName || item.avatarId"></div>
                                <div class="data-item-value" v-text="formatDuration(item.time)"></div>
                            </div>
                        </div>
                        <el-pagination
                            v-if="avatarTimeData.length > avatarPageSize"
                            v-model:current-page="avatarCurrentPage"
                            v-model:page-size="avatarPageSize"
                            :total="avatarTimeData.length"
                            :page-sizes="[10, 20, 50, 100]"
                            layout="sizes, prev, pager, next, total"
                            small
                            class="pagination"
                            @size-change="avatarCurrentPage = 1" />
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
    import { useAvatarStore, useWorldStore } from '../../../stores';

    const { t } = useI18n();
    const { cachedWorlds, showWorldDialog } = useWorldStore();
    const { cachedAvatars, showAvatarDialog } = useAvatarStore();

    const loading = ref(false);
    const dateRange = ref(null);
    const worldTimeData = ref([]);
    const avatarTimeData = ref([]);
    
    // Pagination for world time
    const worldCurrentPage = ref(1);
    const worldPageSize = ref(20);
    
    // Pagination for avatar time
    const avatarCurrentPage = ref(1);
    const avatarPageSize = ref(20);
    
    const paginatedWorldData = computed(() => {
        const start = (worldCurrentPage.value - 1) * worldPageSize.value;
        const end = start + worldPageSize.value;
        return worldTimeData.value.slice(start, end);
    });
    
    const paginatedAvatarData = computed(() => {
        const start = (avatarCurrentPage.value - 1) * avatarPageSize.value;
        const end = start + avatarPageSize.value;
        return avatarTimeData.value.slice(start, end);
    });

    function formatDuration(seconds) {
        if (!seconds) return '0s';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
        
        return parts.join(' ');
    }

    async function loadAnalytics() {
        loading.value = true;
        try {
            const worldData = await database.getWorldTimeBreakdown(dateRange.value);
            const avatarData = await database.getAvatarTimeBreakdown(dateRange.value);
            
            // Enhance with cached names
            worldTimeData.value = worldData.map(item => {
                const cached = cachedWorlds.get(item.worldId);
                return {
                    ...item,
                    worldName: cached?.name || item.worldName || item.worldId
                };
            });
            
            avatarTimeData.value = avatarData.map(item => {
                const cached = cachedAvatars.get(item.avatarId);
                return {
                    ...item,
                    avatarName: cached?.name || item.avatarName || item.avatarId
                };
            });
            
            // Reset pagination when data changes
            worldCurrentPage.value = 1;
            avatarCurrentPage.value = 1;
        } catch (e) {
            console.error('[Activity Analytics] Error loading data:', e);
        } finally {
            loading.value = false;
        }
    }

    onMounted(() => {
        loadAnalytics();
    });
</script>

<style scoped lang="scss">
    .activity-analytics {
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

