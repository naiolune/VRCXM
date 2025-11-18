<template>
    <div>
        <div class="options-container" style="margin-top: 0">
            <span class="header">{{ t('view.settings.general.general.header') }}</span>
            <div class="x-friend-list" style="margin-top: 10px">
                <div class="x-friend-item" style="cursor: default">
                    <div class="detail">
                        <span class="name">{{ t('view.settings.general.general.version') }}</span>
                        <span class="extra" v-text="currentVersion"></span>
                    </div>
                </div>
                <div class="x-friend-item" @click="checkForVRCXUpdate">
                    <div class="detail">
                        <span class="name">{{ t('view.settings.general.general.latest_app_version') }}</span>
                        <span v-if="latestAppVersion" class="extra" v-text="latestAppVersion"></span>
                        <span v-else class="extra">{{
                            t('view.settings.general.general.latest_app_version_refresh')
                        }}</span>
                    </div>
                </div>
                <div class="x-friend-item" @click="openExternalLink('https://github.com/naiolune/VRCXM')">
                    <div class="detail">
                        <span class="name">{{ t('view.settings.general.general.repository_url') }}</span>
                        <span v-once class="extra">https://github.com/naiolune/VRCXM</span>
                    </div>
                </div>
                <div class="x-friend-item" @click="openExternalLink('https://github.com/naiolune/VRCXM/issues')">
                    <div class="detail">
                        <span class="name">{{ t('view.settings.general.general.support') }}</span>
                        <span v-once class="extra">https://github.com/naiolune/VRCXM/issues</span>
                    </div>
                </div>
                <div class="options-container-item" style="margin-top: 15px">
                    <el-button type="danger" @click="handleLogout" style="width: 100%">
                        {{ t('view.settings.general.general.logout') }}
                    </el-button>
                </div>
            </div>
        </div>
        <div class="options-container">
            <span class="header">{{ t('view.settings.general.vrcx_updater.header') }}</span>
            <div class="options-container-item">
                <el-button size="small" :icon="Document" @click="showChangeLogDialog">{{
                    t('view.settings.general.vrcx_updater.change_log')
                }}</el-button>
                <el-button size="small" :icon="Upload" @click="showVRCXUpdateDialog()">{{
                    t('view.settings.general.vrcx_updater.change_build')
                }}</el-button>
            </div>
            <div class="options-container-item">
                <span class="name">{{ t('view.settings.general.vrcx_updater.update_action') }}</span>
                <br />
                <el-radio-group
                    :model-value="autoUpdateVRCX"
                    size="small"
                    style="margin-top: 5px"
                    @change="setAutoUpdateVRCX">
                    <el-radio-button label="Off">{{
                        t('view.settings.general.vrcx_updater.auto_update_off')
                    }}</el-radio-button>
                    <el-radio-button label="Notify">{{
                        t('view.settings.general.vrcx_updater.auto_update_notify')
                    }}</el-radio-button>
                    <el-radio-button label="Auto Download">{{
                        t('view.settings.general.vrcx_updater.auto_update_download')
                    }}</el-radio-button>
                </el-radio-group>
            </div>
        </div>
        <div class="options-container">
            <span class="header">{{ t('view.settings.general.application.header') }}</span>
            <simple-switch
                v-if="!isLinux"
                :label="t('view.settings.general.application.startup')"
                :value="isStartAtWindowsStartup"
                @change="setIsStartAtWindowsStartup" />
            <simple-switch
                v-if="!isLinux"
                :label="t('view.settings.general.application.minimized')"
                :value="isStartAsMinimizedState"
                @change="setIsStartAsMinimizedState" />
            <simple-switch
                v-else
                :label="t('view.settings.general.application.minimized')"
                :value="isStartAsMinimizedState"
                :tooltip="t('view.settings.general.application.startup_linux')"
                @change="setIsStartAsMinimizedState" />
            <simple-switch
                v-if="!isMacOS"
                :label="t('view.settings.general.application.tray')"
                :value="isCloseToTray"
                @change="setIsCloseToTray" />
            <simple-switch
                v-if="!isLinux"
                :label="t('view.settings.general.application.disable_gpu_acceleration')"
                :value="disableGpuAcceleration"
                :tooltip="t('view.settings.general.application.disable_gpu_acceleration_tooltip')"
                @change="setDisableGpuAcceleration" />
            <simple-switch
                v-if="!isLinux"
                :label="t('view.settings.general.application.disable_vr_overlay_gpu_acceleration')"
                :value="disableVrOverlayGpuAcceleration"
                :tooltip="t('view.settings.general.application.disable_gpu_acceleration_tooltip')"
                @change="setDisableVrOverlayGpuAcceleration" />
            <div class="options-container-item">
                <el-button size="small" :icon="Connection" @click="promptProxySettings">{{
                    t('view.settings.general.application.proxy')
                }}</el-button>
            </div>
        </div>
        <div class="options-container">
            <span class="header">{{ t('view.settings.general.favorites.header') }}</span>
            <br />
            <el-select
                :model-value="localFavoriteFriendsGroups"
                multiple
                clearable
                :placeholder="t('view.settings.general.favorites.group_placeholder')"
                style="margin-top: 8px"
                @change="setLocalFavoriteFriendsGroups">
                <el-option-group :label="t('view.settings.general.favorites.group_placeholder')">
                    <el-option
                        v-for="group in favoriteFriendGroups"
                        :key="group.key"
                        :label="group.displayName"
                        :value="group.key"
                        class="x-friend-item">
                        <div class="detail">
                            <span class="name" v-text="group.displayName"></span>
                        </div>
                    </el-option>
                </el-option-group>
            </el-select>
        </div>
        <div class="options-container">
            <span class="header">{{ t('view.settings.general.hidden_friends.header') }}</span>
            <div class="options-container-item" style="margin-top: 15px">
                <el-input
                    v-model="hiddenFriendsSearch"
                    :placeholder="t('view.settings.general.hidden_friends.search_placeholder')"
                    clearable
                    size="small"
                    style="margin-bottom: 10px">
                    <template #prefix>
                        <i class="ri-search-line"></i>
                    </template>
                </el-input>
                <div v-if="filteredHiddenFriends.length > 0" class="hidden-friends-list">
                    <div
                        v-for="friend in filteredHiddenFriends"
                        :key="friend.userId"
                        class="hidden-friend-item">
                        <div class="hidden-friend-avatar">
                            <img
                                v-if="friend.avatarUrl"
                                :src="friend.avatarUrl"
                                loading="lazy" />
                            <i v-else class="ri-user-line"></i>
                        </div>
                        <div class="hidden-friend-info">
                            <div class="hidden-friend-name" v-text="friend.displayName"></div>
                            <div class="hidden-friend-id" v-text="friend.userId"></div>
                        </div>
                        <el-button
                            size="small"
                            :icon="View"
                            @click="unhideFriend(friend.userId)">
                            {{ t('view.settings.general.hidden_friends.unhide') }}
                        </el-button>
                    </div>
                </div>
                <div v-else class="hidden-friends-empty">
                    <i class="ri-user-search-line"></i>
                    <p>{{ t('view.settings.general.hidden_friends.empty') }}</p>
                </div>
            </div>
        </div>
        <div class="options-container">
            <span class="header">{{ t('view.settings.general.logging.header') }}</span>
            <simple-switch
                :label="t('view.settings.advanced.advanced.cache_debug.udon_exception_logging')"
                :value="udonExceptionLogging"
                @change="
                    setUdonExceptionLogging();
                    saveOpenVROption();
                " />
            <simple-switch
                :label="t('view.settings.general.logging.resource_load')"
                :value="logResourceLoad"
                @change="setLogResourceLoad" />
            <simple-switch
                :label="t('view.settings.general.logging.empty_avatar')"
                :value="logEmptyAvatars"
                @change="setLogEmptyAvatars" />
        </div>
        <div class="options-container">
            <span class="header">{{ t('view.settings.general.automation.header') }}</span>
            <simple-switch
                :label="t('view.settings.general.automation.auto_change_status')"
                :value="autoStateChangeEnabled"
                :tooltip="t('view.settings.general.automation.auto_state_change_tooltip')"
                @change="setAutoStateChangeEnabled" />
            <div class="options-container-item">
                <span class="name">{{ t('view.settings.general.automation.alone_status') }}</span>
                <el-select
                    :model-value="autoStateChangeAloneStatus"
                    :disabled="!autoStateChangeEnabled"
                    style="margin-top: 8px"
                    size="small"
                    @change="setAutoStateChangeAloneStatus">
                    <el-option :label="t('dialog.user.status.join_me')" value="join me">
                        <i class="x-user-status joinme"></i> {{ t('dialog.user.status.join_me') }}
                    </el-option>
                    <el-option :label="t('dialog.user.status.online')" value="active">
                        <i class="x-user-status online"></i> {{ t('dialog.user.status.online') }}
                    </el-option>
                    <el-option :label="t('dialog.user.status.ask_me')" value="ask me">
                        <i class="x-user-status askme"></i> {{ t('dialog.user.status.ask_me') }}
                    </el-option>
                    <el-option :label="t('dialog.user.status.busy')" value="busy">
                        <i class="x-user-status busy"></i> {{ t('dialog.user.status.busy') }}
                    </el-option>
                </el-select>
            </div>
            <div class="options-container-item">
                <span class="name">{{ t('view.settings.general.automation.company_status') }}</span>
                <el-select
                    :model-value="autoStateChangeCompanyStatus"
                    :disabled="!autoStateChangeEnabled"
                    style="margin-top: 8px"
                    size="small"
                    @change="setAutoStateChangeCompanyStatus">
                    <el-option :label="t('dialog.user.status.join_me')" value="join me">
                        <i class="x-user-status joinme"></i> {{ t('dialog.user.status.join_me') }}
                    </el-option>
                    <el-option :label="t('dialog.user.status.online')" value="active">
                        <i class="x-user-status online"></i> {{ t('dialog.user.status.online') }}
                    </el-option>
                    <el-option :label="t('dialog.user.status.ask_me')" value="ask me">
                        <i class="x-user-status askme"></i> {{ t('dialog.user.status.ask_me') }}
                    </el-option>
                    <el-option :label="t('dialog.user.status.busy')" value="busy">
                        <i class="x-user-status busy"></i> {{ t('dialog.user.status.busy') }}
                    </el-option>
                </el-select>
            </div>
            <div class="options-container-item">
                <span class="name">{{ t('view.settings.general.automation.allowed_instance_types') }}</span>
                <el-select
                    :model-value="autoStateChangeInstanceTypes"
                    :disabled="!autoStateChangeEnabled"
                    multiple
                    clearable
                    :placeholder="t('view.settings.general.automation.instance_type_placeholder')"
                    style="margin-top: 8px"
                    size="small"
                    @change="setAutoStateChangeInstanceTypes">
                    <el-option-group :label="t('view.settings.general.automation.allowed_instance_types')">
                        <el-option
                            v-for="instanceType in instanceTypes"
                            :key="instanceType"
                            :label="instanceType"
                            :value="instanceType"
                            class="x-friend-item">
                            <div class="detail">
                                <span class="name" v-text="instanceType"></span>
                            </div>
                        </el-option>
                    </el-option-group>
                </el-select>
            </div>
            <div class="options-container-item">
                <span class="name">{{ t('view.settings.general.automation.alone_condition') }}</span>
                <el-radio-group
                    :model-value="autoStateChangeNoFriends"
                    :disabled="!autoStateChangeEnabled"
                    @change="setAutoStateChangeNoFriends">
                    <el-radio :label="false">{{ t('view.settings.general.automation.alone') }}</el-radio>
                    <el-radio :label="true">{{ t('view.settings.general.automation.no_friends') }}</el-radio>
                </el-radio-group>
            </div>
            <div class="options-container-item">
                <span class="name"
                    >{{ t('view.settings.general.automation.auto_invite_request_accept') }}
                    <el-tooltip
                        placement="top"
                        style="margin-left: 5px"
                        :content="t('view.settings.general.automation.auto_invite_request_accept_tooltip')">
                        <el-icon><InfoFilled /></el-icon>
                    </el-tooltip>
                </span>
                <br />
                <el-radio-group
                    :model-value="autoAcceptInviteRequests"
                    size="small"
                    style="margin-top: 5px"
                    @change="setAutoAcceptInviteRequests">
                    <el-radio-button label="Off">{{
                        t('view.settings.general.automation.auto_invite_request_accept_off')
                    }}</el-radio-button>
                    <el-radio-button label="All Favorites">{{
                        t('view.settings.general.automation.auto_invite_request_accept_favs')
                    }}</el-radio-button>
                    <el-radio-button label="Selected Favorites">{{
                        t('view.settings.general.automation.auto_invite_request_accept_selected_favs')
                    }}</el-radio-button>
                </el-radio-group>
            </div>
        </div>
        <div class="options-container">
            <span class="header">{{ t('view.settings.general.contributors.header') }}</span>
            <div class="options-container-item">
                <img
                    src="https://contrib.rocks/image?repo=naiolune/VRCXM"
                    alt="Contributors"
                    style="cursor: pointer"
                    @click="openExternalLink('https://github.com/naiolune/VRCXM/graphs/contributors')" />
            </div>
        </div>
        <div class="options-container legal-notice-container">
            <span class="header">{{ t('view.settings.general.legal_notice.header') }}</span>
            <div class="options-container-item">
                <p>
                    &copy; 2019-2025
                    <a class="x-link" @click="openExternalLink('https://github.com/pypy-vrc')">pypy</a> &amp;
                    <a class="x-link" @click="openExternalLink('https://github.com/Natsumi-sama')">Natsumi</a>
                </p>
                <p>{{ t('view.settings.general.legal_notice.info') }}</p>
                <p>{{ t('view.settings.general.legal_notice.disclaimer1') }}</p>
                <p>{{ t('view.settings.general.legal_notice.disclaimer2') }}</p>
            </div>
            <div class="options-container-item">
                <el-button size="small" @click="openOSSDialog">{{
                    t('view.settings.general.legal_notice.open_source_software_notice')
                }}</el-button>
            </div>
        </div>
        <OpenSourceSoftwareNoticeDialog v-if="ossDialog" v-model:ossDialog="ossDialog" />
    </div>
