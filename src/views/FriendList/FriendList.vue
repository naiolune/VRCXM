<template>
    <div class="x-container friends-list-container">
        <div class="friends-list-header">
            <div class="header-top">
                <h1 class="page-title">{{ t('view.friend_list.header') }}</h1>
                <div class="header-actions">
                    <div v-if="friendsListBulkUnfriendMode" class="bulk-action-btn">
                        <el-button size="small" @click="showBulkUnfriendSelectionConfirm">
                            {{ t('view.friend_list.bulk_unfriend_selection') }}
                        </el-button>
                    </div>
                    <div class="bulk-unfriend-toggle">
                        <span class="toggle-label">{{ t('view.friend_list.bulk_unfriend') }}</span>
                        <el-switch
                            v-model="friendsListBulkUnfriendMode"
                            @change="toggleFriendsListBulkUnfriendMode"></el-switch>
                    </div>
                    <div class="load-section">
                        <span class="load-label">{{ t('view.friend_list.load') }}</span>
                        <template v-if="friendsListLoading">
                            <span class="load-progress" v-text="friendsListLoadingProgress"></span>
                            <el-tooltip placement="top" :content="t('view.friend_list.cancel_tooltip')">
                                <el-button
                                    size="small"
                                    :icon="Loading"
                                    circle
                                    class="load-button"
                                    @click="friendsListLoading = false"></el-button>
                            </el-tooltip>
                        </template>
                        <template v-else>
                            <el-tooltip placement="top" :content="t('view.friend_list.load_tooltip')">
                                <el-button
                                    size="small"
                                    :icon="RefreshLeft"
                                    circle
                                    class="load-button"
                                    @click="friendsListLoadUsers"></el-button>
                            </el-tooltip>
                        </template>
                    </div>
                </div>
            </div>

            <div class="search-filters-bar">
                <div class="favorites-toggle">
                    <el-tooltip placement="bottom" :content="t('view.friend_list.favorites_only_tooltip')">
                        <el-switch
                            v-model="friendsListSearchFilterVIP"
                            @change="friendsListSearchChange"></el-switch>
                    </el-tooltip>
                </div>
                <el-input
                    v-model="friendsListSearch"
                    :placeholder="t('view.friend_list.search_placeholder')"
                    clearable
                    class="search-input"
                    @change="friendsListSearchChange">
                    <template #prefix>
                        <el-icon><Search /></el-icon>
                    </template>
                </el-input>
                <el-select
                    v-model="friendsListSearchFilters"
                    multiple
                    clearable
                    collapse-tags
                    class="filter-select"
                    :placeholder="t('view.friend_list.filter_placeholder')"
                    @change="friendsListSearchChange">
                    <el-option
                        v-for="type in ['Display Name', 'User Name', 'Rank', 'Status', 'Bio', 'Note', 'Memo']"
                        :key="type"
                        :label="type"
                        :value="type"></el-option>
                </el-select>
                <el-tooltip placement="top" :content="t('view.friend_list.refresh_tooltip')">
                    <el-button
                        type="default"
                        :icon="Refresh"
                        circle
                        class="refresh-button"
                        @click="friendsListSearchChange"></el-button>
                </el-tooltip>
            </div>
        </div>
        <DataTable
            v-loading="friendsListLoading"
            v-bind="friendsListTable"
            :table-props="{ height: '100%', size: 'small' }"
            class="friends-list-table"
            @row-click="selectFriendsListRow">
                <el-table-column
                    v-if="friendsListBulkUnfriendMode"
                    :key="friendsListBulkUnfriendForceUpdate"
                    width="55"
                    prop="$selected">
                    <template #default="{ row }">
                        <el-button type="text" size="small" @click.stop>
                            <el-checkbox
                                v-model="row.$selected"
                                @change="friendsListBulkUnfriendForceUpdate++"></el-checkbox>
                        </el-button>
                    </template>
                </el-table-column>
                <el-table-column :label="t('table.friendList.no')" width="70" prop="$friendNumber" :sortable="true">
                    <template #default="{ row }">
                        <span>{{ row.$friendNumber ? row.$friendNumber : '' }}</span>
                    </template>
                </el-table-column>
                <el-table-column :label="t('table.friendList.avatar')" width="70" prop="photo">
                    <template #default="{ row }">
                        <el-popover placement="right" :width="500" trigger="hover">
                            <template #reference>
                                <img :src="userImage(row, true)" class="friends-list-avatar" loading="lazy" />
                            </template>
                            <img
                                :src="userImageFull(row)"
                                :class="['friends-list-avatar', 'x-popover-image']"
                                style="cursor: pointer"
                                @click="showFullscreenImageDialog(userImageFull(row))"
                                loading="lazy" />
                        </el-popover>
                    </template>
                </el-table-column>
                <el-table-column
                    :label="t('table.friendList.displayName')"
                    min-width="140"
                    prop="displayName"
                    sortable
                    :sort-method="(a, b) => sortAlphabetically(a, b, 'displayName')">
                    <template #default="{ row }">
                        <span :style="{ color: randomUserColours ? row.$userColour : undefined }" class="name">{{
                            row.displayName
                        }}</span>
                    </template>
                </el-table-column>
                <el-table-column :label="t('table.friendList.rank')" width="110" prop="$trustSortNum" :sortable="true">
                    <template #default="{ row }">
                        <span
                            v-if="randomUserColours"
                            :class="row.$trustClass"
                            class="name"
                            v-text="row.$trustLevel"></span>
                        <span v-else class="name" :style="{ color: row.$userColour }" v-text="row.$trustLevel"></span>
                    </template>
                </el-table-column>
                <el-table-column
                    :label="t('table.friendList.status')"
                    min-width="180"
                    prop="status"
                    sortable
                    :sort-method="(a, b) => sortStatus(a.status, b.status)">
                    <template #default="{ row }">
                        <i
                            v-if="row.status !== 'offline'"
                            :class="statusClass(row.status)"
                            style="margin-right: 3px"
                            class="x-user-status"></i>
                        <span v-text="row.statusDescription"></span>
                    </template>
                </el-table-column>
                <el-table-column
                    :label="t('table.friendList.language')"
                    width="110"
                    prop="$languages"
                    sortable
                    :sort-method="(a, b) => sortLanguages(a, b)">
                    <template #default="{ row }">
                        <el-tooltip v-for="item in row.$languages" :key="item.key" placement="top">
                            <template #content>
                                <span>{{ item.value }} ({{ item.key }})</span>
                            </template>
                            <span
                                :class="languageClass(item.key)"
                                style="display: inline-block; margin-right: 5px"
                                class="flags"></span>
                        </el-tooltip>
                    </template>
                </el-table-column>
                <el-table-column :label="t('table.friendList.bioLink')" width="100" prop="bioLinks">
                    <template #default="{ row }">
                        <el-tooltip v-for="(link, index) in row.bioLinks.filter(Boolean)" :key="index">
                            <template #content>
                                <span v-text="link"></span>
                            </template>
                            <img
                                :src="getFaviconUrl(link)"
                                style="
                                    width: 16px;
                                    height: 16px;
                                    vertical-align: middle;
                                    margin-right: 5px;
                                    cursor: pointer;
                                "
                                @click.stop="openExternalLink(link)"
                                loading="lazy" />
                        </el-tooltip>
                    </template>
                </el-table-column>
                <el-table-column
                    :label="t('table.friendList.joinCount')"
                    width="120"
                    prop="$joinCount"
                    sortable></el-table-column>
                <el-table-column :label="t('table.friendList.timeTogether')" width="140" prop="$timeSpent" sortable>
                    <template #default="{ row }">
                        <span v-if="row.$timeSpent">{{ timeToText(row.$timeSpent) }}</span>
                    </template>
                </el-table-column>
                <el-table-column
                    :label="t('table.friendList.lastSeen')"
                    width="170"
                    prop="$lastSeen"
                    sortable
                    :sort-method="(a, b) => sortAlphabetically(a, b, '$lastSeen')">
                    <template #default="{ row }">
                        <span>{{ formatDateFilter(row.$lastSeen, 'long') }}</span>
                    </template>
                </el-table-column>
                <el-table-column
                    :label="t('table.friendList.lastActivity')"
                    width="170"
                    prop="last_activity"
                    sortable
                    :sort-method="(a, b) => sortAlphabetically(a, b, 'last_activity')">
                    <template #default="{ row }">
                        <span>{{ formatDateFilter(row.last_activity, 'long') }}</span>
                    </template>
                </el-table-column>
                <el-table-column
                    :label="t('table.friendList.lastLogin')"
                    width="170"
                    prop="last_login"
                    sortable
                    :sort-method="(a, b) => sortAlphabetically(a, b, 'last_login')">
                    <template #default="{ row }">
                        <span>{{ formatDateFilter(row.last_login, 'long') }}</span>
                    </template>
                </el-table-column>
                <el-table-column
                    :label="t('table.friendList.dateJoined')"
                    width="120"
                    prop="date_joined"
                    sortable
                    :sort-method="(a, b) => sortAlphabetically(a, b, 'date_joined')"></el-table-column>
                <el-table-column :label="t('table.friendList.unfriend')" width="100" align="center">
                    <template #default="{ row }">
                        <el-button
                            type="text"
                            :icon="Close"
                            style="color: #f56c6c"
                            size="small"
                            @click.stop="confirmDeleteFriend(row.id)"></el-button>
                    </template>
                </el-table-column>
        </DataTable>
    </div>
