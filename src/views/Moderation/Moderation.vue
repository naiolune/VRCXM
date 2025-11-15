<template>
    <div class="x-container">
        <!-- 工具栏 -->
        <div class="tool-slot">
            <el-select
                v-model="playerModerationTable.filters[0].value"
                @change="saveTableFilters()"
                multiple
                clearable
                style="flex: 1"
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
                class="filter-input" />
            <el-tooltip placement="bottom" :content="t('view.moderation.refresh_tooltip')">
                <el-button
                    type="default"
                    :loading="playerModerationTable.loading"
                    @click="refreshPlayerModerations()"
                    :icon="Refresh"
                    circle />
            </el-tooltip>
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
    const { refreshPlayerModerations, handlePlayerModerationDelete } = useModerationStore();
    const { shiftHeld } = storeToRefs(useUiStore());
    const { currentUser } = storeToRefs(useUserStore());

    async function init() {
        playerModerationTable.value.filters[0].value = JSON.parse(
            await configRepository.getString('VRCX_playerModerationTableFilters', '[]')
        );
    }

    init();

    function saveTableFilters() {
        configRepository.setString(
            'VRCX_playerModerationTableFilters',
            JSON.stringify(playerModerationTable.value.filters[0].value)
        );
    }

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
    .tool-slot {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border-radius: 16px;
        margin-bottom: 16px;
    }

    // Dark theme tool slot
    .dark .tool-slot {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    // Light theme tool slot
    html:not(.dark) .tool-slot {
        background: #f0f0f0;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }
    
    .filter-input {
        width: 150px;
    }
    
    .x-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        
        // Dark theme select
        .dark :deep(.el-select) {
            .el-input__wrapper {
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 12px;
                transition: all 0.3s ease;
                
                &:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.2);
                }
                
                &.is-focus {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.25);
                    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
                }
            }
            
            .el-input__inner {
                color: rgba(255, 255, 255, 0.9);
            }
        }

        // Light theme select
        html:not(.dark) :deep(.el-select) {
            .el-input__wrapper {
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 12px;
                transition: all 0.3s ease;
                
                &:hover {
                    background: #f5f5f5;
                    border-color: #d0d0d0;
                }
                
                &.is-focus {
                    background: #ffffff;
                    border-color: #409eff;
                    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
                }
            }
            
            .el-input__inner {
                color: #333333;
            }
        }
        
        // Dark theme input wrapper
        .dark :deep(.el-input__wrapper) {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            transition: all 0.3s ease;
            
            &:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.2);
            }
            
            &.is-focus {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.25);
                box-shadow: 
                    0 0 0 2px rgba(255, 255, 255, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.15);
            }
        }

        // Light theme input wrapper
        html:not(.dark) :deep(.el-input__wrapper) {
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            transition: all 0.3s ease;
            
            &:hover {
                background: #f5f5f5;
                border-color: #d0d0d0;
            }
            
            &.is-focus {
                background: #ffffff;
                border-color: #409eff;
                box-shadow: 
                    0 0 0 2px rgba(64, 158, 255, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.5);
            }
        }
        
        // Dark theme input inner
        .dark :deep(.el-input__inner) {
            color: rgba(255, 255, 255, 0.9);
            
            &::placeholder {
                color: rgba(255, 255, 255, 0.5);
            }
        }

        // Light theme input inner
        html:not(.dark) :deep(.el-input__inner) {
            color: #333333;
            
            &::placeholder {
                color: #999999;
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
    }
</style>
