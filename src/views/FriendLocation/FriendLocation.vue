<template>
    <div class="friend-view x-container">
        <div v-if="settingsReady" class="friend-view__header">
            <div class="friend-view__tabs-container">
                <div 
                    v-for="option in segmentedOptions" 
                    :key="option.value"
                    :class="['friend-view__tab', { 'is-active': activeSegment === option.value }]"
                    @click="activeSegment = option.value">
                    <span>{{ option.label }}</span>
                </div>
            </div>
            
            <div class="friend-view__actions">
                <el-popover placement="bottom" trigger="click" :width="300" popper-class="friend-location-settings-popover">
                    <template #reference>
                        <div class="settings-button-wrapper">
                            <el-tooltip :content="t('view.charts.instance_activity.settings.header')" placement="top">
                                <el-button circle class="settings-button">
                                    <i class="ri-settings-3-line"></i>
                                </el-button>
                            </el-tooltip>
                        </div>
                    </template>
                    <div class="settings-popover">
                        <div class="settings-item">
                            <span class="settings-label">Separate Same Instance</span>
                            <el-switch v-model="showSameInstance" />
                        </div>
                        <div class="settings-item">
                            <span class="settings-label">Scale</span>
                            <el-slider
                                v-model="cardScale"
                                class="settings-slider"
                                :min="0.6"
                                :max="1.0"
                                :step="0.01"
                                :show-tooltip="false" />
                        </div>
                    </div>
                </el-popover>

                <el-input
                    v-model="searchTerm"
                    class="friend-view__search"
                    :prefix-icon="Search"
                    clearable
                    placeholder="Search Friend"></el-input>
            </div>
        </div>
        <div v-else class="friend-view__header friend-view__header--loading">
            <span class="friend-view__loading-text">Loading preferences...</span>
        </div>
        <el-scrollbar v-if="settingsReady" ref="scrollbarRef" class="friend-view__scroll" @scroll="handleScroll">
            <template v-if="isSameInstanceView">
                <div v-if="visibleSameInstanceGroups.length" class="friend-view__instances">
                    <section
                        v-for="group in visibleSameInstanceGroups"
                        :key="group.instanceId"
                        class="friend-view__instance">
                        <header class="friend-view__instance-header">
                            <Location class="extra" :location="group.instanceId" style="display: inline" />
                            <span class="friend-view__instance-count">{{ group.friends.length }}</span>
                        </header>
                        <div
                            class="friend-view__grid"
                            :style="
                                gridStyle(group.friends.length, {
                                    preferredColumns: sameInstanceColumnTarget,
                                    disableAutoStretch: true,
                                    matchMaxColumnWidth: true
                                })
                            ">
                            <FriendLocationCard
                                v-for="friend in group.friends"
                                :key="friend.id ?? friend.userId ?? friend.displayName"
                                :friend="friend"
                                :card-scale="cardScale" />
                        </div>
                    </section>
                </div>
                <div v-else class="friend-view__empty">No matching friends</div>
            </template>
            <template v-else-if="shouldMergeSameInstance">
                <div v-if="mergedSameInstanceGroups.length" class="friend-view__instances">
                    <section
                        v-for="group in mergedSameInstanceGroups"
                        :key="group.instanceId"
                        class="friend-view__instance">
                        <header class="friend-view__instance-header">
                            <Location class="extra" :location="group.instanceId" style="display: inline" />
                            <span class="friend-view__instance-count">{{ group.friends.length }}</span>
                        </header>
                        <div
                            class="friend-view__grid"
                            :style="
                                gridStyle(group.friends.length, {
                                    preferredColumns: sameInstanceColumnTarget,
                                    disableAutoStretch: true,
                                    matchMaxColumnWidth: true
                                })
                            ">
                            <FriendLocationCard
                                v-for="friend in group.friends"
                                :key="friend.id ?? friend.userId ?? friend.displayName"
                                :friend="friend"
                                :card-scale="cardScale"
                                :display-instance-info="false" />
                        </div>
                    </section>
                </div>
                <div v-if="mergedSameInstanceGroups.length && mergedOnlineEntries.length" class="friend-view__divider">
                    <span class="friend-view__divider-text">Online Friends</span>
                </div>
                <div
                    v-if="mergedOnlineEntries.length"
                    class="friend-view__grid"
                    :style="gridStyle(mergedOnlineEntries.length)">
                    <FriendLocationCard
                        v-for="entry in mergedOnlineEntries"
                        :key="entry.id ?? entry.friend.id ?? entry.friend.displayName"
                        :friend="entry.friend"
                        :card-scale="cardScale" />
                </div>
                <div v-if="!mergedSameInstanceGroups.length && !mergedOnlineEntries.length" class="friend-view__empty">
                    No matching friends
                </div>
            </template>
            <template v-else>
                <div v-if="visibleFriends.length" class="friend-view__grid" :style="gridStyle(visibleFriends.length)">
                    <FriendLocationCard
                        v-for="entry in visibleFriends"
                        :key="entry.id ?? entry.friend.id ?? entry.friend.displayName"
                        :friend="entry.friend"
                        :card-scale="cardScale" />
                </div>
                <div v-else class="friend-view__empty">No matching friends</div>
            </template>
            <div v-if="isLoadingMore" class="friend-view__loading">
                <el-icon class="friend-view__loading-icon" :size="18">
                    <Loading />
                </el-icon>
                <span>Loading more...</span>
            </div>
        </el-scrollbar>
        <div v-else class="friend-view__initial-loading">
            <el-icon class="friend-view__loading-icon" :size="22">
                <Loading />
            </el-icon>
        </div>
    </div>
