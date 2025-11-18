import { defineStore } from 'pinia';
import { watch } from 'vue';

import { database } from '../service/database';
import { groupRequest } from '../api';
import { useAuthStore } from './auth';
import { useDiscordPresenceSettingsStore } from './settings/discordPresence';
import { useFriendStore } from './friend';
import { useGameLogStore } from './gameLog';
import { useGameStore } from './game';
import { useGroupStore } from './group';
import { useModerationStore } from './moderation';
import { useUserStore } from './user';
import { useVRCXUpdaterStore } from './vrcxUpdater';
import { useVrStore } from './vr';
import { useVrcxStore } from './vrcx';
import { watchState } from '../service/watchState';

import * as workerTimers from 'worker-timers';

export const useUpdateLoopStore = defineStore('UpdateLoop', () => {
    const authStore = useAuthStore();
    const userStore = useUserStore();
    const friendStore = useFriendStore();
    const gameStore = useGameStore();
    const moderationStore = useModerationStore();
    const vrcxStore = useVrcxStore();
    const discordPresenceSettingsStore = useDiscordPresenceSettingsStore();
    const gameLogStore = useGameLogStore();
    const vrcxUpdaterStore = useVRCXUpdaterStore();
    const groupStore = useGroupStore();
    const vrStore = useVrStore();
    const state = {
        nextCurrentUserRefresh: 300,
        nextFriendsRefresh: 3600,
        nextGroupInstanceRefresh: 0,
        nextAppUpdateCheck: 3600,
        ipcTimeout: 0,
        nextClearVRCXCacheCheck: 0,
        nextDiscordUpdate: 0,
        nextAutoStateChange: 0,
        nextGetLogCheck: 0,
        nextGameRunningCheck: 0,
        nextDatabaseOptimize: 3600
    };

    watch(
        () => watchState.isLoggedIn,
        () => {
            state.nextCurrentUserRefresh = 300;
            state.nextFriendsRefresh = 3600;
            state.nextGroupInstanceRefresh = 0;
        },
        { flush: 'sync' }
    );

    const nextGroupInstanceRefresh = state.nextGroupInstanceRefresh;

    const nextCurrentUserRefresh = state.nextCurrentUserRefresh;

    const nextDiscordUpdate = state.nextDiscordUpdate;

    const ipcTimeout = state.ipcTimeout;

    async function updateLoop() {
        try {
            if (watchState.isLoggedIn) {
                if (--state.nextCurrentUserRefresh <= 0) {
                    state.nextCurrentUserRefresh = 300; // 5min
                    userStore.getCurrentUser();
                }
                if (--state.nextFriendsRefresh <= 0) {
                    state.nextFriendsRefresh = 3600; // 1hour
                    friendStore.refreshFriendsList();
                    authStore.updateStoredUser(userStore.currentUser);
                    if (gameStore.isGameRunning) {
                        moderationStore.refreshPlayerModerations();
                    }
                }
                if (--state.nextGroupInstanceRefresh <= 0) {
                    if (watchState.isFriendsLoaded) {
                        state.nextGroupInstanceRefresh = 300; // 5min
                        const args =
                            await groupRequest.getUsersGroupInstances();
                        groupStore.handleGroupUserInstances(args);
                    }
                    AppApi.CheckGameRunning();
                }
                if (--state.nextAppUpdateCheck <= 0) {
                    state.nextAppUpdateCheck = 3600; // 1hour
                    if (vrcxUpdaterStore.autoUpdateVRCX !== 'Off') {
                        vrcxUpdaterStore.checkForVRCXUpdate();
                    }
                    vrcxStore.tryAutoBackupVrcRegistry();
                }
                if (--state.ipcTimeout <= 0) {
                    vrcxStore.ipcEnabled = false;
                }
                if (
                    --state.nextClearVRCXCacheCheck <= 0 &&
                    vrcxStore.clearVRCXCacheFrequency > 0
                ) {
                    state.nextClearVRCXCacheCheck =
                        vrcxStore.clearVRCXCacheFrequency / 2;
                    vrcxStore.clearVRCXCache();
                }
                if (--state.nextDiscordUpdate <= 0) {
                    state.nextDiscordUpdate = 3;
                    if (discordPresenceSettingsStore.discordActive) {
                        discordPresenceSettingsStore.updateDiscord();
                    }
                }
                if (--state.nextAutoStateChange <= 0) {
                    state.nextAutoStateChange = 3;
                    userStore.updateAutoStateChange();
                }
                if ((LINUX || (typeof window !== 'undefined' && window.electron)) && --state.nextGetLogCheck <= 0) {
                    state.nextGetLogCheck = 0.5;
                    try {
                        if (typeof LogWatcher === 'undefined' || typeof LogWatcher.GetLogLines !== 'function') {
                            console.warn('[GameLog] LogWatcher.GetLogLines is not available', { 
                                LogWatcher: typeof LogWatcher, 
                                GetLogLines: typeof LogWatcher?.GetLogLines,
                                LINUX,
                                windowElectron: typeof window !== 'undefined' ? !!window.electron : false
                            });
                            return;
                        }
                        console.log('[GameLog] Calling LogWatcher.GetLogLines()...');
                        const logLines = await LogWatcher.GetLogLines();
                        console.log('[GameLog] GetLogLines returned:', { 
                            result: logLines, 
                            type: typeof logLines, 
                            isArray: Array.isArray(logLines),
                            length: logLines?.length 
                        });
                        if (logLines && logLines.length > 0) {
                            console.log(`[GameLog] ✅ GetLogLines returned ${logLines.length} events`);
                            const joinLeaveEvents = logLines.filter(line => {
                                try {
                                    const parsed = JSON.parse(line);
                                    return parsed && parsed.length > 2 && (parsed[2] === 'player-joined' || parsed[2] === 'player-left');
                                } catch {
                                    return false;
                                }
                            });
                            if (joinLeaveEvents.length > 0) {
                                console.log(`[GameLog] 🎯 Found ${joinLeaveEvents.length} join/leave events!`);
                                joinLeaveEvents.forEach(event => {
                                    try {
                                        const parsed = JSON.parse(event);
                                        console.log(`[GameLog] Join/Leave event:`, parsed);
                                    } catch (e) {
                                        console.log(`[GameLog] Join/Leave event (parse error):`, event.substring(0, 200));
                                    }
                                });
                            } else {
                                const sample = logLines[0]?.substring(0, 150);
                                console.log(`[GameLog] No join/leave events in ${logLines.length} events. Sample:`, sample);
                                // Show all event types for debugging
                                const eventTypes = logLines.map(line => {
                                    try {
                                        const parsed = JSON.parse(line);
                                        return parsed && parsed.length > 2 ? parsed[2] : 'unknown';
                                    } catch {
                                        return 'parse-error';
                                    }
                                });
                                const typeCounts = {};
                                eventTypes.forEach(type => typeCounts[type] = (typeCounts[type] || 0) + 1);
                                console.log(`[GameLog] Event types in this batch:`, typeCounts);
                            }
                            logLines.forEach((logLine) => {
                                gameLogStore.addGameLogEvent(logLine);
                            });
                        }
                        // Removed the empty array logging to reduce spam
                    } catch (error) {
                        console.error(`[GameLog] Error calling GetLogLines:`, error);
                    }
                }
                if ((LINUX || (typeof window !== 'undefined' && window.electron)) && --state.nextGameRunningCheck <= 0) {
                    state.nextGameRunningCheck = 1;
                    gameStore.updateIsGameRunning(
                        await AppApi.IsGameRunning(),
                        await AppApi.IsSteamVRRunning(),
                        false
                    );
                    vrStore.vrInit(); // TODO: make this event based
                }
                if (--state.nextDatabaseOptimize <= 0) {
                    state.nextDatabaseOptimize = 86400; // 1 day
                    database.optimize();
                }
            }
        } catch (err) {
            friendStore.isRefreshFriendsLoading = false;
            console.error(err);
        }
        workerTimers.setTimeout(() => updateLoop(), 1000);
    }

    return {
        // state,

        nextGroupInstanceRefresh,
        nextCurrentUserRefresh,
        nextDiscordUpdate,
        ipcTimeout,
        updateLoop
    };
});
