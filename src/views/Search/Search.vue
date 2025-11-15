<template>
    <div class="search-page">
        <div class="search-page-header">
            <div class="search-bar-container">
                <div class="search-bar">
                    <i class="ri-search-line search-icon"></i>
                    <el-input
                        :model-value="searchText"
                        :placeholder="t('view.search.search_placeholder')"
                        class="search-input-field"
                        @input="updateSearchText"
                        @keyup.enter="search">
                    </el-input>
                    <el-tooltip placement="bottom" :content="t('view.search.clear_results_tooltip')">
                        <el-button
                            type="default"
                            :icon="Delete"
                            circle
                            class="search-clear-btn"
                            @click="handleClearSearch"></el-button>
                    </el-tooltip>
                </div>
            </div>
            
            <div class="search-tabs-container">
                <div 
                    v-for="(tab, index) in tabs" 
                    :key="index"
                    :class="['search-tab', { 'is-active': activeTabIndex === index }]"
                    @click="switchTab(index)">
                    <i :class="tab.icon"></i>
                    <span>{{ tab.label }}</span>
                </div>
            </div>
        </div>

        <div class="search-content">
            <!-- User Tab -->
            <div v-show="activeTabIndex === 0" class="search-tab-content">
                <div class="tab-filters">
                    <el-checkbox v-model="searchUserByBio" class="filter-checkbox">{{
                        t('view.search.user.search_by_bio')
                    }}</el-checkbox>
                    <el-checkbox v-model="searchUserSortByLastLoggedIn" class="filter-checkbox">{{
                        t('view.search.user.sort_by_last_logged_in')
                    }}</el-checkbox>
                </div>
                <div v-loading="isSearchUserLoading" class="tab-results">
                    <div class="search-results-grid" v-if="searchUserResults.length">
                        <div
                            v-for="user in searchUserResults"
                            :key="user.id"
                            class="search-result-card"
                            @click="showUserDialog(user.id)">
                            <div class="result-card-avatar">
                                <img :src="userImage(user, true)" loading="lazy" />
                            </div>
                            <div class="result-card-content">
                                <div class="result-card-name" v-text="user.displayName"></div>
                                <div class="result-card-meta">
                                    <span
                                        v-if="randomUserColours"
                                        class="result-card-tag"
                                        :class="user.$trustClass"
                                        v-text="user.$trustLevel"></span>
                                    <span
                                        v-else
                                        class="result-card-tag"
                                        :style="{ color: user.$userColour }"
                                        v-text="user.$trustLevel"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="search-empty-state">
                        <i class="ri-user-search-line"></i>
                        <p>No users found</p>
                    </div>
                </div>
                <div v-if="searchUserResults.length" class="pagination-controls">
                    <el-button-group>
                        <el-button
                            :disabled="!searchUserParams.offset"
                            :icon="Back"
                            size="small"
                            @click="handleMoreSearchUser(-1)"
                            >{{ t('view.search.prev_page') }}</el-button
                        >
                        <el-button
                            :disabled="searchUserResults.length < 10"
                            :icon="Right"
                            size="small"
                            @click="handleMoreSearchUser(1)"
                            >{{ t('view.search.next_page') }}</el-button
                        >
                    </el-button-group>
                </div>
            </div>

            <!-- World Tab -->
            <div v-show="activeTabIndex === 1" class="search-tab-content">
                <div class="tab-filters">
                    <el-dropdown
                        size="small"
                        trigger="click"
                        @command="(row) => searchWorld(row)">
                        <el-button size="small" class="filter-button"
                            >{{ t('view.search.world.category') }} <el-icon class="el-icon--right"><ArrowDown /></el-icon
                        ></el-button>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item
                                    v-for="row in cachedConfig.dynamicWorldRows"
                                    :key="row.index"
                                    :command="row"
                                    v-text="row.name"></el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                    <el-checkbox v-model="searchWorldLabs" class="filter-checkbox">{{
                        t('view.search.world.community_lab')
                    }}</el-checkbox>
                </div>
                <div v-loading="isSearchWorldLoading" class="tab-results">
                    <div class="search-results-grid" v-if="searchWorldResults.length">
                        <div
                            v-for="world in searchWorldResults"
                            :key="world.id"
                            class="search-result-card"
                            @click="showWorldDialog(world.id)">
                            <div class="result-card-avatar">
                                <img :src="world.thumbnailImageUrl" loading="lazy" />
                            </div>
                            <div class="result-card-content">
                                <div class="result-card-name" v-text="world.name"></div>
                                <div class="result-card-meta">
                                    <span class="result-card-tag">{{ world.authorName }}</span>
                                    <span v-if="world.occupants" class="result-card-badge">{{ world.occupants }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="search-empty-state">
                        <i class="ri-global-line"></i>
                        <p>No worlds found</p>
                    </div>
                </div>
                <div v-if="searchWorldResults.length" class="pagination-controls">
                    <el-button-group>
                        <el-button
                            :disabled="!searchWorldParams.offset"
                            :icon="Back"
                            size="small"
                            @click="moreSearchWorld(-1)"
                            >{{ t('view.search.prev_page') }}</el-button
                        >
                        <el-button
                            :disabled="searchWorldResults.length < 10"
                            :icon="Right"
                            size="small"
                            @click="moreSearchWorld(1)"
                            >{{ t('view.search.next_page') }}</el-button
                        >
                    </el-button-group>
                </div>
            </div>

            <!-- Avatar Tab -->
            <div v-show="activeTabIndex === 2" class="search-tab-content">
                <div class="tab-filters tab-filters-avatar">
                    <div class="filters-row">
                        <div class="filters-left">
                            <el-dropdown
                                v-if="avatarRemoteDatabaseProviderList.length > 1"
                                trigger="click"
                                size="small"
                                @click.stop>
                                <el-button size="small" class="filter-button"
                                    >{{ t('view.search.avatar.search_provider') }}
                                    <el-icon class="el-icon--right"><ArrowDown /></el-icon
                                ></el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item
                                            v-for="provider in avatarRemoteDatabaseProviderList"
                                            :key="provider"
                                            @click="setAvatarProvider(provider)">
                                            <el-icon v-if="provider === avatarRemoteDatabaseProvider" class="el-icon--left"
                                                ><Check
                                            /></el-icon>
                                            {{ provider }}
                                        </el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                            <el-tooltip placement="bottom" :content="t('view.search.avatar.refresh_tooltip')">
                                <el-button
                                    type="default"
                                    :loading="userDialog.isAvatarsLoading"
                                    size="small"
                                    :icon="Refresh"
                                    circle
                                    class="filter-button"
                                    @click="refreshUserDialogAvatars"></el-button>
                            </el-tooltip>
                            <span class="result-count">{{
                                t('view.search.avatar.result_count', {
                                    count: searchAvatarResults.length
                                })
                            }}</span>
                        </div>
                        <div class="filters-right">
                            <el-radio-group
                                v-model="searchAvatarFilter"
                                size="small"
                                class="filter-radio-group"
                                @change="searchAvatar">
                                <el-radio label="all">{{ t('view.search.avatar.all') }}</el-radio>
                                <el-radio label="public">{{ t('view.search.avatar.public') }}</el-radio>
                                <el-radio label="private">{{ t('view.search.avatar.private') }}</el-radio>
                            </el-radio-group>
                            <el-divider direction="vertical" class="filter-divider"></el-divider>
                            <el-radio-group
                                v-model="searchAvatarFilterRemote"
                                size="small"
                                class="filter-radio-group"
                                @change="searchAvatar">
                                <el-radio label="all">{{ t('view.search.avatar.all') }}</el-radio>
                                <el-radio label="local">{{ t('view.search.avatar.local') }}</el-radio>
                                <el-radio label="remote" :disabled="!avatarRemoteDatabase">{{
                                    t('view.search.avatar.remote')
                                }}</el-radio>
                            </el-radio-group>
                        </div>
                    </div>
                    <div class="filters-row filters-row-bottom">
                        <el-radio-group
                            v-model="searchAvatarSort"
                            :disabled="searchAvatarFilterRemote !== 'local'"
                            size="small"
                            class="filter-radio-group"
                            @change="searchAvatar">
                            <el-radio label="name">{{ t('view.search.avatar.sort_name') }}</el-radio>
                            <el-radio label="update">{{ t('view.search.avatar.sort_update') }}</el-radio>
                            <el-radio label="created">{{ t('view.search.avatar.sort_created') }}</el-radio>
                        </el-radio-group>
                    </div>
                </div>
                <div v-loading="isSearchAvatarLoading" class="tab-results">
                    <div class="search-results-grid" v-if="searchAvatarPage.length">
                        <div
                            v-for="avatar in searchAvatarPage"
                            :key="avatar.id"
                            class="search-result-card"
                            @click="showAvatarDialog(avatar.id)">
                            <div class="result-card-avatar">
                                <img v-if="avatar.thumbnailImageUrl" :src="avatar.thumbnailImageUrl" loading="lazy" />
                                <img v-else-if="avatar.imageUrl" :src="avatar.imageUrl" loading="lazy" />
                            </div>
                            <div class="result-card-content">
                                <div class="result-card-name" v-text="avatar.name"></div>
                                <div class="result-card-meta">
                                    <span
                                        v-if="avatar.releaseStatus === 'public'"
                                        class="result-card-tag result-card-tag--success"
                                        v-text="avatar.releaseStatus"></span>
                                    <span
                                        v-else-if="avatar.releaseStatus === 'private'"
                                        class="result-card-tag result-card-tag--danger"
                                        v-text="avatar.releaseStatus"></span>
                                    <span v-else class="result-card-tag" v-text="avatar.releaseStatus"></span>
                                    <span class="result-card-author" v-text="avatar.authorName"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="search-empty-state">
                        <i class="ri-user-avatar-line"></i>
                        <p>No avatars found</p>
                    </div>
                </div>
                <div v-if="searchAvatarPage.length" class="pagination-controls">
                    <el-button-group>
                        <el-button
                            :disabled="!searchAvatarPageNum"
                            :icon="Back"
                            size="small"
                            @click="moreSearchAvatar(-1)"
                            >{{ t('view.search.prev_page') }}</el-button
                        >
                        <el-button
                            :disabled="
                                searchAvatarResults.length < 10 ||
                                (searchAvatarPageNum + 1) * 10 >= searchAvatarResults.length
                            "
                            :icon="Right"
                            size="small"
                            @click="moreSearchAvatar(1)"
                            >{{ t('view.search.next_page') }}</el-button
                        >
                    </el-button-group>
                </div>
            </div>

            <!-- Group Tab -->
            <div v-show="activeTabIndex === 3" class="search-tab-content">
                <div v-loading="isSearchGroupLoading" class="tab-results">
                    <div class="search-results-grid" v-if="searchGroupResults.length">
                        <div
                            v-for="group in searchGroupResults"
                            :key="group.id"
                            class="search-result-card"
                            @click="showGroupDialog(group.id)">
                            <div class="result-card-avatar">
                                <img :src="getSmallThumbnailUrl(group.iconUrl)" loading="lazy" />
                            </div>
                            <div class="result-card-content">
                                <div class="result-card-name">
                                    <span v-text="group.name"></span>
                                    <span class="result-card-count">({{ group.memberCount }})</span>
                                </div>
                                <div class="result-card-meta">
                                    <span class="result-card-code">{{ group.shortCode }}.{{ group.discriminator }}</span>
                                    <span class="result-card-description" v-text="group.description"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="search-empty-state">
                        <i class="ri-group-line"></i>
                        <p>No groups found</p>
                    </div>
                </div>
                <div v-if="searchGroupResults.length" class="pagination-controls">
                    <el-button-group>
                        <el-button
                            :disabled="!searchGroupParams.offset"
                            :icon="Back"
                            size="small"
                            @click="moreSearchGroup(-1)"
                            >{{ t('view.search.prev_page') }}</el-button
                        >
                        <el-button
                            :disabled="searchGroupResults.length < 10"
                            :icon="Right"
                            size="small"
                            @click="moreSearchGroup(1)"
                            >{{ t('view.search.next_page') }}</el-button
                        >
                    </el-button-group>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ArrowDown, Back, Check, Delete, Refresh, Right } from '@element-plus/icons-vue';
    import { ref } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import {
        useAdvancedSettingsStore,
        useAppearanceSettingsStore,
        useAuthStore,
        useAvatarProviderStore,
        useAvatarStore,
        useGroupStore,
        useSearchStore,
        useUserStore,
        useWorldStore
    } from '../../stores';
    import {
        compareByCreatedAt,
        compareByName,
        compareByUpdatedAt,
        convertFileUrlToImageUrl,
        replaceBioSymbols,
        userImage
    } from '../../shared/utils';
    import { groupRequest, worldRequest } from '../../api';

    const { randomUserColours } = storeToRefs(useAppearanceSettingsStore());
    const { avatarRemoteDatabase } = storeToRefs(useAdvancedSettingsStore());
    const { avatarRemoteDatabaseProviderList, avatarRemoteDatabaseProvider } = storeToRefs(useAvatarProviderStore());
    const { setAvatarProvider } = useAvatarProviderStore();
    const { userDialog } = storeToRefs(useUserStore());
    const { showUserDialog, refreshUserDialogAvatars } = useUserStore();
    const { showAvatarDialog, lookupAvatars, cachedAvatars } = useAvatarStore();
    const { cachedWorlds, showWorldDialog } = useWorldStore();
    const { showGroupDialog, applyGroup } = useGroupStore();
    const { searchText, searchUserResults } = storeToRefs(useSearchStore());
    const { clearSearch, moreSearchUser } = useSearchStore();
    const { cachedConfig } = storeToRefs(useAuthStore());

    const { t } = useI18n();

    const searchTabRef = ref(null);
    const activeTabIndex = ref(0);

    const tabs = [
        { label: t('view.search.user.header'), icon: 'ri-user-line' },
        { label: t('view.search.world.header'), icon: 'ri-global-line' },
        { label: t('view.search.avatar.header'), icon: 'ri-user-avatar-line' },
        { label: t('view.search.group.header'), icon: 'ri-group-line' }
    ];

    function switchTab(index) {
        activeTabIndex.value = index;
        searchText.value = '';
        // Clear results when switching tabs
        if (index === 0) {
            searchUserResults.value = [];
        } else if (index === 1) {
            searchWorldResults.value = [];
        } else if (index === 2) {
            searchAvatarResults.value = [];
        } else if (index === 3) {
            searchGroupResults.value = [];
        }
    }

    const searchUserParams = ref({});
    const searchUserByBio = ref(false);
    const searchUserSortByLastLoggedIn = ref(false);

    const isSearchUserLoading = ref(false);
    const isSearchWorldLoading = ref(false);
    const isSearchAvatarLoading = ref(false);
    const isSearchGroupLoading = ref(false);

    const searchWorldOption = ref('');
    const searchWorldLabs = ref(false);
    const searchWorldParams = ref({});
    const searchWorldResults = ref([]);

    const searchAvatarFilter = ref('');
    const searchAvatarSort = ref('');
    const searchAvatarFilterRemote = ref('');
    const searchAvatarPageNum = ref(0);
    const searchAvatarResults = ref([]);
    const searchAvatarPage = ref([]);

    const searchGroupParams = ref({});
    const searchGroupResults = ref([]);

    function getSmallThumbnailUrl(url) {
        return convertFileUrlToImageUrl(url);
    }

    function handleClearSearch() {
        searchUserParams.value = {};
        searchWorldParams.value = {};
        searchWorldResults.value = [];
        searchAvatarResults.value = [];
        searchAvatarPage.value = [];
        searchAvatarPageNum.value = 0;
        searchGroupParams.value = {};
        searchGroupResults.value = [];
        clearSearch();
    }

    function updateSearchText(text) {
        searchText.value = text;
    }

    function search() {
        switch (activeTabIndex.value) {
            case 0:
                searchUser();
                break;
            case 1:
                searchWorld({});
                break;
            case 2:
                searchAvatar();
                break;
            case 3:
                searchGroup();
                break;
        }
    }

    async function searchUser() {
        searchUserParams.value = {
            n: 10,
            offset: 0,
            search: searchText.value,
            customFields: searchUserByBio.value ? 'bio' : 'displayName',
            sort: searchUserSortByLastLoggedIn.value ? 'last_login' : 'relevance'
        };
        await handleMoreSearchUser();
    }

    async function handleMoreSearchUser(go = null) {
        isSearchUserLoading.value = true;
        await moreSearchUser(go, searchUserParams.value);
        isSearchUserLoading.value = false;
    }

    function searchWorld(ref) {
        searchWorldOption.value = '';
        const params = {
            n: 10,
            offset: 0
        };
        switch (ref.sortHeading) {
            case 'featured':
                params.sort = 'order';
                params.featured = 'true';
                break;
            case 'trending':
                params.sort = 'popularity';
                params.featured = 'false';
                break;
            case 'updated':
                params.sort = 'updated';
                break;
            case 'created':
                params.sort = 'created';
                break;
            case 'publication':
                params.sort = 'publicationDate';
                break;
            case 'shuffle':
                params.sort = 'shuffle';
                break;
            case 'active':
                searchWorldOption.value = 'active';
                break;
            case 'recent':
                searchWorldOption.value = 'recent';
                break;
            case 'favorite':
                searchWorldOption.value = 'favorites';
                break;
            case 'labs':
                params.sort = 'labsPublicationDate';
                break;
            case 'heat':
                params.sort = 'heat';
                params.featured = 'false';
                break;
            default:
                params.sort = 'relevance';
                params.search = replaceBioSymbols(searchText.value);
                break;
        }
        params.order = ref.sortOrder || 'descending';
        if (ref.sortOwnership === 'mine') {
            params.user = 'me';
            params.releaseStatus = 'all';
        }
        if (ref.tag) {
            params.tag = ref.tag;
        }
        if (!searchWorldLabs.value) {
            if (params.tag) {
                params.tag += ',system_approved';
            } else {
                params.tag = 'system_approved';
            }
        }
        // TODO: option.platform
        searchWorldParams.value = params;
        moreSearchWorld();
    }

    function moreSearchWorld(go) {
        const params = searchWorldParams.value;
        if (go) {
            params.offset += params.n * go;
            if (params.offset < 0) {
                params.offset = 0;
            }
        }
        isSearchWorldLoading.value = true;
        worldRequest
            .getWorlds(params, searchWorldOption.value)
            .finally(() => {
                isSearchWorldLoading.value = false;
            })
            .then((args) => {
                const map = new Map();
                for (const json of args.json) {
                    const ref = cachedWorlds.get(json.id);
                    if (typeof ref !== 'undefined') {
                        map.set(ref.id, ref);
                    }
                }
                searchWorldResults.value = Array.from(map.values());
                return args;
            });
    }

    async function searchAvatar() {
        let ref;
        isSearchAvatarLoading.value = true;
        if (!searchAvatarFilter.value) {
            searchAvatarFilter.value = 'all';
        }
        if (!searchAvatarSort.value) {
            searchAvatarSort.value = 'name';
        }
        if (!searchAvatarFilterRemote.value) {
            searchAvatarFilterRemote.value = 'all';
        }
        if (searchAvatarFilterRemote.value !== 'local') {
            searchAvatarSort.value = 'name';
        }
        const avatars = new Map();
        const query = searchText.value;
        const queryUpper = query.toUpperCase();
        if (!query) {
            for (ref of cachedAvatars.values()) {
                switch (searchAvatarFilter.value) {
                    case 'all':
                        avatars.set(ref.id, ref);
                        break;
                    case 'public':
                        if (ref.releaseStatus === 'public') {
                            avatars.set(ref.id, ref);
                        }
                        break;
                    case 'private':
                        if (ref.releaseStatus === 'private') {
                            avatars.set(ref.id, ref);
                        }
                        break;
                }
            }
            isSearchAvatarLoading.value = false;
        } else {
            if (searchAvatarFilterRemote.value === 'all' || searchAvatarFilterRemote.value === 'local') {
                for (ref of cachedAvatars.values()) {
                    let match = ref.name.toUpperCase().includes(queryUpper);
                    if (!match && ref.description) {
                        match = ref.description.toUpperCase().includes(queryUpper);
                    }
                    if (!match && ref.authorName) {
                        match = ref.authorName.toUpperCase().includes(queryUpper);
                    }
                    if (match) {
                        switch (searchAvatarFilter.value) {
                            case 'all':
                                avatars.set(ref.id, ref);
                                break;
                            case 'public':
                                if (ref.releaseStatus === 'public') {
                                    avatars.set(ref.id, ref);
                                }
                                break;
                            case 'private':
                                if (ref.releaseStatus === 'private') {
                                    avatars.set(ref.id, ref);
                                }
                                break;
                        }
                    }
                }
            }
            if (
                (searchAvatarFilterRemote.value === 'all' || searchAvatarFilterRemote.value === 'remote') &&
                avatarRemoteDatabase.value &&
                query.length >= 3
            ) {
                const data = await lookupAvatars('search', query);
                if (data && typeof data === 'object') {
                    data.forEach((avatar) => {
                        avatars.set(avatar.id, avatar);
                    });
                }
            }
            isSearchAvatarLoading.value = false;
        }
        const avatarsArray = Array.from(avatars.values());
        if (searchAvatarFilterRemote.value === 'local') {
            switch (searchAvatarSort.value) {
                case 'updated':
                    avatarsArray.sort(compareByUpdatedAt);
                    break;
                case 'created':
                    avatarsArray.sort(compareByCreatedAt);
                    break;
                case 'name':
                    avatarsArray.sort(compareByName);
                    break;
            }
        }
        searchAvatarPageNum.value = 0;
        searchAvatarResults.value = avatarsArray;
        searchAvatarPage.value = avatarsArray.slice(0, 10);
    }
    function moreSearchAvatar(n) {
        let offset;
        if (n === -1) {
            searchAvatarPageNum.value--;
            offset = searchAvatarPageNum.value * 10;
        }
        if (n === 1) {
            searchAvatarPageNum.value++;
            offset = searchAvatarPageNum.value * 10;
        }
        searchAvatarPage.value = searchAvatarResults.value.slice(offset, offset + 10);
    }
    async function searchGroup() {
        searchGroupParams.value = {
            n: 10,
            offset: 0,
            query: replaceBioSymbols(searchText.value)
        };
        await moreSearchGroup();
    }
    async function moreSearchGroup(go) {
        const params = searchGroupParams.value;
        if (go) {
            params.offset += params.n * go;
            if (params.offset < 0) {
                params.offset = 0;
            }
        }
        isSearchGroupLoading.value = true;
        await groupRequest
            .groupSearch(params)
            .finally(() => {
                isSearchGroupLoading.value = false;
            })
            .then((args) => {
                const map = new Map();
                for (const json of args.json) {
                    const ref = applyGroup(json);
                    map.set(ref.id, ref);
                }
                searchGroupResults.value = Array.from(map.values());
                return args;
            });
    }
