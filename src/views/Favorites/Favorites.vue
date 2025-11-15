<template>
    <div class="favorites-page">
        <div class="favorites-header">
            <div class="favorites-tabs-container">
                <div 
                    v-for="(tab, index) in tabs" 
                    :key="index"
                    :class="['favorites-tab', { 'is-active': currentFavoriteTab === tab.name }]"
                    @click="currentFavoriteTab = tab.name">
                    <i :class="tab.icon"></i>
                    <span>{{ tab.label }}</span>
                </div>
            </div>
            
            <div class="favorites-actions">
                <div v-if="editFavoritesMode" class="bulk-actions">
                    <el-button size="small" @click="clearBulkFavoriteSelection">{{ t('view.favorite.clear') }}</el-button>
                    <el-button size="small" @click="handleBulkCopyFavoriteSelection">{{
                        t('view.favorite.copy')
                    }}</el-button>
                    <el-button size="small" @click="showBulkUnfavoriteSelectionConfirm">{{
                        t('view.favorite.bulk_unfavorite')
                    }}</el-button>
                </div>
                <div class="header-controls">
                    <div class="edit-mode-toggle">
                        <span class="toggle-label">{{ t('view.favorite.edit_mode') }}</span>
                        <el-switch v-model="editFavoritesMode"></el-switch>
                    </div>
                    <el-tooltip placement="bottom" :content="t('view.favorite.refresh_favorites_tooltip')" :teleported="false">
                        <el-button
                            type="default"
                            :loading="isFavoriteLoading"
                            size="small"
                            :icon="Refresh"
                            circle
                            class="refresh-btn"
                            @click="
                                refreshFavorites();
                                getLocalWorldFavorites();
                            "></el-button>
                    </el-tooltip>
                </div>
            </div>
        </div>
        
        <div class="favorites-content" v-loading="isFavoriteLoading">
            <FavoritesFriendTab 
                v-show="currentFavoriteTab === 'friend'"
                @change-favorite-group-name="changeFavoriteGroupName" />
            <FavoritesWorldTab 
                v-show="currentFavoriteTab === 'world'"
                @change-favorite-group-name="changeFavoriteGroupName" />
            <FavoritesAvatarTab 
                v-show="currentFavoriteTab === 'avatar'"
                @change-favorite-group-name="changeFavoriteGroupName" />
        </div>
    </div>
</template>

