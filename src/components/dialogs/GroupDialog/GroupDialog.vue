<template>
    <el-dialog
        :z-index="groupDialogIndex"
        v-model="groupDialog.visible"
        :show-close="false"
        width="1100px"
        top="0"
        class="x-dialog x-group-dialog group-dialog-modern">
        <div v-loading="groupDialog.loading" class="group-dialog-container">
            <!-- Modern Header -->
            <div class="group-dialog-header">
                <div class="group-profile-header">
                    <!-- Banner Section (shows group banner) -->
                    <div class="group-profile-header__banner">
                        <img
                            v-if="groupDialog.ref.bannerUrl"
                            class="group-profile-header__banner-image x-link"
                            :src="groupDialog.ref.bannerUrl"
                            @click="showFullscreenImageDialog(groupDialog.ref.bannerUrl)"
                            loading="lazy" />
                        <div class="group-profile-header__banner-overlay"></div>
                    </div>

                    <!-- Content Section -->
                    <div class="group-profile-header__content">
                        <!-- Group Icon positioned to overlap banner -->
                        <div class="group-profile-header__icon-wrapper">
                            <div class="group-profile-header__icon-container">
                                <img
                                    class="group-profile-header__icon x-link"
                                    :src="groupDialog.ref.iconUrl"
                                    @click="showFullscreenImageDialog(groupDialog.ref.iconUrl)"
                                    loading="lazy" />
                            </div>
                        </div>
                        <!-- Top Row: Name, Actions -->
                        <div class="group-profile-header__top-row">
                            <div class="group-profile-header__name-section">
                                <div class="group-profile-header__name-group">
                                    <h1 
                                        class="group-profile-header__name"
                                        v-text="groupDialog.ref.name"
                                        @click="copyToClipboard(groupDialog.ref.name)"></h1>
                                    <span
                                        v-if="groupDialog.ref.ownerId === currentUser.id"
                                        class="group-profile-header__owner-badge">👑</span>
                                    <span
                                        class="group-profile-header__discriminator x-grey">
                                        {{ groupDialog.ref.shortCode }}.{{ groupDialog.ref.discriminator }}
                                    </span>
                                </div>
                                <div class="group-profile-header__identity">
                                    <el-tooltip v-for="item in groupDialog.ref.$languages" :key="item.key" placement="top">
                                        <template #content>
                                            <span>{{ item.value }} ({{ item.key }})</span>
                                        </template>
                                        <span class="flags group-profile-header__flag" :class="languageClass(item.key)"></span>
                                    </el-tooltip>
                                    <span
                                        class="group-profile-header__identity-item x-link x-grey"
                                        @click="showUserDialog(groupDialog.ref.ownerId)"
                                        v-text="groupDialog.ownerDisplayName"></span>
                                </div>
                            </div>
                            <div class="group-profile-header__actions">
                                <div style="flex: none">
                                    <template v-if="groupDialog.inGroup && groupDialog.ref?.myMember">
                                        <el-tooltip
                                            v-if="groupDialog.ref.myMember?.isRepresenting"
                                            placement="top"
                                            :content="t('dialog.group.actions.unrepresent_tooltip')">
                                            <el-button
                                                type="warning"
                                                :icon="Star"
                                                size="large"
                                                circle
                                                style="margin-left: 5px"
                                                @click="clearGroupRepresentation(groupDialog.id)"></el-button>
                                        </el-tooltip>
                                        <el-tooltip v-else placement="top" :content="t('dialog.group.actions.represent_tooltip')">
                                            <el-button
                                                type="default"
                                                :icon="StarFilled"
                                                size="large"
                                                circle
                                                style="margin-left: 5px"
                                                :disabled="groupDialog.ref.privacy === 'private'"
                                                @click="setGroupRepresentation(groupDialog.id)"></el-button>
                                        </el-tooltip>
                                    </template>
                                    <el-dropdown trigger="click" size="small" @command="groupDialogCommand" style="margin-left: 5px">
                                        <el-button
                                            :type="groupDialog.ref.membershipStatus === 'userblocked' ? 'danger' : 'default'"
                                            :icon="MoreFilled"
                                            size="large"
                                            circle></el-button>
                                        <template #dropdown>
                                            <el-dropdown-menu>
                                                <el-dropdown-item :icon="Refresh" command="Refresh">
                                                    {{ t('dialog.group.actions.refresh') }}
                                                </el-dropdown-item>
                                                <el-dropdown-item :icon="Share" command="Share">
                                                    {{ t('dialog.group.actions.share') }}
                                                </el-dropdown-item>
                                                <template v-if="groupDialog.inGroup">
                                                    <template v-if="groupDialog.ref.myMember">
                                                        <el-dropdown-item
                                                            v-if="groupDialog.ref.myMember.isSubscribedToAnnouncements"
                                                            :icon="MuteNotification"
                                                            command="Unsubscribe To Announcements"
                                                            divided>
                                                            {{ t('dialog.group.actions.unsubscribe') }}
                                                        </el-dropdown-item>
                                                        <el-dropdown-item
                                                            v-else
                                                            :icon="Bell"
                                                            command="Subscribe To Announcements"
                                                            divided>
                                                            {{ t('dialog.group.actions.subscribe') }}
                                                        </el-dropdown-item>
                                                        <el-dropdown-item
                                                            v-if="hasGroupPermission(groupDialog.ref, 'group-invites-manage')"
                                                            :icon="Message"
                                                            command="Invite To Group">
                                                            {{ t('dialog.group.actions.invite_to_group') }}
                                                        </el-dropdown-item>
                                                        <template v-if="hasGroupPermission(groupDialog.ref, 'group-announcement-manage')">
                                                            <el-dropdown-item :icon="Tickets" command="Create Post">
                                                                {{ t('dialog.group.actions.create_post') }}
                                                            </el-dropdown-item>
                                                        </template>
                                                        <el-dropdown-item
                                                            :disabled="!hasGroupModerationPermission(groupDialog.ref)"
                                                            :icon="Operation"
                                                            command="Moderation Tools">
                                                            {{ t('dialog.group.actions.moderation_tools') }}
                                                        </el-dropdown-item>
                                                        <template v-if="groupDialog.ref.myMember && groupDialog.ref.privacy === 'default'">
                                                            <el-dropdown-item :icon="View" command="Visibility Everyone" divided>
                                                                <el-icon v-if="groupDialog.ref.myMember.visibility === 'visible'"><Check /></el-icon>
                                                                {{ t('dialog.group.actions.visibility_everyone') }}
                                                            </el-dropdown-item>
                                                            <el-dropdown-item :icon="View" command="Visibility Friends">
                                                                <el-icon v-if="groupDialog.ref.myMember.visibility === 'friends'"><Check /></el-icon>
                                                                {{ t('dialog.group.actions.visibility_friends') }}
                                                            </el-dropdown-item>
                                                            <el-dropdown-item :icon="View" command="Visibility Hidden">
                                                                <el-icon v-if="groupDialog.ref.myMember.visibility === 'hidden'"><Check /></el-icon>
                                                                {{ t('dialog.group.actions.visibility_hidden') }}
                                                            </el-dropdown-item>
                                                        </template>
                                                        <el-dropdown-item :icon="Delete" command="Leave Group" style="color: #f56c6c" divided>
                                                            {{ t('dialog.group.actions.leave') }}
                                                        </el-dropdown-item>
                                                    </template>
                                                </template>
                                                <template v-else>
                                                    <el-dropdown-item
                                                        v-if="groupDialog.ref.membershipStatus === 'userblocked'"
                                                        :icon="CircleCheck"
                                                        command="Unblock Group"
                                                        style="color: #f56c6c"
                                                        divided>
                                                        {{ t('dialog.group.actions.unblock') }}
                                                    </el-dropdown-item>
                                                    <el-dropdown-item v-else :icon="CircleClose" command="Block Group" divided>
                                                        {{ t('dialog.group.actions.block') }}
                                                    </el-dropdown-item>
                                                </template>
                                            </el-dropdown-menu>
                                        </template>
                                    </el-dropdown>
                                </div>
                            </div>
                        </div>

                        <!-- Tags Row -->
                        <div class="group-profile-header__tags-row" v-show="!groupDialog.loading">
                            <el-tag
                                v-if="groupDialog.ref.isVerified"
                                type="info"
                                effect="plain"
                                size="small"
                                class="group-profile-header__tag">
                                {{ t('dialog.group.tags.verified') }}
                            </el-tag>
                            <el-tag
                                v-if="groupDialog.ref.privacy === 'private'"
                                type="danger"
                                effect="plain"
                                size="small"
                                class="group-profile-header__tag">
                                {{ t('dialog.group.tags.private') }}
                            </el-tag>
                            <el-tag
                                v-if="groupDialog.ref.privacy === 'default'"
                                type="success"
                                effect="plain"
                                size="small"
                                class="group-profile-header__tag">
                                {{ t('dialog.group.tags.public') }}
                            </el-tag>
                            <el-tag
                                v-if="groupDialog.ref.joinState === 'open'"
                                type="success"
                                effect="plain"
                                size="small"
                                class="group-profile-header__tag">
                                {{ t('dialog.group.tags.open') }}
                            </el-tag>
                            <el-tag
                                v-else-if="groupDialog.ref.joinState === 'request'"
                                type="warning"
                                effect="plain"
                                size="small"
                                class="group-profile-header__tag">
                                {{ t('dialog.group.tags.request') }}
                            </el-tag>
                            <el-tag
                                v-else-if="groupDialog.ref.joinState === 'invite'"
                                type="danger"
                                effect="plain"
                                size="small"
                                class="group-profile-header__tag">
                                {{ t('dialog.group.tags.invite') }}
                            </el-tag>
                            <el-tag
                                v-else-if="groupDialog.ref.joinState === 'closed'"
                                type="danger"
                                effect="plain"
                                size="small"
                                class="group-profile-header__tag">
                                {{ t('dialog.group.tags.closed') }}
                            </el-tag>
                            <el-tag
                                v-if="groupDialog.inGroup"
                                type="info"
                                effect="plain"
                                size="small"
                                class="group-profile-header__tag">
                                {{ t('dialog.group.tags.joined') }}
                            </el-tag>
                            <el-tag
                                v-if="groupDialog.ref.myMember && groupDialog.ref.myMember.bannedAt"
                                type="danger"
                                effect="plain"
                                size="small"
                                class="group-profile-header__tag">
                                {{ t('dialog.group.tags.banned') }}
                            </el-tag>
                            <template v-if="groupDialog.inGroup && groupDialog.ref.myMember">
                                <el-tag
                                    v-if="groupDialog.ref.myMember.visibility === 'visible'"
                                    type="info"
                                    effect="plain"
                                    size="small"
                                    class="group-profile-header__tag">
                                    {{ t('dialog.group.tags.visible') }}
                                </el-tag>
                                <el-tag
                                    v-else-if="groupDialog.ref.myMember.visibility === 'friends'"
                                    type="info"
                                    effect="plain"
                                    size="small"
                                    class="group-profile-header__tag">
                                    {{ t('dialog.group.tags.friends') }}
                                </el-tag>
                                <el-tag
                                    v-else-if="groupDialog.ref.myMember.visibility === 'hidden'"
                                    type="info"
                                    effect="plain"
                                    size="small"
                                    class="group-profile-header__tag">
                                    {{ t('dialog.group.tags.hidden') }}
                                </el-tag>
                                <el-tag
                                    v-if="groupDialog.ref.myMember.isSubscribedToAnnouncements"
                                    type="info"
                                    effect="plain"
                                    size="small"
                                    class="group-profile-header__tag">
                                    {{ t('dialog.group.tags.subscribed') }}
                                </el-tag>
                            </template>
                        </div>

                        <!-- Description -->
                        <div
                            v-if="groupDialog.ref.description && groupDialog.ref.name !== groupDialog.ref.description"
                            class="group-profile-header__description">
                            <pre v-text="groupDialog.ref.description"></pre>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabs Section -->
            <div class="group-dialog-body">
                <div class="group-dialog-tabs-container">
                    <el-tabs v-model="groupDialogLastActiveTab" @tab-click="groupDialogTabClick" class="group-dialog-tabs">
                        <el-tab-pane name="Info" :label="t('dialog.group.info.header')">
                            <div class="tab-content-wrapper">
                                <div class="tab-section-card">
                                    <div class="group-banner-image-info" v-if="groupDialog.ref.bannerUrl">
                                        <img
                                            :src="groupDialog.ref.bannerUrl"
                                            class="x-link"
                                            style="width: 100%; aspect-ratio: 6/1; object-fit: cover; border-radius: 8px"
                                            @click="showFullscreenImageDialog(groupDialog.ref.bannerUrl)"
                                            loading="lazy" />
                                    </div>
                                </div>
                                <div class="tab-content-body">
                                    <div class="x-friend-list tab-content-list">
                                        <span
                                            v-if="groupDialog.instances.length"
                                            style="font-size: 12px; font-weight: bold; margin: 5px">
                                            {{ t('dialog.group.info.instances') }}
                                        </span>
                                        <div v-for="room in groupDialog.instances" :key="room.tag" style="width: 100%">
                                            <div style="margin: 5px 0">
                                                <Location :location="room.tag" style="display: inline-block" />
                                                <InviteYourself :location="room.tag" style="margin-left: 5px" />
                                                <el-tooltip placement="top" content="Refresh player count">
                                                    <el-button
                                                        size="small"
                                                        :icon="Refresh"
                                                        style="margin-left: 5px"
                                                        circle
                                                        @click="refreshInstancePlayerCount(room.tag)" />
                                                </el-tooltip>
                                                <LastJoin :location="room.tag" :currentlocation="lastLocation.location" />
                                                <InstanceInfo
                                                    :location="room.tag"
                                                    :instance="room.ref"
                                                    :friendcount="room.friendCount" />
                                            </div>
                                            <div
                                                v-if="room.users.length"
                                                class="x-friend-list"
                                                style="margin: 10px 0; padding: 0; max-height: unset">
                                                <div
                                                    v-for="user in room.users"
                                                    :key="user.id"
                                                    class="x-friend-item x-friend-item-border"
                                                    @click="showUserDialog(user.id)">
                                                    <div class="avatar" :class="userStatusClass(user)">
                                                        <img :src="userImage(user)" loading="lazy" />
                                                    </div>
                                                    <div class="detail">
                                                        <span
                                                            class="name"
                                                            :style="{ color: user.$userColour }"
                                                            v-text="user.displayName" />
                                                        <span v-if="user.location === 'traveling'" class="extra">
                                                            <el-icon class="is-loading" style="margin-right: 3px"><Loading /></el-icon>
                                                            <Timer :epoch="user.$travelingToTime" />
                                                        </span>
                                                        <span v-else class="extra">
                                                            <Timer :epoch="user.$location_at" />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="x-friend-item" style="width: 100%; cursor: default">
                                            <div class="detail">
                                                <span class="name">{{ t('dialog.group.info.announcement') }}</span>
                                                <span style="display: block" v-text="groupDialog.announcement.title" />
                                                <div
                                                    v-if="groupDialog.announcement.imageUrl"
                                                    style="display: inline-block; margin-right: 5px">
                                                    <img
                                                        :src="groupDialog.announcement.imageUrl"
                                                        class="x-link"
                                                        style="
                                                            flex: none;
                                                            width: 60px;
                                                            height: 60px;
                                                            border-radius: 4px;
                                                            object-fit: cover;
                                                        "
                                                        @click="showFullscreenImageDialog(groupDialog.announcement.imageUrl)"
                                                        loading="lazy" />
                                                </div>
                                                <pre
                                                    class="extra"
                                                    style="
                                                        display: inline-block;
                                                        vertical-align: top;
                                                        font-family: inherit;
                                                        font-size: 12px;
                                                        white-space: pre-wrap;
                                                        margin: 0;
                                                    "
                                                    >{{ groupDialog.announcement.text || '-' }}</pre
                                                >
                                                <br />
                                                <div
                                                    v-if="groupDialog.announcement.id"
                                                    class="extra"
                                                    style="float: right; margin-left: 5px">
                                                    <el-tooltip v-if="groupDialog.announcement.roleIds.length" placement="top">
                                                        <template #content>
                                                            <span>{{ t('dialog.group.posts.visibility') }}</span>
                                                            <br />
                                                            <template v-for="roleId in groupDialog.announcement.roleIds" :key="roleId">
                                                                <template v-for="role in groupDialog.ref.roles" :key="roleId + role.id"
                                                                    ><span v-if="role.id === roleId" v-text="role.name"
                                                                /></template>
                                                                <span
                                                                    v-if="
                                                                        groupDialog.announcement.roleIds.indexOf(roleId) <
                                                                        groupDialog.announcement.roleIds.length - 1
                                                                    ">
                                                                    ,&nbsp;
                                                                </span>
                                                            </template>
                                                        </template>
                                                        <el-icon style="margin-right: 5px"><View /></el-icon>
                                                    </el-tooltip>
                                                    <DisplayName
                                                        :userid="groupDialog.announcement.authorId"
                                                        style="margin-right: 5px" />
                                                    <span v-if="groupDialog.announcement.editorId" style="margin-right: 5px">
                                                        ({{ t('dialog.group.posts.edited_by') }}
                                                        <DisplayName :userid="groupDialog.announcement.editorId" />)
                                                    </span>
                                                    <el-tooltip placement="bottom">
                                                        <template #content>
                                                            <span
                                                                >{{ t('dialog.group.posts.created_at') }}
                                                                {{ formatDateFilter(groupDialog.announcement.createdAt, 'long') }}</span
                                                            >
                                                            <template
                                                                v-if="
                                                                    groupDialog.announcement.updatedAt !==
                                                                    groupDialog.announcement.createdAt
                                                                ">
                                                                <br />
                                                                <span
                                                                    >{{ t('dialog.group.posts.edited_at') }}
                                                                    {{
                                                                        formatDateFilter(groupDialog.announcement.updatedAt, 'long')
                                                                    }}</span
                                                                >
                                                            </template>
                                                        </template>
                                                        <Timer :epoch="Date.parse(groupDialog.announcement.updatedAt)" />
                                                    </el-tooltip>
                                                    <template v-if="hasGroupPermission(groupDialog.ref, 'group-announcement-manage')">
                                                        <el-tooltip placement="top" :content="t('dialog.group.posts.edit_tooltip')">
                                                            <el-button
                                                                type="text"
                                                                :icon="Edit"
                                                                size="small"
                                                                style="margin-left: 5px; padding: 0"
                                                                @click="
                                                                    showGroupPostEditDialog(groupDialog.id, groupDialog.announcement)
                                                                " />
                                                        </el-tooltip>
                                                        <el-tooltip placement="top" :content="t('dialog.group.posts.delete_tooltip')">
                                                            <el-button
                                                                type="text"
                                                                :icon="Delete"
                                                                size="small"
                                                                style="margin-left: 5px; padding: 0"
                                                                @click="confirmDeleteGroupPost(groupDialog.announcement)" />
                                                        </el-tooltip>
                                                    </template>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="x-friend-item" style="width: 100%; cursor: default">
                                            <div class="detail">
                                                <span class="name">{{ t('dialog.group.info.rules') }}</span>
                                                <pre
                                                    class="extra"
                                                    style="
                                                        font-family: inherit;
                                                        font-size: 12px;
                                                        white-space: pre-wrap;
                                                        margin: 0 0.5em 0 0;
                                                    "
                                                    >{{ groupDialog.ref.rules || '-' }}</pre
                                                >
                                            </div>
                                        </div>
                                        <div class="x-friend-item" style="cursor: default">
                                            <div class="detail">
                                                <span class="name">{{ t('dialog.group.info.links') }}</span>
                                                <div
                                                    v-if="groupDialog.ref.links && groupDialog.ref.links.length > 0"
                                                    style="margin-top: 5px">
                                                    <template v-for="(link, index) in groupDialog.ref.links" :key="index">
                                                        <el-tooltip v-if="link">
                                                            <template #content>
                                                                <span v-text="link" />
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
                                                </div>
                                                <div v-else class="extra">-</div>
                                            </div>
                                        </div>
                                        <div class="x-friend-item" style="width: 350px; cursor: default">
                                            <div class="detail">
                                                <span class="name">{{ t('dialog.group.info.member_count') }}</span>
                                                <span class="extra" v-text="groupDialog.ref.memberCount"></span>
                                            </div>
                                        </div>
                                        <div class="x-friend-item" style="width: 350px; cursor: default">
                                            <div class="detail">
                                                <span class="name">{{ t('dialog.group.info.created_at') }}</span>
                                                <span class="extra">{{ formatDateFilter(groupDialog.ref.createdAt, 'long') }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </el-tab-pane>
                        <el-tab-pane name="Posts" :label="t('dialog.group.posts.header')" lazy>
                            <div class="tab-content-wrapper">
                                <div class="tab-section-header">
                                    <template v-if="groupDialog.visible">
                                        <span style="margin-right: 10px; vertical-align: top"
                                            >{{ t('dialog.group.posts.posts_count') }} {{ groupDialog.posts.length }}</span
                                        >
                                    </template>
                                </div>
                                <div class="tab-content-body">
                                    <div class="x-friend-list tab-content-list">
                                        <!-- Posts content will go here -->
                                    </div>
                                </div>
                            </div>
                        </el-tab-pane>
                    </el-tabs>
                </div>
            </div>
        </div>
        <GroupPostEditDialog :dialog-data="groupPostEditDialog" :selected-gallery-file="selectedGalleryFile" />
        <PreviousInstancesGroupDialog
            :previous-instances-group-dialog="previousInstancesGroupDialog"
            :current-user="currentUser" />
    </el-dialog>
</template>

<script setup>
    import {
        ArrowDown,
        Bell,
        ChatLineSquare,
        Check,
        CircleCheck,
        CircleClose,
        Close,
        CollectionTag,
        CopyDocument,
        Delete,
        Download,
        Edit,
        Loading,
        Message,
        MoreFilled,
        MuteNotification,
        Operation,
        Refresh,
        Share,
        Star,
        StarFilled,
        Tickets,
        View,
        Warning
    } from '@element-plus/icons-vue';
    import { nextTick, reactive, ref, watch } from 'vue';
    import { ElMessage, ElMessageBox } from 'element-plus';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import {
        buildTreeData,
        copyToClipboard,
        debounce,
        downloadAndSaveJson,
        formatDateFilter,
        getFaviconUrl,
        hasGroupModerationPermission,
        hasGroupPermission,
        languageClass,
        openExternalLink,
        refreshInstancePlayerCount,
        removeFromArray,
        userImage,
        userStatusClass
    } from '../../../shared/utils';
    import { useGalleryStore, useGroupStore, useLocationStore, useUserStore } from '../../../stores';
    import { groupDialogFilterOptions, groupDialogSortingOptions } from '../../../shared/constants';
    import { getNextDialogIndex } from '../../../shared/utils/base/ui';
    import { groupRequest } from '../../../api';

    import GroupPostEditDialog from './GroupPostEditDialog.vue';
    import PreviousInstancesGroupDialog from '../PreviousInstancesDialog/PreviousInstancesGroupDialog.vue';

    import * as workerTimers from 'worker-timers';

    const { t } = useI18n();

    const { showUserDialog } = useUserStore();
    const { currentUser } = storeToRefs(useUserStore());
    const { groupDialog, inviteGroupDialog } = storeToRefs(useGroupStore());
    const {
        getGroupDialogGroup,
        updateGroupPostSearch,
        showGroupDialog,
        leaveGroupPrompt,
        setGroupVisibility,
        setGroupSubscription,
        applyGroupMember,
        handleGroupMember,
        showGroupMemberModerationDialog
    } = useGroupStore();

    const { lastLocation } = storeToRefs(useLocationStore());
    const { showFullscreenImageDialog } = useGalleryStore();

    const groupDialogLastActiveTab = ref('Info');
    const groupDialogIndex = ref(2000);
    const isGroupMembersDone = ref(false);
    const isGroupMembersLoading = ref(false);
    const groupDialogGalleryCurrentName = ref('0');
    const groupDialogTabCurrentName = ref('0');
    const isGroupGalleryLoading = ref(false);
    const selectedGalleryFile = ref({
        selectedFileId: '',
        selectedImageUrl: ''
    });
    const groupPostEditDialog = reactive({
        visible: false,
        groupRef: {},
        title: '',
        text: '',
        sendNotification: true,
        visibility: 'group',
        roleIds: [],
        postId: '',
        groupId: ''
    });

    const previousInstancesGroupDialog = ref({
        visible: false,
        openFlg: false,
        groupRef: {}
    });

    let loadMoreGroupMembersParams = ref({
        n: 100,
        offset: 0,
        groupId: '',
        sort: '',
        roleId: ''
    });

    watch(
        () => groupDialog.value.loading,
        () => {
            if (groupDialog.value.visible) {
                nextTick(() => {
                    groupDialogIndex.value = getNextDialogIndex();
                });
            }
        }
    );

    watch(
        () => groupDialog.value.isGetGroupDialogGroupLoading,
        (val) => {
            if (val) {
                loadLastActiveTab();
            }
        }
    );

    function showInviteGroupDialog(groupId, userId) {
        if (groupId) {
            inviteGroupDialog.value.groupId = groupId;
        }
        if (userId) {
            inviteGroupDialog.value.userId = userId;
        }
        inviteGroupDialog.value.visible = true;
    }

    function showPreviousInstancesGroupDialog(groupRef) {
        const D = previousInstancesGroupDialog.value;
        D.groupRef = groupRef;
        D.visible = true;
        D.openFlg = true;
        nextTick(() => (D.openFlg = false));
    }

    function setGroupRepresentation(groupId) {
        handleGroupRepresentationChange(groupId, true);
    }
    function clearGroupRepresentation(groupId) {
        handleGroupRepresentationChange(groupId, false);
    }

    function groupMembersSearch() {
        if (groupDialog.value.memberSearch.length < 3) {
            groupDialog.value.memberSearchResults = [];
            isGroupMembersLoading.value = false;
            return;
        }
        debounce(groupMembersSearchDebounced, 200)();
    }

    function groupMembersSearchDebounced() {
        const D = groupDialog.value;
        const search = D.memberSearch;
        D.memberSearchResults = [];
        if (!search || search.length < 3) {
            return;
        }
        isGroupMembersLoading.value = true;
        groupRequest
            .getGroupMembersSearch({
                groupId: D.id,
                query: search,
                n: 100,
                offset: 0
            })
            .then((args) => {
                for (const json of args.json.results) {
                    handleGroupMember({
                        json,
                        params: {
                            groupId: args.params.groupId
                        }
                    });
                }
                if (D.id === args.params.groupId) {
                    D.memberSearchResults = args.json.results;
                }
            })
            .finally(() => {
                isGroupMembersLoading.value = false;
            });
    }

    function handleGroupRepresentationChange(groupId, isSet) {
        groupRequest
            .setGroupRepresentation(groupId, {
                isRepresenting: isSet
            })
            .then((args) => {
                if (groupDialog.value.visible && groupDialog.value.id === args.groupId) {
                    updateGroupDialogData({
                        ...groupDialog.value,
                        ref: { ...groupDialog.value.ref, isRepresenting: args.params.isRepresenting }
                    });
                    getGroupDialogGroup(groupId);
                }
            });
    }

    function cancelGroupRequest(id) {
        groupRequest
            .cancelGroupRequest({
                groupId: id
            })
            .then(() => {
                if (groupDialog.value.visible && groupDialog.value.id === id) {
                    getGroupDialogGroup(id);
                }
            });
    }
    function confirmDeleteGroupPost(post) {
        ElMessageBox.confirm('Are you sure you want to delete this post?', 'Confirm', {
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
            type: 'info'
        })
            .then((action) => {
                if (action === 'confirm') {
                    groupRequest
                        .deleteGroupPost({
                            groupId: post.groupId,
                            postId: post.id
                        })
                        .then((args) => {
                            const D = groupDialog.value;
                            if (D.id !== args.params.groupId) {
                                return;
                            }

                            const postId = args.params.postId;
                            // remove existing post
                            for (const item of D.posts) {
                                if (item.id === postId) {
                                    removeFromArray(D.posts, item);
                                    break;
                                }
                            }
                            // remove/update announcement
                            if (postId === D.announcement.id) {
                                if (D.posts.length > 0) {
                                    D.announcement = D.posts[0];
                                } else {
                                    D.announcement = {};
                                }
                            }
                            updateGroupPostSearch();
                        });
                }
            })
            .catch(() => {});
    }

    function groupGalleryStatus(gallery) {
        const style = {};
        if (!gallery.membersOnly) {
            style.blue = true;
        } else if (!gallery.roleIdsToView) {
            style.green = true;
        } else {
            style.red = true;
        }
        return style;
    }

    function groupDialogCommand(command) {
        const D = groupDialog.value;
        if (D.visible === false) {
            return;
        }
        switch (command) {
            case 'Share':
                copyToClipboard(groupDialog.value.ref.$url);
                break;
            case 'Create Post':
                showGroupPostEditDialog(groupDialog.value.id, null);
                break;
            case 'Moderation Tools':
                showGroupMemberModerationDialog(groupDialog.value.id);
                break;
            case 'Invite To Group':
                showInviteGroupDialog(D.id, '');
                break;
            case 'Refresh':
                showGroupDialog(D.id);
                break;
            case 'Subscribe To Announcements':
                setGroupSubscription(D.id, true);
                break;
            case 'Unsubscribe To Announcements':
                setGroupSubscription(D.id, false);
                break;
            case 'Visibility Everyone':
                setGroupVisibility(D.id, 'visible');
                break;
            case 'Visibility Friends':
                setGroupVisibility(D.id, 'friends');
                break;
            case 'Visibility Hidden':
                setGroupVisibility(D.id, 'hidden');
                break;
            case 'Leave Group':
                leaveGroupPrompt(D.id);
                break;
            case 'Block Group':
                groupRequest
                    .blockGroup({
                        groupId: D.id
                    })
                    .then(() => {
                        if (groupDialog.value.visible && groupDialog.value.id === D.id) {
                            getGroupDialogGroup(D.id);
                        }
                    });
                break;
            case 'Unblock Group':
                groupRequest
                    .unblockGroup({
                        groupId: D.id
                    })
                    .then(() => {
                        if (groupDialog.value.visible && groupDialog.value.id === D.id) {
                            getGroupDialogGroup(D.id);
                        }
                    });
                break;
        }
    }

    function showGroupPostEditDialog(groupId, post) {
        const D = groupPostEditDialog;
        D.groupId = groupId;
        D.postId = post ? post.id : '';
        D.title = post ? post.title : '';
        D.text = post ? post.text : '';
        D.sendNotification = post ? post.sendNotification : true;
        D.visibility = post ? post.visibility : 'group';
        D.roleIds = post ? post.roleIds : [];
        D.visible = true;
    }

    function joinGroup(groupId) {
        groupRequest
            .joinGroup({
                groupId
            })
            .then(() => {
                if (groupDialog.value.visible && groupDialog.value.id === groupId) {
                    getGroupDialogGroup(groupId);
                }
            });
    }

    function loadLastActiveTab() {
        const tab = groupDialogLastActiveTab.value;
        switch (tab) {
            case 'Posts':
                if (groupDialog.value.posts.length === 0) {
                    getGroupDialogGroup(groupDialog.value.id);
                }
                break;
            case 'Members':
                if (groupDialog.value.members.length === 0) {
                    getGroupDialogGroupMembers();
                }
                break;
            case 'Photos':
                if (Object.keys(groupDialog.value.galleries).length === 0) {
                    getGroupGalleries();
                }
                break;
        }
    }

    function groupDialogTabClick(tab) {
        loadLastActiveTab();
    }

    async function getGroupDialogGroupMembers() {
        const D = groupDialog.value;
        isGroupMembersDone.value = false;
        D.members = [];
        loadMoreGroupMembersParams.value = {
            n: 100,
            offset: 0,
            groupId: D.id,
            sort: D.memberSortOrder.value,
            roleId: D.memberFilter.id
        };
        if (D.inGroup) {
            await groupRequest
                .getGroupMember({
                    groupId: D.id,
                    userId: currentUser.value.id
                })
                .then((args) => {
                    args.ref = applyGroupMember(args.json);
                    if (args.json) {
                        args.json.user = currentUser.value;
                        if (D.memberFilter.id === null) {
                            // when flitered by role don't include self
                            D.members.push(args.json);
                        }
                    }
                    return args;
                });
        }
        await loadMoreGroupMembers();
    }

    async function loadMoreGroupMembers() {
        if (isGroupMembersDone.value || isGroupMembersLoading.value) {
            return;
        }
        const D = groupDialog.value;
        const params = loadMoreGroupMembersParams.value;
        if (params.roleId === '') {
            delete params.roleId;
        }
        D.memberSearch = '';
        isGroupMembersLoading.value = true;
        await groupRequest
            .getGroupMembers(params)
            .finally(() => {
                isGroupMembersLoading.value = false;
            })
            .then((args) => {
                for (const json of args.json) {
                    handleGroupMember({
                        json,
                        params: {
                            groupId: args.params.groupId
                        }
                    });
                }
                for (let i = 0; i < args.json.length; i++) {
                    const member = args.json[i];
                    if (member.userId === currentUser.value.id) {
                        if (D.members.length > 0 && D.members[0].userId === currentUser.value.id) {
                            // remove duplicate and keep sort order
                            D.members.splice(0, 1);
                        }
                        break;
                    }
                }
                if (args.json.length < params.n) {
                    isGroupMembersDone.value = true;
                }
                D.members = [...D.members, ...args.json];
                params.offset += params.n;
                return args;
            })
            .catch((err) => {
                isGroupMembersDone.value = true;
                throw err;
            });
    }

    async function getGroupGalleries() {
        updateGroupDialogData({ ...groupDialog.value, galleries: {} });
        groupDialogGalleryCurrentName.value = '0';
        isGroupGalleryLoading.value = true;
        for (let i = 0; i < groupDialog.value.ref.galleries.length; i++) {
            const gallery = groupDialog.value.ref.galleries[i];
            await getGroupGallery(groupDialog.value.id, gallery.id);
        }
        isGroupGalleryLoading.value = false;
    }

    async function getGroupGallery(groupId, galleryId) {
        try {
            const params = {
                groupId,
                galleryId,
                n: 100,
                offset: 0
            };
            const count = 50; // 5000 max
            for (let i = 0; i < count; i++) {
                const args = await groupRequest.getGroupGallery(params);
                if (args) {
                    for (const json of args.json) {
                        if (groupDialog.value.id === json.groupId) {
                            if (!groupDialog.value.galleries[json.galleryId]) {
                                groupDialog.value.galleries[json.galleryId] = [];
                            }
                            groupDialog.value.galleries[json.galleryId].push(json);
                        }
                    }
                }
                params.offset += 100;
                if (args.json.length < 100) {
                    break;
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    function refreshGroupDialogTreeData() {
        const D = groupDialog.value;
        const treeData = buildTreeData({
            group: D.ref,
            posts: D.posts,
            instances: D.instances,
            members: D.members,
            galleries: D.galleries
        });
        updateGroupDialogData({
            ...groupDialog.value,
            treeData
        });
    }

    async function loadAllGroupMembers() {
        if (isGroupMembersLoading.value) {
            return;
        }
        await getGroupDialogGroupMembers();
        while (groupDialog.value.visible && !isGroupMembersDone.value) {
            isGroupMembersLoading.value = true;
            await new Promise((resolve) => {
                workerTimers.setTimeout(resolve, 1000);
            });
            isGroupMembersLoading.value = false;
            await loadMoreGroupMembers();
        }
    }

    async function setGroupMemberSortOrder(sortOrder) {
        const D = groupDialog.value;
        if (D.memberSortOrder.value === sortOrder) {
            return;
        }
        D.memberSortOrder = sortOrder;
        await getGroupDialogGroupMembers();
    }

    async function setGroupMemberFilter(filter) {
        const D = groupDialog.value;
        if (D.memberFilter === filter) {
            return;
        }
        D.memberFilter = filter;
        await getGroupDialogGroupMembers();
    }

    function updateGroupDialogData(obj) {
        groupDialog.value = {
            ...groupDialog.value,
            ...obj
        };
    }
</script>

<style lang="scss" scoped>
    .group-dialog-modern {
        :deep(.el-overlay) {
            height: 100vh !important;
            width: 100vw !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
        }

        :deep(.el-dialog__wrapper) {
            height: 100vh !important;
            width: 100vw !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }

        :deep(.el-dialog) {
            background: rgba(0, 0, 0, 0.98) !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            border-radius: 0 !important;
            box-shadow: 0 24px 96px rgba(0, 0, 0, 0.95) !important;
            backdrop-filter: blur(20px);
            margin: 0 !important;
            padding: 0 !important;
            height: 100vh !important;
            width: 100vw !important;
            max-width: 100vw !important;
            max-height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
        }

        :deep(.el-dialog__header) {
            display: none;
        }

        :deep(.el-dialog__body) {
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            flex: 1 1 auto !important;
            min-height: 0 !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
        }
    }

    .group-dialog-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
    }

    .group-dialog-header {
        flex-shrink: 0;
    }

    .group-dialog-body {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .group-dialog-tabs-container {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.02);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding: 0;
    }

    .group-dialog-tabs {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        background: transparent;

        :deep(.el-tabs__header) {
            margin: 0;
            padding: 0 20px;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
        }

        :deep(.el-tabs__nav-wrap) {
            &::after {
                display: none;
            }
        }

        :deep(.el-tabs__nav) {
            border: none;
            display: flex;
            gap: 2px;
        }

        :deep(.el-tabs__item) {
            color: rgba(255, 255, 255, 0.5) !important;
            font-size: 13px;
            font-weight: 500;
            padding: 16px 20px;
            border: none;
            border-radius: 0;
            transition: all 0.2s ease;
            margin: 0;
            position: relative;
            background: transparent;

            &::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 2px;
                background: rgba(255, 255, 255, 0.5);
                transition: all 0.2s ease;
            }

            &:hover {
                color: rgba(255, 255, 255, 0.8) !important;
                background: rgba(255, 255, 255, 0.03);
            }

            &.is-active {
                color: rgba(255, 255, 255, 0.98) !important;
                font-weight: 600;
                background: rgba(255, 255, 255, 0.05);

                &::after {
                    width: 60%;
                }
            }
        }

        :deep(.el-tabs__active-bar) {
            display: none;
        }

        :deep(.el-tabs__content) {
            flex: 1 1 auto;
            min-height: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            padding: 0;
            background: transparent;
        }

        :deep(.el-tab-pane) {
            flex: 1 1 auto;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 20px 20px 80px 20px;
            background: transparent;

            // Modern content wrapper
            .tab-content-wrapper {
                display: flex;
                flex-direction: column;
                height: 100%;
                gap: 16px;
                overflow: hidden;
            }

            // Modern section headers
            .tab-section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                padding: 16px 20px;
                flex-shrink: 0;
            }

            // Modern section cards
            .tab-section-card {
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                padding: 16px 20px;
                margin-bottom: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            // Modern content body
            .tab-content-body {
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
                min-height: 0;
                max-height: 100%;
            }

            // Modern content list
            .tab-content-list {
                background: transparent;
                max-height: none;
            }

            // Modern friend list items
            .x-friend-list {
                background: transparent;

                .x-friend-item {
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: 12px 16px;
                    margin-bottom: 8px;
                    transition: all 0.2s ease;

                    &:hover {
                        background: rgba(255, 255, 255, 0.06);
                        border-color: rgba(255, 255, 255, 0.12);
                    }

                    &.x-friend-item-border {
                        border: 1px solid rgba(255, 255, 255, 0.08);
                    }

                    .avatar {
                        border-radius: 8px;
                        overflow: hidden;
                    }

                    .detail {
                        .name {
                            color: rgba(255, 255, 255, 0.95);
                            font-weight: 500;
                        }

                        .extra {
                            color: rgba(255, 255, 255, 0.6);
                            font-size: 12px;
                        }
                    }
                }
            }

            // Modern buttons
            .el-button {
                background: rgba(255, 255, 255, 0.06) !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                color: rgba(255, 255, 255, 0.9) !important;
                transition: all 0.2s ease;

                &:hover {
                    background: rgba(255, 255, 255, 0.1) !important;
                    border-color: rgba(255, 255, 255, 0.18) !important;
                }
            }

            &::-webkit-scrollbar {
                width: 8px;
            }

            &::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.02);
                border-radius: 4px;
            }

            &::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                border: 2px solid transparent;
                background-clip: padding-box;

                &:hover {
                    background: rgba(255, 255, 255, 0.18);
                    background-clip: padding-box;
                }
            }
        }
    }

    // Group Profile Header Styles (similar to UserSummaryHeader)
    .group-profile-header {
        position: relative;
        background: transparent;

        &__banner {
            position: relative;
            width: 100%;
            aspect-ratio: 1837 / 1032;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.04);
            border-radius: 0;

            &-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            &-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6));
            }
        }

        &__content {
            position: relative;
            padding: 0 24px 20px;
            background: transparent;
        }

        &__icon-wrapper {
            position: relative;
            margin-top: -60px;
            margin-bottom: 16px;
            z-index: 1;
        }

        &__icon-container {
            position: relative;
            width: 120px;
            height: 120px;
            border-radius: 50%;
            overflow: hidden;
            border: 4px solid rgba(0, 0, 0, 0.8);
            background: rgba(255, 255, 255, 0.04);
        }

        &__icon {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        &__top-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        &__name-section {
            flex: 1;
        }

        &__name-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }

        &__name {
            color: rgba(255, 255, 255, 0.98);
            font-size: 24px;
            font-weight: 600;
            margin: 0;
            cursor: pointer;
            transition: color 0.2s ease;

            &:hover {
                color: rgba(255, 255, 255, 1);
            }
        }

        &__owner-badge {
            font-size: 20px;
        }

        &__discriminator {
            font-family: monospace;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.5);
        }

        &__identity {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        &__identity-item {
            color: rgba(255, 255, 255, 0.6);
            font-size: 13px;
        }

        &__flag {
            display: inline-block;
        }

        &__actions {
            flex-shrink: 0;
        }

        &__tags-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 12px;
        }

        &__tag {
            background: rgba(255, 255, 255, 0.06) !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            color: rgba(255, 255, 255, 0.9) !important;
        }

        &__description {
            color: rgba(255, 255, 255, 0.8);
            font-size: 13px;
            line-height: 1.6;
            margin-top: 12px;

            pre {
                font-family: inherit;
                white-space: pre-wrap;
                margin: 0;
                color: rgba(255, 255, 255, 0.8);
            }
        }
    }
</style>
