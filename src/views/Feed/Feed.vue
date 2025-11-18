<template>
    <div class="x-container feed">
        <div class="feed-controls">
            <div class="controls-left">
                <el-tooltip placement="bottom" :content="t('view.feed.favorites_only_tooltip')">
                    <div class="vip-toggle-wrapper">
                        <span class="vip-label">{{ t('view.feed.favorites_only', 'Favorites Only') }}</span>
                        <el-switch v-model="feedTable.vip" active-color="#13ce66" @change="feedTableLookup"></el-switch>
                    </div>
                </el-tooltip>
            </div>
            
            <div class="controls-right">
                <el-date-picker
                    v-model="feedTable.dateRange"
                    type="datetimerange"
                    range-separator="To"
                    start-placeholder="Start"
                    end-placeholder="End"
                    format="MM/DD HH:mm"
                    value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
                    class="feed-date-picker"
                    size="default"
                    clearable
                    @change="feedTableLookup" />
                
                <el-select
                    v-model="feedTable.filter"
                    multiple
                    clearable
                    class="feed-filter-select"
                    :placeholder="t('view.feed.filter_placeholder')"
                    @change="feedTableLookup">
                    <el-option
                        v-for="type in ['GPS', 'Online', 'Offline', 'Status', 'Avatar', 'Bio']"
                        :key="type"
                        :label="t('view.feed.filters.' + type)"
                        :value="type"></el-option>
                </el-select>
                
                <el-input
                    v-model="feedTable.search"
                    :placeholder="t('view.feed.search_placeholder')"
                    clearable
                    class="feed-search-input"
                    @keyup.enter="feedTableLookup"
                    @change="feedTableLookup">
                    <template #prefix>
                        <i class="ri-search-line"></i>
                    </template>
                </el-input>
            </div>
        </div>

        <div class="feed-table-wrapper">
            <DataTable 
                :data="feedTable.data"
                :loading="feedTable.loading"
                :table-props="feedTable.tableProps"
                :pagination-props="feedTable.paginationProps"
                :current-page="feedTable.currentPage || 1"
                :page-size="feedTable.pageSize"
                :page-size-linked="feedTable.pageSizeLinked"
                :filters="[]"
                layout="table, pagination"
                @current-change="(page) => feedTable.currentPage = page"
                @size-change="(size) => feedTable.pageSize = size">
            <el-table-column type="expand" width="20">
                <template #default="scope">
                    <div style="position: relative; font-size: 14px">
                        <template v-if="scope.row.type === 'GPS'">
                            <Location
                                v-if="scope.row.previousLocation"
                                :location="scope.row.previousLocation"
                                style="display: inline-block" />
                            <el-tag type="info" effect="plain" size="small" style="margin-left: 5px">{{
                                timeToText(scope.row.time)
                            }}</el-tag>
                            <br />
                            <span style="margin-right: 5px">
                                <el-icon><Right /></el-icon>
                            </span>
                            <Location
                                v-if="scope.row.location"
                                :location="scope.row.location"
                                :hint="scope.row.worldName"
                                :grouphint="scope.row.groupName" />
                        </template>
                        <template v-else-if="scope.row.type === 'Offline'">
                            <template v-if="scope.row.location">
                                <Location
                                    :location="scope.row.location"
                                    :hint="scope.row.worldName"
                                    :grouphint="scope.row.groupName" />
                                <el-tag type="info" effect="plain" size="small" style="margin-left: 5px">{{
                                    timeToText(scope.row.time)
                                }}</el-tag>
                            </template>
                        </template>
                        <template v-else-if="scope.row.type === 'Online'">
                            <Location
                                v-if="scope.row.location"
                                :location="scope.row.location"
                                :hint="scope.row.worldName"
                                :grouphint="scope.row.groupName" />
                        </template>
                        <template v-else-if="scope.row.type === 'Avatar'">
                            <div style="display: flex; align-items: center">
                                <el-popover placement="right" :width="500" trigger="click">
                                    <template #reference>
                                        <div style="display: inline-block; vertical-align: top; width: 160px">
                                            <template v-if="scope.row.previousCurrentAvatarThumbnailImageUrl">
                                                <img
                                                    :src="scope.row.previousCurrentAvatarThumbnailImageUrl"
                                                    class="x-link"
                                                    style="flex: none; width: 160px; height: 120px; border-radius: 4px"
                                                    loading="lazy" />
                                                <br />
                                                <AvatarInfo
                                                    :imageurl="scope.row.previousCurrentAvatarThumbnailImageUrl"
                                                    :userid="scope.row.userId"
                                                    :hintownerid="scope.row.previousOwnerId"
                                                    :hintavatarname="scope.row.previousAvatarName"
                                                    :avatartags="scope.row.previousCurrentAvatarTags" />
                                            </template>
                                        </div>
                                    </template>
                                    <img
                                        :src="scope.row.previousCurrentAvatarImageUrl"
                                        :class="['x-link', 'x-popover-image']"
                                        @click="showFullscreenImageDialog(scope.row.previousCurrentAvatarImageUrl)"
                                        loading="lazy" />
                                </el-popover>
                                <span style="position: relative; margin: 0 10px">
                                    <el-icon><Right /></el-icon>
                                </span>
                                <el-popover placement="right" :width="500" trigger="click">
                                    <template #reference>
                                        <div style="display: inline-block; vertical-align: top; width: 160px">
                                            <template v-if="scope.row.currentAvatarThumbnailImageUrl">
                                                <img
                                                    :src="scope.row.currentAvatarThumbnailImageUrl"
                                                    class="x-link"
                                                    style="flex: none; width: 160px; height: 120px; border-radius: 4px"
                                                    loading="lazy" />
                                                <br />
                                                <AvatarInfo
                                                    :imageurl="scope.row.currentAvatarThumbnailImageUrl"
                                                    :userid="scope.row.userId"
                                                    :hintownerid="scope.row.ownerId"
                                                    :hintavatarname="scope.row.avatarName"
                                                    :avatartags="scope.row.currentAvatarTags" />
                                            </template>
                                        </div>
                                    </template>
                                    <img
                                        :src="scope.row.currentAvatarImageUrl"
                                        :class="['x-link', 'x-popover-image']"
                                        @click="showFullscreenImageDialog(scope.row.currentAvatarImageUrl)"
                                        loading="lazy" />
                                </el-popover>
                            </div>
                        </template>
                        <template v-else-if="scope.row.type === 'Status'">
                            <el-tooltip placement="top">
                                <template #content>
                                    <span v-if="scope.row.previousStatus === 'active'">{{
                                        t('dialog.user.status.active')
                                    }}</span>
                                    <span v-else-if="scope.row.previousStatus === 'join me'">{{
                                        t('dialog.user.status.join_me')
                                    }}</span>
                                    <span v-else-if="scope.row.previousStatus === 'ask me'">{{
                                        t('dialog.user.status.ask_me')
                                    }}</span>
                                    <span v-else-if="scope.row.previousStatus === 'busy'">{{
                                        t('dialog.user.status.busy')
                                    }}</span>
                                    <span v-else>{{ t('dialog.user.status.offline') }}</span>
                                </template>
                                <i class="x-user-status" :class="statusClass(scope.row.previousStatus)"></i>
                            </el-tooltip>
                            <span style="margin-left: 5px" v-text="scope.row.previousStatusDescription"></span>
                            <br />
                            <span>
                                <el-icon><Right /></el-icon>
                            </span>
                            <el-tooltip placement="top">
                                <template #content>
                                    <span v-if="scope.row.status === 'active'">{{
                                        t('dialog.user.status.active')
                                    }}</span>
                                    <span v-else-if="scope.row.status === 'join me'">{{
                                        t('dialog.user.status.join_me')
                                    }}</span>
                                    <span v-else-if="scope.row.status === 'ask me'">{{
                                        t('dialog.user.status.ask_me')
                                    }}</span>
                                    <span v-else-if="scope.row.status === 'busy'">{{
                                        t('dialog.user.status.busy')
                                    }}</span>
                                    <span v-else>{{ t('dialog.user.status.offline') }}</span>
                                </template>
                                <i
                                    class="x-user-status"
                                    :class="statusClass(scope.row.status)"
                                    style="margin: 0 5px"></i>
                            </el-tooltip>
                            <span v-text="scope.row.statusDescription"></span>
                        </template>
                        <template v-else-if="scope.row.type === 'Bio'">
                            <pre
                                style="font-family: inherit; font-size: 12px; white-space: pre-wrap; line-height: 22px"
                                v-html="formatDifference(scope.row.previousBio, scope.row.bio)"></pre>
                        </template>
                    </div>
                </template>
            </el-table-column>

            <el-table-column :label="t('table.feed.date')" prop="created_at" :sortable="true" width="110">
                <template #default="scope">
                    <el-tooltip placement="right">
                        <template #content>
                            <span>{{ formatDateFilter(scope.row.created_at, 'long') }}</span>
                        </template>
                        <span>{{ formatDateFilter(scope.row.created_at, 'short') }}</span>
                    </el-tooltip>
                </template>
            </el-table-column>

            <el-table-column :label="t('table.feed.type')" prop="type" width="70">
                <template #default="scope">
                    <span v-text="scope.row.type ? t('view.feed.filters.' + scope.row.type) : '-'"></span>
                </template>
            </el-table-column>

            <el-table-column :label="t('table.feed.user')" prop="displayName" width="150">
                <template #default="scope">
                    <span
                        class="x-link"
                        style="padding-right: 10px"
                        @click="showUserDialog(scope.row.userId)"
                        v-text="scope.row.displayName"></span>
                </template>
            </el-table-column>

            <el-table-column :label="t('table.feed.detail')">
                <template #default="scope">
                    <template v-if="scope.row.type === 'GPS'">
                        <Location
                            v-if="scope.row.location"
                            :location="scope.row.location"
                            :hint="scope.row.worldName"
                            :grouphint="scope.row.groupName" />
                    </template>
                    <template v-else-if="scope.row.type === 'Offline' || scope.row.type === 'Online'">
                        <Location
                            v-if="scope.row.location"
                            :location="scope.row.location"
                            :hint="scope.row.worldName"
                            :grouphint="scope.row.groupName" />
                    </template>
                    <template v-else-if="scope.row.type === 'Status'">
                        <template v-if="scope.row.statusDescription === scope.row.previousStatusDescription">
                            <el-tooltip placement="top">
                                <template #content>
                                    <span v-if="scope.row.previousStatus === 'active'">{{
                                        t('dialog.user.status.active')
                                    }}</span>
                                    <span v-else-if="scope.row.previousStatus === 'join me'">{{
                                        t('dialog.user.status.join_me')
                                    }}</span>
                                    <span v-else-if="scope.row.previousStatus === 'ask me'">{{
                                        t('dialog.user.status.ask_me')
                                    }}</span>
                                    <span v-else-if="scope.row.previousStatus === 'busy'">{{
                                        t('dialog.user.status.busy')
                                    }}</span>
                                    <span v-else>{{ t('dialog.user.status.offline') }}</span>
                                </template>
                                <i class="x-user-status" :class="statusClass(scope.row.previousStatus)"></i>
                            </el-tooltip>
                            <span style="margin: 0 5px">
                                <el-icon><Right /></el-icon>
                            </span>
                            <el-tooltip placement="top">
                                <template #content>
                                    <span v-if="scope.row.status === 'active'">{{
                                        t('dialog.user.status.active')
                                    }}</span>
                                    <span v-else-if="scope.row.status === 'join me'">{{
                                        t('dialog.user.status.join_me')
                                    }}</span>
                                    <span v-else-if="scope.row.status === 'ask me'">{{
                                        t('dialog.user.status.ask_me')
                                    }}</span>
                                    <span v-else-if="scope.row.status === 'busy'">{{
                                        t('dialog.user.status.busy')
                                    }}</span>
                                    <span v-else>{{ t('dialog.user.status.offline') }}</span>
                                </template>
                                <i class="x-user-status" :class="statusClass(scope.row.status)"></i>
                            </el-tooltip>
                        </template>
                        <template v-else>
                            <el-tooltip placement="top">
                                <template #content>
                                    <span v-if="scope.row.status === 'active'">{{
                                        t('dialog.user.status.active')
                                    }}</span>
                                    <span v-else-if="scope.row.status === 'join me'">{{
                                        t('dialog.user.status.join_me')
                                    }}</span>
                                    <span v-else-if="scope.row.status === 'ask me'">{{
                                        t('dialog.user.status.ask_me')
                                    }}</span>
                                    <span v-else-if="scope.row.status === 'busy'">{{
                                        t('dialog.user.status.busy')
                                    }}</span>
                                    <span v-else>{{ t('dialog.user.status.offline') }}</span>
                                </template>
                                <i
                                    class="x-user-status"
                                    :class="statusClass(scope.row.status)"
                                    style="margin-right: 3px"></i>
                            </el-tooltip>
                            <span v-text="scope.row.statusDescription"></span>
                        </template>
                    </template>
                    <template v-else-if="scope.row.type === 'Avatar'">
                        <AvatarInfo
                            :imageurl="scope.row.currentAvatarImageUrl"
                            :userid="scope.row.userId"
                            :hintownerid="scope.row.ownerId"
                            :hintavatarname="scope.row.avatarName"
                            :avatartags="scope.row.currentAvatarTags" />
                    </template>
                    <template v-else-if="scope.row.type === 'Bio'">
                        <span v-text="scope.row.bio"></span>
                    </template>
                </template>
            </el-table-column>
            </DataTable>
        </div>
    </div>