</template>

<script setup>
    import { Connection, Document, InfoFilled, Upload, View } from '@element-plus/icons-vue';
    import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { database } from '../../../../service/database';
    import { useAuthStore, useFavoriteStore, useGeneralSettingsStore, useUserStore, useVRCXUpdaterStore, useVrStore } from '../../../../stores';
    import { openExternalLink } from '../../../../shared/utils';

    import SimpleSwitch from '../SimpleSwitch.vue';

    const { t } = useI18n();

    const generalSettingsStore = useGeneralSettingsStore();
    const vrcxUpdaterStore = useVRCXUpdaterStore();
    const favoriteStore = useFavoriteStore();
    const authStore = useAuthStore();
    const { cachedUsers } = useUserStore();

    const { saveOpenVROption } = useVrStore();

    const hiddenFriendsSearch = ref('');
    const hiddenFriends = ref([]);

    const filteredHiddenFriends = computed(() => {
        if (!hiddenFriendsSearch.value) {
            return hiddenFriends.value;
        }
        const search = hiddenFriendsSearch.value.toLowerCase();
        return hiddenFriends.value.filter(
            (friend) =>
                friend.displayName.toLowerCase().includes(search) ||
                friend.userId.toLowerCase().includes(search)
        );
    });

    async function loadHiddenFriends() {
        const hiddenSet = await database.getHiddenFriends();
        hiddenFriends.value = [];
        for (const userId of hiddenSet) {
            const user = cachedUsers.get(userId);
            hiddenFriends.value.push({
                userId,
                displayName: user?.displayName || userId,
                avatarUrl: user?.userIcon || user?.currentAvatarImageUrl || null
            });
        }
    }

    async function unhideFriend(userId) {
        await database.unhideFriendFromFeed(userId);
        await loadHiddenFriends();
    }

    onMounted(() => {
        loadHiddenFriends();
    });

    const {
        isStartAtWindowsStartup,
        isStartAsMinimizedState,
        isCloseToTray,
        disableGpuAcceleration,
        disableVrOverlayGpuAcceleration,
        localFavoriteFriendsGroups,
        udonExceptionLogging,
        logResourceLoad,
        logEmptyAvatars,
        autoStateChangeEnabled,
        autoStateChangeAloneStatus,
        autoStateChangeCompanyStatus,
        autoStateChangeInstanceTypes,
        autoStateChangeNoFriends,
        autoAcceptInviteRequests
    } = storeToRefs(generalSettingsStore);

    const {
        setIsStartAtWindowsStartup,
        setIsStartAsMinimizedState,
        setIsCloseToTray,
        setDisableGpuAcceleration,
        setDisableVrOverlayGpuAcceleration,
        setUdonExceptionLogging,
        setLogResourceLoad,
        setLogEmptyAvatars,
        setAutoStateChangeEnabled,
        setAutoStateChangeAloneStatus,
        setAutoStateChangeCompanyStatus,
        setAutoStateChangeInstanceTypes,
        setAutoStateChangeNoFriends,
        setAutoAcceptInviteRequests,
        setLocalFavoriteFriendsGroups,
        promptProxySettings
    } = generalSettingsStore;

    const { favoriteFriendGroups } = storeToRefs(favoriteStore);

    const { appVersion, currentVersion, autoUpdateVRCX, latestAppVersion } = storeToRefs(vrcxUpdaterStore);
    const { setAutoUpdateVRCX, checkForVRCXUpdate, showVRCXUpdateDialog, showChangeLogDialog } = vrcxUpdaterStore;

    const instanceTypes = ref([
        'invite',
        'invite+',
        'friends',
        'friends+',
        'public',
        'groupPublic',
        'groupPlus',
        'groupOnly'
    ]);

    const ossDialog = ref(false);
    const isLinux = computed(() => LINUX);
    const isMacOS = computed(() => {
        return navigator.platform.indexOf('Mac') > -1;
    });

    const OpenSourceSoftwareNoticeDialog = defineAsyncComponent(
        () => import('../../dialogs/OpenSourceSoftwareNoticeDialog.vue')
    );

    function openOSSDialog() {
        ossDialog.value = true;
    }

    function handleLogout() {
        authStore.logout();
    }
