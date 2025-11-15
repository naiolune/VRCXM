<template>
    <div class="instance-activity-container">
        <div class="instance-activity-header">
            <div class="header-left">
                <h2 class="activity-title">{{ t('view.charts.instance_activity.header') }}</h2>
                <el-popover placement="bottom-start" trigger="hover" :width="300">
                    <div class="tips-popover">
                        <div>{{ t('view.charts.instance_activity.tips.online_time') }}</div>
                        <div>{{ t('view.charts.instance_activity.tips.click_Y_axis') }}</div>
                        <div>{{ t('view.charts.instance_activity.tips.click_instance_name') }}</div>
                        <div>
                            <el-icon><WarningFilled /></el-icon
                            ><i>{{ t('view.charts.instance_activity.tips.accuracy_notice') }}</i>
                        </div>
                    </div>

                    <template #reference>
                        <el-icon class="info-icon"><InfoFilled /></el-icon>
                    </template>
                </el-popover>
            </div>

            <div class="header-actions">
                <el-tooltip :content="t('view.charts.instance_activity.refresh')" placement="top">
                    <el-button :icon="Refresh" circle class="action-button" @click="reloadData"></el-button>
                </el-tooltip>

                <el-popover placement="bottom" trigger="click" :width="280" popper-class="charts-settings-popover">
                    <div class="settings-popover">
                        <div class="settings-item">
                            <span class="settings-label">{{ t('view.charts.instance_activity.settings.bar_width') }}</span>
                            <el-slider
                                v-model.lazy="barWidth"
                                class="settings-slider"
                                :max="50"
                                :min="1"
                                @change="
                                    (value) => changeBarWidth(value, () => handleEchartsRerender())
                                "></el-slider>
                        </div>
                        <div class="settings-item">
                            <span class="settings-label">{{ t('view.charts.instance_activity.settings.show_detail') }}</span>
                            <el-switch
                                v-model="isDetailVisible"
                                @change="(value) => changeIsDetailInstanceVisible(value, () => handleSettingsChange())">
                            </el-switch>
                        </div>
                        <div v-if="isDetailVisible" class="settings-item">
                            <span class="settings-label">{{ t('view.charts.instance_activity.settings.show_solo_instance') }}</span>
                            <el-switch
                                v-model="isSoloInstanceVisible"
                                @change="(value) => changeIsSoloInstanceVisible(value, () => handleSettingsChange())">
                            </el-switch>
                        </div>
                        <div v-if="isDetailVisible" class="settings-item">
                            <span class="settings-label">{{ t('view.charts.instance_activity.settings.show_no_friend_instance') }}</span>
                            <el-switch
                                v-model="isNoFriendInstanceVisible"
                                @change="
                                    (value) => changeIsNoFriendInstanceVisible(value, () => handleSettingsChange())
                                ">
                            </el-switch>
                        </div>
                    </div>

                    <template #reference>
                        <el-tooltip :content="t('view.charts.instance_activity.settings.header')" placement="top">
                            <el-button :icon="Setting" circle class="action-button"></el-button>
                        </el-tooltip>
                    </template>
                </el-popover>
                
                <el-button-group class="date-navigation">
                    <el-tooltip :content="t('view.charts.instance_activity.previous_day')" placement="top">
                        <el-button
                            :icon="ArrowLeft"
                            :disabled="isPrevDayBtnDisabled"
                            class="date-nav-button"
                            @click="changeSelectedDateFromBtn(false)"></el-button>
                    </el-tooltip>
                    <el-tooltip :content="t('view.charts.instance_activity.next_day')" placement="top">
                        <el-button 
                            :disabled="isNextDayBtnDisabled"
                            class="date-nav-button"
                            @click="changeSelectedDateFromBtn(true)">
                            <el-icon class="el-icon--right"><ArrowRight /></el-icon>
                        </el-button>
                    </el-tooltip>
                </el-button-group>
                
                <el-date-picker
                    v-model="selectedDate"
                    type="date"
                    class="date-picker"
                    :clearable="false"
                    :default-value="dayjs().toDate()"
                    :disabled-date="getDatePickerDisabledDate"
                    @change="reloadData"></el-date-picker>
            </div>
        </div>
        
        <div class="status-online">
            <el-statistic
                :title="t('view.charts.instance_activity.online_time')"
                :formatter="(val) => timeToText(val, true)"
                :value="totalOnlineTime">
            </el-statistic>
        </div>

        <div ref="activityChartRef" class="activity-chart-container"></div>
        <div v-if="!isLoading && activityData.length === 0" class="nodata">
            <span>No data here, try another day</span>
        </div>

        <transition name="el-fade-in-linear">
            <div v-show="isDetailVisible && !isLoading && activityData.length !== 0" class="divider">
                <el-divider>·</el-divider>
            </div>
        </transition>
        <template v-if="isDetailVisible && activityData.length !== 0">
            <InstanceActivityDetail
                v-for="arr in filteredActivityDetailData"
                :key="arr[0].location + arr[0].created_at"
                ref="activityDetailChartRef"
                :activity-detail-data="arr"
                :bar-width="barWidth" />
        </template>
    </div>
