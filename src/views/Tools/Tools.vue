<template>
    <div id="chart" class="x-container tools-container">
        <div class="tools-header">
            <h1 class="page-title">{{ t('view.tools.header') }}</h1>
        </div>

        <div class="tool-categories">
                <div class="tool-category">
                    <div class="category-header" @click="toggleCategory('group')">
                        <el-icon class="rotation-transition" :class="{ 'is-rotated': !categoryCollapsed['group'] }"
                            ><ArrowRight
                        /></el-icon>
                        <span class="category-title">{{ t('view.tools.group.header') }}</span>
                    </div>
                    <div class="tools-grid" v-show="!categoryCollapsed['group']">
                        <el-card :body-style="{ padding: '0px' }" class="tool-card">
                            <div class="tool-content" @click="showGroupCalendarDialog">
                                <div class="tool-icon">
                                    <i class="ri-calendar-event-line"></i>
                                </div>
                                <div class="tool-info">
                                    <div class="tool-name">{{ t('view.tools.group.calendar') }}</div>
                                    <div class="tool-description">{{ t('view.tools.group.calendar_description') }}</div>
                                </div>
                            </div>
                        </el-card>
                    </div>
                </div>

                <div class="tool-category">
                    <div class="category-header" @click="toggleCategory('image')">
                        <el-icon class="rotation-transition" :class="{ 'is-rotated': !categoryCollapsed['image'] }"
                            ><ArrowRight
                        /></el-icon>
                        <span class="category-title">{{ t('view.tools.pictures.header') }}</span>
                    </div>
                    <div class="tools-grid" v-show="!categoryCollapsed['image']">
                        <el-card :body-style="{ padding: '0px' }" class="tool-card">
                            <div class="tool-content" @click="showScreenshotMetadataDialog">
                                <div class="tool-icon">
                                    <i class="ri-screenshot-2-line"></i>
                                </div>
                                <div class="tool-info">
                                    <div class="tool-name">{{ t('view.tools.pictures.screenshot') }}</div>
                                    <div class="tool-description">
                                        {{ t('view.tools.pictures.screenshot_description') }}
                                    </div>
                                </div>
                            </div>
                        </el-card>
                        <el-card :body-style="{ padding: '0px' }" class="tool-card">
                            <div class="tool-content" @click="showGalleryDialog">
                                <div class="tool-icon">
                                    <i class="ri-multi-image-line"></i>
                                </div>
                                <div class="tool-info">
                                    <div class="tool-name">{{ t('view.tools.pictures.inventory') }}</div>
                                    <div class="tool-description">
                                        {{ t('view.tools.pictures.inventory_description') }}
                                    </div>
                                </div>
                            </div>
                        </el-card>
                        <el-card :body-style="{ padding: '0px' }" class="tool-card">
                            <div class="tool-content" @click="openVrcPhotosFolder">
                                <div class="tool-icon">
                                    <i class="ri-folder-image-line"></i>
                                </div>
                                <div class="tool-info">
                                    <div class="tool-name">{{ t('view.tools.pictures.pictures.vrc_photos') }}</div>
                                    <div class="tool-description">
                                        {{ t('view.tools.pictures.pictures.vrc_photos_description') }}
                                    </div>
                                </div>
                            </div>
                        </el-card>
                        <el-card :body-style="{ padding: '0px' }" class="tool-card">
                            <div class="tool-content" @click="openVrcScreenshotsFolder">
                                <div class="tool-icon">
                                    <i class="ri-folder-image-line"></i>
                                </div>
                                <div class="tool-info">
                                    <div class="tool-name">
                                        {{ t('view.tools.pictures.pictures.steam_screenshots') }}
                                    </div>
                                    <div class="tool-description">
                                        {{ t('view.tools.pictures.pictures.steam_screenshots_description') }}
                                    </div>
                                </div>
                            </div>
                        </el-card>
                    </div>
                </div>

                <div class="tool-category">
                    <div class="category-header" @click="toggleCategory('user')">
                        <el-icon class="rotation-transition" :class="{ 'is-rotated': !categoryCollapsed['user'] }"
                            ><ArrowRight
                        /></el-icon>
                        <span class="category-title">{{ t('view.tools.export.header') }}</span>
                    </div>

                    <div class="tools-grid" v-show="!categoryCollapsed['user']">
                        <el-card :body-style="{ padding: '0px' }" class="tool-card">
                            <div class="tool-content" @click="showExportDiscordNamesDialog">
                                <div class="tool-icon">
                                    <i class="ri-discord-line"></i>
                                </div>
                                <div class="tool-info">
                                    <div class="tool-name">{{ t('view.tools.export.discord_names') }}</div>
                                    <div class="tool-description">
                                        {{ t('view.tools.user.discord_names_description') }}
                                    </div>
                                </div>
                            </div>
                        </el-card>
                        <el-card :body-style="{ padding: '0px' }" class="tool-card">
                            <div class="tool-content" @click="showNoteExportDialog">
                                <div class="tool-icon">
                                    <i class="ri-user-shared-line"></i>
                                </div>
                                <div class="tool-info">
                                    <div class="tool-name">{{ t('view.tools.export.export_notes') }}</div>
                                    <div class="tool-description">
                                        {{ t('view.tools.export.export_notes_description') }}
                                    </div>
                                </div>
                            </div>
                        </el-card>

                        <el-card :body-style="{ padding: '0px' }" class="tool-card">
                            <div class="tool-content" @click="showExportFriendsListDialog">
                                <div class="tool-icon">
                                    <i class="ri-user-shared-line"></i>
                                </div>
                                <div class="tool-info">
                                    <div class="tool-name">{{ t('view.tools.export.export_friend_list') }}</div>
                                    <div class="tool-description">
                                        {{ t('view.tools.user.export_friend_list_description') }}
                                    </div>
                                </div>
                            </div>
                        </el-card>
                        <el-card :body-style="{ padding: '0px' }" class="tool-card">
                            <div class="tool-content" @click="showExportAvatarsListDialog">
                                <div class="tool-icon">
                                    <i class="ri-user-shared-line"></i>
                                </div>
                                <div class="tool-info">
                                    <div class="tool-name">{{ t('view.tools.export.export_own_avatars') }}</div>
                                    <div class="tool-description">
                                        {{ t('view.tools.user.export_own_avatars_description') }}
                                    </div>
                                </div>
                            </div>
                        </el-card>
                    </div>
                </div>
        </div>
        
        <template v-if="isToolsTabVisible">
            <GroupCalendarDialog
                :visible="isGroupCalendarDialogVisible"
                @close="isGroupCalendarDialogVisible = false" />
            <ScreenshotMetadataDialog
                :isScreenshotMetadataDialogVisible="isScreenshotMetadataDialogVisible"
                @close="isScreenshotMetadataDialogVisible = false" />
            <NoteExportDialog
                :isNoteExportDialogVisible="isNoteExportDialogVisible"
                @close="isNoteExportDialogVisible = false" />
            <GalleryDialog />
            <ExportDiscordNamesDialog
                v-model:discordNamesDialogVisible="isExportDiscordNamesDialogVisible"
                :friends="friends" />
            <ExportFriendsListDialog
                v-model:isExportFriendsListDialogVisible="isExportFriendsListDialogVisible"
                :friends="friends" />
            <ExportAvatarsListDialog v-model:isExportAvatarsListDialogVisible="isExportAvatarsListDialogVisible" />
        </template>
    </div>