</script>

<style scoped lang="scss">
    .search-page {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 32px;
        gap: 0;
    }

    // Dark theme page
    .dark .search-page {
        background: rgba(255, 255, 255, 0.04) !important;
    }

    // Light theme page
    html:not(.dark) .search-page {
        background: #ffffff !important;
    }

    .search-page-header {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-bottom: 20px;
        margin-bottom: 20px;
    }

    // Dark theme header
    .dark .search-page-header {
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    // Light theme header
    html:not(.dark) .search-page-header {
        border-bottom: 1px solid #e0e0e0;
    }

    .search-bar-container {
        width: 100%;
    }

    .search-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        border-radius: 16px;
    }

    // Dark theme search bar
    .dark .search-bar {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    }

    // Light theme search bar
    html:not(.dark) .search-bar {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .search-icon {
        font-size: 20px;
        flex-shrink: 0;
    }

    // Dark theme search icon
    .dark .search-icon {
        color: rgba(255, 255, 255, 0.5);
    }

    // Light theme search icon
    html:not(.dark) .search-icon {
        color: #999999;
    }

    .search-input-field {
        flex: 1;
        
        :deep(.el-input__wrapper) {
            background: transparent;
            border: none;
            box-shadow: none;
            padding: 0;
            
            &:hover {
                background: transparent;
            }
            
            &.is-focus {
                background: transparent;
                box-shadow: none;
            }
        }
        
        // Dark theme input inner
        .dark :deep(.el-input__inner) {
            color: rgba(255, 255, 255, 0.9);
            font-size: 15px;
            padding: 0;
            
            &::placeholder {
                color: rgba(255, 255, 255, 0.4);
            }
        }

        // Light theme input inner
        html:not(.dark) :deep(.el-input__inner) {
            color: #333333;
            font-size: 15px;
            padding: 0;
            
            &::placeholder {
                color: #999999;
            }
        }
    }

    .search-clear-btn {
        border-radius: 50% !important;
        width: 36px;
        height: 36px;
        transition: all 0.3s ease;
        flex-shrink: 0;
    }

    // Dark theme clear button
    .dark .search-clear-btn {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: rgba(255, 255, 255, 0.85) !important;
        
        &:hover {
            background: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }
    }

    // Light theme clear button
    html:not(.dark) .search-clear-btn {
        background: #f0f0f0 !important;
        border: 1px solid #e0e0e0 !important;
        color: #666666 !important;
        
        &:hover {
            background: #e0e0e0 !important;
            border-color: #d0d0d0 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
    }

    .search-tabs-container {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .search-tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 13px;
        font-weight: 500;
        position: relative;
        
        i {
            font-size: 16px;
            transition: all 0.3s ease;
        }
    }

    // Dark theme search tab
    .dark .search-tab {
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
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            
            i {
                color: rgba(255, 255, 255, 1);
            }
        }
    }

    // Light theme search tab
    html:not(.dark) .search-tab {
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
            box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
            
            i {
                color: #409eff;
            }
        }
    }

    .search-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
    }

    .search-tab-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }

    .tab-filters {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 12px;
        flex-wrap: wrap;
    }

    // Dark theme tab filters
    .dark .tab-filters {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
    }

    // Light theme tab filters
    html:not(.dark) .tab-filters {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
    }

    .tab-filters-avatar {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
    }

    .tab-results {
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }


    .filters-row {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }

    .filters-left {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .filters-right {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
    }

    .filters-row-bottom {
        justify-content: flex-end;
    }

    .filter-checkbox {
        font-size: 13px;
    }

    // Dark theme filter checkbox
    .dark .filter-checkbox {
        color: rgba(255, 255, 255, 0.75);
        
        :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.25);
        }
        
        :deep(.el-checkbox__inner) {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.15);
        }
    }

    // Light theme filter checkbox
    html:not(.dark) .filter-checkbox {
        color: #666666;
        
        :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
            background: #409eff;
            border-color: #409eff;
        }
        
        :deep(.el-checkbox__inner) {
            background: #ffffff;
            border-color: #e0e0e0;
        }
    }

    .filter-button {
        border-radius: 8px !important;
        font-size: 12px;
    }

    // Dark theme filter button
    .dark .filter-button {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: rgba(255, 255, 255, 0.85) !important;
        
        &:hover {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: rgba(255, 255, 255, 0.15) !important;
        }
    }

    // Light theme filter button
    html:not(.dark) .filter-button {
        background: #f0f0f0 !important;
        border: 1px solid #e0e0e0 !important;
        color: #666666 !important;
        
        &:hover {
            background: #e0e0e0 !important;
            border-color: #d0d0d0 !important;
        }
    }

    // Dark theme filter radio group
    .dark .filter-radio-group {
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

    // Light theme filter radio group
    html:not(.dark) .filter-radio-group {
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

    .filter-divider {
        margin: 0 8px;
    }

    // Dark theme divider
    .dark .filter-divider {
        border-color: rgba(255, 255, 255, 0.1) !important;
    }

    // Light theme divider
    html:not(.dark) .filter-divider {
        border-color: #e0e0e0 !important;
    }

    .result-count {
        font-size: 13px;
        font-weight: 500;
    }

    // Dark theme result count
    .dark .result-count {
        color: rgba(255, 255, 255, 0.6);
    }

    // Light theme result count
    html:not(.dark) .result-count {
        color: #999999;
    }

    .search-results-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
        flex: 1;
        overflow-y: auto;
        padding: 4px;
        
        // Modern scrollbar
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

    .search-result-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 16px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    // Dark theme result card
    .dark .search-result-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        
        &:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.12);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }
    }

    // Light theme result card
    html:not(.dark) .search-result-card {
        background: #ffffff;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        
        &:hover {
            background: #f5f5f5;
            border-color: #d0d0d0;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
    }

    .result-card-avatar {
        flex-shrink: 0;
        width: 56px;
        height: 56px;
        border-radius: 12px;
        overflow: hidden;
        border: 2px solid;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        
        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    // Dark theme avatar
    .dark .result-card-avatar {
        border-color: rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }

    // Light theme avatar
    html:not(.dark) .result-card-avatar {
        border-color: #e0e0e0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .result-card-content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .result-card-name {
        font-size: 15px;
        font-weight: 600;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    // Dark theme card name
    .dark .result-card-name {
        color: rgba(255, 255, 255, 0.9);
    }

    // Light theme card name
    html:not(.dark) .result-card-name {
        color: #333333;
    }

    .result-card-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .result-card-tag {
        display: inline-flex;
        align-items: center;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        text-transform: capitalize;
    }

    // Dark theme result card tag
    .dark .result-card-tag {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.7);
    }

    // Light theme result card tag
    html:not(.dark) .result-card-tag {
        background: #f0f0f0;
        border: 1px solid #e0e0e0;
        color: #666666;
    }

    // Success and danger tags use semantic colors (same for both themes)
    .result-card-tag--success {
        color: #67c23a;
        border-color: rgba(103, 194, 58, 0.3);
        background: rgba(103, 194, 58, 0.1);
    }

    .result-card-tag--danger {
        color: #f56c6c;
        border-color: rgba(245, 108, 108, 0.3);
        background: rgba(245, 108, 108, 0.1);
    }

    .result-card-badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
    }

    // Dark theme result card badge
    .dark .result-card-badge {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.6);
    }

    // Light theme result card badge
    html:not(.dark) .result-card-badge {
        background: #f0f0f0;
        border: 1px solid #e0e0e0;
        color: #666666;
    }

    .result-card-author {
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    // Dark theme card author
    .dark .result-card-author {
        color: rgba(255, 255, 255, 0.55);
    }

    // Light theme card author
    html:not(.dark) .result-card-author {
        color: #999999;
    }

    .result-card-count {
        font-size: 13px;
        font-weight: 400;
        margin-left: 4px;
    }

    // Dark theme card count
    .dark .result-card-count {
        color: rgba(255, 255, 255, 0.5);
    }

    // Light theme card count
    html:not(.dark) .result-card-count {
        color: #999999;
    }

    .result-card-code {
        font-family: 'Courier New', monospace;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
    }

    // Dark theme card code
    .dark .result-card-code {
        color: rgba(255, 255, 255, 0.45);
        background: rgba(255, 255, 255, 0.03);
    }

    // Light theme card code
    html:not(.dark) .result-card-code {
        color: #999999;
        background: #f5f5f5;
    }

    .result-card-description {
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
    }

    // Dark theme card description
    .dark .result-card-description {
        color: rgba(255, 255, 255, 0.55);
    }

    // Light theme card description
    html:not(.dark) .result-card-description {
        color: #999999;
    }

    .search-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px 20px;
        text-align: center;
        flex: 1;
        min-height: 400px;
        
        i {
            font-size: 64px;
            margin-bottom: 20px;
        }
        
        p {
            font-size: 14px;
            font-weight: 500;
            margin: 0;
        }
    }

    // Dark theme empty state
    .dark .search-empty-state {
        i {
            color: rgba(255, 255, 255, 0.15);
        }
        
        p {
            color: rgba(255, 255, 255, 0.5);
        }
    }

    // Light theme empty state
    html:not(.dark) .search-empty-state {
        i {
            color: #d0d0d0;
        }
        
        p {
            color: #999999;
        }
    }

    .pagination-controls {
        display: flex;
        justify-content: center;
        padding: 12px 0;
        
        // Dark theme pagination buttons
        .dark :deep(.el-button-group) {
            .el-button {
                background: rgba(255, 255, 255, 0.05) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 8px !important;
                color: rgba(255, 255, 255, 0.85) !important;
                font-size: 12px;
                transition: all 0.3s ease;
                
                &:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.1) !important;
                    border-color: rgba(255, 255, 255, 0.2) !important;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }
                
                &:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
            }
        }

        // Light theme pagination buttons
        html:not(.dark) :deep(.el-button-group) {
            .el-button {
                background: #f0f0f0 !important;
                border: 1px solid #e0e0e0 !important;
                border-radius: 8px !important;
                color: #666666 !important;
                font-size: 12px;
                transition: all 0.3s ease;
                
                &:hover:not(:disabled) {
                    background: #e0e0e0 !important;
                    border-color: #d0d0d0 !important;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                }
                
                &:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
            }
        }
    }

    // Dark theme dropdown menu
    .dark :deep(.el-dropdown-menu) {
        background: rgba(255, 255, 255, 0.06) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        border-radius: 10px !important;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
        padding: 8px !important;
    }

    .dark :deep(.el-dropdown-menu__item) {
        color: rgba(255, 255, 255, 0.8) !important;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        
        &:hover {
            background: rgba(255, 255, 255, 0.08) !important;
            color: rgba(255, 255, 255, 0.95) !important;
        }
    }

    // Light theme dropdown menu
    html:not(.dark) :deep(.el-dropdown-menu) {
        background: #ffffff !important;
        border: 1px solid #e0e0e0 !important;
        border-radius: 10px !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        padding: 8px !important;
    }

    html:not(.dark) :deep(.el-dropdown-menu__item) {
        color: #333333 !important;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        
        &:hover {
            background: #f0f0f0 !important;
            color: #333333 !important;
        }
    }
</style>