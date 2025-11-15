<template>
    <div class="x-container">
        <!-- 工具栏 -->
        <div style="margin: 0 0 10px; display: flex; align-items: center">
            <el-select
                v-model="friendLogTable.filters[0].value"
                multiple
                clearable
                style="flex: 1"
                :placeholder="t('view.friend_log.filter_placeholder')"
                @change="saveTableFilters">
                <el-option
                    v-for="type in [
                        'Friend',
                        'Unfriend',
                        'FriendRequest',
                        'CancelFriendRequest',
                        'DisplayName',
                        'TrustLevel'
                    ]"
                    :key="type"
                    :label="t('view.friend_log.filters.' + type)"
                    :value="type" />
            </el-select>
            <el-input
                v-model="friendLogTable.filters[1].value"
                :placeholder="t('view.friend_log.search_placeholder')"
                style="flex: 0.4; margin-left: 10px" />
        </div>

        <DataTable v-bind="friendLogTable">
            <el-table-column :label="t('table.friendLog.date')" prop="created_at" :sortable="true" width="200">
                <template #default="scope">
                    <el-tooltip placement="right">
                        <template #content>
                            <span>{{ formatDateFilter(scope.row.created_at, 'long') }}</span>
                        </template>
                        <span>{{ formatDateFilter(scope.row.created_at, 'short') }}</span>
                    </el-tooltip>
                </template>
            </el-table-column>

            <el-table-column :label="t('table.friendLog.type')" prop="type" width="150">
                <template #default="scope">
                    <span v-text="t('view.friend_log.filters.' + scope.row.type)"></span>
                </template>
            </el-table-column>

            <el-table-column :label="t('table.friendLog.user')" prop="displayName">
                <template #default="scope">
                    <span v-if="scope.row.type === 'DisplayName'">
                        {{ scope.row.previousDisplayName }} <el-icon><Right /></el-icon>&nbsp;
                    </span>
                    <span
                        class="x-link"
                        style="padding-right: 10px"
                        @click="showUserDialog(scope.row.userId)"
                        v-text="scope.row.displayName || scope.row.userId"></span>
                    <template v-if="scope.row.type === 'TrustLevel'">
                        <span>
                            (<span :class="getTrustClass(scope.row.previousTrustLevel)">{{ scope.row.previousTrustLevel }}</span> <el-icon><Right /></el-icon>
                            <span :class="getTrustClass(scope.row.trustLevel)">{{ scope.row.trustLevel }}</span>)</span
                        >
                    </template>
                </template>
            </el-table-column>

            <el-table-column :label="t('table.friendLog.action')" width="80" align="right">
                <template #default="scope">
                    <el-button
                        v-if="shiftHeld"
                        style="color: #f56c6c"
                        type="text"
                        :icon="Close"
                        size="small"
                        class="button-pd-0"
                        @click="deleteFriendLog(scope.row)"></el-button>
                    <el-button
                        v-else
                        type="text"
                        :icon="Delete"
                        size="small"
                        class="button-pd-0"
                        @click="deleteFriendLogPrompt(scope.row)"></el-button>
                </template>
            </el-table-column>
        </DataTable>
    </div>
</template>

<script setup>
    import { Close, Delete, Right } from '@element-plus/icons-vue';
    import { ElMessageBox } from 'element-plus';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';
    import { watch } from 'vue';

    import { useAppearanceSettingsStore, useFriendStore, useUiStore, useUserStore } from '../../stores';
    import { formatDateFilter, removeFromArray } from '../../shared/utils';
    import { database } from '../../service/database';

    import configRepository from '../../service/config';

    const { hideUnfriends } = storeToRefs(useAppearanceSettingsStore());
    const { showUserDialog } = useUserStore();
    const { friendLogTable } = storeToRefs(useFriendStore());
    const { shiftHeld } = storeToRefs(useUiStore());

    watch(
        () => hideUnfriends.value,
        (newValue) => {
            friendLogTable.value.filters[2].value = newValue;
        },
        { immediate: true }
    );

    const { t } = useI18n();
    
    function getTrustClass(trustLevel) {
        // Map trust level strings to CSS classes
        const trustLevelMap = {
            'Trusted User': 'x-tag-veteran',
            'Known User': 'x-tag-trusted',
            'User': 'x-tag-known',
            'New User': 'x-tag-basic',
            'Visitor': 'x-tag-untrusted'
        };
        return trustLevelMap[trustLevel] || '';
    }
    
    function saveTableFilters() {
        configRepository.setString('VRCX_friendLogTableFilters', JSON.stringify(friendLogTable.value.filters[0].value));
    }
    function deleteFriendLogPrompt(row) {
        ElMessageBox.confirm('Continue? Delete Log', 'Confirm', {
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
            type: 'info'
        })
            .then((action) => {
                if (action === 'confirm') {
                    deleteFriendLog(row);
                }
            })
            .catch(() => {});
    }
    function deleteFriendLog(row) {
        removeFromArray(friendLogTable.value.data, row);
        database.deleteFriendLogHistory(row.rowId);
    }
</script>

<style scoped lang="scss">
    .button-pd-0 {
        padding: 0 !important;
    }
    
    .x-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        
        > div:first-child {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            border-radius: 16px;
        }

        // Dark theme controls
        .dark & {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 
                0 8px 32px rgba(0, 0, 0, 0.3);
        }

        // Light theme controls
        html:not(.dark) & {
            background: #f0f0f0;
            border: 1px solid #e0e0e0;
            box-shadow: 
                0 4px 16px rgba(0, 0, 0, 0.1);
        }
        
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
                    box-shadow: 
                        0 0 0 2px rgba(255, 255, 255, 0.1);
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
                    box-shadow: 
                        0 0 0 2px rgba(64, 158, 255, 0.1);
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
