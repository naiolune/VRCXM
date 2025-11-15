<template>
    <div v-if="showMigration" class="analytics-migration">
        <div class="migration-header">
            <el-alert
                :title="t('view.analytics.migration.warning.title')"
                type="warning"
                :closable="false"
                show-icon>
                <template #default>
                    <p>{{ t('view.analytics.migration.warning.description') }}</p>
                </template>
            </el-alert>
            <el-button
                type="text"
                :icon="Close"
                class="migration-close-btn"
                @click="handleCloseMigration">
            </el-button>
        </div>

        <div v-if="!migrationStatus || migrationStatus.status === 'completed' || migrationStatus.status === 'cancelled'" class="migration-controls">
            <el-button
                type="primary"
                :loading="migrating"
                @click="startMigration">
                {{ t('view.analytics.migration.start') }}
            </el-button>
            <el-button
                type="danger"
                :loading="clearing"
                @click="clearAnalyticsData">
                {{ t('view.analytics.migration.clear_data') }}
            </el-button>
        </div>

        <div v-else-if="migrationStatus.status === 'running'" class="migration-progress">
            <div class="progress-header">
                <h3>{{ t('view.analytics.migration.progress.title') }}</h3>
                <span class="progress-text">
                    {{ Math.round((migrationStatus.progress || 0) * 100) }}%
                    ({{ migrationStatus.processedRecords || 0 }} / {{ migrationStatus.totalRecords || 0 }})
                </span>
            </div>
            <el-progress
                :percentage="Math.round((migrationStatus.progress || 0) * 100)"
                :status="migrationStatus.progress >= 1.0 ? 'success' : undefined"
                :stroke-width="20"
                striped
                striped-flow
                :duration="3" />
            <div v-if="estimatedTimeRemaining && (migrationStatus.processedRecords || 0) > 0" class="time-remaining">
                <span>{{ t('view.analytics.migration.progress.time_remaining') }}: {{ estimatedTimeRemaining }}</span>
            </div>
            <div v-else-if="(migrationStatus.processedRecords || 0) === 0" class="time-remaining">
                <span>{{ t('view.analytics.migration.progress.starting') }}</span>
            </div>
            <p class="progress-description">
                {{ t('view.analytics.migration.progress.description') }}
            </p>
            <div class="migration-actions">
                <el-button
                    v-if="(migrationStatus.progress || 0) >= 1.0"
                    type="primary"
                    size="small"
                    @click="handleCloseMigration">
                    {{ t('view.analytics.migration.close') }}
                </el-button>
                <el-button
                    v-else
                    type="danger"
                    size="small"
                    :loading="cancelling"
                    @click="cancelMigration">
                    {{ t('view.analytics.migration.cancel') }}
                </el-button>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed, onMounted, onUnmounted, ref } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { ElMessageBox, ElMessage } from 'element-plus';
    import { Close } from '@element-plus/icons-vue';

    import { database } from '../../../service/database';
    import configRepository from '../../../service/config';

    const { t } = useI18n();

    const migrationStatus = ref(null);
    const migrating = ref(false);
    const cancelling = ref(false);
    const clearing = ref(false);
    const showMigration = ref(false);
    const startTime = ref(null);
    const lastProgressTime = ref(null);
    const lastProcessedCount = ref(0);
    let progressInterval = null;
    let migrationAbortController = null;

    const estimatedTimeRemaining = computed(() => {
        if (!migrationStatus.value || 
            migrationStatus.value.status !== 'running' || 
            !lastProgressTime.value ||
            migrationStatus.value.progress >= 1.0 ||
            migrationStatus.value.processedRecords === 0) {
            return null;
        }

        const processed = migrationStatus.value.processedRecords;
        const total = migrationStatus.value.totalRecords;
        const remaining = total - processed;

        if (remaining <= 0) {
            return null;
        }

        // Calculate rate (records per second) based on recent progress
        const timeElapsed = (Date.now() - lastProgressTime.value) / 1000; // seconds
        const recordsProcessed = processed - lastProcessedCount.value;

        if (recordsProcessed <= 0 || timeElapsed <= 0) {
            return null;
        }

        const rate = recordsProcessed / timeElapsed; // records per second
        const secondsRemaining = remaining / rate;

        if (secondsRemaining < 60) {
            return `${Math.round(secondsRemaining)}s`;
        } else if (secondsRemaining < 3600) {
            const minutes = Math.floor(secondsRemaining / 60);
            const secs = Math.round(secondsRemaining % 60);
            return `${minutes}m ${secs}s`;
        } else {
            const hours = Math.floor(secondsRemaining / 3600);
            const minutes = Math.floor((secondsRemaining % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    });

    async function loadMigrationStatus() {
        try {
            // Check if user has permanently closed the migration box
            const migrationClosed = await configRepository.getBool('VRCX_analyticsMigrationClosed', false);
            if (migrationClosed) {
                showMigration.value = false;
                return;
            }

            migrationStatus.value = await database.getMigrationStatus();
            
            // Check if migration is stuck (running but no progress for a while)
            let isStuck = false;
            if (migrationStatus.value && migrationStatus.value.status === 'running') {
                const startedAt = migrationStatus.value.startedAt ? new Date(migrationStatus.value.startedAt).getTime() : null;
                const now = Date.now();
                const processedRecords = migrationStatus.value.processedRecords || 0;
                
                // Consider it stuck if:
                // 1. No records processed and it's been more than 30 seconds since start
                // 2. Or if startedAt is missing (old migration record)
                if (processedRecords === 0 && startedAt && (now - startedAt) > 30000) {
                    isStuck = true;
                } else if (processedRecords === 0 && !startedAt) {
                    isStuck = true;
                }
                
                // If stuck, mark as cancelled so user can restart
                if (isStuck) {
                    console.log('[Analytics Migration] Detected stuck migration, marking as cancelled');
                    await database.cancelMigration();
                    migrationStatus.value = await database.getMigrationStatus();
                }
            }
            
            // Hide migration if it's completed
            showMigration.value = !migrationStatus.value || 
                                  migrationStatus.value.status === 'running' || 
                                  (migrationStatus.value.status && migrationStatus.value.status !== 'completed');
            
            // Update timing for ETA calculation
            if (migrationStatus.value && migrationStatus.value.status === 'running') {
                if (!lastProgressTime.value) {
                    lastProgressTime.value = Date.now();
                    lastProcessedCount.value = migrationStatus.value.processedRecords || 0;
                } else {
                    // Update every 2 seconds for smoother ETA
                    const now = Date.now();
                    if (now - lastProgressTime.value >= 2000) {
                        lastProgressTime.value = now;
                        lastProcessedCount.value = migrationStatus.value.processedRecords || 0;
                    }
                }
            }
        } catch (e) {
            console.error('[Analytics Migration] Error loading status:', e);
            // If error, assume migration needed
            showMigration.value = true;
        }
    }

    async function handleCloseMigration() {
        // If migration is complete (100%), just close without confirmation
        if (migrationStatus.value && (migrationStatus.value.progress || 0) >= 1.0) {
            // Permanently hide the migration box
            await configRepository.setBool('VRCX_analyticsMigrationClosed', true);
            showMigration.value = false;
            return;
        }

        // Otherwise, show confirmation dialog
        try {
            await ElMessageBox.confirm(
                t('view.analytics.migration.close_warning'),
                t('view.analytics.migration.close_title'),
                {
                    confirmButtonText: t('view.analytics.migration.close_confirm'),
                    cancelButtonText: t('view.friend_list.cancel_tooltip'),
                    type: 'warning',
                    dangerouslyUseHTMLString: false
                }
            );

            // Permanently hide the migration box
            await configRepository.setBool('VRCX_analyticsMigrationClosed', true);
            showMigration.value = false;
            ElMessage.success(t('view.analytics.migration.close_success'));
        } catch (e) {
            if (e !== 'cancel') {
                console.error('[Analytics Migration] Error closing migration box:', e);
            }
        }
    }

    async function startMigration() {
        if (migrating.value) {
            return;
        }

        // Check if migration is already completed
        if (migrationStatus.value && 
            (migrationStatus.value.status === 'completed' || 
             (migrationStatus.value.progress || 0) >= 1.0)) {
            try {
                await ElMessageBox.confirm(
                    t('view.analytics.migration.already_completed_warning'),
                    t('view.analytics.migration.already_completed_title'),
                    {
                        confirmButtonText: t('view.analytics.migration.start_anyway'),
                        cancelButtonText: t('view.friend_list.cancel_tooltip'),
                        type: 'warning',
                        dangerouslyUseHTMLString: false
                    }
                );
            } catch (e) {
                if (e === 'cancel') {
                    return; // User cancelled, don't proceed
                }
                console.error('[Analytics Migration] Error showing completion warning:', e);
            }
        }

        migrating.value = true;
        startTime.value = Date.now();
        lastProgressTime.value = Date.now();
        lastProcessedCount.value = 0;
        migrationAbortController = new AbortController();

        try {
            // Update initial status to show it's starting
            migrationStatus.value = {
                status: 'running',
                progress: 0,
                processedRecords: 0,
                totalRecords: 0
            };

            await database.migrateHistoricalData(
                (progress, processed, total) => {
                    migrationStatus.value = {
                        status: 'running',
                        progress,
                        processedRecords: processed,
                        totalRecords: total
                    };
                    // Update timing for ETA
                    const now = Date.now();
                    if (now - lastProgressTime.value >= 2000) {
                        lastProgressTime.value = now;
                        lastProcessedCount.value = processed;
                    }
                },
                migrationAbortController.signal
            );

            await loadMigrationStatus();
        } catch (e) {
            if (e.name === 'AbortError' || migrationAbortController?.signal.aborted) {
                console.log('[Analytics Migration] Migration cancelled by user');
            } else {
                console.error('[Analytics Migration] Error during migration:', e);
            }
            // Reload status on error to update UI
            await loadMigrationStatus();
        } finally {
            migrating.value = false;
            migrationAbortController = null;
            startTime.value = null;
            lastProgressTime.value = null;
            lastProcessedCount.value = 0;
        }
    }

    async function cancelMigration() {
        if (cancelling.value) {
            return;
        }

        cancelling.value = true;
        try {
            // Abort the migration if it's running
            if (migrationAbortController) {
                migrationAbortController.abort();
            }
            // Mark migration as cancelled in database
            await database.cancelMigration();
            // Reload status
            await loadMigrationStatus();
        } catch (e) {
            console.error('[Analytics Migration] Error cancelling migration:', e);
            ElMessage.error('Failed to cancel migration. Please try again.');
        } finally {
            cancelling.value = false;
        }
    }

    async function clearAnalyticsData() {
        if (clearing.value) {
            return;
        }

        try {
            // Confirm with user using Element Plus MessageBox
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
            // Reload status
            await loadMigrationStatus();
            ElMessage.success(t('view.analytics.migration.clear_data_success'));
        } catch (e) {
            if (e !== 'cancel') {
                console.error('[Analytics Migration] Error clearing analytics data:', e);
                ElMessage.error(t('view.analytics.migration.clear_data_error'));
            }
        } finally {
            clearing.value = false;
        }
    }

    onMounted(() => {
        loadMigrationStatus();
        // Poll for status updates every 500ms
        progressInterval = setInterval(() => {
            if (migrationStatus.value && migrationStatus.value.status === 'running') {
                loadMigrationStatus();
            }
        }, 500);
    });

    onUnmounted(() => {
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        // Cancel migration if component is unmounted
        if (migrationAbortController) {
            migrationAbortController.abort();
        }
    });
</script>

<style scoped lang="scss">
    .analytics-migration {
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
        position: relative;
    }

    // Dark theme
    .dark .analytics-migration {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    // Light theme
    html:not(.dark) .analytics-migration {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
    }

    .migration-header {
        position: relative;
    }

    .migration-close-btn {
        position: absolute;
        top: 0;
        right: 0;
        padding: 4px;
        min-height: auto;
    }

    // Dark theme close button
    .dark .migration-close-btn {
        color: rgba(255, 255, 255, 0.6);
        
        &:hover {
            color: rgba(255, 255, 255, 0.9);
            background: rgba(255, 255, 255, 0.06);
        }
    }

    // Light theme close button
    html:not(.dark) .migration-close-btn {
        color: #999999;
        
        &:hover {
            color: #333333;
            background: #f0f0f0;
        }
    }

    .migration-controls {
        margin-top: 20px;
        display: flex;
        justify-content: center;
        gap: 12px;
    }

    .migration-progress {
        margin-top: 20px;
    }

    .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }

        .progress-text {
            font-size: 14px;
        }
    }

    // Dark theme progress header
    .dark .progress-header {
        h3 {
            color: rgba(255, 255, 255, 0.9);
        }

        .progress-text {
            color: rgba(255, 255, 255, 0.7);
        }
    }

    // Light theme progress header
    html:not(.dark) .progress-header {
        h3 {
            color: #333333;
        }

        .progress-text {
            color: #666666;
        }
    }

    .progress-description {
        margin-top: 12px;
        font-size: 12px;
        text-align: center;
    }

    // Dark theme progress description
    .dark .progress-description {
        color: rgba(255, 255, 255, 0.6);
    }

    // Light theme progress description
    html:not(.dark) .progress-description {
        color: #999999;
    }

    .time-remaining {
        margin-top: 8px;
        text-align: center;
        font-size: 13px;
        font-weight: 500;
    }

    // Dark theme time remaining
    .dark .time-remaining {
        color: rgba(255, 255, 255, 0.7);
    }

    // Light theme time remaining
    html:not(.dark) .time-remaining {
        color: #666666;
    }

    .migration-actions {
        margin-top: 16px;
        display: flex;
        justify-content: center;
    }

    .migration-starting {
        text-align: center;
        padding: 20px;
        
        p {
            font-size: 14px;
            margin-bottom: 16px;
        }
    }

    // Dark theme migration starting
    .dark .migration-starting {
        p {
            color: rgba(255, 255, 255, 0.7);
        }
    }

    // Light theme migration starting
    html:not(.dark) .migration-starting {
        p {
            color: #666666;
        }
    }
</style>

