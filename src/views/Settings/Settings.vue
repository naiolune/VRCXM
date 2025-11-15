<template>
    <div class="x-container settings-page">
        <div class="settings-header">
            <h1 class="settings-title">{{ t('view.settings.header') }}</h1>
        </div>
        <div class="settings-tabs-container">
            <div 
                v-for="tab in tabs" 
                :key="tab.key"
                :class="['settings-tab', { 'is-active': activeTab === tab.key }]"
                @click="activeTab = tab.key">
                <i :class="tab.icon"></i>
                <span>{{ tab.label }}</span>
            </div>
        </div>
        <div class="settings-content">
            <div class="settings-content-inner">
                <GeneralTab v-if="activeTab === 'general'" />
                <AppearanceTab v-if="activeTab === 'appearance'" />
                <NotificationsTab v-if="activeTab === 'notifications'" />
                <WristOverlayTab v-if="activeTab === 'wrist_overlay'" />
                <DiscordPresenceTab v-if="activeTab === 'discord_presence'" />
                <PicturesTab v-if="activeTab === 'pictures'" />
                <AnalyticsTab v-if="activeTab === 'analytics'" />
                <AdvancedTab v-if="activeTab === 'advanced'" />
            </div>
        </div>
    </div>
</template>

<script setup>
    import { onBeforeMount, ref } from 'vue';
    import { useI18n } from 'vue-i18n';

    import AdvancedTab from './components/Tabs/AdvancedTab.vue';
    import AnalyticsTab from './components/Tabs/AnalyticsTab.vue';
    import AppearanceTab from './components/Tabs/AppearanceTab.vue';
    import DiscordPresenceTab from './components/Tabs/DiscordPresenceTab.vue';
    import GeneralTab from './components/Tabs/GeneralTab.vue';
    import NotificationsTab from './components/Tabs/NotificationsTab.vue';
    import PicturesTab from './components/Tabs/PicturesTab.vue';
    import WristOverlayTab from './components/Tabs/WristOverlayTab.vue';

    const { t } = useI18n();

    const activeTab = ref('general');

    const tabs = [
        { key: 'general', label: t('view.settings.category.general'), icon: 'ri-settings-3-line' },
        { key: 'appearance', label: t('view.settings.category.appearance'), icon: 'ri-palette-line' },
        { key: 'notifications', label: t('view.settings.category.notifications'), icon: 'ri-notification-3-line' },
        { key: 'wrist_overlay', label: t('view.settings.category.wrist_overlay'), icon: 'ri-watch-line' },
        { key: 'discord_presence', label: t('view.settings.category.discord_presence'), icon: 'ri-discord-line' },
        { key: 'pictures', label: t('view.settings.category.pictures'), icon: 'ri-image-line' },
        { key: 'analytics', label: t('view.settings.category.analytics'), icon: 'ri-line-chart-line' },
        { key: 'advanced', label: t('view.settings.category.advanced'), icon: 'ri-tools-line' }
    ];

    onBeforeMount(() => {
        const menuItem = document.querySelector('li[role="menuitem"].is-active');

        if (menuItem) {
            menuItem.classList.remove('is-active');
        }
    });
</script>

<style scoped lang="scss">
    .settings-page {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 0;
        overflow: hidden;
    }
    
    .settings-header {
        padding: 24px 32px;
        flex-shrink: 0;
    }

    // Dark theme header
    .dark .settings-header {
        background: rgba(255, 255, 255, 0.04);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    // Light theme header
    html:not(.dark) .settings-header {
        background: #f5f5f5;
        border-bottom: 1px solid #e0e0e0;
    }
    
    .settings-title {
        margin: 0;
        font-weight: 600;
        font-size: 24px;
        letter-spacing: -0.5px;
    }

    // Dark theme title
    .dark .settings-title {
        color: rgba(255, 255, 255, 0.95);
    }

    // Light theme title
    html:not(.dark) .settings-title {
        color: #333333;
    }
    
    .settings-tabs-container {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 0 32px;
        overflow-x: auto;
        overflow-y: hidden;
        flex-shrink: 0;
        
        &::-webkit-scrollbar {
            height: 4px;
        }
        
        &::-webkit-scrollbar-track {
            background: transparent;
        }
        
        &::-webkit-scrollbar-thumb {
            border-radius: 4px;
        }
    }

    // Dark theme tabs container
    .dark .settings-tabs-container {
        background: rgba(255, 255, 255, 0.03);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);

        &::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            
            &:hover {
                background: rgba(255, 255, 255, 0.15);
            }
        }
    }

    // Light theme tabs container
    html:not(.dark) .settings-tabs-container {
        background: #fafafa;
        border-bottom: 1px solid #e0e0e0;

        &::-webkit-scrollbar-thumb {
            background: #d0d0d0;
            
            &:hover {
                background: #b0b0b0;
            }
        }
    }
    
    .settings-tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        white-space: nowrap;
        border-bottom: 2px solid transparent;
        
        i {
            font-size: 16px;
            width: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }

    // Dark theme tab
    .dark .settings-tab {
        color: rgba(255, 255, 255, 0.6);
        
        &:hover {
            color: rgba(255, 255, 255, 0.9);
        }
        
        &.is-active {
            color: rgba(255, 255, 255, 1);
            font-weight: 600;
            border-bottom-color: rgba(255, 255, 255, 0.5);
            
            i {
                color: rgba(255, 255, 255, 1);
            }
        }
    }

    // Light theme tab
    html:not(.dark) .settings-tab {
        color: #666666;
        
        &:hover {
            color: #333333;
        }
        
        &.is-active {
            color: #409eff;
            font-weight: 600;
            border-bottom-color: #409eff;
            
            i {
                color: #409eff;
            }
        }
    }
    
    .settings-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        min-width: 0;
        min-height: 0;
        
        &::-webkit-scrollbar {
            width: 10px;
        }
        
        &::-webkit-scrollbar-track {
            border-radius: 10px;
        }
        
        &::-webkit-scrollbar-thumb {
            border-radius: 10px;
            border: 2px solid transparent;
            background-clip: padding-box;
        }
    }

    // Dark theme content scrollbar
    .dark .settings-content {
        &::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
        }
        
        &::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.12);
            
            &:hover {
                background: rgba(255, 255, 255, 0.2);
                background-clip: padding-box;
            }
        }
    }

    // Light theme content scrollbar
    html:not(.dark) .settings-content {
        &::-webkit-scrollbar-track {
            background: #f5f5f5;
        }
        
        &::-webkit-scrollbar-thumb {
            background: #d0d0d0;
            
            &:hover {
                background: #b0b0b0;
                background-clip: padding-box;
            }
        }
    }
    
    .settings-content-inner {
        padding: 24px 32px;
        max-width: 1200px;
    }
</style>
