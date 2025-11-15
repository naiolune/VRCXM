<template>
    <div class="favorites-tab-content">
        <div class="tab-toolbar">
            <div class="toolbar-left">
                <el-button size="small" @click="showFriendExportDialog">
                    <i class="ri-download-line"></i>
                    {{ t('view.favorite.export') }}
                </el-button>
                <el-button size="small" @click="showFriendImportDialog">
                    <i class="ri-upload-line"></i>
                    {{ t('view.favorite.import') }}
                </el-button>
            </div>
            <div class="toolbar-right">
                <span class="sort-label">{{ t('view.favorite.sort_by') }}</span>
                <el-radio-group v-model="sortFav" size="small" class="sort-radio-group">
                    <el-radio :label="false">{{
                        t('view.settings.appearance.appearance.sort_favorite_by_name')
                    }}</el-radio>
                    <el-radio :label="true">{{
                        t('view.settings.appearance.appearance.sort_favorite_by_date')
                    }}</el-radio>
                </el-radio-group>
            </div>
        </div>

        <div class="favorites-section">
            <h3 class="section-title">{{ t('view.favorite.avatars.vrchat_favorites') }}</h3>
            <el-collapse class="modern-collapse">
                <el-collapse-item 
                    v-for="group in favoriteFriendGroups" 
                    :key="group.name"
                    :name="group.name">
                    <template #title>
                        <div class="collapse-title">
                            <div class="group-info">
                                <h4 class="group-name" v-text="group.displayName"></h4>
                                <span class="group-count">{{ group.count }}/{{ group.capacity }}</span>
                            </div>
                            <div class="group-actions" @click.stop>
                                <el-tooltip placement="top" :content="t('view.favorite.rename_tooltip')" :teleported="false">
                                    <el-button
                                        size="small"
                                        :icon="Edit"
                                        circle
                                        class="group-action-btn"
                                        @click="changeFavoriteGroupName(group)"></el-button>
                                </el-tooltip>
                                <el-tooltip placement="right" :content="t('view.favorite.clear_tooltip')" :teleported="false">
                                    <el-button
                                        size="small"
                                        :icon="Delete"
                                        circle
                                        class="group-action-btn"
                                        @click="clearFavoriteGroup(group)"></el-button>
                                </el-tooltip>
                            </div>
                        </div>
                    </template>
                    <div v-if="group.count" class="group-items">
                        <FavoritesFriendItem
                            v-for="favorite in groupedByGroupKeyFavoriteFriends[group.key]"
                            :key="favorite.id"
                            class="favorite-item"
                            :favorite="favorite"
                            :group="group"
                            @click="showUserDialog(favorite.id)" />
                    </div>
                    <div v-else class="group-empty">
                        <i class="ri-inbox-line"></i>
                        <span>No favorites in this group</span>
                    </div>
                </el-collapse-item>
            </el-collapse>
        </div>
        <FriendExportDialog v-model:friendExportDialogVisible="friendExportDialogVisible" />
    </div>
</template>

<script setup>
    import { Delete, Edit } from '@element-plus/icons-vue';
    import { computed, ref } from 'vue';
    import { ElMessageBox } from 'element-plus';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { useAppearanceSettingsStore, useFavoriteStore, useUserStore } from '../../../stores';
    import { favoriteRequest } from '../../../api';

    import FavoritesFriendItem from './FavoritesFriendItem.vue';
    import FriendExportDialog from '../dialogs/FriendExportDialog.vue';

    const emit = defineEmits(['change-favorite-group-name']);

    const { sortFavorites } = storeToRefs(useAppearanceSettingsStore());
    const { setSortFavorites } = useAppearanceSettingsStore();
    const { showUserDialog } = useUserStore();
    const { favoriteFriendGroups, groupedByGroupKeyFavoriteFriends } = storeToRefs(useFavoriteStore());
    const { showFriendImportDialog } = useFavoriteStore();
    const { t } = useI18n();

    const friendExportDialogVisible = ref(false);

    const sortFav = computed({
        get() {
            return sortFavorites.value;
        },
        set() {
            setSortFavorites();
        }
    });

    function showFriendExportDialog() {
        friendExportDialogVisible.value = true;
    }

    function clearFavoriteGroup(ctx) {
        ElMessageBox.confirm('Continue? Clear Group', 'Confirm', {
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
            type: 'info'
        })
            .then((action) => {
                if (action === 'confirm') {
                    favoriteRequest.clearFavoriteGroup({
                        type: ctx.type,
                        group: ctx.name
                    });
                }
            })
            .catch(() => {});
    }

    function changeFavoriteGroupName(group) {
        emit('change-favorite-group-name', group);
    }
</script>

