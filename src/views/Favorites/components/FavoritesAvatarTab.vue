<template>
    <div class="favorites-tab-content">
        <div class="tab-toolbar">
            <div class="toolbar-left">
                <el-button size="small" @click="showAvatarExportDialog">
                    <i class="ri-download-line"></i>
                    {{ t('view.favorite.export') }}
                </el-button>
                <el-button size="small" @click="showAvatarImportDialog">
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
                <el-input
                    v-model="avatarFavoriteSearch"
                    clearable
                    size="small"
                    :placeholder="t('view.favorite.avatars.search')"
                    class="search-input"
                    @input="searchAvatarFavorites">
                    <template #prefix>
                        <i class="ri-search-line"></i>
                    </template>
                </el-input>
            </div>
        </div>

        <div v-if="avatarFavoriteSearchResults.length" class="search-results-section">
            <h3 class="section-title">Search Results</h3>
            <div class="search-results-grid">
                <div
                    v-for="favorite in avatarFavoriteSearchResults"
                    :key="favorite.id"
                    class="search-result-card"
                    @click="showAvatarDialog(favorite.id)">
                    <div class="result-avatar">
                        <img v-if="favorite.thumbnailImageUrl" :src="favorite.thumbnailImageUrl" loading="lazy" />
                    </div>
                    <div class="result-content">
                        <div class="result-name" v-text="favorite.name || favorite.id"></div>
                        <div class="result-meta" v-if="favorite.authorName" v-text="favorite.authorName"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="favorites-section">
            <h3 class="section-title">{{ t('view.favorite.avatars.vrchat_favorites') }}</h3>
            <el-collapse class="modern-collapse">
                <el-collapse-item 
                    v-for="group in favoriteAvatarGroups" 
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
                                        @click="changeFavoriteGroupName(group)" />
                                </el-tooltip>
                                <el-tooltip placement="right" :content="t('view.favorite.clear_tooltip')" :teleported="false">
                                    <el-button
                                        size="small"
                                        :icon="Delete"
                                        circle
                                        class="group-action-btn"
                                        @click="clearFavoriteGroup(group)" />
                                </el-tooltip>
                            </div>
                        </div>
                    </template>
                    <div v-if="group.count" class="group-items">
                        <FavoritesAvatarItem
                            v-for="favorite in groupedByGroupKeyFavoriteAvatars[group.key]"
                            :key="favorite.id"
                            class="favorite-item"
                            :favorite="favorite"
                            :group="group"
                            @handle-select="favorite.$selected = $event"
                            @click="showAvatarDialog(favorite.id)" />
                    </div>
                    <div v-else class="group-empty">
                        <i class="ri-inbox-line"></i>
                        <span>No favorites in this group</span>
                    </div>
                </el-collapse-item>
                
                <el-collapse-item name="local-history">
                    <template #title>
                        <div class="collapse-title">
                            <div class="group-info">
                                <h4 class="group-name">Local History</h4>
                                <span class="group-count">{{ avatarHistory.length }}/100</span>
                            </div>
                            <div class="group-actions" @click.stop>
                                <el-tooltip placement="right" content="Clear" :teleported="false">
                                    <el-button
                                        size="small"
                                        :icon="Delete"
                                        circle
                                        class="group-action-btn"
                                        @click="promptClearAvatarHistory"></el-button>
                                </el-tooltip>
                            </div>
                        </div>
                    </template>
                    <div v-if="avatarHistory.length" class="group-items">
                        <FavoritesAvatarLocalHistoryItem
                            v-for="favorite in avatarHistory"
                            :key="favorite.id"
                            class="favorite-item"
                            :favorite="favorite"
                            @click="showAvatarDialog(favorite.id)" />
                    </div>
                    <div v-else class="group-empty">
                        <i class="ri-inbox-line"></i>
                        <span>No history</span>
                    </div>
                </el-collapse-item>
            </el-collapse>
        </div>

        <div class="favorites-section">
            <div class="section-header">
                <h3 class="section-title">{{ t('view.favorite.avatars.local_favorites') }}</h3>
                <div class="section-actions">
                    <el-button 
                        size="small" 
                        :disabled="!isLocalUserVrcPlusSupporter" 
                        @click="promptNewLocalAvatarFavoriteGroup">
                        <i class="ri-add-line"></i>
                        {{ t('view.favorite.avatars.new_group') }}
                    </el-button>
                    <el-button
                        v-if="!refreshingLocalFavorites"
                        size="small"
                        @click="refreshLocalAvatarFavorites">
                        <i class="ri-refresh-line"></i>
                        {{ t('view.favorite.avatars.refresh') }}
                    </el-button>
                    <el-button v-else size="small" @click="cancelLocalAvatarRefresh">
                        <el-icon class="is-loading"><Loading /></el-icon>
                        <span>{{ t('view.favorite.avatars.cancel_refresh') }}</span>
                    </el-button>
                </div>
            </div>
            <el-collapse class="modern-collapse">
                <el-collapse-item 
                    v-for="group in localAvatarFavoriteGroups" 
                    :key="group"
                    :name="group">
                    <template #title>
                        <div class="collapse-title">
                            <div class="group-info">
                                <h4 class="group-name" v-text="group"></h4>
                                <span class="group-count">{{ localAvatarFavGroupLength(group) }}</span>
                            </div>
                            <div class="group-actions" @click.stop>
                                <el-tooltip placement="top" :content="t('view.favorite.rename_tooltip')" :teleported="false">
                                    <el-button
                                        size="small"
                                        :icon="Edit"
                                        circle
                                        class="group-action-btn"
                                        @click="promptLocalAvatarFavoriteGroupRename(group)" />
                                </el-tooltip>
                                <el-tooltip placement="right" :content="t('view.favorite.delete_tooltip')" :teleported="false">
                                    <el-button
                                        size="small"
                                        :icon="Delete"
                                        circle
                                        class="group-action-btn"
                                        @click="promptLocalAvatarFavoriteGroupDelete(group)" />
                                </el-tooltip>
                            </div>
                        </div>
                    </template>
                    <div v-if="localAvatarFavorites[group] && localAvatarFavorites[group].length" class="group-items">
                        <FavoritesAvatarItem
                            v-for="favorite in localAvatarFavorites[group]"
                            :key="favorite.id"
                            is-local-favorite
                            class="favorite-item"
                            :favorite="favorite"
                            :group="group"
                            @handle-select="favorite.$selected = $event"
                            @click="showAvatarDialog(favorite.id)" />
                    </div>
                    <div v-else class="group-empty">
                        <i class="ri-inbox-line"></i>
                        <span>No favorites in this group</span>
                    </div>
                </el-collapse-item>
            </el-collapse>
        </div>
        <AvatarExportDialog v-model:avatarExportDialogVisible="avatarExportDialogVisible" />
    </div>
