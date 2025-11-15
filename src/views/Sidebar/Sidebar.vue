<template>
    <div class="x-aside-container modern-sidebar">
        <div class="sidebar-header">
            <el-select
                clearable
                :placeholder="t('side_panel.search_placeholder')"
                filterable
                remote
                :remote-method="quickSearchRemoteMethod"
                popper-class="x-quick-search"
                class="sidebar-search"
                @change="quickSearchChange">
                <el-option v-for="item in quickSearchItems" :key="item.value" :value="item.value" :label="item.label">
                    <div class="x-friend-item">
                        <template v-if="item.ref">
                            <div class="detail">
                                <span class="name" :style="{ color: item.ref.$userColour }">{{
                                    item.ref.displayName
                                }}</span>
                                <span v-if="!item.ref.isFriend" class="extra"></span>
                                <span v-else-if="item.ref.state === 'offline'" class="extra">{{
                                    t('side_panel.search_result_active')
                                }}</span>
                                <span v-else-if="item.ref.state === 'active'" class="extra">{{
                                    t('side_panel.search_result_offline')
                                }}</span>
                                <Location
                                    v-else
                                    class="extra"
                                    :location="item.ref.location"
                                    :traveling="item.ref.travelingToLocation"
                                    :link="false" />
                            </div>
                            <img :src="userImage(item.ref)" class="avatar" loading="lazy" />
                        </template>
                        <span v-else>
                            {{ t('side_panel.search_result_more') }}
                            <span style="font-weight: bold">{{ item.label }}</span>
                        </span>
                    </div>
                </el-option>
            </el-select>
            <el-tooltip placement="bottom" :content="t('side_panel.refresh_tooltip')">
                <el-button
                    type="default"
                    :loading="isRefreshFriendsLoading"
                    size="small"
                    :icon="Refresh"
                    circle
                    class="refresh-button"
                    @click="refreshFriendsList"></el-button>
            </el-tooltip>
        </div>
        <el-tabs class="modern-sidebar-tabs" stretch>
            <el-tab-pane>
                <template #label>
                    <span class="tab-label">{{ t('side_panel.friends') }}</span>
                    <span class="tab-count">({{ onlineFriendCount }}/{{ friends.size }})</span>
                </template>
                <el-backtop target=".modern-sidebar-tabs .el-tabs__content" :bottom="20" :right="20"></el-backtop>
                <FriendsSidebar @confirm-delete-friend="confirmDeleteFriend" />
            </el-tab-pane>
            <el-tab-pane lazy>
                <template #label>
                    <span class="tab-label">{{ t('side_panel.groups') }}</span>
                    <span class="tab-count">({{ groupInstances.length }})</span>
                </template>
                <GroupsSidebar :group-instances="groupInstances" :group-order="inGameGroupOrder" />
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script setup>
    import { Refresh } from '@element-plus/icons-vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { useFriendStore, useGroupStore, useSearchStore } from '../../stores';
    import { userImage } from '../../shared/utils';

    import FriendsSidebar from './components/FriendsSidebar.vue';
    import GroupsSidebar from './components/GroupsSidebar.vue';

    const { friends, isRefreshFriendsLoading, onlineFriendCount } = storeToRefs(useFriendStore());
    const { refreshFriendsList, confirmDeleteFriend } = useFriendStore();
    const { quickSearchRemoteMethod, quickSearchChange } = useSearchStore();
    const { quickSearchItems } = storeToRefs(useSearchStore());
    const { inGameGroupOrder, groupInstances } = storeToRefs(useGroupStore());
    const { t } = useI18n();
</script>