</template>

<script setup>
    import { computed, defineAsyncComponent, ref, watch } from 'vue';
    import { ArrowRight } from '@element-plus/icons-vue';
    import { ElMessage } from 'element-plus';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';
    import { useRoute } from 'vue-router';

    import { useFriendStore, useGalleryStore } from '../../stores';

    const GroupCalendarDialog = defineAsyncComponent(() => import('./dialogs/GroupCalendarDialog.vue'));
    const ScreenshotMetadataDialog = defineAsyncComponent(() => import('./dialogs/ScreenshotMetadataDialog.vue'));
    const NoteExportDialog = defineAsyncComponent(() => import('./dialogs/NoteExportDialog.vue'));
    const GalleryDialog = defineAsyncComponent(() => import('./dialogs/GalleryDialog.vue'));

    const ExportDiscordNamesDialog = defineAsyncComponent(() => import('./dialogs/ExportDiscordNamesDialog.vue'));
    const ExportFriendsListDialog = defineAsyncComponent(() => import('./dialogs/ExportFriendsListDialog.vue'));
    const ExportAvatarsListDialog = defineAsyncComponent(() => import('./dialogs/ExportAvatarsListDialog.vue'));

    const { t } = useI18n();

    const { showGalleryDialog } = useGalleryStore();
    const { friends } = storeToRefs(useFriendStore());

    const categoryCollapsed = ref({
        group: false,
        image: false,
        user: false
    });

    const isGroupCalendarDialogVisible = ref(false);
    const isScreenshotMetadataDialogVisible = ref(false);
    const isNoteExportDialogVisible = ref(false);
    const isExportDiscordNamesDialogVisible = ref(false);
    const isExportFriendsListDialogVisible = ref(false);
    const isExportAvatarsListDialogVisible = ref(false);
    const isToolsTabVisible = computed(() => {
        return useRoute().name === 'tools';
    });

    const showGroupCalendarDialog = () => {
        isGroupCalendarDialogVisible.value = true;
    };

    const showScreenshotMetadataDialog = () => {
        isScreenshotMetadataDialogVisible.value = true;
    };

    const showNoteExportDialog = () => {
        isNoteExportDialogVisible.value = true;
    };

    const toggleCategory = (category) => {
        categoryCollapsed.value[category] = !categoryCollapsed.value[category];
    };

    function showExportDiscordNamesDialog() {
        isExportDiscordNamesDialogVisible.value = true;
    }

    function showExportFriendsListDialog() {
        isExportFriendsListDialogVisible.value = true;
    }

    function showExportAvatarsListDialog() {
        isExportAvatarsListDialogVisible.value = true;
    }

    function openVrcPhotosFolder() {
        AppApi.OpenVrcPhotosFolder().then((result) => {
            if (result) {
                ElMessage({
                    message: 'Folder opened',
                    type: 'success'
                });
            } else {
                ElMessage({
                    message: "Folder dosn't exist",
                    type: 'error'
                });
            }
        });
    }

    function openVrcScreenshotsFolder() {
        AppApi.OpenVrcScreenshotsFolder().then((result) => {
            if (result) {
                ElMessage({
                    message: 'Folder opened',
                    type: 'success'
                });
            } else {
                ElMessage({
                    message: "Folder dosn't exist",
                    type: 'error'
                });
            }
        });
    }
