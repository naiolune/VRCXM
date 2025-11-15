<template>
    <div>
        <div class="options-container" style="margin-top: 0">
            <span class="header">{{ t('view.settings.analytics.analytics.header') }}</span>
            
            <span class="sub-header">{{ t('view.settings.analytics.analytics.migration.header') }}</span>
            <div class="options-container-item" style="margin-top: 15px">
                <simple-switch
                    :label="t('view.settings.analytics.analytics.migration.show_migration_box')"
                    :value="!migrationBoxClosed"
                    :long-label="true"
                    @change="toggleMigrationBox" />
            </div>
            
            <div class="options-container-item" style="margin-top: 15px">
                <el-button-group>
                    <el-button
                        size="small"
                        type="primary"
                        :loading="migrating"
                        :disabled="migrationStatus?.status === 'running'"
                        @click="startMigration">
                        {{ t('view.analytics.migration.start') }}
                    </el-button>
                    <el-button
                        size="small"
                        type="danger"
                        :loading="clearing"
                        @click="clearAnalyticsData">
                        {{ t('view.analytics.migration.clear_data') }}
                    </el-button>
                    <el-button
                        v-if="migrationStatus?.status === 'running'"
                        size="small"
                        type="danger"
                        :loading="cancelling"
                        @click="cancelMigration">
                        {{ t('view.analytics.migration.cancel') }}
                    </el-button>
                </el-button-group>
            </div>

            <div v-if="migrationStatus" class="migration-status" style="margin-top: 15px">
                <div class="status-item">
                    <span class="status-label">{{ t('view.settings.analytics.analytics.migration.status') }}:</span>
                    <span class="status-value" :class="getStatusClass(migrationStatus.status)">
                        {{ getStatusText(migrationStatus.status) }}
                    </span>
                </div>
                <div v-if="migrationStatus.status === 'running'" class="status-item">
                    <span class="status-label">{{ t('view.settings.analytics.analytics.migration.progress') }}:</span>
                    <span class="status-value">
                        {{ Math.round((migrationStatus.progress || 0) * 100) }}%
                        ({{ migrationStatus.processedRecords || 0 }} / {{ migrationStatus.totalRecords || 0 }})
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { onMounted, onUnmounted, ref } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { ElMessageBox, ElMessage } from 'element-plus';

    import { database } from '../../../../service/database';
    import configRepository from '../../../../service/config';
    import SimpleSwitch from '../SimpleSwitch.vue';

    const { t } = useI18n();

    const migrationBoxClosed = ref(false);
    const migrationStatus = ref(null);
    const migrating = ref(false);
    const cancelling = ref(false);
    const clearing = ref(false);
    let migrationAbortController = null;

    async function loadSettings() {
        migrationBoxClosed.value = await configRepository.getBool('VRCX_analyticsMigrationClosed', false);
        await loadMigrationStatus();
    }

    async function loadMigrationStatus() {
        try {
            migrationStatus.value = await database.getMigrationStatus();
        } catch (e) {
            console.error('[Analytics Settings] Error loading migration status:', e);
        }
    }

    async function toggleMigrationBox() {
        const newValue = !migrationBoxClosed.value;
        await configRepository.setBool('VRCX_analyticsMigrationClosed', newValue);
        migrationBoxClosed.value = newValue;
        
        if (!newValue) {
            ElMessage.success(t('view.settings.analytics.analytics.migration.box_enabled'));
        } else {
            ElMessage.success(t('view.settings.analytics.analytics.migration.box_disabled'));
        }
    }

    async function startMigration() {
        if (migrating.value || migrationStatus.value?.status === 'running') {
            return;
        }

        migrating.value = true;
        migrationAbortController = new AbortController();

        try {
            await database.migrateHistoricalData(
                (progress, processed, total) => {
                    migrationStatus.value = {
                        ...migrationStatus.value,
                        status: 'running',
                        progress,
                        processedRecords: processed,
                        totalRecords: total
                    };
                },
                migrationAbortController.signal
            );

            await loadMigrationStatus();
            ElMessage.success(t('view.settings.analytics.analytics.migration.completed'));
        } catch (e) {
            if (e.name === 'AbortError' || migrationAbortController?.signal.aborted) {
                console.log('[Analytics Settings] Migration cancelled');
            } else {
                console.error('[Analytics Settings] Error during migration:', e);
                ElMessage.error(t('view.settings.analytics.analytics.migration.error'));
            }
            await loadMigrationStatus();
        } finally {
            migrating.value = false;
            migrationAbortController = null;
        }
    }

    async function cancelMigration() {
        if (cancelling.value) {
            return;
        }

        cancelling.value = true;
        try {
            if (migrationAbortController) {
                migrationAbortController.abort();
            }
            await database.cancelMigration();
            await loadMigrationStatus();
            ElMessage.success(t('view.settings.analytics.analytics.migration.cancelled'));
        } catch (e) {
            console.error('[Analytics Settings] Error cancelling migration:', e);
            ElMessage.error(t('view.settings.analytics.analytics.migration.cancel_error'));
        } finally {
            cancelling.value = false;
        }
    }

    async function clearAnalyticsData() {
        if (clearing.value) {
            return;
        }

        try {
            await ElMessageBox.confirm(
                t('view.analytics.migration.clear_data_confirm'),
                t('view.analytics.migration.clear_data'),
                {
                    confirmButtonText: t('view.analytics.migration.clear_data'),
                    cancelButtonText: t('view.friend_list.cancel_tooltip'),
                    type: 'warning',
                    dangerouslyUseHTMLString: false
                }
            );

            clearing.value = true;
            await database.clearAnalyticsData();
            await loadMigrationStatus();
            ElMessage.success(t('view.analytics.migration.clear_data_success'));
        } catch (e) {
            if (e !== 'cancel') {
                console.error('[Analytics Settings] Error clearing analytics data:', e);
                ElMessage.error(t('view.analytics.migration.clear_data_error'));
            }
        } finally {
            clearing.value = false;
        }
    }

    function getStatusText(status) {
        if (!status) return t('view.settings.analytics.analytics.migration.status_not_started');
        switch (status) {
            case 'running':
                return t('view.settings.analytics.analytics.migration.status_running');
            case 'completed':
                return t('view.settings.analytics.analytics.migration.status_completed');
            case 'cancelled':
                return t('view.settings.analytics.analytics.migration.status_cancelled');
            default:
                return status;
        }
    }

    function getStatusClass(status) {
        if (!status) return '';
        switch (status) {
            case 'running':
                return 'status-running';
            case 'completed':
                return 'status-completed';
            case 'cancelled':
                return 'status-cancelled';
            default:
                return '';
        }
    }

    let statusInterval = null;

    onMounted(() => {
        loadSettings();
        // Poll for status updates
        statusInterval = setInterval(() => {
            if (migrationStatus.value?.status === 'running') {
                loadMigrationStatus();
            }
        }, 1000);
    });

    onUnmounted(() => {
        if (statusInterval) {
            clearInterval(statusInterval);
        }
        if (migrationAbortController) {
            migrationAbortController.abort();
        }
    });
</script>

<style scoped lang="scss">
    .migration-status {
        padding: 12px;
        border-radius: 8px;
    }

    // Dark theme migration status
    .dark .migration-status {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    // Light theme migration status
    html:not(.dark) .migration-status {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
    }

    .status-item {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;

        &:last-child {
            margin-bottom: 0;
        }
    }

    .status-label {
        font-size: 13px;
        min-width: 80px;
    }

    // Dark theme status label
    .dark .status-label {
        color: rgba(255, 255, 255, 0.7);
    }

    // Light theme status label
    html:not(.dark) .status-label {
        color: #666666;
    }

    .status-value {
        font-size: 13px;
        font-weight: 500;

        &.status-running {
            color: #409eff;
        }

        &.status-completed {
            color: #67c23a;
        }

        &.status-cancelled {
            color: #e6a23c;
        }
    }

    // Dark theme status value
    .dark .status-value {
        color: rgba(255, 255, 255, 0.9);
    }

    // Light theme status value (base color, semantic colors override)
    html:not(.dark) .status-value {
        color: #333333;
    }
</style>

