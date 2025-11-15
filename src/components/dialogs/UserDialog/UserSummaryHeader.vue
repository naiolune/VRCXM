<template>
    <div class="profile-header">
        <!-- Banner Section (shows avatar image) -->
        <div class="profile-header__banner">
            <img
                v-if="!userDialog.loading && (userDialog.ref.profilePicOverride || userDialog.ref.currentAvatarImageUrl)"
                class="profile-header__banner-image x-link"
                :src="userDialog.ref.profilePicOverride || userDialog.ref.currentAvatarImageUrl"
                @click="showFullscreenImageDialog(userDialog.ref.profilePicOverride || userDialog.ref.currentAvatarImageUrl)"
                loading="lazy" />
            <div class="profile-header__banner-overlay"></div>
        </div>

        <!-- Content Section -->
        <div class="profile-header__content">
            <!-- User Icon positioned to overlap banner (profile picture) -->
            <div class="profile-header__avatar-wrapper">
                <div v-if="userDialog.ref.userIcon" class="profile-header__avatar-container">
                    <img
                        class="profile-header__avatar x-link"
                        :src="userImage(userDialog.ref, true, '256', true)"
                        @click="showFullscreenImageDialog(userDialog.ref.userIcon)"
                        loading="lazy" />
                    <div v-if="userDialog.ref.status" class="profile-header__status-badge">
                        <i class="x-user-status" :class="userStatusClass(userDialog.ref)"></i>
                    </div>
                </div>
            </div>
            <!-- Top Row: Name, Actions -->
            <div class="profile-header__top-row">
                <div class="profile-header__name-section">
                    <div class="profile-header__name-group">
                        <h1 
                            class="profile-header__name"
                            v-text="userDialog.ref.displayName"
                            @click="copyUserDisplayName(userDialog.ref.displayName)"></h1>
                        <el-tooltip v-if="userDialog.previousDisplayNames.length > 0" placement="bottom">
                            <template #content>
                                <span>{{ t('dialog.user.previous_display_names') }}</span>
                                <div
                                    v-for="data in userDialog.previousDisplayNames"
                                    :key="data.displayName"
                                    placement="top">
                                    <span>{{ data.displayName }}</span>
                                    <span v-if="data.updated_at">
                                        &horbar; {{ formatDateFilter(data.updated_at, 'long') }}</span
                                    >
                                </div>
                            </template>
                            <el-icon class="profile-header__history"><CaretBottom /></el-icon>
                        </el-tooltip>
                    </div>
                    <div class="profile-header__identity">
                        <el-tooltip v-if="userDialog.ref.pronouns" placement="top" :content="t('dialog.user.pronouns')">
                            <span class="profile-header__identity-item" v-text="userDialog.ref.pronouns"></span>
                        </el-tooltip>
                        <el-tooltip v-for="item in userDialog.ref.$languages" :key="item.key" placement="top">
                            <template #content>
                                <span>{{ item.value }} ({{ item.key }})</span>
                            </template>
                            <span class="flags profile-header__flag" :class="languageClass(item.key)"></span>
                        </el-tooltip>
                        <template v-if="userDialog.ref.id === currentUser.id">
                            <span
                                class="profile-header__identity-item profile-header__username"
                                v-text="currentUser.username"
                                @click="copyUserDisplayName(currentUser.username)"></span>
                        </template>
                    </div>
                </div>
                <div class="profile-header__actions">
                    <UserActionDropdown :user-dialog-command="userDialogCommand" />
                </div>
            </div>

            <!-- Tags Row -->
            <div class="profile-header__tags-row" v-show="!userDialog.loading">
                <el-tag
                    type="info"
                    effect="plain"
                    size="small"
                    class="profile-header__tag"
                    :class="userDialog.ref.$trustClass">
                    {{ userDialog.ref.$trustLevel }}
                </el-tag>
                <el-tooltip
                    v-if="userDialog.ref.ageVerified && userDialog.ref.ageVerificationStatus"
                    placement="top"
                    :content="t('dialog.user.tags.age_verified')">
                    <el-tag
                        type="info"
                        effect="plain"
                        size="small"
                        class="profile-header__tag x-tag-age-verification">
                        <template v-if="userDialog.ref.ageVerificationStatus === '18+'">
                            <i class="ri-info-card-line"></i> 18+
                        </template>
                        <template v-else>
                            <i class="ri-info-card-line"></i>
                        </template>
                    </el-tag>
                </el-tooltip>
                <el-tooltip
                    v-if="userDialog.isFriend && userDialog.friend"
                    placement="top"
                    :content="t('dialog.user.tags.friend_number')">
                    <el-tag
                        type="info"
                        effect="plain"
                        size="small"
                        class="profile-header__tag x-tag-friend">
                        <i class="ri-user-add-line"></i>
                        {{ userDialog.ref.$friendNumber ? userDialog.ref.$friendNumber : '' }}
                    </el-tag>
                </el-tooltip>
                <el-tag
                    v-if="userDialog.ref.$isTroll"
                    type="info"
                    effect="plain"
                    size="small"
                    class="profile-header__tag x-tag-troll">
                    Nuisance
                </el-tag>
                <el-tag
                    v-if="userDialog.ref.$isProbableTroll"
                    type="info"
                    effect="plain"
                    size="small"
                    class="profile-header__tag x-tag-troll">
                    Almost Nuisance
                </el-tag>
                <el-tag
                    v-if="userDialog.ref.$isModerator"
                    type="info"
                    effect="plain"
                    size="small"
                    class="profile-header__tag x-tag-vip">
                    {{ t('dialog.user.tags.vrchat_team') }}
                </el-tag>
                <el-tooltip v-if="userDialog.ref.$platform === 'standalonewindows'" placement="top" content="PC">
                    <el-tag
                        type="info"
                        effect="plain"
                        size="small"
                        class="profile-header__tag x-tag-platform-pc">
                        <i class="ri-computer-line"></i>
                    </el-tag>
                </el-tooltip>
                <el-tooltip v-else-if="userDialog.ref.$platform === 'android'" placement="top" content="Quest">
                    <el-tag
                        type="info"
                        effect="plain"
                        size="small"
                        class="profile-header__tag x-tag-platform-quest">
                        <i class="ri-android-line"></i>
                    </el-tag>
                </el-tooltip>
                <el-tooltip v-else-if="userDialog.ref.$platform === 'ios'" placement="top" content="iOS">
                    <el-tag
                        type="info"
                        effect="plain"
                        size="small"
                        class="profile-header__tag x-tag-platform-ios">
                        <i class="ri-apple-line"></i>
                    </el-tag>
                </el-tooltip>
                <el-tag
                    v-else-if="userDialog.ref.$platform"
                    type="info"
                    effect="plain"
                    size="small"
                    class="profile-header__tag x-tag-platform-other">
                    {{ userDialog.ref.$platform }}
                </el-tag>
                <el-tag
                    v-if="userDialog.ref.$customTag"
                    type="info"
                    effect="plain"
                    size="small"
                    class="profile-header__tag"
                    :style="{
                        color: userDialog.ref.$customTagColour,
                        'border-color': userDialog.ref.$customTagColour
                    }">
                    {{ userDialog.ref.$customTag }}
                </el-tag>
            </div>

            <!-- Badges Row -->
            <div class="profile-header__badges-row" v-if="userDialog.ref.badges && userDialog.ref.badges.length > 0">
                <el-tooltip v-for="badge in userDialog.ref.badges" :key="badge.badgeId" placement="top">
                    <template #content>
                        <span>{{ badge.badgeName }}</span>
                        <span v-if="badge.hidden">&nbsp;(Hidden)</span>
                    </template>
                    <el-popover placement="bottom" :width="300" trigger="click">
                        <template #reference>
                            <img
                                class="x-link x-user-badge profile-header__badge"
                                :src="badge.badgeImageUrl"
                                :class="{ 'x-user-badge-hidden': badge.hidden }"
                                loading="lazy" />
                        </template>
                        <img
                            :src="badge.badgeImageUrl"
                            :class="['x-link', 'x-popover-image']"
                            @click="showFullscreenImageDialog(badge.badgeImageUrl)"
                            loading="lazy" />
                        <br />
                        <div style="display: block; width: 300px; word-break: normal">
                            <span>{{ badge.badgeName }}</span>
                            <br />
                            <span class="x-grey" style="font-size: 12px">{{ badge.badgeDescription }}</span>
                            <br />
                            <span
                                v-if="badge.assignedAt"
                                class="x-grey"
                                style="font-family: monospace; font-size: 12px">
                                {{ t('dialog.user.badges.assigned') }}:
                                {{ formatDateFilter(badge.assignedAt, 'long') }}
                            </span>
                            <template v-if="userDialog.id === currentUser.id">
                                <br />
                                <el-checkbox
                                    v-model="badge.hidden"
                                    style="margin-top: 5px"
                                    @change="toggleBadgeVisibility(badge)">
                                    {{ t('dialog.user.badges.hidden') }}
                                </el-checkbox>
                                <br />
                                <el-checkbox v-model="badge.showcased" @change="toggleBadgeShowcased(badge)">
                                    {{ t('dialog.user.badges.showcased') }}
                                </el-checkbox>
                            </template>
                        </div>
                    </el-popover>
                </el-tooltip>
            </div>

            <!-- Status Description -->
            <div class="profile-header__status" v-if="userDialog.ref.statusDescription">
                <p class="profile-header__status-text" v-text="userDialog.ref.statusDescription"></p>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { CaretBottom } from '@element-plus/icons-vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { formatDateFilter, languageClass, userImage, userStatusClass } from '../../../shared/utils';
    import { useGalleryStore, useUserStore } from '../../../stores';

    import UserActionDropdown from './UserActionDropdown.vue';

    const props = defineProps({
        getUserStateText: {
            type: Function,
            required: true
        },
        copyUserDisplayName: {
            type: Function,
            required: true
        },
        toggleBadgeVisibility: {
            type: Function,
            required: true
        },
        toggleBadgeShowcased: {
            type: Function,
            required: true
        },
        userDialogCommand: {
            type: Function,
            required: true
        }
    });

    const { t } = useI18n();
    const { userDialog, currentUser } = storeToRefs(useUserStore());
    const { showFullscreenImageDialog } = useGalleryStore();

    const getUserStateText = props.getUserStateText;
    const copyUserDisplayName = props.copyUserDisplayName;
    const toggleBadgeVisibility = props.toggleBadgeVisibility;
    const toggleBadgeShowcased = props.toggleBadgeShowcased;
    const userDialogCommand = props.userDialogCommand;