</script>

<style lang="scss" scoped>
    .tools-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        height: 100%;
        overflow-y: auto;
        padding: 32px;
    }
    
    .tools-header {
        padding: 20px 24px;
        border-radius: 16px;
    }

    // Dark theme header
    .dark .tools-header {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    // Light theme header
    html:not(.dark) .tools-header {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
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
    
    .tool-categories {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .tool-category {
        display: flex;
        flex-direction: column;
        
        .category-header {
            cursor: pointer;
            display: flex;
            align-items: center;
            padding: 14px 18px;
            border-radius: 14px;
            margin-bottom: 16px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            user-select: none;
        }

        // Dark theme category header
        .dark .category-header {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);

            &:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.15);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            }

            :deep(.el-icon) {
                font-size: 16px;
                margin-right: 12px;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                color: rgba(255, 255, 255, 0.7);
            }

            .category-title {
                font-size: 17px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.95);
                letter-spacing: 0.3px;
            }
        }

        // Light theme category header
        html:not(.dark) .category-header {
            background: #f5f5f5;
            border: 1px solid #e0e0e0;

            &:hover {
                background: #f0f0f0;
                border-color: #d0d0d0;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            }

            :deep(.el-icon) {
                font-size: 16px;
                margin-right: 12px;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                color: #666666;
            }

            .category-title {
                font-size: 17px;
                font-weight: 600;
                color: #333333;
                letter-spacing: 0.3px;
            }
        }
    }

    .tools-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 16px;
        margin-left: 0;
        padding: 0;
        
        @media (max-width: 768px) {
            grid-template-columns: 1fr;
        }
    }

    .tool-card {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        border-radius: 14px;
        cursor: pointer;

        :deep(.el-card__body) {
            overflow: hidden;
            padding: 0;
        }

        .tool-content {
            display: flex;
            align-items: center;
            padding: 20px 18px;
            gap: 16px;

            .tool-icon {
                width: 56px;
                height: 56px;
                min-width: 56px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                transition: all 0.3s ease;
            }

            .tool-info {
                flex: 1;
                min-width: 0;

                .tool-name {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 6px;
                    line-height: 1.3;
                }

                .tool-description {
                    font-size: 13px;
                    line-height: 1.4;
                }
            }
        }
    }

    // Dark theme tool card
    .dark .tool-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);

        &:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.15);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
            
            .tool-content .tool-icon {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.2);
            }
        }

        .tool-content .tool-icon {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

            i {
                font-size: 26px;
                color: rgba(255, 255, 255, 0.9);
            }
        }

        .tool-content .tool-info .tool-name {
            color: rgba(255, 255, 255, 0.95);
        }

        .tool-content .tool-info .tool-description {
            color: rgba(255, 255, 255, 0.65);
        }
    }

    // Light theme tool card
    html:not(.dark) .tool-card {
        background: #ffffff;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);

        &:hover {
            background: #f5f5f5;
            border-color: #d0d0d0;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            
            .tool-content .tool-icon {
                background: #f0f0f0;
                border-color: #d0d0d0;
            }
        }

        .tool-content .tool-icon {
            background: #f0f0f0;
            border: 1px solid #e0e0e0;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

            i {
                font-size: 26px;
                color: #333333;
            }
        }

        .tool-content .tool-info .tool-name {
            color: #333333;
        }

        .tool-content .tool-info .tool-description {
            color: #666666;
        }
    }

    :deep(.el-card) {
        border-radius: 14px;
        width: 100%;
        overflow: hidden;
        background: transparent;
        border: none;
        box-shadow: none;
    }

    .is-rotated {
        transform: rotate(90deg);
    }

    .rotation-transition {
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    // Custom scrollbar for tools container
    .tools-container::-webkit-scrollbar {
        width: 10px;
    }
    
    // Dark theme scrollbar
    .dark .tools-container::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.02);
        border-radius: 10px;
    }
    
    .dark .tools-container::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        border: 2px solid transparent;
        background-clip: padding-box;
        
        &:hover {
            background: rgba(255, 255, 255, 0.2);
            background-clip: padding-box;
        }
    }

    // Light theme scrollbar
    html:not(.dark) .tools-container::-webkit-scrollbar-track {
        background: #f5f5f5;
        border-radius: 10px;
    }
    
    html:not(.dark) .tools-container::-webkit-scrollbar-thumb {
        background: #d0d0d0;
        border-radius: 10px;
        border: 2px solid transparent;
        background-clip: padding-box;
        
        &:hover {
            background: #b0b0b0;
            background-clip: padding-box;
        }
    }
</style>