<script setup>
    import { ElMessage, ElMessageBox } from 'element-plus';
    import { Refresh } from '@element-plus/icons-vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { favoriteRequest } from '../../api';
    import { useFavoriteStore } from '../../stores';

    import FavoritesAvatarTab from './components/FavoritesAvatarTab.vue';
    import FavoritesFriendTab from './components/FavoritesFriendTab.vue';
    import FavoritesWorldTab from './components/FavoritesWorldTab.vue';

    const { t } = useI18n();
    const {
        favoriteFriends,
        favoriteWorlds,
        favoriteAvatars,
        isFavoriteLoading,
        avatarImportDialogInput,
        worldImportDialogInput,
        friendImportDialogInput,
        currentFavoriteTab,
        editFavoritesMode
    } = storeToRefs(useFavoriteStore());

    const tabs = [
        { name: 'friend', label: t('view.favorite.friends.header'), icon: 'ri-user-heart-line' },
        { name: 'world', label: t('view.favorite.worlds.header'), icon: 'ri-global-line' },
        { name: 'avatar', label: t('view.favorite.avatars.header'), icon: 'ri-user-avatar-line' }
    ];
    const {
        refreshFavorites,
        refreshFavoriteGroups,
        clearBulkFavoriteSelection,
        getLocalWorldFavorites,
        handleFavoriteGroup,
        showFriendImportDialog,
        showWorldImportDialog,
        showAvatarImportDialog
    } = useFavoriteStore();

    function showBulkUnfavoriteSelectionConfirm() {
        const elementsTicked = [];
        // check favorites type
        for (const ctx of favoriteFriends.value) {
            if (ctx.$selected) {
                elementsTicked.push(ctx.id);
            }
        }
        for (const ctx of favoriteWorlds.value) {
            if (ctx.$selected) {
                elementsTicked.push(ctx.id);
            }
        }
        for (const ctx of favoriteAvatars.value) {
            if (ctx.$selected) {
                elementsTicked.push(ctx.id);
            }
        }
        if (elementsTicked.length === 0) {
            return;
        }
        ElMessageBox.confirm(
            `Are you sure you want to unfavorite ${elementsTicked.length} favorites?
            This action cannot be undone.`,
            `Delete ${elementsTicked.length} favorites?`,
            {
                confirmButtonText: 'Confirm',
                cancelButtonText: 'Cancel',
                type: 'info'
            }
        )
            .then((action) => {
                if (action === 'confirm') {
                    bulkUnfavoriteSelection(elementsTicked);
                }
            })
            .catch(() => {});
    }

    function bulkUnfavoriteSelection(elementsTicked) {
        for (const id of elementsTicked) {
            favoriteRequest.deleteFavorite({
                objectId: id
            });
        }
        editFavoritesMode.value = false;
    }
    function changeFavoriteGroupName(ctx) {
        ElMessageBox.prompt(
            t('prompt.change_favorite_group_name.description'),
            t('prompt.change_favorite_group_name.header'),
            {
                distinguishCancelAndClose: true,
                cancelButtonText: t('prompt.change_favorite_group_name.cancel'),
                confirmButtonText: t('prompt.change_favorite_group_name.change'),
                inputPlaceholder: t('prompt.change_favorite_group_name.input_placeholder'),
                inputValue: ctx.displayName,
                inputPattern: /\S+/,
                inputErrorMessage: t('prompt.change_favorite_group_name.input_error')
            }
        )
            .then(({ value }) => {
                favoriteRequest
                    .saveFavoriteGroup({
                        type: ctx.type,
                        group: ctx.name,
                        displayName: value
                    })
                    .then((args) => {
                        handleFavoriteGroup({
                            json: args.json,
                            params: {
                                favoriteGroupId: args.json.id
                            }
                        });
                        ElMessage({
                            message: t('prompt.change_favorite_group_name.message.success'),
                            type: 'success'
                        });
                        // load new group name
                        refreshFavoriteGroups();
                    });
            })
            .catch(() => {});
    }

    function handleBulkCopyFavoriteSelection() {
        let idList = '';
        switch (currentFavoriteTab.value) {
            case 'friend':
                for (const ctx of favoriteFriends.value) {
                    if (ctx.$selected) {
                        idList += `${ctx.id}\n`;
                    }
                }
                friendImportDialogInput.value = idList;
                showFriendImportDialog();

                break;

            case 'world':
                for (const ctx of favoriteWorlds.value) {
                    if (ctx.$selected) {
                        idList += `${ctx.id}\n`;
                    }
                }
                worldImportDialogInput.value = idList;
                showWorldImportDialog();

                break;

            case 'avatar':
                for (const ctx of favoriteAvatars.value) {
                    if (ctx.$selected) {
                        idList += `${ctx.id}\n`;
                    }
                }
                avatarImportDialogInput.value = idList;
                showAvatarImportDialog();

                break;

            default:
                break;
        }

        console.log('Favorite selection\n', idList);
    }
</script>

