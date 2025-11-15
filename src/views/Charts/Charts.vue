<template>
    <div id="chart" class="charts-container x-container">
        <div class="charts-header">
            <h1 class="charts-title">{{ t('view.charts.header') }}</h1>
        </div>
        <keep-alive>
            <InstanceActivity />
        </keep-alive>
        <el-backtop target="#chart" :right="30" :bottom="30"></el-backtop>
    </div>
</template>

<script setup>
    import { defineAsyncComponent } from 'vue';
    import { useI18n } from 'vue-i18n';

    const InstanceActivity = defineAsyncComponent(() => import('./components/InstanceActivity.vue'));

    const { t } = useI18n();
</script>

<style scoped lang="scss">
    .charts-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 0;
    }

    .charts-header {
        padding: 20px 24px;
        margin-bottom: 20px;
        border-radius: 16px;
    }

    // Dark theme header
    .dark .charts-header {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    // Light theme header
    html:not(.dark) .charts-header {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }
    
    .charts-title {
        font-weight: 600;
        font-size: 24px;
        margin: 0;
        line-height: 1.2;
    }

    // Dark theme title
    .dark .charts-title {
        color: rgba(255, 255, 255, 0.95);
    }

    // Light theme title
    html:not(.dark) .charts-title {
        color: #333333;
    }
</style>
