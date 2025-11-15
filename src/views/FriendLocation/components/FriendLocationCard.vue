<template>
    <el-card
        class="friend-card"
        shadow="never"
        :body-style="{ padding: `${16 * cardScale}px` }"
        :style="cardStyle"
        @click="showUserDialog(friend.id)">
        <div class="friend-card__header">
            <div class="friend-card__avatar-wrapper">
                <el-avatar :size="avatarSize" :src="userImage(props.friend.ref, true)" class="friend-card__avatar">
                    {{ avatarFallback }}
                </el-avatar>
            </div>
            <span class="friend-card__status-dot" :class="statusDotClass"></span>
            <div class="friend-card__name" :title="friend.name">{{ friend.name }}</div>
        </div>
        <div class="friend-card__body">
            <div class="friend-card__signature" :title="friend.ref?.statusDescription">
                <i v-if="friend.ref?.statusDescription" class="ri-pencil-line" style="opacity: 0.7"></i>
                {{ friend.ref?.statusDescription || '&nbsp;' }}
            </div>
            <div v-if="displayInstanceInfo" class="friend-card__world" :title="friend.worldName">
                <Location
                    class="friend-card__location"
                    :location="friend.ref?.location"
                    :traveling="friend.ref?.travelingToLocation"
                    link />
            </div>
        </div>
    </el-card>
</template>

<script setup>
    import { computed } from 'vue';

    import { userImage, userStatusClass } from '../../../shared/utils';
    import { useUserStore } from '../../../stores';

    const { showUserDialog } = useUserStore();

    const props = defineProps({
        friend: {
            type: Object,
            required: true
        },
        cardScale: {
            type: Number,
            default: 1
        },
        displayInstanceInfo: {
            type: Boolean,
            default: true
        }
    });

    const avatarSize = computed(() => 48 * props.cardScale);

    const cardStyle = computed(() => ({
        '--card-scale': props.cardScale,
        cursor: 'pointer'
    }));

    const avatarFallback = computed(() => props.friend.name.charAt(0) ?? '?');

    const statusDotClass = computed(() => {
        const status = userStatusClass(props.friend.ref, props.friend.pendingOffline);

        if (status.joinme) {
            return 'friend-card__status-dot--join';
        }
        if (status.online || status.active) {
            return 'friend-card__status-dot--online';
        }
        if (status.askme) {
            return 'friend-card__status-dot--ask';
        }
        if (status.busy) {
            return 'friend-card__status-dot--busy';
        }

        return 'friend-card__status-dot--hidden';
    });
</script>

<style scoped lang="scss">
    .friend-card {
        --card-scale: 1;
        position: relative;
        display: grid;
        gap: calc(12px * var(--card-scale));
        border-radius: calc(14px * var(--card-scale));
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        width: 100%;
        max-width: var(--friend-card-target-width, 220px);
        min-width: var(--friend-card-min-width, 220px);
        overflow: hidden;
    }

    // Dark theme card
    .dark .friend-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);

        &:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.15);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        }
    }

    // Light theme card
    html:not(.dark) .friend-card {
        background: #ffffff;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);

        &:hover {
            background: #f5f5f5;
            border-color: #d0d0d0;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
    }

    .friend-card__header {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: flex-start;
        gap: calc(12px * var(--card-scale));
    }

    .friend-card__avatar-wrapper {
        position: static;
        flex: none;
    }

    .friend-card__avatar {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        transition: all 0.3s ease;
    }

    // Dark theme avatar
    .dark .friend-card__avatar {
        border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .dark .friend-card:hover .friend-card__avatar {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
    }

    // Light theme avatar
    html:not(.dark) .friend-card__avatar {
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    html:not(.dark) .friend-card:hover .friend-card__avatar {
        background: #f5f5f5;
        border-color: #d0d0d0;
    }

    .friend-card__status-dot {
        position: absolute;
        top: calc(6px * var(--card-scale));
        right: calc(6px * var(--card-scale));
        width: calc(10px * var(--card-scale));
        height: calc(10px * var(--card-scale));
        border-radius: 999px;
        border: calc(2px * var(--card-scale)) solid rgba(0, 0, 0, 0.3);
        box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
        pointer-events: none;
        z-index: 2;
    }

    .friend-card__status-dot--hidden {
        display: none;
    }

    .friend-card__status-dot--online {
        background: linear-gradient(145deg, #67c23a, #4aa12d);
        box-shadow: 0 0 8px rgba(103, 194, 58, 0.5);
    }

    .friend-card__status-dot--join {
        background: linear-gradient(145deg, #409eff, #2f7ed9);
        box-shadow: 0 0 8px rgba(64, 158, 255, 0.5);
    }

    .friend-card__status-dot--busy {
        background: linear-gradient(145deg, #ff2c2c, #d81f1f);
        box-shadow: 0 0 8px rgba(255, 44, 44, 0.5);
    }

    .friend-card__status-dot--ask {
        background: linear-gradient(145deg, #ff9500, #d97800);
        box-shadow: 0 0 8px rgba(255, 149, 0, 0.5);
    }

    .friend-card__body {
        display: grid;
        gap: calc(12px * var(--card-scale));
    }

    .friend-card__name {
        font-size: calc(15px * var(--card-scale));
        font-weight: 600;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    // Dark theme name
    .dark .friend-card__name {
        color: rgba(255, 255, 255, 0.95);
    }

    // Light theme name
    html:not(.dark) .friend-card__name {
        color: #333333;
    }

    .friend-card__signature {
        margin-top: 4px;
        font-size: calc(12px * var(--card-scale));
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 4px;
        
        i {
            opacity: 0.6;
            font-size: calc(11px * var(--card-scale));
        }
    }

    // Dark theme signature
    .dark .friend-card__signature {
        color: rgba(255, 255, 255, 0.65);
    }

    // Light theme signature
    html:not(.dark) .friend-card__signature {
        color: #666666;
    }

    .friend-card__world {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: calc(36px * var(--card-scale));
        padding: calc(6px * var(--card-scale)) calc(10px * var(--card-scale));
        border-radius: calc(8px * var(--card-scale));
        font-size: calc(11px * var(--card-scale));
        line-height: 1.3;
        box-sizing: border-box;
    }

    // Dark theme world
    .dark .friend-card__world {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: rgba(255, 255, 255, 0.65);
    }

    // Light theme world
    html:not(.dark) .friend-card__world {
        background: #f0f0f0;
        border: 1px solid #e0e0e0;
        color: #666666;
    }

    .friend-card__location {
        display: flex;
        width: 100%;
        max-height: calc(36px * var(--card-scale));
        overflow: hidden;
        line-height: 1.3;
        white-space: normal;
        word-break: break-word;
        text-align: center;
    }

    .friend-card__location :deep(.x-location__text) {
        display: -webkit-box;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        text-overflow: ellipsis;
    }

    .friend-card__location :deep(.x-location__text:only-child) {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: calc(24px * var(--card-scale));
    }

    .friend-card__location :deep(.x-location__text:only-child span) {
        display: block;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .friend-card__location :deep(.x-location__meta) {
        display: none;
    }

    .friend-card__location :deep(.flags) {
        scale: calc(1 * var(--card-scale));
    }
</style>
