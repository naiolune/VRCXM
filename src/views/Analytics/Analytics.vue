<template>
    <div id="analytics" class="analytics-container x-container">
        <div class="analytics-header">
            <h1 class="analytics-title">{{ t('view.analytics.header') }}</h1>
        </div>
        <div class="analytics-content">
            <AnalyticsMigration />
            <div class="analytics-tabs-container">
            <el-tabs v-model="activeTab" class="analytics-tabs">
                <el-tab-pane name="activity" :label="t('view.analytics.activity_analytics.header')">
                    <ActivityAnalytics />
                </el-tab-pane>
                <el-tab-pane name="social" :label="t('view.analytics.social_statistics.header')">
                    <SocialStatistics />
                </el-tab-pane>
                <el-tab-pane name="world" :label="t('view.analytics.world_analytics.header')">
                    <WorldAvatarAnalytics />
                </el-tab-pane>
            </el-tabs>
            </div>
        </div>
        <el-backtop target="#analytics" :right="30" :bottom="30"></el-backtop>
    </div>
</template>

<script setup>
    import { ref } from 'vue';
    import { useI18n } from 'vue-i18n';

    import ActivityAnalytics from './components/ActivityAnalytics.vue';
    import SocialStatistics from './components/SocialStatistics.vue';
    import WorldAvatarAnalytics from './components/WorldAvatarAnalytics.vue';
    import AnalyticsMigration from './components/AnalyticsMigration.vue';

    const { t } = useI18n();
    const activeTab = ref('activity');
</script>

<style scoped lang="scss">
    .analytics-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 0;
    }

    .analytics-header {
        padding: 20px 24px;
        margin-bottom: 20px;
        border-radius: 16px;
    }

    // Dark theme header
    .dark .analytics-header {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    // Light theme header
    html:not(.dark) .analytics-header {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }
    
    .analytics-title {
        font-weight: 600;
        font-size: 24px;
        margin: 0;
        line-height: 1.2;
    }

    // Dark theme title
    .dark .analytics-title {
        color: rgba(255, 255, 255, 0.95);
    }

    // Light theme title
    html:not(.dark) .analytics-title {
        color: #333333;
    }

    .analytics-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
        padding: 0 24px 24px 24px;
    }

    .analytics-tabs-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
    }

    .analytics-tabs {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;

        :deep(.el-tabs__header) {
            margin: 0 0 24px 0;
            background: transparent;
            border: none;
            padding: 0;
        }

        :deep(.el-tabs__nav-wrap) {
            &::after {
                display: none;
            }
        }

        :deep(.el-tabs__nav) {
            display: flex;
            gap: 12px;
            border: none;
            justify-content: flex-start;
        }

        :deep(.el-tabs__item) {
            padding: 12px 24px !important;
            border-radius: 10px;
            transition: all 0.2s ease;
            font-size: 14px;
            font-weight: 500;
            position: relative;
            overflow: hidden;
            text-align: center !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: auto;
            min-width: 0;
            margin: 0 !important;
            line-height: 1.5 !important;
            vertical-align: middle;

            &::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            // Target any inner text elements or spans
            > *,
            span {
                text-align: center !important;
                margin: 0 !important;
                padding: 0 !important;
                display: inline-block;
                width: 100%;
            }
        }

        :deep(.el-tabs__active-bar) {
            display: none;
        }

        :deep(.el-tabs__content) {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            overflow: hidden;
        }

        :deep(.el-tab-pane) {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            overflow: auto;
        }
    }
</style>

<style lang="scss">
    // Dark theme tabs item
    .dark .analytics-tabs .el-tabs__item {
        color: rgba(255, 255, 255, 0.6) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        background: rgba(255, 255, 255, 0.03) !important;

        &::before {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
        }

        &:hover {
            color: rgba(255, 255, 255, 0.9) !important;
            background: rgba(255, 255, 255, 0.06) !important;
            border-color: rgba(255, 255, 255, 0.15) !important;
            
            &::before {
                opacity: 1;
            }
        }

        &.is-active {
            color: rgba(255, 255, 255, 1) !important;
            background: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            
            &::before {
                opacity: 1;
            }
        }
    }

    // Light theme tabs item
    html:not(.dark) .analytics-tabs .el-tabs__item {
        color: #666666 !important;
        border: 1px solid #e0e0e0 !important;
        background: #f5f5f5 !important;

        &::before {
            background: linear-gradient(135deg, rgba(64, 158, 255, 0.1) 0%, rgba(64, 158, 255, 0.05) 100%);
        }

        &:hover {
            color: #333333 !important;
            background: #f0f0f0 !important;
            border-color: #d0d0d0 !important;
            
            &::before {
                opacity: 1;
            }
        }

        &.is-active {
            color: #409eff !important;
            background: #e6f4ff !important;
            border-color: #409eff !important;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
            
            &::before {
                opacity: 1;
            }
        }
    }
</style>