</template>

<script setup>
    import { computed, nextTick, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { Loading, Search } from '@element-plus/icons-vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { getFriendsLocations } from '../../shared/utils/location.js';
    import { useFriendStore } from '../../stores';

    import FriendLocationCard from './components/FriendLocationCard.vue';
    import configRepository from '../../service/config.js';

    const { t } = useI18n();

    const friendStore = useFriendStore();
    const { onlineFriends, vipFriends, activeFriends, offlineFriends, friendsInSameInstance } =
        storeToRefs(friendStore);

    const SEGMENTED_BASE_OPTIONS = [
        { label: 'Online', value: 'online' },
        { label: 'Favorite', value: 'favorite' },
        { label: 'Same Instance', value: 'same-instance' },
        { label: 'Active', value: 'active' },
        { label: 'Offline', value: 'offline' }
    ];

    const segmentedOptions = computed(() =>
        showSameInstance.value
            ? SEGMENTED_BASE_OPTIONS
            : SEGMENTED_BASE_OPTIONS.filter((option) => option.value !== 'same-instance')
    );

    const cardScaleBase = ref(1);

    const cardScale = computed({
        get: () => cardScaleBase.value,
        set: (value) => {
            cardScaleBase.value = value;
            configRepository.setString('VRCX_FriendLocationCardScale', value);
        }
    });

    const showSameInstanceBase = ref(false);

    const showSameInstance = computed({
        get: () => showSameInstanceBase.value,
        set: (value) => {
            showSameInstanceBase.value = value;
            configRepository.setBool('VRCX_FriendLocationShowSameInstance', value);
        }
    });

    const settingsReady = ref(false);

    const PAGE_SIZE = 18;
    const VIEWPORT_BUFFER = 32;

    const activeSegment = ref('online');
    const searchTerm = ref('');

    const itemsToShow = ref(PAGE_SIZE);
    const isLoadingMore = ref(false);
    const scrollbarRef = ref();
    const gridWidth = ref(0);
    let resizeObserver;
    let cleanupResize;

    const updateGridWidth = () => {
        const wrap = scrollbarRef.value?.wrapRef;
        if (!wrap) {
            return;
        }

        gridWidth.value = wrap.clientWidth ?? 0;
    };

    const setupResizeHandling = () => {
        if (cleanupResize) {
            cleanupResize();
            cleanupResize = undefined;
        }

        const wrap = scrollbarRef.value?.wrapRef;
        if (!wrap) {
            return;
        }

        updateGridWidth();

        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver((entries) => {
                if (!entries || entries.length === 0) {
                    return;
                }
                const [entry] = entries;
                gridWidth.value = entry.contentRect?.width ?? wrap.clientWidth ?? 0;
            });
            resizeObserver.observe(wrap);
            cleanupResize = () => {
                resizeObserver?.disconnect();
                resizeObserver = undefined;
            };
            return;
        }

        if (typeof window !== 'undefined') {
            const handleResize = () => {
                updateGridWidth();
            };
            window.addEventListener('resize', handleResize, { passive: true });
            cleanupResize = () => {
                window.removeEventListener('resize', handleResize);
            };
        }
    };

    const normalizedSearchTerm = computed(() => searchTerm.value.trim().toLowerCase());

    const toEntries = (list = [], instanceId) =>
        Array.isArray(list)
            ? list.map((friend) => ({
                  id: friend.id ?? friend.userId ?? friend.displayName,
                  friend,
                  instanceId
              }))
            : [];

    const sameInstanceGroups = computed(() => {
        const source = friendsInSameInstance?.value;
        if (!Array.isArray(source) || source.length === 0) return [];

        return source
            .map((group, index) => {
                if (!Array.isArray(group) || group.length === 0) return null;
                const friends = group;
                const instanceId = getFriendsLocations(friends) || `instance-${index + 1}`;
                return {
                    instanceId: String(instanceId),
                    friends
                };
            })
            .filter(Boolean);
    });

    const sameInstanceEntries = computed(() =>
        sameInstanceGroups.value.flatMap((group) => toEntries(group.friends, group.instanceId))
    );

    const uniqueEntries = (entries = []) => {
        const seen = new Set();
        return entries.filter((entry) => {
            const key = entry.id;
            if (!key) {
                return true;
            }
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    };

    const filteredFriends = computed(() => {
        if (normalizedSearchTerm.value) {
            const pools = [
                ...toEntries(vipFriends.value),
                ...toEntries(onlineFriends.value),
                ...toEntries(activeFriends.value),
                ...toEntries(offlineFriends.value)
            ];

            return uniqueEntries(pools).filter(({ friend }) => {
                const haystack =
                    `${friend.displayName ?? friend.name ?? ''} ${friend.signature ?? ''} ${friend.worldName ?? ''}`.toLowerCase();
                return haystack.includes(normalizedSearchTerm.value);
            });
        }

        switch (activeSegment.value) {
            case 'online': {
                if (!showSameInstance.value) {
                    const sameEntries = sameInstanceEntries.value.map((entry) => ({
                        ...entry,
                        section: 'same-instance'
                    }));

                    const seenIds = new Set(
                        sameEntries
                            .map((entry) => entry.id)
                            .filter((id) => typeof id === 'string' || typeof id === 'number')
                    );

                    const remainingOnline = toEntries(onlineFriends.value)
                        .filter((entry) => {
                            if (!entry?.id) {
                                return true;
                            }
                            return !seenIds.has(entry.id);
                        })
                        .map((entry) => ({
                            ...entry,
                            section: 'online'
                        }));

                    return [...sameEntries, ...remainingOnline];
                }

                return toEntries(onlineFriends.value);
            }
            case 'favorite':
                return toEntries(vipFriends.value);
            case 'same-instance':
                return sameInstanceEntries.value;
            case 'active':
                return toEntries(activeFriends.value);
            case 'offline':
                return toEntries(offlineFriends.value);
            default:
                return [];
        }
    });

    const visibleFriends = computed(() => filteredFriends.value.slice(0, itemsToShow.value));

    const isSameInstanceView = computed(
        () => showSameInstance.value && activeSegment.value === 'same-instance' && !normalizedSearchTerm.value
    );

    const shouldMergeSameInstance = computed(
        () => !showSameInstance.value && activeSegment.value === 'online' && !normalizedSearchTerm.value
    );

    const buildSameInstanceGroups = (entries = []) => {
        if (!Array.isArray(entries) || entries.length === 0) {
            return [];
        }

        const grouped = new Map();

        for (const entry of entries) {
            const bucketId = entry.instanceId ?? entry.friend?.ref?.location ?? null;
            if (!bucketId) {
                continue;
            }
            if (!grouped.has(bucketId)) {
                grouped.set(bucketId, []);
            }
            grouped.get(bucketId).push(entry.friend);
        }

        return sameInstanceGroups.value
            .filter((group) => grouped.has(group.instanceId))
            .map((group) => ({
                instanceId: group.instanceId,
                friends: grouped.get(group.instanceId) ?? []
            }));
    };

    const visibleSameInstanceGroups = computed(() => {
        if (!isSameInstanceView.value) {
            return [];
        }

        return buildSameInstanceGroups(visibleFriends.value);
    });

    const mergedSameInstanceEntries = computed(() => {
        if (!shouldMergeSameInstance.value) {
            return [];
        }

        return visibleFriends.value.filter((entry) => entry.section === 'same-instance');
    });

    const mergedOnlineEntries = computed(() => {
        if (!shouldMergeSameInstance.value) {
            return [];
        }

        return visibleFriends.value.filter((entry) => entry.section !== 'same-instance');
    });

    const mergedSameInstanceGroups = computed(() => {
        if (!shouldMergeSameInstance.value) {
            return [];
        }

        return buildSameInstanceGroups(mergedSameInstanceEntries.value);
    });

    const sameInstanceColumnTarget = computed(() => {
        const groups = isSameInstanceView.value
            ? visibleSameInstanceGroups.value
            : shouldMergeSameInstance.value
              ? mergedSameInstanceGroups.value
              : [];

        let maxCount = 0;
        for (const group of groups) {
            const size = Array.isArray(group?.friends) ? group.friends.length : 0;
            if (size > maxCount) {
                maxCount = size;
            }
        }

        return maxCount > 0 ? maxCount : null;
    });

    const gridStyle = computed(() => {
        const baseWidth = 220;
        const baseGap = 14;
        const scale = cardScale.value;
        const minWidth = baseWidth * scale;
        const gap = baseGap + (scale - 1) * 10;

        return (count = 1, options = {}) => {
            const containerWidth = Math.max(gridWidth.value ?? 0, 0);
            const itemCount = Math.max(Number(count) || 0, 0);
            const safeCount = itemCount > 0 ? itemCount : 1;
            const maxColumns = Math.max(1, Math.floor((containerWidth + gap) / (minWidth + gap)) || 1);
            const preferredColumns = options?.preferredColumns;
            const requestedColumns = preferredColumns
                ? Math.max(1, Math.min(Math.round(preferredColumns), maxColumns))
                : maxColumns;
            const columns = Math.max(1, Math.min(safeCount, requestedColumns));
            const forceStretch = Boolean(options?.forceStretch);
            const disableAutoStretch = Boolean(options?.disableAutoStretch);
            const matchMaxColumnWidth = Boolean(options?.matchMaxColumnWidth);
            const shouldStretch = !disableAutoStretch && (forceStretch || itemCount >= maxColumns);

            let cardWidth = minWidth;
            const maxColumnWidth = maxColumns > 0 ? (containerWidth - gap * (maxColumns - 1)) / maxColumns : minWidth;

            if (shouldStretch && columns > 0) {
                const columnsWidth = containerWidth - gap * (columns - 1);
                const rawWidth = columnsWidth > 0 ? columnsWidth / columns : minWidth;

                if (Number.isFinite(rawWidth) && rawWidth > 0) {
                    cardWidth = Math.max(minWidth, rawWidth);
                }
            } else if (matchMaxColumnWidth && Number.isFinite(maxColumnWidth) && maxColumnWidth > 0) {
                cardWidth = Math.max(minWidth, maxColumnWidth);
            }

            return {
                '--friend-card-min-width': `${Math.round(minWidth)}px`,
                '--friend-card-gap': `${Math.round(gap)}px`,
                '--friend-card-target-width': `${Math.round(cardWidth)}px`,
                '--friend-grid-columns': `${columns}`
            };
        };
    });

    const handleScroll = () => {
        if (
            isLoadingMore.value ||
            filteredFriends.value.length === 0 ||
            itemsToShow.value >= filteredFriends.value.length
        ) {
            return;
        }

        const wrap = scrollbarRef.value?.wrapRef;

        if (!wrap) {
            return;
        }

        const { scrollHeight, scrollTop, clientHeight } = wrap;

        if (scrollTop + clientHeight >= scrollHeight - 120) {
            loadMoreFriends();
        }
    };

    function loadMoreFriends() {
        if (isLoadingMore.value || itemsToShow.value >= filteredFriends.value.length) {
            return;
        }

        isLoadingMore.value = true;

        window.setTimeout(() => {
            if (itemsToShow.value < filteredFriends.value.length) {
                itemsToShow.value = Math.min(itemsToShow.value + PAGE_SIZE, filteredFriends.value.length);
            }
            isLoadingMore.value = false;
            maybeFillViewport();
        }, 350);
    }

    function maybeFillViewport() {
        nextTick(() => {
            const wrap = scrollbarRef.value?.wrapRef;
            if (!wrap) {
                return;
            }

            const { scrollHeight, clientHeight } = wrap;
            const hasSpace = scrollHeight <= clientHeight + VIEWPORT_BUFFER;

            if (!hasSpace || isLoadingMore.value) {
                return;
            }

            if (filteredFriends.value.length > visibleFriends.value.length) {
                loadMoreFriends();
            }
        });
    }

    watch([searchTerm, activeSegment], () => {
        itemsToShow.value = PAGE_SIZE;
        nextTick(() => {
            updateGridWidth();
            maybeFillViewport();
        });
    });

    watch(
        () => filteredFriends.value.length,
        (length) => {
            if (itemsToShow.value > length) {
                itemsToShow.value = length;
            }
            nextTick(() => {
                updateGridWidth();
                maybeFillViewport();
            });
        }
    );

    watch(cardScale, () => {
        if (!settingsReady.value) {
            return;
        }
        nextTick(() => {
            scrollbarRef.value?.update?.();
            updateGridWidth();
            maybeFillViewport();
        });
    });

    watch(showSameInstance, (value) => {
        if (!settingsReady.value) {
            return;
        }
        if (!value && activeSegment.value === 'same-instance') {
            activeSegment.value = 'online';
        }

        itemsToShow.value = PAGE_SIZE;

        nextTick(() => {
            updateGridWidth();
            maybeFillViewport();
        });
    });

    onMounted(() => {
        nextTick(() => {
            setupResizeHandling();
            maybeFillViewport();
        });
    });

    onBeforeUnmount(() => {
        if (cleanupResize) {
            cleanupResize();
            cleanupResize = undefined;
        }
    });

    async function loadInitialSettings() {
        try {
            const [storedScale, storedShowSameInstance] = await Promise.all([
                configRepository.getString('VRCX_FriendLocationCardScale', '1'),
                configRepository.getBool('VRCX_FriendLocationShowSameInstance', null)
            ]);

            const parsedScale = parseFloat(storedScale);
            if (!Number.isNaN(parsedScale) && parsedScale > 0) {
                cardScaleBase.value = parsedScale;
            }

            if (storedShowSameInstance !== null && storedShowSameInstance !== undefined) {
                showSameInstanceBase.value = Boolean(storedShowSameInstance);
            }
        } catch (error) {
            console.error('Failed to load Friend Location preferences', error);
        } finally {
            settingsReady.value = true;
            nextTick(() => {
                setupResizeHandling();
                scrollbarRef.value?.update?.();
                updateGridWidth();
                maybeFillViewport();
            });
        }
    }

    onBeforeMount(() => {
        loadInitialSettings();
    });
</script>

<style scoped lang="scss">
    .friend-view {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 0;
    }

    .friend-view__header {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-bottom: 20px;
        margin-bottom: 20px;
    }

    // Dark theme header
    .dark .friend-view__header {
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    // Light theme header
    html:not(.dark) .friend-view__header {
        border-bottom: 1px solid #e0e0e0;
    }

    .friend-view__header--loading {
        justify-content: flex-end;
        align-items: flex-end;
        font-size: 13px;
        font-weight: 500;
        padding-bottom: 0;
        border-bottom: none;
        margin-bottom: 0;
    }

    // Dark theme loading header
    .dark .friend-view__header--loading {
        color: rgba(255, 255, 255, 0.5);
    }

    // Light theme loading header
    html:not(.dark) .friend-view__header--loading {
        color: #999999;
    }

    .friend-view__loading-text {
        padding-right: 0;
    }

    .friend-view__tabs-container {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .friend-view__tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 13px;
        font-weight: 500;
    }

    // Dark theme tab
    .dark .friend-view__tab {
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
        }
    }

    // Light theme tab
    html:not(.dark) .friend-view__tab {
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
        }
    }

    .friend-view__actions {
        display: flex;
        align-items: center;
        gap: 12px;
        justify-content: flex-end;
    }

    .settings-button-wrapper {
        display: inline-block;
    }

    .settings-button {
        border-radius: 50% !important;
        width: 36px;
        height: 36px;
        transition: all 0.3s ease;
        flex-shrink: 0;
    }

    // Dark theme settings button
    .dark .settings-button {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: rgba(255, 255, 255, 0.85) !important;
        
        &:hover {
            background: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }
    }

    // Light theme settings button
    html:not(.dark) .settings-button {
        background: #f0f0f0 !important;
        border: 1px solid #e0e0e0 !important;
        color: #666666 !important;
        
        &:hover {
            background: #e0e0e0 !important;
            border-color: #d0d0d0 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
    }

    .settings-popover {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .settings-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
    }

    .settings-label {
        font-size: 13px;
        font-weight: 500;
        flex-shrink: 0;
    }

    // Dark theme settings label
    .dark .settings-label {
        color: rgba(255, 255, 255, 0.9);
    }

    // Light theme settings label
    html:not(.dark) .settings-label {
        color: #333333;
    }

    .settings-slider {
        width: 160px;
        flex-shrink: 0;
    }

    .friend-view__search {
        min-width: 200px;
        max-width: 280px;
        flex: 0 1 280px;
        width: 280px;
        
        // Dark theme input
        .dark :deep(.el-input__wrapper) {
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
            
            &:hover {
                background: rgba(20, 22, 32, 0.9);
                border-color: rgba(255, 255, 255, 0.2);
            }
            
            &.is-focus {
                background: rgba(20, 22, 32, 0.95);
                border-color: rgba(255, 255, 255, 0.25);
                box-shadow: 
                    0 0 0 2px rgba(255, 255, 255, 0.1),
                    0 4px 12px rgba(0, 0, 0, 0.15);
            }
        }

        // Light theme input
        html:not(.dark) :deep(.el-input__wrapper) {
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
            
            &:hover {
                background: #f5f5f5;
                border-color: #d0d0d0;
            }
            
            &.is-focus {
                background: #ffffff;
                border-color: #409eff;
                box-shadow: 
                    0 0 0 2px rgba(64, 158, 255, 0.1),
                    0 4px 12px rgba(0, 0, 0, 0.1);
            }
        }
    }

    .friend-view__scroll {
        padding: 4px 6px 4px 4px;
    }

    .friend-view__initial-loading {
        display: grid;
        place-items: center;
        min-height: 240px;
    }

    // Dark theme initial loading
    .dark .friend-view__initial-loading {
        color: rgba(255, 255, 255, 0.5);
    }

    // Light theme initial loading
    html:not(.dark) .friend-view__initial-loading {
        color: #999999;
    }

    .friend-view__grid {
        display: grid;
        grid-template-columns: repeat(
            var(--friend-grid-columns, 1),
            minmax(var(--friend-card-min-width, 200px), var(--friend-card-target-width, 1fr))
        );
        gap: var(--friend-card-gap, 16px);
        justify-content: start;
        padding-right: 2px;
    }

    .friend-view__instance .friend-view__grid {
        padding: 0;
    }

    .friend-view__instances {
        display: grid;
        gap: 16px;
        box-sizing: border-box;
    }

    .friend-view__instance {
        display: grid;
        gap: 12px;
        padding: 16px;
        border-radius: 14px;
    }

    // Dark theme instance
    .dark .friend-view__instance {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
    }

    // Light theme instance
    html:not(.dark) .friend-view__instance {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
    }

    .friend-view__instance-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        margin: 0;
        border-radius: 12px;
        font-weight: 600;
        font-size: 13px;
    }

    // Dark theme instance header
    .dark .friend-view__instance-header {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.9);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    // Light theme instance header
    html:not(.dark) .friend-view__instance-header {
        background: #f0f0f0;
        border: 1px solid #e0e0e0;
        color: #333333;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .friend-view__divider {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 16px 6px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    // Dark theme divider
    .dark .friend-view__divider {
        color: rgba(255, 255, 255, 0.5);
    }

    // Light theme divider
    html:not(.dark) .friend-view__divider {
        color: #999999;
    }

    .friend-view__divider::before,
    .friend-view__divider::after {
        content: '';
        flex: 1;
        height: 1px;
    }

    // Dark theme divider lines
    .dark .friend-view__divider::before,
    .dark .friend-view__divider::after {
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    }

    // Light theme divider lines
    html:not(.dark) .friend-view__divider::before,
    html:not(.dark) .friend-view__divider::after {
        background: linear-gradient(90deg, transparent, #e0e0e0, transparent);
    }

    .friend-view__divider-text {
        flex: none;
    }

    .friend-view__instance-id {
        max-width: 75%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .friend-view__instance-count {
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 8px;
        font-weight: 600;
    }

    // Dark theme instance count
    .dark .friend-view__instance-count {
        color: rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    // Light theme instance count
    html:not(.dark) .friend-view__instance-count {
        color: #666666;
        background: #f0f0f0;
        border: 1px solid #e0e0e0;
    }

    .friend-view__empty {
        display: grid;
        place-items: center;
        min-height: 200px;
        font-size: 14px;
        letter-spacing: 0.3px;
        font-weight: 500;
    }

    // Dark theme empty
    .dark .friend-view__empty {
        color: rgba(255, 255, 255, 0.4);
    }

    // Light theme empty
    html:not(.dark) .friend-view__empty {
        color: #999999;
    }

    .friend-view__loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px 0 10px;
        font-size: 13px;
        font-weight: 500;
    }

    // Dark theme loading
    .dark .friend-view__loading {
        color: rgba(255, 255, 255, 0.5);
    }

    // Light theme loading
    html:not(.dark) .friend-view__loading {
        color: #999999;
    }

    .friend-view__loading-icon {
    }

    // Dark theme loading icon
    .dark .friend-view__loading-icon {
        color: rgba(255, 255, 255, 0.7);
    }

    // Light theme loading icon
    html:not(.dark) .friend-view__loading-icon {
        color: #666666;
    }
    
    
    // Note: Popover is teleported to body, so we need global styles
    // This is handled via popper-class
    
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
    
    // Dark theme slider
    .dark :deep(.el-slider) {
        .el-slider__runway {
            background: rgba(255, 255, 255, 0.08);
        }
        
        .el-slider__bar {
            background: rgba(255, 255, 255, 0.25);
        }
        
        .el-slider__button {
            background: rgba(255, 255, 255, 0.85);
            border-color: rgba(255, 255, 255, 0.25);
        }
    }

    // Light theme slider
    html:not(.dark) :deep(.el-slider) {
        .el-slider__runway {
            background: #e0e0e0;
        }
        
        .el-slider__bar {
            background: #409eff;
        }
        
        .el-slider__button {
            background: #ffffff;
            border-color: #409eff;
        }
    }
</style>
