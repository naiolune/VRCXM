<template>
    <div class="x-menu-container nav-menu-container">
        <div class="nav-menu-top">
            <div v-if="updateInProgress" class="pending-update" @click="showVRCXUpdateDialog">
                <el-progress
                    type="circle"
                    :width="44"
                    :stroke-width="3"
                    :percentage="updateProgress"
                    :format="updateProgressText"></el-progress>
            </div>
            <div v-else-if="pendingVRCXUpdate || pendingVRCXInstall" class="pending-update">
                <el-button
                    type="success"
                    plain
                    class="update-button"
                    @click="showVRCXUpdateDialog"
                    ><i class="ri-download-line"></i
                ></el-button>
            </div>

            <el-menu ref="navRef" collapse router default-active="feed" :collapse-transition="false" class="modern-nav-menu">
                <el-menu-item
                    v-for="item in navItems"
                    :key="item.index"
                    :index="item.index"
                    :class="{ notify: notifiedMenus.includes(item.index) }"
                    class="modern-nav-item">
                    <i :class="item.icon"></i>
                    <template #title>
                        <span class="nav-item-title">{{ t(item.tooltip) }}</span>
                    </template>
                </el-menu-item>
            </el-menu>
        </div>

        <div class="nav-menu-container-bottom">
            <el-tooltip v-if="branch === 'Nightly'" :content="'Feedback'" placement="right"
                ><div class="bottom-button" id="feedback" @click="!sentryErrorReporting && setSentryErrorReporting()">
                    <i class="ri-feedback-line"></i></div
            ></el-tooltip>
            <el-tooltip :content="t('prompt.direct_access_omni.header')" placement="right"
                ><div class="bottom-button" @click="directAccessPaste"><i class="ri-compass-3-line"></i></div
            ></el-tooltip>
            <el-tooltip :content="t('nav_tooltip.settings')" placement="right"
                ><div class="bottom-button" @click="router.push({ name: 'settings' })">
                    <i class="ri-settings-3-line"></i></div
            ></el-tooltip>
        </div>
    </div>
</template>

<script setup>
    import { onMounted } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';
    import { useRouter } from 'vue-router';

    import { useAdvancedSettingsStore, useSearchStore, useUiStore, useVRCXUpdaterStore } from '../stores';

    import * as Sentry from '@sentry/vue';

    const { t } = useI18n();
    const router = useRouter();

    const navItems = [
        { index: 'feed', icon: 'ri-rss-line', tooltip: 'nav_tooltip.feed' },
        { index: 'friend-location', icon: 'ri-group-line', tooltip: 'nav_tooltip.friend_location' },
        { index: 'game-log', icon: 'ri-history-line', tooltip: 'nav_tooltip.game_log' },
        { index: 'player-list', icon: 'ri-group-3-line', tooltip: 'nav_tooltip.player_list' },
        { index: 'search', icon: 'ri-search-line', tooltip: 'nav_tooltip.search' },
        { index: 'favorites', icon: 'ri-star-line', tooltip: 'nav_tooltip.favorites' },
        { index: 'friend-log', icon: 'ri-contacts-line', tooltip: 'nav_tooltip.friend_log' },
        { index: 'moderation', icon: 'ri-user-forbid-line', tooltip: 'nav_tooltip.moderation' },
        { index: 'notification', icon: 'ri-notification-2-line', tooltip: 'nav_tooltip.notification' },
        { index: 'friend-list', icon: 'ri-contacts-book-3-line', tooltip: 'nav_tooltip.friend_list' },
        { index: 'charts', icon: 'ri-bar-chart-line', tooltip: 'nav_tooltip.charts' },
        { index: 'analytics', icon: 'ri-line-chart-line', tooltip: 'nav_tooltip.analytics' },
        { index: 'tools', icon: 'ri-tools-line', tooltip: 'nav_tooltip.tools' }
    ];

    const VRCXUpdaterStore = useVRCXUpdaterStore();
    const { pendingVRCXUpdate, pendingVRCXInstall, updateInProgress, updateProgress, branch } =
        storeToRefs(VRCXUpdaterStore);
    const { showVRCXUpdateDialog, updateProgressText } = VRCXUpdaterStore;
    const uiStore = useUiStore();
    const { notifiedMenus } = storeToRefs(uiStore);
    const { directAccessPaste } = useSearchStore();
    const { sentryErrorReporting } = storeToRefs(useAdvancedSettingsStore());
    const { setSentryErrorReporting } = useAdvancedSettingsStore();

    onMounted(() => {
        if (!sentryErrorReporting.value) return;
        const feedback = Sentry.getFeedback();
        feedback?.attachTo(document.getElementById('feedback'));
    });
</script>

<style scoped>
    .nav-menu-container {
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 16px 8px 12px 8px;
        gap: 8px;
        box-sizing: border-box;
    }
    
    .nav-menu-top {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        gap: 8px;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        padding-top: 4px;
    }
    
    .modern-nav-menu {
        background: transparent !important;
        border: 0 !important;
        width: 100%;
        
        :deep(.el-menu-item) {
            height: 48px;
            line-height: 48px;
            margin: 4px 0;
            border-radius: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: visible;
            padding: 0 12px !important;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.06);
            
            i[class*='ri-'] {
                font-size: 20px;
                width: 24px;
                height: 24px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: rgba(255, 255, 255, 0.6);
                transition: all 0.3s ease;
            }
            
            .nav-item-title {
                font-size: 13px;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.65);
                transition: all 0.3s ease;
                margin-left: 10px;
            }
        }
        
        :deep(.el-menu-item:hover) {
            background: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.15);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            
            i[class*='ri-'] {
                color: rgba(255, 255, 255, 0.85);
            }
            
            .nav-item-title {
                color: rgba(255, 255, 255, 0.9);
            }
        }
        
        :deep(.el-menu-item.is-active) {
            background: rgba(255, 255, 255, 0.14) !important;
            border: 1px solid rgba(255, 255, 255, 0.25);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            
            i[class*='ri-'] {
                color: rgba(255, 255, 255, 1);
            }
            
            .nav-item-title {
                color: rgba(255, 255, 255, 1);
                font-weight: 600;
            }
        }
        
        :deep(.el-menu-item.is-active::before) {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            height: 32px;
            width: 3px;
            border-radius: 0 3px 3px 0;
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
            opacity: 1;
            transition: all 0.3s ease;
        }
        
        :deep(.el-menu-item.notify::after) {
            content: '';
            position: absolute;
            top: 10px;
            right: 10px;
            width: 8px;
            height: 8px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
        }
    }
    
    .bottom-button {
        font-size: 18px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.65);
        transition: all 0.3s ease;
        margin: 0;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.06);
        cursor: pointer;
        flex-shrink: 0;
    }
    
    .bottom-button:hover {
        background: rgba(255, 255, 255, 0.12) !important;
        border-color: rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 1);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }
    
    .nav-menu-container-bottom {
        display: flex;
        flex-direction: column;
        width: 100%;
        align-items: center;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        gap: 6px;
        flex-shrink: 0;
        margin-top: auto;
    }
    
    .pending-update {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        cursor: pointer;
        transition: all 0.3s ease;
        margin-bottom: 2px;
        
        &:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
    }
    
    .update-button {
        width: 100%;
        height: 40px;
        font-size: 18px;
        background: rgba(255, 255, 255, 0.08) !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.9) !important;
        transition: all 0.3s ease;
        
        &:hover {
            background: rgba(255, 255, 255, 0.14) !important;
            border-color: rgba(255, 255, 255, 0.25) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
    }
</style>
