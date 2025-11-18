<template>
    <div class="x-container friend-log">
        <div class="friend-log-controls">
            <div class="controls-left">
                <el-tooltip placement="bottom" :content="t('view.feed.favorites_only_tooltip')">
                    <div class="vip-toggle-wrapper">
                        <span class="vip-label">{{ t('view.feed.favorites_only', 'Favorites Only') }}</span>
                        <el-switch
                            v-model="friendLogTable.vip"
                            active-color="#13ce66"
                            @change="friendLogTableLookup"></el-switch>
                    </div>
                </el-tooltip>
            </div>
            <div class="controls-right">
                <el-date-picker
                    v-model="friendLogTable.dateRange"
                    type="datetimerange"
                    range-separator="To"
                    start-placeholder="Start"
                    end-placeholder="End"
                    format="MM/DD HH:mm"
                    value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
                    class="friend-log-date-picker"
                    size="default"
                    clearable
                    @change="friendLogTableLookup" />
                
                <el-select
                    v-model="friendLogTable.filters[0].value"
                    multiple
                    clearable
                    class="friend-log-filter-select"
                    :placeholder="t('view.friend_log.filter_placeholder')"
                    @change="friendLogTableLookup">
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
                    class="friend-log-search-input"
                    @keyup.enter="friendLogTableLookup"
                    @change="friendLogTableLookup">
                    <template #prefix>
                        <i class="ri-search-line"></i>
                    </template>
                </el-input>
            </div>
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
    const { friendLogTableLookup } = useFriendStore();
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
        friendLogTableLookup();
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
    
    .friend-log {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 16px;
        padding: 24px;
    }

    .friend-log-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 20px;
        border-radius: 12px;
        transition: all 0.3s ease;
    }

    // Dark theme controls
    .dark .friend-log-controls {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    // Light theme controls
    html:not(.dark) .friend-log-controls {
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

    .friend-log-date-picker {
        min-width: 300px;
        max-width: 350px;
        flex: 0 1 auto;
    }

    .friend-log-filter-select {
        min-width: 180px;
        max-width: 200px;
        flex: 0 1 auto;
    }

    .friend-log-search-input {
        width: 280px;
        flex: 0 0 280px;
        max-width: 280px;
    }

    .vip-toggle-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 16px;
        border-radius: 12px;
        transition: all 0.3s ease;
    }

    // Dark theme VIP toggle
    .dark .vip-toggle-wrapper {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);

        &:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.12);
        }
    }

    // Light theme VIP toggle
    html:not(.dark) .vip-toggle-wrapper {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;

        &:hover {
            background: #e8e8e8;
            border-color: #d0d0d0;
        }
    }

    .vip-label {
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
    }

    // Dark theme VIP label
    .dark .vip-label {
        color: rgba(255, 255, 255, 0.8);
    }

    // Light theme VIP label
    html:not(.dark) .vip-label {
        color: #666666;
    }

    // Switch styling (works for both themes - checked state uses semantic color)
    :deep(.el-switch) {
        .el-switch__core {
            transition: all 0.3s ease;
        }

        &.is-checked .el-switch__core {
            background-color: #13ce66;
            border-color: #13ce66;
        }
    }

    // Dark theme switch
    .dark :deep(.el-switch) {
        .el-switch__core {
            background: rgba(20, 22, 32, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.15);
        }
    }

    // Light theme switch
    html:not(.dark) :deep(.el-switch) {
        .el-switch__core {
            background: #e0e0e0;
            border: 1px solid #d0d0d0;
        }
    }
    // Dark theme select styling
    .dark :deep(.friend-log-filter-select) {
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
    html:not(.dark) :deep(.friend-log-filter-select) {
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
    .dark :deep(.friend-log-search-input) {
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
    html:not(.dark) :deep(.friend-log-search-input) {
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