</template>

<script setup>
    import { Close, Loading, Refresh, RefreshLeft, Search } from '@element-plus/icons-vue';
    import { nextTick, reactive, ref, watch } from 'vue';
    import { ElMessageBox } from 'element-plus';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';
    import { useRoute } from 'vue-router';

    import {
        formatDateFilter,
        getFaviconUrl,
        languageClass,
        localeIncludes,
        openExternalLink,
        sortStatus,
        statusClass,
        timeToText,
        userImage,
        userImageFull
    } from '../../shared/utils';
    import {
        useAppearanceSettingsStore,
        useFriendStore,
        useGalleryStore,
        useSearchStore,
        useUserStore
    } from '../../stores';
    import { friendRequest, userRequest } from '../../api';
    import removeConfusables, { removeWhitespace } from '../../service/confusables';

    const { t } = useI18n();

    const emit = defineEmits(['lookup-user']);

    const { friends } = storeToRefs(useFriendStore());
    const { getAllUserStats, confirmDeleteFriend, handleFriendDelete } = useFriendStore();
    const { randomUserColours } = storeToRefs(useAppearanceSettingsStore());
    const { showUserDialog } = useUserStore();
    const { stringComparer, friendsListSearch } = storeToRefs(useSearchStore());
    const { showFullscreenImageDialog } = useGalleryStore();

    const friendsListSearchFilters = ref([]);
    const friendsListTable = reactive({
        data: [],
        tableProps: { stripe: true, size: 'small', defaultSort: { prop: '$friendNumber', order: 'descending' } },
        pageSize: 100,
        paginationProps: { small: true, layout: 'sizes,prev,pager,next,total', pageSizes: [50, 100, 250, 500] }
    });
    const friendsListBulkUnfriendMode = ref(false);
    const friendsListLoading = ref(false);
    const friendsListLoadingProgress = ref('');
    const friendsListSearchFilterVIP = ref(false);
    const friendsListBulkUnfriendForceUpdate = ref(0);

    const route = useRoute();

    watch(
        () => route.path,
        () => {
            nextTick(() => friendsListSearchChange());
        },
        { immediate: true }
    );

    function friendsListSearchChange() {
        friendsListLoading.value = true;
        let query = '';
        let cleanedQuery = '';
        friendsListTable.data = [];
        let filters = friendsListSearchFilters.value.length
            ? [...friendsListSearchFilters.value]
            : ['Display Name', 'Rank', 'Status', 'Bio', 'Note', 'Memo'];
        const results = [];
        if (friendsListSearch.value) {
            query = friendsListSearch.value;
            cleanedQuery = removeWhitespace(query);
        }
        for (const ctx of friends.value.values()) {
            if (!ctx.ref) continue;
            ctx.ref.$selected = ctx.ref.$selected ?? false;
            if (friendsListSearchFilterVIP.value && !ctx.isVIP) continue;
            if (query) {
                let match = false;
                if (!match && filters.includes('Display Name') && ctx.ref.displayName) {
                    match =
                        localeIncludes(ctx.ref.displayName, cleanedQuery, stringComparer.value) ||
                        localeIncludes(removeConfusables(ctx.ref.displayName), cleanedQuery, stringComparer.value);
                }
                if (!match && filters.includes('Memo') && ctx.memo) {
                    match = localeIncludes(ctx.memo, query, stringComparer.value);
                }
                if (!match && filters.includes('Note') && ctx.ref.note) {
                    match = localeIncludes(ctx.ref.note, query, stringComparer.value);
                }
                if (!match && filters.includes('Bio') && ctx.ref.bio) {
                    match = localeIncludes(ctx.ref.bio, query, stringComparer.value);
                }
                if (!match && filters.includes('Status') && ctx.ref.statusDescription) {
                    match = localeIncludes(ctx.ref.statusDescription, query, stringComparer.value);
                }
                if (!match && filters.includes('Rank')) {
                    match = String(ctx.ref.$trustLevel).toUpperCase().includes(query.toUpperCase());
                }
                if (!match) continue;
            }
            results.push(ctx.ref);
        }
        getAllUserStats();
        nextTick(() => {
            friendsListTable.data = results;
            friendsListLoading.value = false;
        });
    }

    function toggleFriendsListBulkUnfriendMode() {
        if (!friendsListBulkUnfriendMode.value) {
            friendsListTable.data.forEach((item) => (item.$selected = false));
        }
    }

    function showBulkUnfriendSelectionConfirm() {
        const pending = friendsListTable.data.filter((item) => item.$selected).map((item) => item.displayName);
        if (!pending.length) return;
        ElMessageBox.confirm(
            `Are you sure you want to delete ${pending.length} friends?
            This can negatively affect your trust rank,
            This action cannot be undone.`,
            `Delete ${pending.length} friends?`,
            {
                confirmButtonText: 'Confirm',
                cancelButtonText: 'Cancel',
                type: 'info',
                showInput: true,
                inputType: 'textarea',
                inputValue: pending.join('\r\n')
            }
        )
            .then(({ action }) => {
                if (action === 'confirm') {
                    bulkUnfriendSelection();
                }
            })
            .catch(() => {});
    }

    function bulkUnfriendSelection() {
        friendsListTable.data.forEach((item) => {
            if (item.$selected) {
                console.log(`Unfriending ${item.displayName} (${item.id})`);
                friendRequest.deleteFriend({ userId: item.id }).then((args) => handleFriendDelete(args));
            }
        });
    }

    async function friendsListLoadUsers() {
        friendsListLoading.value = true;
        let i = 0;
        const toFetch = Array.from(friends.value.values())
            .filter((ctx) => ctx.ref && !ctx.ref.date_joined)
            .map((ctx) => ctx.id);
        const total = toFetch.length;
        for (const userId of toFetch) {
            if (!friendsListLoading.value) {
                friendsListLoadingProgress.value = '';
                return;
            }
            i++;
            friendsListLoadingProgress.value = `${i}/${total}`;
            try {
                await userRequest.getUser({ userId });
            } catch (err) {
                console.error(err);
            }
        }
        friendsListLoadingProgress.value = '';
        friendsListLoading.value = false;
    }

    function selectFriendsListRow(val) {
        if (!val) return;
        if (!val.id) emit('lookup-user', val);
        else showUserDialog(val.id);
    }

    function sortAlphabetically(a, b, field) {
        if (!a[field] || !b[field]) return 0;
        return a[field].toLowerCase().localeCompare(b[field].toLowerCase());
    }

    function sortLanguages(a, b) {
        const as = a.$languages.map((i) => i.value).sort();
        const bs = b.$languages.map((i) => i.value).sort();
        return JSON.stringify(as).localeCompare(JSON.stringify(bs));
    }