<style scoped lang="scss">
    .favorites-page {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 32px;
        gap: 0;
    }

    // Dark theme page
    .dark .favorites-page {
        background: rgba(255, 255, 255, 0.04) !important;
    }

    // Light theme page
    html:not(.dark) .favorites-page {
        background: #ffffff !important;
    }

    .favorites-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 20px;
        margin-bottom: 20px;
    }

    // Dark theme header
    .dark .favorites-header {
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    // Light theme header
    html:not(.dark) .favorites-header {
        border-bottom: 1px solid #e0e0e0;
    }

    .favorites-tabs-container {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .favorites-tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 13px;
        font-weight: 500;
        
        i {
            font-size: 16px;
            transition: all 0.3s ease;
        }
    }

    // Dark theme tab
    .dark .favorites-tab {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.6);
        
        &:hover {
            color: rgba(255, 255, 255, 0.85);
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.1);
        }
        
        &.is-active {
            color: rgba(255, 255, 255, 1);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            font-weight: 600;
            box-shadow: 
                0 4px 12px rgba(0, 0, 0, 0.25);
            
            i {
                color: rgba(255, 255, 255, 1);
            }
        }
    }

    // Light theme tab
    html:not(.dark) .favorites-tab {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        color: #666666;
        
        &:hover {
            color: #333333;
            background: #f0f0f0;
            border-color: #d0d0d0;
        }
        
        &.is-active {
            color: #409eff;
            background: #e6f4ff;
            border: 1px solid #409eff;
            font-weight: 600;
            box-shadow: 
                0 4px 12px rgba(64, 158, 255, 0.2);
            
            i {
                color: #409eff;
            }
        }
    }

    .favorites-actions {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .bulk-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-right: 12px;
    }

    // Dark theme bulk actions
    .dark .bulk-actions {
        border-right: 1px solid rgba(255, 255, 255, 0.08);
    }

    // Light theme bulk actions
    html:not(.dark) .bulk-actions {
        border-right: 1px solid #e0e0e0;
    }

    .header-controls {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .edit-mode-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
    }

    // Dark theme edit mode toggle
    .dark .edit-mode-toggle {
        color: rgba(255, 255, 255, 0.75);
    }

    // Light theme edit mode toggle
    html:not(.dark) .edit-mode-toggle {
        color: #666666;
    }

    .toggle-label {
        font-weight: 500;
    }

    .refresh-btn {
        border-radius: 50% !important;
        transition: all 0.3s ease;
    }

    // Dark theme refresh button
    .dark .refresh-btn {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: rgba(255, 255, 255, 0.85) !important;
        
        &:hover {
            background: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
            box-shadow: 
                0 2px 8px rgba(0, 0, 0, 0.25);
        }
    }

    // Light theme refresh button
    html:not(.dark) .refresh-btn {
        background: #f0f0f0 !important;
        border: 1px solid #e0e0e0 !important;
        color: #666666 !important;
        
        &:hover {
            background: #e0e0e0 !important;
            border-color: #d0d0d0 !important;
            box-shadow: 
                0 2px 8px rgba(0, 0, 0, 0.15);
        }
    }

    .favorites-content {
        flex: 1;
        min-height: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
    
    // Dark theme button
    .dark :deep(.el-button) {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        color: rgba(255, 255, 255, 0.9);
        transition: all 0.3s ease;
        
        &:hover {
            background: rgba(255, 255, 255, 0.12);
            border-color: rgba(255, 255, 255, 0.25);
            box-shadow: 
                0 4px 12px rgba(0, 0, 0, 0.3);
        }
    }

    // Light theme button
    html:not(.dark) :deep(.el-button) {
        background: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        color: #333333;
        transition: all 0.3s ease;
        
        &:hover {
            background: #f0f0f0;
            border-color: #d0d0d0;
            box-shadow: 
                0 4px 12px rgba(0, 0, 0, 0.15);
        }
    }
    
    // Dark theme switch
    .dark :deep(.el-switch) {
        .el-switch__core {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
        }
        
        &.is-checked .el-switch__core {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.3);
        }
    }

    // Light theme switch
    html:not(.dark) :deep(.el-switch) {
        .el-switch__core {
            background: #e0e0e0;
            border-color: #d0d0d0;
        }
        
        &.is-checked .el-switch__core {
            background-color: #13ce66;
            border-color: #13ce66;
        }
    }
</style>