</template>

<script setup>
    import { nextTick, onActivated, onBeforeMount, onDeactivated, onMounted, ref, watch } from 'vue';
    import { ArrowLeft, ArrowRight, InfoFilled, Refresh, Setting, WarningFilled } from '@element-plus/icons-vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import dayjs from 'dayjs';

    import { useAppearanceSettingsStore, useFriendStore, useUserStore } from '../../../stores';
    import { parseLocation, timeToText } from '../../../shared/utils';
    import { useActivityDataProcessor } from '../composables/useActivityDataProcessor';
    import { useChartHelpers } from '../composables/useChartHelpers';
    import { useDateNavigation } from '../composables/useDateNavigation';
    import { useInstanceActivityData } from '../composables/useInstanceActivityData';
    import { useInstanceActivitySettings } from '../composables/useInstanceActivitySettings';
    import { useIntersectionObserver } from '../composables/useIntersectionObserver';

    import InstanceActivityDetail from './InstanceActivityDetail.vue';

    import * as echarts from 'echarts';

    const appearanceSettingsStore = useAppearanceSettingsStore();
    const friendStore = useFriendStore();
    const { isDarkMode, dtHour12 } = storeToRefs(appearanceSettingsStore);
    const { localFavoriteFriends, friends } = storeToRefs(friendStore);
    const { currentUser } = storeToRefs(useUserStore());
    const { t } = useI18n();

    const {
        barWidth,
        isDetailVisible,
        isSoloInstanceVisible,
        isNoFriendInstanceVisible,
        initializeSettings,
        changeBarWidth,
        changeIsDetailInstanceVisible,
        changeIsSoloInstanceVisible,
        changeIsNoFriendInstanceVisible,
        handleChangeSettings
    } = useInstanceActivitySettings();

    const {
        activityData,
        activityDetailData,
        allDateOfActivity,
        worldNameArray,
        getAllDateOfActivity,
        getWorldNameData,
        getActivityData
    } = useInstanceActivityData();

    const echartsInstance = ref(null);
    const resizeObserver = ref(null);
    const { handleIntersectionObserver } = useIntersectionObserver();
    const isLoading = ref(true);

    let reloadData;
    const {
        selectedDate,
        isNextDayBtnDisabled,
        isPrevDayBtnDisabled,
        changeSelectedDateFromBtn,
        getDatePickerDisabledDate
    } = useDateNavigation(allDateOfActivity, () => reloadData());

    const activityChartRef = ref(null);
    const activityDetailChartRef = ref(null);

    const { totalOnlineTime, filteredActivityDetailData } = useActivityDataProcessor(
        activityData,
        activityDetailData,
        isDetailVisible,
        isSoloInstanceVisible,
        isNoFriendInstanceVisible
    );

    const { isDetailDataFiltered, findMatchingDetailData, generateYAxisLabel } = useChartHelpers();

    watch(
        () => isDarkMode.value,
        () => {
            if (echartsInstance.value) {
                echartsInstance.value.dispose();
                echartsInstance.value = null;
                initEcharts();
            }
        }
    );

    watch(
        () => dtHour12.value,
        () => {
            if (echartsInstance.value) {
                initEcharts();
            }
        }
    );

    onActivated(() => {
        // first time also call activated
        if (echartsInstance.value) {
            reloadData();
        }
    });

    onDeactivated(() => {
        // prevent resize animation when switch tab
        if (resizeObserver.value) {
            resizeObserver.value.disconnect();
        }
    });

    onBeforeMount(() => {
        initializeSettings();
    });

    onMounted(async () => {
        try {
            getAllDateOfActivity();
            await getActivityData(selectedDate, currentUser, friends, localFavoriteFriends, () =>
                handleIntersectionObserver(activityDetailChartRef)
            );
            await getWorldNameData();
            initEcharts();
        } catch (error) {
            console.error('error in mounted', error);
            isLoading.value = false;
        }
    });

    reloadData = async function () {
        isLoading.value = true;
        try {
            await getActivityData(selectedDate, currentUser, friends, localFavoriteFriends, () =>
                handleIntersectionObserver(activityDetailChartRef)
            );
            await getWorldNameData();
            // possibility past 24:00
            getAllDateOfActivity();

            await nextTick();

            if (echartsInstance.value && activityData.value.length) {
                const chartsHeight = activityData.value.length * (barWidth.value + 10) + 200;
                echartsInstance.value.resize({
                    height: chartsHeight,
                    animation: {
                        duration: 300
                    }
                });
                echartsInstance.value.setOption(getNewOption(), { notMerge: true });
            } else if (echartsInstance.value) {
                echartsInstance.value.clear();
            }
        } catch (error) {
            console.error('Error in reloadData:', error);
        } finally {
            isLoading.value = false;
        }
    };

    function handleYAxisLabelClick(params) {
        const targetActivity = activityData.value[params?.dataIndex];
        if (!targetActivity) {
            console.error('handleClickYAxisLabel failed, no activity data found for index:', params?.dataIndex);
            return;
        }

        const detailDataIdx = filteredActivityDetailData.value.findIndex((arr) => {
            const sameLocation = arr[0]?.location === targetActivity.location;
            const sameJoinTime = arr
                .find((item) => item.user_id === currentUser.value.id)
                ?.joinTime.isSame(targetActivity.joinTime);
            return sameLocation && sameJoinTime;
        });

        if (detailDataIdx === -1) {
            console.error(
                "handleClickYAxisLabel failed, likely current user wasn't in this instance or chart is filtered out.",
                params
            );
            return;
        }

        if (activityDetailChartRef.value && activityDetailChartRef.value[detailDataIdx]) {
            activityDetailChartRef.value[detailDataIdx].$el.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        } else {
            console.error('handleClickYAxisLabel failed, chart ref not found at index:', detailDataIdx);
        }
    }

    function getYAxisData() {
        return worldNameArray.value.map((worldName, index) => {
            const activityItem = activityData.value[index];
            if (!activityItem) return worldName;

            const detailData = findMatchingDetailData(activityItem, activityDetailData.value, currentUser.value);
            if (!detailData) return worldName;

            const shouldFilter =
                isDetailVisible.value &&
                isDetailDataFiltered(detailData, isSoloInstanceVisible.value, isNoFriendInstanceVisible.value);

            return generateYAxisLabel(worldName, shouldFilter);
        });
    }

    function initEcharts() {
        const chartsHeight = activityData.value.length * (barWidth.value + 10) + 200;
        const chartDom = activityChartRef.value;

        const afterInit = () => {
            if (!echartsInstance.value) {
                console.error('ECharts instance not initialized');
                return;
            }

            echartsInstance.value.resize({
                height: chartsHeight,
                animation: {
                    duration: 300
                }
            });

            const handleClickYAxisLabel = handleYAxisLabelClick;

            echartsInstance.value.off('click');

            if (activityData.value.length && worldNameArray.value.length) {
                const options = getNewOption();
                echartsInstance.value.clear();
                echartsInstance.value.setOption(options, { notMerge: true });
                echartsInstance.value.on('click', 'yAxis', handleClickYAxisLabel);
            } else {
                echartsInstance.value.clear();
            }
            isLoading.value = false;
        };

        const initEchartsInstance = () => {
            echartsInstance.value = echarts.init(chartDom, `${isDarkMode.value ? 'dark' : null}`, {
                height: chartsHeight
            });
            // resizeObserver.value = new ResizeObserver((entries) => {
            //     for (const entry of entries) {
            //         echartsInstance.value.resize({
            //             width: entry.contentRect.width,
            //             animation: {
            //                 duration: 300
            //             }
            //         });
            //     }
            // });
            // resizeObserver.value.observe(chartDom);
        };

        if (!echartsInstance.value) {
            initEchartsInstance();
        }
        afterInit();
    }
    function getNewOption() {
        const getTooltip = (params) => {
            const activityDataArray = activityData.value;
            const param = params[1];

            if (!activityDataArray || !activityDataArray[param.dataIndex]) {
                return '';
            }

            const instanceData = activityDataArray[param.dataIndex];

            const format = dtHour12.value ? 'hh:mm:ss A' : 'HH:mm:ss';

            const formattedLeftDateTime = dayjs(instanceData.leaveTime).format(format);
            const formattedJoinDateTime = dayjs(instanceData.joinTime).format(format);

            const timeString = timeToText(param.data, true);
            const color = param.color;
            const name = param.name;
            const location = parseLocation(instanceData.location);

            return `
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 4px; height: 55px; background-color: ${color}; border-radius: 2px; margin-right: 2px;"></div>
                            <div style="line-height: 1.6;">
                                <div style="font-weight: 600; color: rgba(255, 255, 255, 0.95); margin-bottom: 4px;">${name} #${location.instanceName} ${location.accessTypeName}</div>
                                <div style="color: rgba(255, 255, 255, 0.75); font-size: 12px; margin-bottom: 2px;">${formattedJoinDateTime} - ${formattedLeftDateTime}</div>
                                <div style="color: rgba(255, 255, 255, 0.85); font-size: 13px; font-weight: 500;">${timeString}</div>
                            </div>
                        </div>
                    `;
        };

        const format = dtHour12.value ? 'hh:mm A' : 'HH:mm';

        const echartsOption = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow',
                    shadowStyle: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                backgroundColor: 'rgba(20, 22, 32, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                textStyle: {
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 13
                },
                formatter: getTooltip
            },
            grid: {
                top: 50,
                left: 160,
                right: 90,
                bottom: 30
            },
            yAxis: {
                type: 'category',
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: 'rgba(255, 255, 255, 0.12)',
                        width: 1
                    }
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    interval: 0,
                    color: 'rgba(255, 255, 255, 0.75)',
                    fontSize: 12,
                    rich: {
                        filtered: {
                            opacity: 0.4,
                            color: 'rgba(255, 255, 255, 0.4)'
                        },
                        normal: {
                            opacity: 1,
                            color: 'rgba(255, 255, 255, 0.75)'
                        }
                    }
                },
                inverse: true,
                data: getYAxisData(),
                triggerEvent: true
            },
            xAxis: {
                type: 'value',
                min: 0,
                // axisLabel max 24:00
                max: 24 * 60 * 60 * 1000,
                // axisLabel interval 3hr
                interval: 3 * 60 * 60 * 1000,
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: 'rgba(255, 255, 255, 0.12)',
                        width: 1
                    }
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    color: 'rgba(255, 255, 255, 0.65)',
                    fontSize: 11,
                    formatter: (value) => dayjs(value).utc().format(format)
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        type: 'dashed',
                        color: 'rgba(255, 255, 255, 0.08)',
                        width: 1
                    }
                }
            },
            series: [
                {
                    name: 'Placeholder',
                    type: 'bar',
                    stack: 'Total',
                    itemStyle: {
                        borderColor: 'transparent',
                        color: 'transparent'
                    },
                    emphasis: {
                        itemStyle: {
                            borderColor: 'transparent',
                            color: 'transparent'
                        }
                    },
                    data: activityData.value.map((item, idx) => {
                        if (idx === 0) {
                            const midnight = dayjs.tz(selectedDate.value).startOf('day');
                            if (midnight.isAfter(item.joinTime)) {
                                return 0;
                            }
                        }
                        return item.joinTime - dayjs.tz(selectedDate.value).startOf('day').valueOf();
                    })
                },
                {
                    name: 'Time',
                    type: 'bar',
                    stack: 'Total',
                    colorBy: 'data',
                    barWidth: barWidth.value,
                    emphasis: {
                        focus: 'self',
                        itemStyle: {
                            shadowBlur: 8,
                            shadowOffsetX: 0,
                            shadowOffsetY: 2,
                            shadowColor: 'rgba(0, 0, 0, 0.4)'
                        }
                    },
                    itemStyle: {
                        borderRadius: [4, 4, 0, 0],
                        shadowBlur: 3,
                        shadowOffsetX: 0,
                        shadowOffsetY: 1,
                        shadowColor: 'rgba(0, 0, 0, 0.25)'
                    },
                    data: activityData.value.map((item, idx) => {
                        // If the joinTime of the first data is on the previous day,
                        // and the data traverses midnight, the duration starts at midnight
                        if (idx === 0) {
                            const midnight = dayjs.tz(selectedDate.value).startOf('day');
                            if (midnight.isAfter(item.joinTime)) {
                                return item.leaveTime - dayjs.tz(midnight).valueOf();
                            }
                        }
                        return item.time;
                    })
                }
            ],
            backgroundColor: 'transparent'
        };
        return echartsOption;
    }

    function handleEchartsRerender() {
        initEcharts();
        handleSettingsChange();
    }
    function handleSettingsChange() {
        handleChangeSettings(activityDetailChartRef);

        if (echartsInstance.value) {
            const newOptions = getNewOption();
            echartsInstance.value.setOption({
                yAxis: newOptions.yAxis
            });
        }

        nextTick(() => {
            handleIntersectionObserver(activityDetailChartRef);
        });
    }