</script>

<style scoped lang="scss">
    .friends-list-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        height: 100%;
        overflow: hidden;
        width: 100%;
        max-width: 100%;
    }
    
    .friends-list-header {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 20px 24px;
        border-radius: 16px;
    }

    // Dark theme header
    .dark .friends-list-header {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    // Light theme header
    html:not(.dark) .friends-list-header {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }
    
    .header-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
    }
    
    .page-title {
        font-weight: 600;
        font-size: 24px;
        margin: 0;
        line-height: 1.2;
    }

    // Dark theme title
    .dark .page-title {
        color: rgba(255, 255, 255, 0.95);
    }

    // Light theme title
    html:not(.dark) .page-title {
        color: #333333;
    }
    
    .header-actions {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
    }
    
    .bulk-action-btn {
        margin-right: 0;
    }
    
    .bulk-unfriend-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-radius: 10px;
    }

    // Dark theme bulk unfriend toggle
    .dark .bulk-unfriend-toggle {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    // Light theme bulk unfriend toggle
    html:not(.dark) .bulk-unfriend-toggle {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
    }
    
    .toggle-label {
        font-size: 13px;
        font-weight: 500;
    }

    // Dark theme toggle label
    .dark .toggle-label {
        color: rgba(255, 255, 255, 0.8);
    }

    // Light theme toggle label
    html:not(.dark) .toggle-label {
        color: #666666;
    }
    
    .load-section {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-radius: 10px;
    }

    // Dark theme load section
    .dark .load-section {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    // Light theme load section
    html:not(.dark) .load-section {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
    }
    
    .load-label {
        font-size: 13px;
        font-weight: 500;
    }

    // Dark theme load label
    .dark .load-label {
        color: rgba(255, 255, 255, 0.8);
    }

    // Light theme load label
    html:not(.dark) .load-label {
        color: #666666;
    }
    
    .load-progress {
        font-size: 12px;
        font-weight: 500;
    }

    // Dark theme load progress
    .dark .load-progress {
        color: rgba(255, 255, 255, 0.7);
    }

    // Light theme load progress
    html:not(.dark) .load-progress {
        color: #999999;
    }
    
    .load-button {
        width: 28px;
        height: 28px;
        min-width: 28px;
        padding: 0;
    }
    
    .search-filters-bar {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .favorites-toggle {
        flex-shrink: 0;
    }
    
    .search-input {
        flex: 1;
        min-width: 0;
        
        :deep(.el-input__wrapper) {
            padding-left: 12px;
        }
        
        // Dark theme input prefix
        .dark :deep(.el-input__prefix) {
            color: rgba(255, 255, 255, 0.5);
        }

        // Light theme input prefix
        html:not(.dark) :deep(.el-input__prefix) {
            color: #999999;
        }
    }
    
    .filter-select {
        flex: 0 0 200px;
        min-width: 0;
    }
    
    .refresh-button {
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        min-width: 36px;
        padding: 0;
    }
    
    .friends-list-table {
        flex: 1;
        min-height: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        height: 0; // Force flexbox to constrain height
        width: 100%;
        max-width: 100%;
        
        :deep(.data-table-wrapper) {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            height: 100%;
            width: 100%;
            max-width: 100%;
        }
        
        :deep(.el-table) {
            display: flex;
            flex-direction: column;
            height: 100%;
            max-height: 100%;
            width: 100% !important;
            max-width: 100% !important;
        }
        
        :deep(.el-table__header-wrapper) {
            flex-shrink: 0;
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
        }
        
        :deep(.el-table__body-wrapper) {
            flex: 1;
            min-height: 0;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            max-height: 100%;
            width: 100%;
            max-width: 100%;
        }
        
        :deep(.el-table__header),
        :deep(.el-table__body) {
            width: 100% !important;
            max-width: 100% !important;
        }
        
        :deep(.el-table__cell) {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        :deep(.pagination-wrapper) {
            flex-shrink: 0;
            width: 100%;
            max-width: 100%;
        }
        
        // Dark theme avatar
        .dark :deep(.friends-list-avatar) {
            border: 2px solid rgba(255, 255, 255, 0.1);
            
            &:hover {
                border-color: rgba(255, 255, 255, 0.2);
            }
        }

        // Light theme avatar
        html:not(.dark) :deep(.friends-list-avatar) {
            border: 2px solid #e0e0e0;
            
            &:hover {
                border-color: #d0d0d0;
            }
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
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
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
            box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
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
        
        &.el-button--small {
            border-radius: 8px;
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
        
        &.el-button--small {
            border-radius: 8px;
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