</script>

<style scoped lang="scss">
    .profile-header {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 20px;
    }

    // Banner Section (like Twitter/X) - shows avatar image
    .profile-header__banner {
        position: relative;
        width: 100%;
        aspect-ratio: 1837 / 1032;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 50%, rgba(255, 255, 255, 0.08) 100%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        overflow: hidden;
    }

    .profile-header__banner-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .profile-header__banner-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.2) 100%);
        pointer-events: none;
    }

    // Content Section
    .profile-header__content {
        position: relative;
        padding: 60px 20px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .profile-header__avatar-wrapper {
        position: absolute;
        top: -50px;
        left: 20px;
        display: flex;
        align-items: flex-end;
        gap: 12px;
        z-index: 2;
    }

    .profile-header__avatar-container {
        position: relative;
        width: 100px;
        height: 100px;
        border-radius: 50%;
        overflow: hidden;
        border: 4px solid rgba(0, 0, 0, 0.5);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        background: rgba(0, 0, 0, 0.3);
        flex-shrink: 0;
    }

    .profile-header__avatar {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .profile-header__status-badge {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        
        i {
            font-size: 14px;
        }
    }

    .profile-header__top-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
    }

    .profile-header__name-section {
        flex: 1;
        min-width: 0;
    }

    .profile-header__name-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 8px;
    }

    .profile-header__name {
        font-size: 22px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.98);
        margin: 0;
        cursor: pointer;
        transition: color 0.2s ease;
        line-height: 1.2;
        
        &:hover {
            color: rgba(255, 255, 255, 1);
        }
    }

    .profile-header__history {
        color: rgba(255, 255, 255, 0.5);
        font-size: 14px;
        cursor: pointer;
        transition: color 0.2s ease;
        
        &:hover {
            color: rgba(255, 255, 255, 0.8);
        }
    }

    .profile-header__identity {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .profile-header__identity-item {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 400;
    }

    .profile-header__pronouns {
        font-family: monospace;
        cursor: pointer;
        padding: 2px 8px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.2s ease;
        
        &:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.15);
        }
    }

    .profile-header__username {
        font-family: monospace;
        cursor: pointer;
        padding: 2px 8px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.2s ease;
        
        &:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.12);
            color: rgba(255, 255, 255, 0.85);
        }
    }

    .profile-header__flag {
        display: inline-block;
    }

    .profile-header__actions {
        flex-shrink: 0;
        padding-top: 4px;
    }

    .profile-header__tags-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
    }

    .profile-header__tag {
        margin: 0 !important;
        background: rgba(255, 255, 255, 0.08) !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        color: rgba(255, 255, 255, 0.9) !important;
        font-size: 11px !important;
        padding: 4px 10px !important;
        border-radius: 12px !important;
        font-weight: 500 !important;
        transition: all 0.2s ease;
        
        &:hover {
            background: rgba(255, 255, 255, 0.12) !important;
            border-color: rgba(255, 255, 255, 0.22) !important;
        }
    }

    .profile-header__badges-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
    }

    .profile-header__badge {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        object-fit: cover;
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        transition: border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        
        &:hover {
            opacity: 0.9;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            border-color: rgba(255, 255, 255, 0.2);
        }
    }

    .profile-header__user-icon {
        width: 64px;
        height: 64px;
        border-radius: 14px;
        overflow: hidden;
        border: 3px solid rgba(0, 0, 0, 0.5);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        background: rgba(0, 0, 0, 0.3);
        flex-shrink: 0;
        
        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
    }

    .profile-header__status {
        padding-top: 8px;
    }

    .profile-header__status-text {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.75);
        line-height: 1.6;
        margin: 0;
        font-weight: 400;
    }
</style>