<style scoped lang="scss">
    .favorites-tab-content {
        display: flex;
        flex-direction: column;
        gap: 24px;
        height: 100%;
        overflow-y: auto;
        padding-right: 4px;
        
        &::-webkit-scrollbar {
            width: 8px;
        }
        
        &::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 10px;
        }
        
        &::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            border: 2px solid transparent;
            background-clip: padding-box;
            
            &:hover {
                background: rgba(255, 255, 255, 0.15);
                background-clip: padding-box;
            }
        }
    }

    .tab-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
    }

    .toolbar-left {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .toolbar-right {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .sort-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.75);
        font-weight: 500;
    }

    .sort-radio-group {
        // Dark theme radio
        .dark :deep(.el-radio) {
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
            margin-right: 12px;
            
            .el-radio__input.is-checked .el-radio__inner {
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(255, 255, 255, 0.25);
            }
            
            .el-radio__inner {
                background: rgba(255, 255, 255, 0.04);
                border-color: rgba(255, 255, 255, 0.15);
            }
        }

        // Light theme radio
        html:not(.dark) :deep(.el-radio) {
            color: #666666;
            font-size: 12px;
            margin-right: 12px;
            
            .el-radio__input.is-checked .el-radio__inner {
                background: #409eff;
                border-color: #409eff;
            }
            
            .el-radio__inner {
                background: #ffffff;
                border-color: #e0e0e0;
            }
        }
    }

    .favorites-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .section-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0;
        padding: 0;
    }

    // Dark theme section title
    .dark .section-title {
        color: rgba(255, 255, 255, 0.9);
    }

    // Light theme section title
    html:not(.dark) .section-title {
        color: #333333;
    }

    .modern-collapse {
        border: none;
        
        // Dark theme collapse item
        .dark :deep(.el-collapse-item) {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            margin-bottom: 16px;
            transition: all 0.3s ease;
            overflow: hidden;
            
            &:hover {
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(255, 255, 255, 0.12);
                box-shadow: 
                    0 8px 24px rgba(0, 0, 0, 0.2);
            }
            
            &:last-child {
                margin-bottom: 0;
            }
        }

        // Light theme collapse item
        html:not(.dark) :deep(.el-collapse-item) {
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 16px;
            margin-bottom: 16px;
            transition: all 0.3s ease;
            overflow: hidden;
            
            &:hover {
                background: #f5f5f5;
                border-color: #d0d0d0;
                box-shadow: 
                    0 4px 16px rgba(0, 0, 0, 0.1);
            }
            
            &:last-child {
                margin-bottom: 0;
            }
        }
        
        // Dark theme collapse header
        .dark :deep(.el-collapse-item__header) {
            background: transparent;
            border: none;
            padding: 16px;
            height: auto;
            line-height: normal;
            color: rgba(255, 255, 255, 0.9);
            
            &:hover {
                background: transparent;
            }
        }

        // Light theme collapse header
        html:not(.dark) :deep(.el-collapse-item__header) {
            background: transparent;
            border: none;
            padding: 16px;
            height: auto;
            line-height: normal;
            color: #333333;
            
            &:hover {
                background: transparent;
            }
        }
        
        // Dark theme collapse wrap
        .dark :deep(.el-collapse-item__wrap) {
            background: transparent;
            border: none;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        // Light theme collapse wrap
        html:not(.dark) :deep(.el-collapse-item__wrap) {
            background: transparent;
            border: none;
            border-top: 1px solid #e0e0e0;
        }
        
        // Dark theme collapse content
        .dark :deep(.el-collapse-item__content) {
            padding: 16px;
            padding-top: 16px;
            color: rgba(255, 255, 255, 0.9);
        }

        // Light theme collapse content
        html:not(.dark) :deep(.el-collapse-item__content) {
            padding: 16px;
            padding-top: 16px;
            color: #333333;
        }
        
        // Dark theme collapse arrow
        .dark :deep(.el-collapse-item__arrow) {
            color: rgba(255, 255, 255, 0.6);
            margin-right: 12px;
            transition: all 0.3s ease;
            
            &:hover {
                color: rgba(255, 255, 255, 0.9);
            }
        }

        // Light theme collapse arrow
        html:not(.dark) :deep(.el-collapse-item__arrow) {
            color: #999999;
            margin-right: 12px;
            transition: all 0.3s ease;
            
            &:hover {
                color: #666666;
            }
        }
        
        // Dark theme active arrow
        .dark :deep(.el-collapse-item.is-active .el-collapse-item__arrow) {
            color: rgba(255, 255, 255, 0.9);
        }

        // Light theme active arrow
        html:not(.dark) :deep(.el-collapse-item.is-active .el-collapse-item__arrow) {
            color: #333333;
        }
    }

    .collapse-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
    }

    .group-info {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .group-name {
        font-size: 15px;
        font-weight: 600;
        margin: 0;
    }

    // Dark theme group name
    .dark .group-name {
        color: rgba(255, 255, 255, 0.9);
    }

    // Light theme group name
    html:not(.dark) .group-name {
        color: #333333;
    }

    .group-count {
        font-size: 12px;
        padding: 3px 8px;
        border-radius: 6px;
    }

    // Dark theme group count
    .dark .group-count {
        color: rgba(255, 255, 255, 0.5);
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.06);
    }

    // Light theme group count
    html:not(.dark) .group-count {
        color: #666666;
        background: #f0f0f0;
        border: 1px solid #e0e0e0;
    }

    .group-actions {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .group-action-btn {
    }

    // Dark theme group action button
    .dark .group-action-btn {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: rgba(255, 255, 255, 0.8) !important;
        
        &:hover {
            background: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
        }
    }

    // Light theme group action button
    html:not(.dark) .group-action-btn {
        background: #f0f0f0 !important;
        border: 1px solid #e0e0e0 !important;
        color: #666666 !important;
        
        &:hover {
            background: #e0e0e0 !important;
            border-color: #d0d0d0 !important;
        }
    }

    .group-items {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 12px;
    }

    .favorite-item {
        width: 100% !important;
        margin: 0 !important;
    }

    .group-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 40px 20px;
        font-size: 13px;
        
        i {
            font-size: 32px;
            opacity: 0.5;
        }
    }

    // Dark theme group empty
    .dark .group-empty {
        color: rgba(255, 255, 255, 0.4);
    }

    // Light theme group empty
    html:not(.dark) .group-empty {
        color: #999999;
    }
</style>
