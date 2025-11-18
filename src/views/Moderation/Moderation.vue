<template>
    <div class="x-container moderation">
        <div class="moderation-controls">
            <div class="controls-left"></div>
            <div class="controls-right">
                <el-date-picker
                    v-model="playerModerationTable.dateRange"
                    type="datetimerange"
                    range-separator="To"
                    start-placeholder="Start"
                    end-placeholder="End"
                    format="MM/DD HH:mm"
                    value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
                    class="moderation-date-picker"
                    size="default"
                    clearable
                    @change="saveTableFilters" />
                
                <el-select
                    v-model="playerModerationTable.filters[0].value"
                    @change="saveTableFilters()"
                    multiple
                    clearable
                    class="moderation-filter-select"
                    :placeholder="t('view.moderation.filter_placeholder')">
                    <el-option
                        v-for="item in moderationTypes"
                        :key="item"
                        :label="t('view.moderation.filters.' + item)"
                        :value="item" />
                </el-select>
                <el-input
                    v-model="playerModerationTable.filters[1].value"
                    :placeholder="t('view.moderation.search_placeholder')"
                    class="moderation-search-input"
                    @keyup.enter="saveTableFilters"
                    @change="saveTableFilters">
                    <template #prefix>
                        <i class="ri-search-line"></i>
                    </template>
                </el-input>
                <el-tooltip placement="bottom" :content="t('view.moderation.refresh_tooltip')">
                    <el-button
                        type="default"
                        :loading="playerModerationTable.loading"
                        @click="refreshPlayerModerations()"
                        :icon="Refresh"
                        circle />
                </el-tooltip>
            </div>
        </div>

        <DataTable v-bind="playerModerationTable">
            <el-table-column :label="t('table.moderation.date')" prop="created" :sortable="true" width="130">
                <template #default="scope">
                    <el-tooltip placement="right">
                        <template #content>
                            <span>{{ formatDateFilter(scope.row.created, 'long') }}</span>
                        </template>
                        <span>{{ formatDateFilter(scope.row.created, 'short') }}</span>
                    </el-tooltip>
                </template>
            </el-table-column>
            <el-table-column :label="t('table.moderation.type')" prop="type" width="100">
                <template #default="scope">
                    <span v-text="t('view.moderation.filters.' + scope.row.type)"></span>
                </template>
            </el-table-column>
            <el-table-column :label="t('table.moderation.source')" prop="sourceDisplayName">
                <template #default="scope">
                    <span
                        class="x-link"
                        v-text="scope.row.sourceDisplayName"
                        @click="showUserDialog(scope.row.sourceUserId)"></span>
                </template>
            </el-table-column>
            <el-table-column :label="t('table.moderation.target')" prop="targetDisplayName">
                <template #default="scope">
                    <span
                        class="x-link"
                        v-text="scope.row.targetDisplayName"
                        @click="showUserDialog(scope.row.targetUserId)"></span>
                </template>
            </el-table-column>
            <el-table-column :label="t('table.moderation.action')" width="80" align="right">
                <template #default="scope">
                    <template v-if="scope.row.sourceUserId === currentUser.id">
                        <el-button
                            v-if="shiftHeld"
                            style="color: #f56c6c"
                            type="text"
                            :icon="Close"
                            size="small"
                            @click="deletePlayerModeration(scope.row)"></el-button>
                        <el-button
                            v-else
                            type="text"
                            :icon="Close"
                            size="small"
                            @click="deletePlayerModerationPrompt(scope.row)"></el-button>
                    </template>
                </template>
            </el-table-column>
        </DataTable>
    </div>
</template>

<script setup>
    import { Close, Refresh } from '@element-plus/icons-vue';
    import { ElMessageBox } from 'element-plus';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { useModerationStore, useUiStore, useUserStore } from '../../stores';
    import { formatDateFilter } from '../../shared/utils';
    import { moderationTypes } from '../../shared/constants';
    import { playerModerationRequest } from '../../api';

    import configRepository from '../../service/config.js';

    const { t } = useI18n();
    const { showUserDialog } = useUserStore();
    const { playerModerationTable } = storeToRefs(useModerationStore());
    const { refreshPlayerModerations, handlePlayerModerationDelete, saveTableFilters } = useModerationStore();
    const { shiftHeld } = storeToRefs(useUiStore());
    const { currentUser } = storeToRefs(useUserStore());

    async function init() {
        playerModerationTable.value.filters[0].value = JSON.parse(
            await configRepository.getString('VRCX_playerModerationTableFilters', '[]')
        );
    }

    init();

    async function deletePlayerModeration(row) {
        const args = await playerModerationRequest.deletePlayerModeration({
            moderated: row.targetUserId,
            type: row.type
        });
        handlePlayerModerationDelete(args);
    }

    function deletePlayerModerationPrompt(row) {
        ElMessageBox.confirm(`Continue? Delete Moderation ${row.type}`, 'Confirm', {
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
            type: 'info'
        })
            .then((action) => {
                if (action === 'confirm') {
                    deletePlayerModeration(row);
                }
            })
            .catch(() => {});
    }
</script>