<style scoped lang="scss">
    .modern-sidebar {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 12px;
        padding: 16px;
    }
    
    .sidebar-header {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
    }
    
    .sidebar-search {
        flex: 1;
        min-width: 0;
        
        // Dark theme input wrapper
        .dark :deep(.el-input__wrapper) {
            background: rgba(255, 255, 255, 0.06) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 12px !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            padding: 0 14px;
            min-height: 40px;
            
            &:hover {
                background: rgba(255, 255, 255, 0.09) !important;
                border-color: rgba(255, 255, 255, 0.15) !important;
            }
            
            &.is-focus {
                background: rgba(255, 255, 255, 0.12) !important;
                border-color: rgba(255, 255, 255, 0.25) !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(255, 255, 255, 0.08);
            }
        }

        // Light theme input wrapper
        html:not(.dark) :deep(.el-input__wrapper) {
            background: #ffffff !important;
            border: 1px solid #e0e0e0 !important;
            border-radius: 12px !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
            padding: 0 14px;
            min-height: 40px;
            
            &:hover {
                background: #f5f5f5 !important;
                border-color: #d0d0d0 !important;
            }
            
            &.is-focus {
                background: #ffffff !important;
                border-color: #409eff !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 2px rgba(64, 158, 255, 0.1);
            }
        }
        
        // Dark theme input inner
        .dark :deep(.el-input__inner) {
            color: rgba(255, 255, 255, 0.9);
            font-size: 13px;
            
            &::placeholder {
                color: rgba(255, 255, 255, 0.5);
            }
        }

        // Light theme input inner
        html:not(.dark) :deep(.el-input__inner) {
            color: #333333;
            font-size: 13px;
            
            &::placeholder {
                color: #999999;
            }
        }
    }
    
    .refresh-button {
        border-radius: 50% !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        width: 36px !important;
        height: 36px !important;
        min-width: 36px !important;
        min-height: 36px !important;
        flex-shrink: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        
        :deep(.el-icon) {
            font-size: 16px;
            width: 16px;
            height: 16px;
        }
    }

    // Dark theme refresh button
    .dark .refresh-button {
        background: rgba(255, 255, 255, 0.06) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        
        &:hover {
            background: rgba(255, 255, 255, 0.12) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }
    }

    // Light theme refresh button
    html:not(.dark) .refresh-button {
        background: #f0f0f0 !important;
        border: 1px solid #e0e0e0 !important;
        
        &:hover {
            background: #e0e0e0 !important;
            border-color: #d0d0d0 !important;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
        }
    }
    
    .modern-sidebar-tabs {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
        
        // Dark theme tabs header
        .dark :deep(.el-tabs__header) {
            background: rgba(255, 255, 255, 0.04);
            border-radius: 12px;
            padding: 6px;
            margin: 0 0 10px 0;
            border: 1px solid rgba(255, 255, 255, 0.08);
            flex-shrink: 0;
        }

        // Light theme tabs header
        html:not(.dark) :deep(.el-tabs__header) {
            background: #f5f5f5;
            border-radius: 12px;
            padding: 6px;
            margin: 0 0 10px 0;
            border: 1px solid #e0e0e0;
            flex-shrink: 0;
        }
        
        :deep(.el-tabs__nav-wrap) {
            &::after {
                display: none;
            }
        }
        
        // Dark theme tabs item
        .dark :deep(.el-tabs__item) {
            color: rgba(255, 255, 255, 0.6);
            border-radius: 10px;
            padding: 8px 16px;
            margin: 0 3px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 500;
            
            .tab-label {
                font-size: 13px;
            }
            
            .tab-count {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.45);
                margin-left: 6px;
                font-weight: 400;
            }
            
            &:hover {
                color: rgba(255, 255, 255, 0.85);
                background: rgba(255, 255, 255, 0.06);
            }
            
            &.is-active {
                color: rgba(255, 255, 255, 1);
                background: rgba(255, 255, 255, 0.12);
                border: 1px solid rgba(255, 255, 255, 0.18);
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
                
                .tab-count {
                    color: rgba(255, 255, 255, 0.65);
                }
            }
        }

        // Light theme tabs item
        html:not(.dark) :deep(.el-tabs__item) {
            color: #666666;
            border-radius: 10px;
            padding: 8px 16px;
            margin: 0 3px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 500;
            
            .tab-label {
                font-size: 13px;
            }
            
            .tab-count {
                font-size: 11px;
                color: #999999;
                margin-left: 6px;
                font-weight: 400;
            }
            
            &:hover {
                color: #333333;
                background: #f0f0f0;
            }
            
            &.is-active {
                color: #409eff;
                background: #e6f4ff;
                border: 1px solid #409eff;
                box-shadow: 0 2px 6px rgba(64, 158, 255, 0.2);
                
                .tab-count {
                    color: #666666;
                }
            }
        }
        
        :deep(.el-tabs__active-bar) {
            display: none;
        }
        
        :deep(.el-tabs__content) {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            min-height: 0;
        }
        
        :deep(.el-tab-pane) {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            min-height: 0;
        }
    }
    
    .group-calendar-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 5;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    // Dark theme calendar button
    .dark .group-calendar-button {
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.12);
        
        &:hover {
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
            background: rgba(255, 255, 255, 0.18);
        }
    }

    // Light theme calendar button
    html:not(.dark) .group-calendar-button {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        border: 1px solid #e0e0e0;
        background: #ffffff;
        
        &:hover {
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            background: #f0f0f0;
        }
    }
</style>
