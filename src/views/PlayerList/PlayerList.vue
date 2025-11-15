<template>
    <div class="x-container" style="padding-top: 5px">
        <div style="display: flex; flex-direction: column; height: 100%">
            <div v-if="currentInstanceWorld.ref.id" style="display: flex">
                <img
                    :src="currentInstanceWorld.ref.thumbnailImageUrl"
                    class="x-link"
                    style="flex: none; width: 160px; height: 120px; border-radius: 4px"
                    @click="showFullscreenImageDialog(currentInstanceWorld.ref.imageUrl)"
                    loading="lazy" />
                <div style="margin-left: 10px; display: flex; flex-direction: column; min-width: 320px; width: 100%">
                    <div>
                        <span
                            class="x-link"
                            style="
                                font-weight: bold;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                display: -webkit-box;
                                -webkit-box-orient: vertical;
                                line-clamp: 1;
                            "
                            @click="showWorldDialog(currentInstanceWorld.ref.id)">
                            <el-icon
                                v-if="
                                    currentUser.$homeLocation &&
                                    currentUser.$homeLocation.worldId === currentInstanceWorld.ref.id
                                "
                                style="margin-right: 5px"
                                ><HomeFilled
                            /></el-icon>
                            {{ currentInstanceWorld.ref.name }}
                        </span>
                    </div>
                    <div>
                        <span
                            class="x-link x-grey"
                            style="font-family: monospace"
                            @click="showUserDialog(currentInstanceWorld.ref.authorId)"
                            v-text="currentInstanceWorld.ref.authorName"></span>
                    </div>
                    <div style="margin-top: 5px">
                        <el-tag
                            v-if="currentInstanceWorld.ref.$isLabs"
                            type="primary"
                            effect="plain"
                            size="small"
                            style="margin-right: 5px"
                            >{{ t('dialog.world.tags.labs') }}</el-tag
                        >
                        <el-tag
                            v-else-if="currentInstanceWorld.ref.releaseStatus === 'public'"
                            type="success"
                            effect="plain"
                            size="small"
                            style="margin-right: 5px"
                            >{{ t('dialog.world.tags.public') }}</el-tag
                        >
                        <el-tag
                            v-else-if="currentInstanceWorld.ref.releaseStatus === 'private'"
                            type="danger"
                            effect="plain"
                            size="small"
                            style="margin-right: 5px"
                            >{{ t('dialog.world.tags.private') }}</el-tag
                        >
                        <el-tag
                            v-if="currentInstanceWorld.isPC"
                            class="x-tag-platform-pc"
                            type="info"
                            effect="plain"
                            size="small"
                            style="margin-right: 5px"
                            ><i class="ri-computer-line"></i>
                            <span
                                v-if="currentInstanceWorld.bundleSizes['standalonewindows']"
                                :class="['x-grey', 'x-tag-platform-pc', 'x-tag-border-left']"
                                >{{ currentInstanceWorld.bundleSizes['standalonewindows'].fileSize }}</span
                            >
                        </el-tag>
                        <el-tag
                            v-if="currentInstanceWorld.isQuest"
                            class="x-tag-platform-quest"
                            type="info"
                            effect="plain"
                            size="small"
                            style="margin-right: 5px"
                            ><i class="ri-android-line"></i>
                            <span
                                v-if="currentInstanceWorld.bundleSizes['android']"
                                :class="['x-grey', 'x-tag-platform-quest', 'x-tag-border-left']"
                                >{{ currentInstanceWorld.bundleSizes['android'].fileSize }}</span
                            >
                        </el-tag>
                        <el-tag
                            v-if="currentInstanceWorld.isIos"
                            class="x-tag-platform-ios"
                            type="info"
                            effect="plain"
                            size="small"
                            style="margin-right: 5px"
                            ><i class="ri-apple-line"></i>
                            <span
                                v-if="currentInstanceWorld.bundleSizes['ios']"
                                :class="['x-grey', 'x-tag-platform-ios', 'x-tag-border-left']"
                                >{{ currentInstanceWorld.bundleSizes['ios'].fileSize }}</span
                            >
                        </el-tag>
                        <el-tag
                            v-if="currentInstanceWorld.avatarScalingDisabled"
                            type="warning"
                            effect="plain"
                            size="small"
                            style="margin-right: 5px; margin-top: 5px"
                            >{{ t('dialog.world.tags.avatar_scaling_disabled') }}</el-tag
                        >
                        <el-tag
                            v-if="currentInstanceWorld.inCache"
                            type="info"
                            effect="plain"
                            size="small"
                            style="margin-right: 5px">
                            <span>{{ currentInstanceWorld.cacheSize }} {{ t('dialog.world.tags.cache') }}</span>
                        </el-tag>
                    </div>
                    <div style="margin-top: 5px">
                        <LocationWorld :locationobject="currentInstanceLocation" :currentuserid="currentUser.id" />
                        <span v-if="lastLocation.playerList.size > 0" style="margin-left: 5px">
                            {{ lastLocation.playerList.size }}
                            <template v-if="lastLocation.friendList.size > 0"
                                >({{ lastLocation.friendList.size }})</template
                            >
                            &nbsp;&horbar; <Timer v-if="lastLocation.date" :epoch="lastLocation.date" />
                        </span>
                    </div>
                    <div style="margin-top: 5px">
                        <span
                            v-show="currentInstanceWorld.ref.name !== currentInstanceWorld.ref.description"
                            :style="{
                                fontSize: '12px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: currentInstanceWorldDescriptionExpanded ? 'none' : '2'
                            }"
                            v-text="currentInstanceWorld.ref.description"></span>
                        <div style="display: flex; justify-content: end">
                            <el-button
                                v-if="
                                    currentInstanceWorld.ref.description.length > 50 &&
                                    !currentInstanceWorldDescriptionExpanded
                                "
                                type="text"
                                size="small"
                                @click="currentInstanceWorldDescriptionExpanded = true"
                                >{{ !currentInstanceWorldDescriptionExpanded && 'Show more' }}</el-button
                            >
                        </div>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; margin-left: 20px">
                    <div class="x-friend-item" style="cursor: default">
                        <div class="detail">
                            <span class="name">{{ t('dialog.world.info.capacity') }}</span>
                            <span class="extra"
                                >{{ commaNumber(currentInstanceWorld.ref.recommendedCapacity) }} ({{
                                    commaNumber(currentInstanceWorld.ref.capacity)
                                }})</span
                            >
                        </div>
                    </div>
                    <div class="x-friend-item" style="cursor: default">
                        <div class="detail">
                            <span class="name">{{ t('dialog.world.info.last_updated') }}</span>
                            <span class="extra">{{ formatDateFilter(currentInstanceWorld.lastUpdated, 'long') }}</span>
                        </div>
                    </div>
                    <div class="x-friend-item" style="cursor: default">
                        <div class="detail">
                            <span class="name">{{ t('dialog.world.info.created_at') }}</span>
                            <span class="extra">{{
                                formatDateFilter(currentInstanceWorld.ref.created_at, 'long')
                            }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="photonLoggingEnabled" style="margin-bottom: 10px">
                <PhotonEventTable @show-chatbox-blacklist="showChatboxBlacklistDialog" />
            </div>

            <div class="current-instance-table">
                <DataTable
                    v-bind="currentInstanceUsersTable"
                    style="margin-top: 10px; cursor: pointer"
                    @row-click="selectCurrentInstanceRow">
                    <el-table-column :label="t('table.playerList.avatar')" width="70" prop="photo">
                        <template #default="scope">
                            <template v-if="userImage(scope.row.ref)">
                                <el-popover placement="right" :width="500" trigger="hover">
                                    <template #reference>
                                        <img
                                            :src="userImage(scope.row.ref)"
                                            class="friends-list-avatar"
                                            loading="lazy" />
                                    </template>
                                    <img
                                        :src="userImageFull(scope.row.ref)"
                                        :class="['friends-list-avatar', 'x-popover-image']"
                                        style="cursor: pointer"
                                        @click="showFullscreenImageDialog(userImageFull(scope.row.ref))"
                                        loading="lazy" />
                                </el-popover>
                            </template>
                        </template>
                    </el-table-column>
                    <el-table-column :label="t('table.playerList.timer')" width="90" prop="timer" sortable>
                        <template #default="scope">
                            <Timer :epoch="scope.row.timer" />
                        </template>
                    </el-table-column>
                    <el-table-column
                        v-if="photonLoggingEnabled"
                        :label="t('table.playerList.photonId')"
                        width="110"
                        prop="photonId"
                        sortable>
                        <template #default="scope">
                            <template v-if="chatboxUserBlacklist.has(scope.row.ref.id)">
                                <el-tooltip placement="left" content="Unblock chatbox messages">
                                    <el-button
                                        type="text"
                                        :icon="Mute"
                                        size="small"
                                        style="color: red; margin-right: 5px"
                                        @click.stop="deleteChatboxUserBlacklist(scope.row.ref.id)"></el-button>
                                </el-tooltip>
                            </template>
                            <template v-else>
                                <el-tooltip placement="left" content="Block chatbox messages">
                                    <el-button
                                        type="text"
                                        :icon="Microphone"
                                        size="small"
                                        style="margin-right: 5px"
                                        @click.stop="addChatboxUserBlacklist(scope.row.ref)"></el-button>
                                </el-tooltip>
                            </template>
                            <span v-text="scope.row.photonId"></span>
                        </template>
                    </el-table-column>
                    <el-table-column
                        :label="t('table.playerList.icon')"
                        prop="isMaster"
                        width="90"
                        align="center"
                        sortable
                        :sort-method="sortInstanceIcon">
                        <template #default="scope">
                            <span></span>
                            <el-tooltip v-if="scope.row.isMaster" placement="left" content="Instance Master">
                                <span>👑</span>
                            </el-tooltip>
                            <el-tooltip v-if="scope.row.isModerator" placement="left" content="Moderator">
                                <span>⚔️</span>
                            </el-tooltip>
                            <el-tooltip v-if="scope.row.isFriend" placement="left" content="Friend">
                                <span>💚</span>
                            </el-tooltip>
                            <el-tooltip v-if="scope.row.isBlocked" placement="left" content="Blocked">
                                <el-icon style="color: red"><CircleClose /></el-icon>
                            </el-tooltip>
                            <el-tooltip v-if="scope.row.isMuted" placement="left" content="Muted">
                                <el-icon style="color: orange"><Mute /></el-icon>
                            </el-tooltip>
                            <el-tooltip
                                v-if="scope.row.isAvatarInteractionDisabled"
                                placement="left"
                                content="Avatar Interaction Disabled
                                    ">
                                <el-icon style="color: orange"><Pointer /></el-icon>
                            </el-tooltip>
                            <el-tooltip v-if="scope.row.isChatBoxMuted" placement="left" content="Chatbox Muted">
                                <el-icon style="color: orange"><ChatLineRound /></el-icon>
                            </el-tooltip>
                            <el-tooltip v-if="scope.row.timeoutTime" placement="left" content="Timeout">
                                <span style="color: red">🔴{{ scope.row.timeoutTime }}s</span>
                            </el-tooltip>
                            <el-tooltip v-if="scope.row.ageVerified" placement="left" content="18+ Verified">
                                <i class="ri-id-card-line"></i>
                            </el-tooltip>
                        </template>
                    </el-table-column>
                    <el-table-column :label="t('table.playerList.platform')" prop="inVRMode" width="90">
                        <template #default="scope">
                            <template v-if="scope.row.ref.$platform">
                                <span v-if="scope.row.ref.$platform === 'standalonewindows'" style="color: #409eff"
                                    ><i class="ri-computer-line"></i
                                ></span>
                                <span v-else-if="scope.row.ref.$platform === 'android'" style="color: #67c23a"
                                    ><i class="ri-android-line"></i
                                ></span>
                                <span v-else-if="scope.row.ref.$platform === 'ios'" style="color: #c7c7ce"
                                    ><i class="ri-apple-line"></i
                                ></span>
                                <span v-else>{{ scope.row.ref.$platform }}</span>
                            </template>
                            <template v-if="scope.row.inVRMode !== null">
                                <span v-if="scope.row.inVRMode">VR</span>
                                <span
                                    v-else-if="
                                        scope.row.ref.last_platform === 'android' ||
                                        scope.row.ref.last_platform === 'ios'
                                    "
                                    >M</span
                                >
                                <span v-else>D</span>
                            </template>
                        </template>
                    </el-table-column>
                    <el-table-column
                        :label="t('table.playerList.displayName')"
                        min-width="140"
                        prop="displayName"
                        :sortable="true">
                        <template #default="scope">
                            <span
                                v-if="randomUserColours"
                                :style="{ color: scope.row.ref.$userColour }"
                                v-text="scope.row.ref.displayName"></span>
                            <span v-else v-text="scope.row.ref.displayName"></span>
                        </template>
                    </el-table-column>
                    <el-table-column :label="t('table.playerList.status')" min-width="180" prop="ref.status">
                        <template #default="scope">
                            <template v-if="scope.row.ref.status">
                                <i
                                    class="x-user-status"
                                    :class="statusClass(scope.row.ref.status)"
                                    style="margin-right: 3px"></i>
                                <span v-text="scope.row.ref.statusDescription"></span>
                                <!--//- el-table-column(label="Group" min-width="180" prop="groupOnNameplate" sortable)-->
                                <!--//-     template(v-once #default="scope")-->
                                <!--//-         span(v-text="scope.row.groupOnNameplate")-->
                            </template>
                        </template>
                    </el-table-column>
                    <el-table-column
                        :label="t('table.playerList.rank')"
                        width="110"
                        prop="$trustSortNum"
                        :sortable="true">
                        <template #default="scope">
                            <span
                                class="name"
                                :class="scope.row.ref.$trustClass"
                                v-text="scope.row.ref.$trustLevel"></span>
                        </template>
                    </el-table-column>
                    <el-table-column :label="t('table.playerList.language')" width="100" prop="ref.$languages">
                        <template #default="scope">
                            <el-tooltip v-for="item in scope.row.ref.$languages" :key="item.key" placement="top">
                                <template #content>
                                    <span>{{ item.value }} ({{ item.key }})</span>
                                </template>
                                <span
                                    class="flags"
                                    :class="languageClass(item.key)"
                                    style="display: inline-block; margin-right: 5px"></span>
                            </el-tooltip>
                        </template>
                    </el-table-column>
                    <el-table-column :label="t('table.playerList.bioLink')" width="100" prop="ref.bioLinks">
                        <template #default="scope">
                            <div style="display: flex; align-items: center">
                                <el-tooltip
                                    v-for="(link, index) in scope.row.ref.bioLinks?.filter(Boolean)"
                                    :key="index">
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
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column :label="t('table.playerList.note')" width="150" prop="ref.note">
                        <template #default="scope">
                            <span v-text="scope.row.ref.note"></span>
                        </template>
                    </el-table-column>
                </DataTable>
            </div>
        </div>
        <ChatboxBlacklistDialog
            :chatbox-blacklist-dialog="chatboxBlacklistDialog"
            @delete-chatbox-user-blacklist="deleteChatboxUserBlacklist" />
    </div>
</template>

<script setup>
    import { ChatLineRound, CircleClose, HomeFilled, Microphone, Mute, Pointer } from '@element-plus/icons-vue';
    import { defineAsyncComponent, ref } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import {
        commaNumber,
        formatDateFilter,
        getFaviconUrl,
        languageClass,
        openExternalLink,
        statusClass,
        userImage,
        userImageFull
    } from '../../shared/utils';
    import {
        useAppearanceSettingsStore,
        useGalleryStore,
        useInstanceStore,
        useLocationStore,
        usePhotonStore,
        useUiStore,
        useUserStore,
        useWorldStore
    } from '../../stores';

    import ChatboxBlacklistDialog from './dialogs/ChatboxBlacklistDialog.vue';

    const PhotonEventTable = defineAsyncComponent(() => import('./components/PhotonEventTable.vue'));

    const { randomUserColours } = storeToRefs(useAppearanceSettingsStore());
    const photonStore = usePhotonStore();
    const { photonLoggingEnabled, chatboxUserBlacklist } = storeToRefs(photonStore);
    const { saveChatboxUserBlacklist } = photonStore;
    const { showUserDialog, lookupUser } = useUserStore();
    const { showWorldDialog } = useWorldStore();
    const { lastLocation } = storeToRefs(useLocationStore());
    const { currentInstanceLocation, currentInstanceWorld } = storeToRefs(useInstanceStore());
    const { getCurrentInstanceUserList } = useInstanceStore();
    const { currentInstanceUsersTable } = storeToRefs(useInstanceStore());
    const { showFullscreenImageDialog } = useGalleryStore();
    const { currentUser } = storeToRefs(useUserStore());

    const { t } = useI18n();

    const chatboxBlacklistDialog = ref({
        visible: false,
        loading: false
    });

    const currentInstanceWorldDescriptionExpanded = ref(false);

    function showChatboxBlacklistDialog() {
        const D = chatboxBlacklistDialog.value;
        D.visible = true;
    }

    function selectCurrentInstanceRow(val) {
        if (val === null) {
            return;
        }
        const ref = val.ref;
        if (ref.id) {
            showUserDialog(ref.id);
        } else {
            lookupUser(ref);
        }
    }

    async function deleteChatboxUserBlacklist(userId) {
        chatboxUserBlacklist.value.delete(userId);
        await saveChatboxUserBlacklist();
        getCurrentInstanceUserList();
    }

    async function addChatboxUserBlacklist(user) {
        chatboxUserBlacklist.value.set(user.id, user.displayName);
        await saveChatboxUserBlacklist();
        getCurrentInstanceUserList();
    }

    function sortInstanceIcon(a, b) {
        const getValue = (item) => {
            let value = 0;
            if (item.isMaster) value += 1000;
            if (item.isModerator) value += 500;
            if (item.isFriend) value += 200;
            if (item.isBlocked) value -= 100;
            if (item.isMuted) value -= 50;
            if (item.isAvatarInteractionDisabled) value -= 20;
            if (item.isChatBoxMuted) value -= 10;
            return value;
        };
        return getValue(b) - getValue(a);
    }
</script>

<style scoped lang="scss">
    .x-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        
        > div:first-child {
            padding: 16px 20px;
            border-radius: 16px;
        }

        // Dark theme controls
        .dark & > div:first-child {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        // Light theme controls
        html:not(.dark) & > div:first-child {
            background: #f0f0f0;
            border: 1px solid #e0e0e0;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
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
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
        
        // Dark theme tag
        .dark :deep(.el-tag) {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: rgba(255, 255, 255, 0.9);
        }

        // Light theme tag
        html:not(.dark) :deep(.el-tag) {
            background: #f0f0f0;
            border: 1px solid #e0e0e0;
            color: #333333;
        }
    }
</style>