<style scoped lang="scss">
    .moderation {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 16px;
        padding: 24px;
    }

    .moderation-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 20px;
        border-radius: 12px;
        transition: all 0.3s ease;
    }

    // Dark theme controls
    .dark .moderation-controls {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    // Light theme controls
    html:not(.dark) .moderation-controls {
        background: #f0f0f0;
        border: 1px solid #e0e0e0;
        box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
    }

    .controls-left {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .controls-right {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 0 1 auto;
        justify-content: flex-end;
        min-width: 0;
        overflow: hidden;
    }

    .moderation-date-picker {
        min-width: 300px;
        max-width: 350px;
        flex: 0 1 auto;
    }

    .moderation-filter-select {
        min-width: 180px;
        max-width: 200px;
        flex: 0 1 auto;
    }

    .moderation-search-input {
        width: 280px;
        flex: 0 0 280px;
        max-width: 280px;
    }
    
    // Dark theme select styling
    .dark :deep(.moderation-filter-select) {
        .el-input__wrapper {
            background: rgba(20, 22, 32, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            transition: all 0.3s ease;
            
            .el-input__inner {
                color: rgba(255, 255, 255, 0.95);
                font-size: 14px;
            }
        }
        
        .el-input__wrapper:hover {
            background: rgba(20, 22, 32, 0.9);
            border-color: rgba(255, 255, 255, 0.2);
        }
        
        .el-input__wrapper.is-focus {
            background: rgba(20, 22, 32, 0.95);
            border-color: rgba(255, 255, 255, 0.25);
            box-shadow: 
                0 0 0 2px rgba(255, 255, 255, 0.1),
                0 4px 12px rgba(0, 0, 0, 0.15);
        }
    }

    // Light theme select styling
    html:not(.dark) :deep(.moderation-filter-select) {
        .el-input__wrapper {
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            transition: all 0.3s ease;
            
            .el-input__inner {
                color: #333333;
                font-size: 14px;
            }
        }
        
        .el-input__wrapper:hover {
            background: #f5f5f5;
            border-color: #d0d0d0;
        }
        
        .el-input__wrapper.is-focus {
            background: #ffffff;
            border-color: #409eff;
            box-shadow: 
                0 0 0 2px rgba(64, 158, 255, 0.1),
                0 4px 12px rgba(0, 0, 0, 0.1);
        }
    }
    
    // Dark theme input styling
    .dark :deep(.moderation-search-input) {
        .el-input__wrapper {
            background: rgba(20, 22, 32, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            transition: all 0.3s ease;
            padding: 0 16px;
            
            .el-input__inner {
                color: rgba(255, 255, 255, 0.95);
                font-size: 14px;
                
                &::placeholder {
                    color: rgba(255, 255, 255, 0.5);
                }
            }

            .el-input__prefix {
                color: rgba(255, 255, 255, 0.6);
                margin-right: 8px;
            }
        }
        
        .el-input__wrapper:hover {
            background: rgba(20, 22, 32, 0.9);
            border-color: rgba(255, 255, 255, 0.2);
        }
        
        .el-input__wrapper.is-focus {
            background: rgba(20, 22, 32, 0.95);
            border-color: rgba(255, 255, 255, 0.25);
            box-shadow: 
                0 0 0 2px rgba(255, 255, 255, 0.1),
                0 4px 12px rgba(0, 0, 0, 0.15);
        }
    }

    // Light theme input styling
    html:not(.dark) :deep(.moderation-search-input) {
        .el-input__wrapper {
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            transition: all 0.3s ease;
            padding: 0 16px;
            
            .el-input__inner {
                color: #333333;
                font-size: 14px;
                
                &::placeholder {
                    color: #999999;
                }
            }

            .el-input__prefix {
                color: #666666;
                margin-right: 8px;
            }
        }
        
        .el-input__wrapper:hover {
            background: #f5f5f5;
            border-color: #d0d0d0;
        }
        
        .el-input__wrapper.is-focus {
            background: #ffffff;
            border-color: #409eff;
            box-shadow: 
                0 0 0 2px rgba(64, 158, 255, 0.1),
                0 4px 12px rgba(0, 0, 0, 0.1);
        }
    }
        
    // Dark theme button
    .dark :deep(.el-button) {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 50%;
        color: rgba(255, 255, 255, 0.9);
        transition: all 0.3s ease;
        
        &:hover {
            background: rgba(255, 255, 255, 0.12);
            border-color: rgba(255, 255, 255, 0.25);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
    }

    // Light theme button
    html:not(.dark) :deep(.el-button) {
        background: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 50%;
        color: #333333;
        transition: all 0.3s ease;
        
        &:hover {
            background: #f0f0f0;
            border-color: #d0d0d0;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
    }
    
    // Dark theme text button
    .dark :deep(.el-button--text) {
        color: rgba(255, 255, 255, 0.7);
        transition: all 0.3s ease;
        
        &:hover {
            color: rgba(255, 255, 255, 0.9);
            background: rgba(255, 255, 255, 0.06);
        }
    }

    // Light theme text button
    html:not(.dark) :deep(.el-button--text) {
        color: #666666;
        transition: all 0.3s ease;
        
        &:hover {
            color: #333333;
            background: #f0f0f0;
        }
    }
</style>