</script>

<style lang="scss" scoped>
    .instance-activity-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .instance-activity-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 20px;
        border-radius: 16px;
        flex-wrap: wrap;
    }

    // Dark theme header
    .dark .instance-activity-header {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    // Light theme header
    html:not(.dark) .instance-activity-header {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .activity-title {
        font-weight: 600;
        font-size: 18px;
        margin: 0;
        line-height: 1.2;
    }

    // Dark theme title
    .dark .activity-title {
        color: rgba(255, 255, 255, 0.95);
    }

    // Light theme title
    html:not(.dark) .activity-title {
        color: #333333;
    }

    .info-icon {
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    // Dark theme info icon
    .dark .info-icon {
        color: rgba(255, 255, 255, 0.6);
        
        &:hover {
            color: rgba(255, 255, 255, 0.9);
        }
    }

    // Light theme info icon
    html:not(.dark) .info-icon {
        color: #999999;
        
        &:hover {
            color: #666666;
        }
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }

    .action-button {
        border-radius: 50% !important;
        width: 36px;
        height: 36px;
        transition: all 0.3s ease;
        flex-shrink: 0;
        
        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
    }

    // Dark theme action button
    .dark .action-button {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: rgba(255, 255, 255, 0.85) !important;
        
        &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }
    }

    // Light theme action button
    html:not(.dark) .action-button {
        background: #f0f0f0 !important;
        border: 1px solid #e0e0e0 !important;
        color: #666666 !important;
        
        &:hover:not(:disabled) {
            background: #e0e0e0 !important;
            border-color: #d0d0d0 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
    }

    // Dark theme date navigation
    .dark .date-navigation {
        :deep(.el-button) {
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 8px !important;
            color: rgba(255, 255, 255, 0.85) !important;
            transition: all 0.3s ease;
            
            &:hover:not(:disabled) {
                background: rgba(255, 255, 255, 0.1) !important;
                border-color: rgba(255, 255, 255, 0.2) !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
            }

            &:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }
        }
    }

    // Light theme date navigation
    html:not(.dark) .date-navigation {
        :deep(.el-button) {
            background: #f0f0f0 !important;
            border: 1px solid #e0e0e0 !important;
            border-radius: 8px !important;
            color: #666666 !important;
            transition: all 0.3s ease;
            
            &:hover:not(:disabled) {
                background: #e0e0e0 !important;
                border-color: #d0d0d0 !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }

            &:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }
        }
    }

    // Dark theme date picker
    .dark .date-picker {
        :deep(.el-input__wrapper) {
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
        
        :deep(.el-input__inner) {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
        }
    }

    // Light theme date picker
    html:not(.dark) .date-picker {
        :deep(.el-input__wrapper) {
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
        
        :deep(.el-input__inner) {
            color: #333333;
            font-size: 14px;
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

    // Dark theme settings slider
    .dark .settings-slider {
        width: 160px;
        flex-shrink: 0;
        
        :deep(.el-slider__runway) {
            background: rgba(255, 255, 255, 0.08);
        }
        
        :deep(.el-slider__bar) {
            background: rgba(255, 255, 255, 0.25);
        }
        
        :deep(.el-slider__button) {
            background: rgba(255, 255, 255, 0.85);
            border-color: rgba(255, 255, 255, 0.25);
        }
    }

    // Light theme settings slider
    html:not(.dark) .settings-slider {
        width: 160px;
        flex-shrink: 0;
        
        :deep(.el-slider__runway) {
            background: #e0e0e0;
        }
        
        :deep(.el-slider__bar) {
            background: #409eff;
        }
        
        :deep(.el-slider__button) {
            background: #ffffff;
            border-color: #409eff;
        }
    }

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

    // Dark theme tips popover
    .dark .tips-popover {
        & > div {
            margin-bottom: 5px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
        }
        & > div:last-child {
            display: flex;
            align-items: center;
            margin-top: 10px;
            i {
                margin-right: 3px;
            }
        }
        & .el-icon-warning-outline {
            font-size: 12px;
        }
    }

    // Light theme tips popover
    html:not(.dark) .tips-popover {
        & > div {
            margin-bottom: 5px;
            font-size: 12px;
            color: #666666;
        }
        & > div:last-child {
            display: flex;
            align-items: center;
            margin-top: 10px;
            i {
                margin-right: 3px;
            }
        }
        & .el-icon-warning-outline {
            font-size: 12px;
        }
    }

    .activity-chart-container {
        width: 100%;
        padding: 20px;
        border-radius: 16px;
    }

    // Dark theme chart container
    .dark .activity-chart-container {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    // Light theme chart container
    html:not(.dark) .activity-chart-container {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .nodata {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 100px;
        font-size: 14px;
        font-weight: 500;
    }

    // Dark theme nodata
    .dark .nodata {
        color: rgba(255, 255, 255, 0.5);
    }

    // Light theme nodata
    html:not(.dark) .nodata {
        color: #999999;
    }

    .divider {
        padding: 20px 0;
        transition: top 0.3s ease;
    }

    // Dark theme divider
    .dark .divider {
        :deep(.el-divider) {
            border-color: rgba(255, 255, 255, 0.1);
        }
        
        :deep(.el-divider__text) {
            background: rgba(20, 22, 32, 0.95);
            color: rgba(255, 255, 255, 0.6);
            padding: 0 12px;
            font-size: 14px;
        }
    }

    // Light theme divider
    html:not(.dark) .divider {
        :deep(.el-divider) {
            border-color: #e0e0e0;
        }
        
        :deep(.el-divider__text) {
            background: #ffffff;
            color: #666666;
            padding: 0 12px;
            font-size: 14px;
        }
    }

    // override el-ui
    .el-date-editor.el-input,
    .el-date-editor.el-input__inner {
        width: 200px;
    }

    .status-online {
        display: flex;
        justify-content: center;
        padding: 16px 20px;
        border-radius: 16px;
    }

    // Dark theme status online
    .dark .status-online {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        
        :deep(.el-statistic__head) {
            display: flex;
            justify-content: center;
            color: rgba(255, 255, 255, 0.7);
            font-size: 13px;
            font-weight: 500;
        }

        :deep(.el-statistic__number) {
            color: rgba(255, 255, 255, 0.95);
            font-weight: 600;
        }
    }

    // Light theme status online
    html:not(.dark) .status-online {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        
        :deep(.el-statistic__head) {
            display: flex;
            justify-content: center;
            color: #666666;
            font-size: 13px;
            font-weight: 500;
        }

        :deep(.el-statistic__number) {
            color: #333333;
            font-weight: 600;
        }
    }
</style>