</template>

<script setup>
    import { Right } from '@element-plus/icons-vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { useFeedStore, useGalleryStore, useUiStore, useUserStore } from '../../stores';
    import { formatDateFilter, statusClass, timeToText } from '../../shared/utils';

    const { showUserDialog } = useUserStore();
    const { feedTable } = storeToRefs(useFeedStore());
    const { feedTableLookup } = useFeedStore();
    const { showFullscreenImageDialog } = useGalleryStore();

    const { t } = useI18n();

    /**
     * Function that format the differences between two strings with HTML tags
     * markerStartTag and markerEndTag are optional, if emitted, the differences will be highlighted with yellow and underlined.
     * @param {*} s1
     * @param {*} s2
     * @param {*} markerStartTag
     * @param {*} markerEndTag
     * @returns An array that contains both the string 1 and string 2, which the differences are formatted with HTML tags
     */

    //function getWordDifferences
    function formatDifference(
        oldString,
        newString,
        markerAddition = '<span class="x-text-added">{{text}}</span>',
        markerDeletion = '<span class="x-text-removed">{{text}}</span>'
    ) {
        [oldString, newString] = [oldString, newString].map((s) =>
            s
                .replaceAll(/&/g, '&amp;')
                .replaceAll(/</g, '&lt;')
                .replaceAll(/>/g, '&gt;')
                .replaceAll(/"/g, '&quot;')
                .replaceAll(/'/g, '&#039;')
                .replaceAll(/\n/g, '<br>')
        );

        const oldWords = oldString.split(/\s+/).flatMap((word) => word.split(/(<br>)/));
        const newWords = newString.split(/\s+/).flatMap((word) => word.split(/(<br>)/));

        function findLongestMatch(oldStart, oldEnd, newStart, newEnd) {
            let bestOldStart = oldStart;
            let bestNewStart = newStart;
            let bestSize = 0;

            const lookup = new Map();
            for (let i = oldStart; i < oldEnd; i++) {
                const word = oldWords[i];
                if (!lookup.has(word)) lookup.set(word, []);
                lookup.get(word).push(i);
            }

            for (let j = newStart; j < newEnd; j++) {
                const word = newWords[j];
                if (!lookup.has(word)) continue;

                for (const i of lookup.get(word)) {
                    let size = 0;
                    while (i + size < oldEnd && j + size < newEnd && oldWords[i + size] === newWords[j + size]) {
                        size++;
                    }
                    if (size > bestSize) {
                        bestOldStart = i;
                        bestNewStart = j;
                        bestSize = size;
                    }
                }
            }

            return {
                oldStart: bestOldStart,
                newStart: bestNewStart,
                size: bestSize
            };
        }

        function buildDiff(oldStart, oldEnd, newStart, newEnd) {
            const result = [];
            const match = findLongestMatch(oldStart, oldEnd, newStart, newEnd);

            if (match.size > 0) {
                // Handle differences before the match
                if (oldStart < match.oldStart || newStart < match.newStart) {
                    result.push(...buildDiff(oldStart, match.oldStart, newStart, match.newStart));
                }

                // Add the matched words
                result.push(oldWords.slice(match.oldStart, match.oldStart + match.size).join(' '));

                // Handle differences after the match
                if (match.oldStart + match.size < oldEnd || match.newStart + match.size < newEnd) {
                    result.push(...buildDiff(match.oldStart + match.size, oldEnd, match.newStart + match.size, newEnd));
                }
            } else {
                function build(words, start, end, pattern) {
                    let r = [];
                    let ts = words
                        .slice(start, end)
                        .filter((w) => w.length > 0)
                        .join(' ')
                        .split('<br>');
                    for (let i = 0; i < ts.length; i++) {
                        if (i > 0) r.push('<br>');
                        if (ts[i].length < 1) continue;
                        r.push(pattern.replace('{{text}}', ts[i]));
                    }
                    return r;
                }

                // Add deletions
                if (oldStart < oldEnd) result.push(...build(oldWords, oldStart, oldEnd, markerDeletion));

                // Add insertions
                if (newStart < newEnd) result.push(...build(newWords, newStart, newEnd, markerAddition));
            }

            return result;
        }

        return buildDiff(0, oldWords.length, 0, newWords.length)
            .join(' ')
            .replace(/<br>[ ]+<br>/g, '<br><br>')
            .replace(/<br> /g, '<br>');
    }
</script>

<style scoped lang="scss">
    .feed {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 16px;
        padding: 24px;
    }

    .feed-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 20px;
        border-radius: 12px;
        transition: all 0.3s ease;
    }

    // Dark theme controls
    .dark .feed-controls {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    // Light theme controls
    html:not(.dark) .feed-controls {
        background: #f0f0f0;
        border: 1px solid #e0e0e0;
        box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
    }

    .controls-left {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .vip-toggle-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 16px;
        border-radius: 12px;
        transition: all 0.3s ease;
    }

    // Dark theme VIP toggle
    .dark .vip-toggle-wrapper {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);

        &:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.12);
        }
    }

    // Light theme VIP toggle
    html:not(.dark) .vip-toggle-wrapper {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;

        &:hover {
            background: #e8e8e8;
            border-color: #d0d0d0;
        }
    }

    .vip-label {
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
    }

    // Dark theme VIP label
    .dark .vip-label {
        color: rgba(255, 255, 255, 0.8);
    }

    // Light theme VIP label
    html:not(.dark) .vip-label {
        color: #666666;
    }

    .controls-right {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 0 1 auto;
        justify-content: flex-end;
        min-width: 0;
        overflow: hidden;
    }

    .feed-date-picker {
        max-width: 320px;
        width: 100%;
        flex: 0 1 320px;
        min-width: 0;
        
        :deep(.el-input__wrapper) {
            overflow: hidden;
        }
        
        :deep(.el-input__inner) {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }

    .feed-filter-select {
        min-width: 180px;
        max-width: 200px;
        flex: 0 1 auto;
    }

    .feed-search-input {
        width: 280px;
        flex: 0 0 280px;
        max-width: 280px;
    }

    .feed-table-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
        border-radius: 12px;
        padding: 12px;
    }

    // Dark theme table wrapper
    .dark .feed-table-wrapper {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    // Light theme table wrapper
    html:not(.dark) .feed-table-wrapper {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
    }

    // DataTable wrapper styling
    :deep(.data-table-wrapper) {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
    }

    // Table container with scroll
    :deep(.el-table) {
        flex: 1;
        overflow: auto;
    }

    :deep(.el-table__body-wrapper) {
        max-height: 100%;
        overflow-y: auto !important;
        overflow-x: auto !important;
    }

    // Pagination styling
    :deep(.pagination-wrapper) {
        margin-top: 16px;
        padding: 12px 0;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    // Dark theme pagination
    .dark :deep(.el-pagination) {
        .el-pagination__sizes {
            .el-select {
                .el-input__wrapper {
                    background: rgba(20, 22, 32, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 8px;
                    
                    .el-input__inner {
                        color: rgba(255, 255, 255, 0.9);
                    }
                }
            }
        }

        .btn-prev,
        .btn-next,
        .el-pager li {
            background: rgba(20, 22, 32, 0.6);
            color: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            transition: all 0.2s ease;

            &:hover {
                background: rgba(20, 22, 32, 0.8);
                border-color: rgba(255, 255, 255, 0.2);
                color: rgba(255, 255, 255, 1);
            }
        }

        .el-pager li.is-active {
            background: rgba(20, 22, 32, 0.9);
            border-color: rgba(255, 255, 255, 0.25);
            color: rgba(255, 255, 255, 1);
        }

        .el-pagination__total {
            color: rgba(255, 255, 255, 0.8);
        }
    }

    // Light theme pagination
    html:not(.dark) :deep(.el-pagination) {
        .el-pagination__sizes {
            .el-select {
                .el-input__wrapper {
                    background: #ffffff;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    
                    .el-input__inner {
                        color: #333333;
                    }
                }
            }
        }

        .btn-prev,
        .btn-next,
        .el-pager li {
            background: #ffffff;
            color: #333333;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            transition: all 0.2s ease;

            &:hover {
                background: #f0f0f0;
                border-color: #d0d0d0;
                color: #333333;
            }
        }

        .el-pager li.is-active {
            background: #409eff;
            border-color: #409eff;
            color: #ffffff;
        }

        .el-pagination__total {
            color: #666666;
        }
    }

    // Dark theme select styling
    .dark :deep(.feed-filter-select) {
        .el-input__wrapper {
            background: rgba(20, 22, 32, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            transition: all 0.3s ease;
            
            .el-input__inner {
                color: rgba(255, 255, 255, 0.95);
                font-size: 14px;
            }
        }
        
        .el-input__wrapper:hover {
            background: rgba(20, 22, 32, 0.9);
            border-color: rgba(255, 255, 255, 0.2);
        }
        
        .el-input__wrapper.is-focus {
            background: rgba(20, 22, 32, 0.95);
            border-color: rgba(255, 255, 255, 0.25);
            box-shadow: 
                0 0 0 2px rgba(255, 255, 255, 0.1),
                0 4px 12px rgba(0, 0, 0, 0.15);
        }
    }

    // Light theme select styling
    html:not(.dark) :deep(.feed-filter-select) {
        .el-input__wrapper {
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            transition: all 0.3s ease;
            
            .el-input__inner {
                color: #333333;
                font-size: 14px;
            }
        }
        
        .el-input__wrapper:hover {
            background: #f5f5f5;
            border-color: #d0d0d0;
        }
        
        .el-input__wrapper.is-focus {
            background: #ffffff;
            border-color: #409eff;
            box-shadow: 
                0 0 0 2px rgba(64, 158, 255, 0.1),
                0 4px 12px rgba(0, 0, 0, 0.1);
        }
    }
    
    // Dark theme input styling
    .dark :deep(.feed-search-input) {
        .el-input__wrapper {
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
        }
        
        .el-input__wrapper:hover {
            background: rgba(20, 22, 32, 0.9);
            border-color: rgba(255, 255, 255, 0.2);
        }
        
        .el-input__wrapper.is-focus {
            background: rgba(20, 22, 32, 0.95);
            border-color: rgba(255, 255, 255, 0.25);
            box-shadow: 
                0 0 0 2px rgba(255, 255, 255, 0.1),
                0 4px 12px rgba(0, 0, 0, 0.15);
        }
    }

    // Light theme input styling
    html:not(.dark) :deep(.feed-search-input) {
        .el-input__wrapper {
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
        }
        
        .el-input__wrapper:hover {
            background: #f5f5f5;
            border-color: #d0d0d0;
        }
        
        .el-input__wrapper.is-focus {
            background: #ffffff;
            border-color: #409eff;
            box-shadow: 
                0 0 0 2px rgba(64, 158, 255, 0.1),
                0 4px 12px rgba(0, 0, 0, 0.1);
        }
    }
    
    // Switch styling (works for both themes - checked state uses semantic color)
    :deep(.el-switch) {
        .el-switch__core {
            transition: all 0.3s ease;
        }

        &.is-checked .el-switch__core {
            background-color: #13ce66;
            border-color: #13ce66;
        }
    }

    // Dark theme switch
    .dark :deep(.el-switch) {
        .el-switch__core {
            background: rgba(20, 22, 32, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.15);
        }
    }

    // Light theme switch
    html:not(.dark) :deep(.el-switch) {
        .el-switch__core {
            background: #e0e0e0;
            border: 1px solid #d0d0d0;
        }
    }
    
    // Table styling - uses global theme styles

    // Dark theme link styling
    .dark :deep(.x-link) {
        color: rgba(255, 255, 255, 0.9);
        transition: all 0.2s ease;
        cursor: pointer;

        &:hover {
            color: rgba(255, 255, 255, 1);
            text-decoration: underline;
        }
    }

    // Light theme link styling
    html:not(.dark) :deep(.x-link) {
        color: #409eff;
        transition: all 0.2s ease;
        cursor: pointer;

        &:hover {
            color: #66b1ff;
            text-decoration: underline;
        }
    }

    // Dark theme tag styling
    .dark :deep(.el-tag) {
        background-color: rgba(20, 22, 32, 0.8);
        border-color: rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.9);
        border-radius: 8px;
        font-size: 12px;
        padding: 4px 10px;
    }

    // Light theme tag styling
    html:not(.dark) :deep(.el-tag) {
        background-color: #f0f0f0;
        border-color: #e0e0e0;
        color: #333333;
        border-radius: 8px;
        font-size: 12px;
        padding: 4px 10px;
    }

    // Responsive design
    @media (max-width: 1200px) {
        .feed-controls {
            flex-direction: column;
            align-items: stretch;
        }

        .controls-right {
            flex-direction: row;
            width: 100%;
            flex-wrap: wrap;
        }

        .feed-date-picker {
            width: 100%;
            max-width: 100%;
            min-width: unset;
        }

        .feed-filter-select,
        .feed-search-input {
            flex: 0 0 auto;
            width: auto;
        }
        
        .feed-search-input {
            width: 280px;
            max-width: 280px;
        }
    }

    @media (max-width: 768px) {
        .feed {
            padding: 20px;
            gap: 16px;
        }

        .feed-title {
            font-size: 24px;
        }

        .feed-controls {
            padding: 16px;
        }
    }
</style>