</script>

<style scoped lang="scss">
    .hidden-friends-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 400px;
        overflow-y: auto;
    }

    .hidden-friend-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        transition: background 0.2s ease;

        &:hover {
            background: rgba(255, 255, 255, 0.06);
        }
    }

    .hidden-friend-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        i {
            font-size: 20px;
            color: rgba(255, 255, 255, 0.5);
        }
    }

    .hidden-friend-info {
        flex: 1;
        min-width: 0;
    }

    .hidden-friend-name {
        font-weight: 500;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .hidden-friend-id {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .hidden-friends-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;

        i {
            font-size: 48px;
            margin-bottom: 12px;
            opacity: 0.5;
        }

        p {
            margin: 0;
            font-size: 14px;
        }
    }

    // Dark theme styles
    .dark {
        .hidden-friend-item {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);

            &:hover {
                background: rgba(255, 255, 255, 0.06);
            }
        }

        .hidden-friend-avatar {
            background: rgba(255, 255, 255, 0.05);

            i {
                color: rgba(255, 255, 255, 0.5);
            }
        }

        .hidden-friend-name {
            color: rgba(255, 255, 255, 0.9);
        }

        .hidden-friend-id {
            color: rgba(255, 255, 255, 0.5);
        }

        .hidden-friends-empty {
            color: rgba(255, 255, 255, 0.5);
        }

        .logout-description {
            color: rgba(255, 255, 255, 0.6);
        }

        .legal-notice-container {
            border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
    }

    // Light theme styles
    html:not(.dark) {
        .hidden-friend-item {
            background: #ffffff;
            border: 1px solid #e0e0e0;

            &:hover {
                background: #f0f0f0;
            }
        }

        .hidden-friend-avatar {
            background: #f5f5f5;

            i {
                color: #999999;
            }
        }

        .hidden-friend-name {
            color: #333333;
        }

        .hidden-friend-id {
            color: #666666;
        }

        .hidden-friends-empty {
            color: #999999;
        }

        .logout-description {
            color: #999999;
        }

        .legal-notice-container {
            margin-top: 45px;
            border-top: 1px solid #e0e0e0;
            padding-top: 30px;
        }
    }
</style>