</template>

<script setup>
    import { Delete, Edit, Loading } from '@element-plus/icons-vue';
    import { computed, onBeforeUnmount, ref } from 'vue';
    import { ElMessageBox } from 'element-plus';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { useAppearanceSettingsStore, useAvatarStore, useFavoriteStore, useUserStore } from '../../../stores';
    import { avatarRequest, favoriteRequest } from '../../../api';

    import AvatarExportDialog from '../dialogs/AvatarExportDialog.vue';
    import FavoritesAvatarItem from './FavoritesAvatarItem.vue';
    import FavoritesAvatarLocalHistoryItem from './FavoritesAvatarLocalHistoryItem.vue';

    import * as workerTimers from 'worker-timers';

    const emit = defineEmits(['change-favorite-group-name', 'refresh-local-avatar-favorites']);

    const { sortFavorites } = storeToRefs(useAppearanceSettingsStore());
    const { setSortFavorites } = useAppearanceSettingsStore();
    const { favoriteAvatars, favoriteAvatarGroups, localAvatarFavorites } = storeToRefs(useFavoriteStore());
    const {
        showAvatarImportDialog,
        localAvatarFavGroupLength,
        deleteLocalAvatarFavoriteGroup,
        renameLocalAvatarFavoriteGroup,
        newLocalAvatarFavoriteGroup,
        localAvatarFavoritesList,
        localAvatarFavoriteGroups
    } = useFavoriteStore();
    const { avatarHistory } = storeToRefs(useAvatarStore());
    const { promptClearAvatarHistory, showAvatarDialog, applyAvatar } = useAvatarStore();
    const { isLocalUserVrcPlusSupporter } = storeToRefs(useUserStore());
    const { t } = useI18n();

    const avatarExportDialogVisible = ref(false);
    const avatarFavoriteSearch = ref('');
    const avatarFavoriteSearchResults = ref([]);
    const refreshingLocalFavorites = ref(false);
    const worker = ref(null);
    const refreshCancelToken = ref(null);

    const sortFav = computed({
        get() {
            return sortFavorites.value;
        },
        set() {
            setSortFavorites();
        }
    });

    const groupedByGroupKeyFavoriteAvatars = computed(() => {
        const groupedByGroupKeyFavoriteAvatars = {};
        favoriteAvatars.value.forEach((avatar) => {
            if (avatar.groupKey) {
                if (!groupedByGroupKeyFavoriteAvatars[avatar.groupKey]) {
                    groupedByGroupKeyFavoriteAvatars[avatar.groupKey] = [];
                }
                groupedByGroupKeyFavoriteAvatars[avatar.groupKey].push(avatar);
            }
        });

        return groupedByGroupKeyFavoriteAvatars;
    });

    function searchAvatarFavorites() {
        let ref = null;
        const search = avatarFavoriteSearch.value.toLowerCase();
        if (search.length < 3) {
            avatarFavoriteSearchResults.value = [];
            return;
        }

        const results = [];
        for (let i = 0; i < localAvatarFavoriteGroups.length; ++i) {
            const group = localAvatarFavoriteGroups[i];
            if (!localAvatarFavorites.value[group]) {
                continue;
            }
            for (let j = 0; j < localAvatarFavorites.value[group].length; ++j) {
                ref = localAvatarFavorites.value[group][j];
                if (
                    !ref ||
                    typeof ref.id === 'undefined' ||
                    typeof ref.name === 'undefined' ||
                    typeof ref.authorName === 'undefined'
                ) {
                    continue;
                }
                if (ref.name.toLowerCase().includes(search) || ref.authorName.toLowerCase().includes(search)) {
                    if (!results.some((r) => r.id === ref.id)) {
                        results.push(ref);
                    }
                }
            }
        }

        for (let i = 0; i < favoriteAvatars.value.length; ++i) {
            ref = favoriteAvatars.value[i].ref;
            if (
                !ref ||
                typeof ref.id === 'undefined' ||
                typeof ref.name === 'undefined' ||
                typeof ref.authorName === 'undefined'
            ) {
                continue;
            }
            if (ref.name.toLowerCase().includes(search) || ref.authorName.toLowerCase().includes(search)) {
                if (!results.some((r) => r.id === ref.id)) {
                    results.push(ref);
                }
            }
        }

        avatarFavoriteSearchResults.value = results;
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

    function showAvatarExportDialog() {
        avatarExportDialogVisible.value = true;
    }

    function changeFavoriteGroupName(group) {
        emit('change-favorite-group-name', group);
    }

    function promptNewLocalAvatarFavoriteGroup() {
        ElMessageBox.prompt(
            t('prompt.new_local_favorite_group.description'),
            t('prompt.new_local_favorite_group.header'),
            {
                distinguishCancelAndClose: true,
                confirmButtonText: t('prompt.new_local_favorite_group.ok'),
                cancelButtonText: t('prompt.new_local_favorite_group.cancel'),
                inputPattern: /\S+/,
                inputErrorMessage: t('prompt.new_local_favorite_group.input_error')
            }
        )
            .then(({ value }) => {
                if (value) {
                    newLocalAvatarFavoriteGroup(value);
                }
            })
            .catch(() => {});
    }

    function promptLocalAvatarFavoriteGroupRename(group) {
        ElMessageBox.prompt(
            t('prompt.local_favorite_group_rename.description'),
            t('prompt.local_favorite_group_rename.header'),
            {
                distinguishCancelAndClose: true,
                confirmButtonText: t('prompt.local_favorite_group_rename.save'),
                cancelButtonText: t('prompt.local_favorite_group_rename.cancel'),
                inputPattern: /\S+/,
                inputErrorMessage: t('prompt.local_favorite_group_rename.input_error'),
                inputValue: group
            }
        )
            .then(({ value }) => {
                if (value) {
                    renameLocalAvatarFavoriteGroup(value, group);
                }
            })
            .catch(() => {});
    }

    function promptLocalAvatarFavoriteGroupDelete(group) {
        ElMessageBox.confirm(`Delete Group? ${group}`, 'Confirm', {
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
            type: 'info'
        })
            .then((action) => {
                if (action === 'confirm') {
                    deleteLocalAvatarFavoriteGroup(group);
                }
            })
            .catch(() => {});
    }

    async function refreshLocalAvatarFavorites() {
        if (refreshingLocalFavorites.value) {
            return;
        }
        refreshingLocalFavorites.value = true;
        const token = {
            cancelled: false,
            resolve: null
        };
        refreshCancelToken.value = token;
        try {
            for (const avatarId of localAvatarFavoritesList) {
                if (token.cancelled) {
                    break;
                }
                try {
                    const args = await avatarRequest.getAvatar({
                        avatarId
                    });
                    applyAvatar(args.json);
                } catch (err) {
                    console.error(err);
                }
                if (token.cancelled) {
                    break;
                }
                await new Promise((resolve) => {
                    token.resolve = resolve;
                    worker.value = workerTimers.setTimeout(() => {
                        worker.value = null;
                        resolve();
                    }, 1000);
                });
            }
        } finally {
            if (worker.value) {
                workerTimers.clearTimeout(worker.value);
                worker.value = null;
            }
            if (refreshCancelToken.value === token) {
                refreshCancelToken.value = null;
            }
            refreshingLocalFavorites.value = false;
        }
    }

    function cancelLocalAvatarRefresh() {
        if (!refreshingLocalFavorites.value) {
            return;
        }
        if (refreshCancelToken.value) {
            refreshCancelToken.value.cancelled = true;
            if (typeof refreshCancelToken.value.resolve === 'function') {
                refreshCancelToken.value.resolve();
            }
        }
        if (worker.value) {
            workerTimers.clearTimeout(worker.value);
            worker.value = null;
        }
        refreshingLocalFavorites.value = false;
    }

    onBeforeUnmount(() => {
        cancelLocalAvatarRefresh();
    });
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
        
        // Dark theme scrollbar
        .dark &::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 10px;
        }
        
        .dark &::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            border: 2px solid transparent;
            background-clip: padding-box;
            
            &:hover {
                background: rgba(255, 255, 255, 0.15);
                background-clip: padding-box;
            }
        }

        // Light theme scrollbar
        html:not(.dark) &::-webkit-scrollbar-track {
            background: #f5f5f5;
            border-radius: 10px;
        }
        
        html:not(.dark) &::-webkit-scrollbar-thumb {
            background: #d0d0d0;
            border-radius: 10px;
            border: 2px solid transparent;
            background-clip: padding-box;
            
            &:hover {
                background: #b0b0b0;
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
        border-radius: 12px;
        flex-wrap: wrap;
    }

    // Dark theme toolbar
    .dark .tab-toolbar {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
    }

    // Light theme toolbar
    html:not(.dark) .tab-toolbar {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
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
        flex-wrap: wrap;
    }

    .sort-label {
        font-size: 13px;
        font-weight: 500;
    }

    // Dark theme sort label
    .dark .sort-label {
        color: rgba(255, 255, 255, 0.75);
    }

    // Light theme sort label
    html:not(.dark) .sort-label {
        color: #666666;
    }

    // Dark theme radio group
    .dark .sort-radio-group {
        :deep(.el-radio) {
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
    }

    // Light theme radio group
    html:not(.dark) .sort-radio-group {
        :deep(.el-radio) {
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

    // Dark theme search input
    .dark .search-input {
        width: 220px;
        
        :deep(.el-input__wrapper) {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            
            &:hover {
                background: rgba(255, 255, 255, 0.07);
                border-color: rgba(255, 255, 255, 0.15);
            }
            
            &.is-focus {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.2);
            }
        }
        
        :deep(.el-input__inner) {
            color: rgba(255, 255, 255, 0.9);
            font-size: 13px;
            
            &::placeholder {
                color: rgba(255, 255, 255, 0.4);
            }
        }
        
        :deep(.el-input__prefix) {
            color: rgba(255, 255, 255, 0.5);
        }
    }

    // Light theme search input
    html:not(.dark) .search-input {
        width: 220px;
        
        :deep(.el-input__wrapper) {
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            
            &:hover {
                background: #f5f5f5;
                border-color: #d0d0d0;
            }
            
            &.is-focus {
                background: #ffffff;
                border-color: #409eff;
            }
        }
        
        :deep(.el-input__inner) {
            color: #333333;
            font-size: 13px;
            
            &::placeholder {
                color: #999999;
            }
        }
        
        :deep(.el-input__prefix) {
            color: #999999;
        }
    }

    .search-results-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .search-results-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 12px;
    }

    .search-result-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    // Dark theme search result card
    .dark .search-result-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        
        &:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.12);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }
    }

    // Light theme search result card
    html:not(.dark) .search-result-card {
        background: #ffffff;
        border: 1px solid #e0e0e0;
        
        &:hover {
            background: #f5f5f5;
            border-color: #d0d0d0;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }
    }

    .result-avatar {
        flex-shrink: 0;
        width: 48px;
        height: 48px;
        border-radius: 10px;
        overflow: hidden;
        border: 2px solid;
        
        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    // Dark theme result avatar
    .dark .result-avatar {
        border-color: rgba(255, 255, 255, 0.1);
    }

    // Light theme result avatar
    html:not(.dark) .result-avatar {
        border-color: #e0e0e0;
    }

    .result-content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .result-name {
        font-size: 14px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    // Dark theme result name
    .dark .result-name {
        color: rgba(255, 255, 255, 0.9);
    }

    // Light theme result name
    html:not(.dark) .result-name {
        color: #333333;
    }

    .result-meta {
        font-size: 12px;
    }

    // Dark theme result meta
    .dark .result-meta {
        color: rgba(255, 255, 255, 0.6);
    }

    // Light theme result meta
    html:not(.dark) .result-meta {
        color: #999999;
    }

    .favorites-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
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

    .section-actions {
        display: flex;
        align-items: center;
        gap: 8px;
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
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
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
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
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
