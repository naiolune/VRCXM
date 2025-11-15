<template>
    <div class="login-top-buttons">
        <el-tooltip placement="top" :content="t('view.login.updater')">
            <el-button type="default" size="small" :icon="Download" circle @click="showVRCXUpdateDialog"></el-button>
        </el-tooltip>
        <el-tooltip placement="top" :content="t('view.login.proxy_settings')">
            <el-button
                type="default"
                size="small"
                :icon="Connection"
                style="margin-left: 5px"
                circle
                @click="promptProxySettings"></el-button>
        </el-tooltip>
    </div>
    <div v-loading="loginForm.loading" class="x-login-container login-page-wrapper">
        <div class="x-login">
            <div class="x-login-form-container">
                <div class="x-login-card">
                    <h2 style="font-weight: bold; text-align: center; margin: 0">{{ t('view.login.login') }}</h2>
                    <el-form
                        ref="loginFormRef"
                        :model="loginForm"
                        :rules="loginForm.rules"
                        @submit.prevent="handleLogin()">
                        <el-form-item
                            :label="t('view.login.field.username')"
                            prop="username"
                            required
                            style="display: block">
                            <el-input
                                v-model="loginForm.username"
                                name="username"
                                :placeholder="t('view.login.field.username')"
                                clearable></el-input>
                        </el-form-item>
                        <el-form-item
                            :label="t('view.login.field.password')"
                            prop="password"
                            required
                            style="display: block; margin-top: 10px">
                            <el-input
                                v-model="loginForm.password"
                                type="password"
                                name="password"
                                :placeholder="t('view.login.field.password')"
                                clearable
                                show-password></el-input>
                        </el-form-item>
                        <el-checkbox v-model="loginForm.saveCredentials">{{
                            t('view.login.field.saveCredentials')
                        }}</el-checkbox>
                        <el-checkbox
                            v-model="enableCustomEndpoint"
                            style="margin-top: 10px"
                            @change="toggleCustomEndpoint"
                            >{{ t('view.login.field.devEndpoint') }}</el-checkbox
                        >
                        <el-form-item
                            v-if="enableCustomEndpoint"
                            :label="t('view.login.field.endpoint')"
                            prop="endpoint"
                            style="margin-top: 10px">
                            <el-input
                                v-model="loginForm.endpoint"
                                name="endpoint"
                                :placeholder="AppDebug.endpointDomainVrchat"
                                clearable></el-input>
                        </el-form-item>
                        <el-form-item
                            v-if="enableCustomEndpoint"
                            :label="t('view.login.field.websocket')"
                            prop="websocket"
                            style="margin-top: 10px">
                            <el-input
                                v-model="loginForm.websocket"
                                name="websocket"
                                :placeholder="AppDebug.websocketDomainVrchat"
                                clearable></el-input>
                        </el-form-item>
                        <el-form-item>
                            <el-button native-type="submit" type="primary" style="width: 100%">{{
                                t('view.login.login')
                            }}</el-button>
                        </el-form-item>
                    </el-form>
                    <el-button
                        type="primary"
                        style="width: 100%"
                        @click="openExternalLink('https://vrchat.com/register')"
                        >{{ t('view.login.register') }}</el-button
                    >
                </div>

                <hr v-if="Object.keys(savedCredentials).length !== 0" class="x-vertical-divider" />

                <div v-if="Object.keys(savedCredentials).length !== 0" class="x-saved-accounts-card">
                    <h2 style="font-weight: bold; text-align: center; margin: 0">
                        {{ t('view.login.savedAccounts') }}
                    </h2>
                    <div class="x-scroll-wrapper" style="margin-top: 10px">
                        <div class="x-saved-account-list">
                            <div
                                v-for="user in savedCredentials"
                                :key="user.user.id"
                                class="x-friend-item"
                                @click="clickSavedLogin(user)">
                                <div class="avatar">
                                    <img :src="userImage(user.user)" loading="lazy" />
                                </div>
                                <div class="detail">
                                    <span class="name" v-text="user.user.displayName"></span>
                                    <span class="extra" v-text="user.user.username"></span>
                                    <span class="extra" v-text="user.loginParams.endpoint"></span>
                                </div>
                                <el-button
                                    type="default"
                                    size="small"
                                    :icon="Delete"
                                    style="margin-left: 10px"
                                    circle
                                    @click.stop="clickDeleteSavedLogin(user.user.id)"></el-button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="x-legal-notice-container">
                <div style="text-align: center; font-size: 12px">
                    <p>
                        <a class="x-link" @click="openExternalLink('https://vrchat.com/home/password')">{{
                            t('view.login.forgotPassword')
                        }}</a>
                    </p>
                    <p>
                        &copy; 2019-2025
                        <a class="x-link" @click="openExternalLink('https://github.com/pypy-vrc')">pypy</a> &amp;
                        <a class="x-link" @click="openExternalLink('https://github.com/Natsumi-sama')">Natsumi</a>
                        <br />
                        VRCXM Fork by <a class="x-link" @click="openExternalLink('https://github.com/naiolune')">naiolune</a>
                    </p>
                    <p>{{ t('view.settings.general.legal_notice.info') }}</p>
                    <p>{{ t('view.settings.general.legal_notice.disclaimer1') }}</p>
                    <p>{{ t('view.settings.general.legal_notice.disclaimer2') }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { Connection, Delete, Download } from '@element-plus/icons-vue';
    import { onBeforeMount, onBeforeUnmount, ref } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { useAuthStore, useGeneralSettingsStore, useVRCXUpdaterStore } from '../../stores';
    import { openExternalLink, userImage } from '../../shared/utils';
    import { AppDebug } from '../../service/appConfig';
    import { watchState } from '../../service/watchState';

    const { showVRCXUpdateDialog } = useVRCXUpdaterStore();
    const { loginForm, enableCustomEndpoint } = storeToRefs(useAuthStore());
    const { toggleCustomEndpoint, relogin, deleteSavedLogin, login, getAllSavedCredentials } = useAuthStore();
    const { promptProxySettings } = useGeneralSettingsStore();

    const { t } = useI18n();

    const loginFormRef = ref(null);
    const savedCredentials = ref({});

    async function clickDeleteSavedLogin(userId) {
        await deleteSavedLogin(userId);
        await updateSavedCredentials();
    }

    async function clickSavedLogin(user) {
        await relogin(user);
        await updateSavedCredentials();
    }

    function handleLogin() {
        if (loginFormRef.value) {
            loginFormRef.value.validate(async (valid) => {
                if (valid) {
                    await login();
                    await updateSavedCredentials();
                }
            });
        }
    }

    async function updateSavedCredentials() {
        if (watchState.isLoggedIn) {
            return;
        }
        savedCredentials.value = await getAllSavedCredentials();
    }

    onBeforeMount(async () => {
        updateSavedCredentials();
    });

    onBeforeUnmount(() => {
        if (loginFormRef.value) {
            loginFormRef.value.resetFields();
        }
        savedCredentials.value = {};
    });
</script>

<style scoped>
    .login-page-wrapper {
        background: rgba(255, 255, 255, 0.04) !important;
    }
    
    .x-login-container {
        position: relative;
        overflow: hidden;
    }
    
    .x-login {
        position: relative;
        z-index: 1;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 20px;
        padding: 32px 28px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
        max-width: clamp(800px, 80svw, 1200px);
        width: 100%;
    }
    
    .x-login-form-container {
        background: transparent;
        padding: 0;
        border: none;
        box-shadow: none;
    }
    
    .x-login-card,
    .x-saved-accounts-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 24px;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }
    
    .x-saved-accounts-card {
        min-height: 0;
        overflow: hidden;
    }
    
    .x-login h2 {
        color: rgba(255, 255, 255, 0.95);
        margin-bottom: 24px;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.5px;
        text-align: center;
        text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
    }
    
    .x-legal-notice-container {
        margin-top: 20px;
        padding: 16px 18px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .x-legal-notice-container p {
        color: rgba(255, 255, 255, 0.75);
        margin: 10px 0;
        font-size: 12px;
        line-height: 1.6;
    }
    
    .x-legal-notice-container a {
        color: rgba(255, 255, 255, 0.8);
        transition: all 0.2s ease;
        text-decoration: none;
        font-weight: 500;
    }
    
    .x-legal-notice-container a:hover {
        color: rgba(255, 255, 255, 0.95);
        text-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
    }
    
    .x-saved-account-list .x-friend-item {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 14px;
        padding: 16px;
        margin-bottom: 12px;
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .x-saved-account-list .x-friend-item:hover {
        background: rgba(255, 255, 255, 0.12);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        border-color: rgba(255, 255, 255, 0.25);
    }
    
    :deep(.el-form-item) {
        margin-bottom: 16px;
    }
    
    :deep(.el-form-item__label) {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 500;
        font-size: 13px;
        margin-bottom: 6px;
    }
    
    :deep(.el-input__wrapper) {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        padding: 10px 14px;
        min-height: 40px;
        transition: all 0.3s ease;
    }
    
    :deep(.el-input__wrapper:hover) {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.3);
    }
    
    :deep(.el-input__wrapper.is-focus) {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.4);
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
    }
    
    :deep(.el-input__inner) {
        color: rgba(255, 255, 255, 0.95);
        font-size: 14px;
    }
    
    :deep(.el-input__inner::placeholder) {
        color: rgba(255, 255, 255, 0.4);
    }
    
    :deep(.el-button--primary) {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.25);
        transition: all 0.3s ease;
        height: 42px;
        font-size: 14px;
        font-weight: 600;
        border-radius: 10px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        color: rgba(255, 255, 255, 0.95);
    }
    
    :deep(.el-button--primary:hover) {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.35);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }
    
    :deep(.el-checkbox) {
        color: rgba(255, 255, 255, 0.85);
        font-size: 14px;
    }
    
    :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
        background-color: rgba(255, 255, 255, 0.9);
        border-color: rgba(255, 255, 255, 0.9);
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
    }
    
    :deep(.el-checkbox__inner) {
        border-radius: 6px;
        border-color: rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.05);
        transition: all 0.2s ease;
    }
    
    :deep(.el-checkbox__input:hover .el-checkbox__inner) {
        border-color: rgba(255, 255, 255, 0.3);
    }
    
    .login-top-buttons {
        position: fixed;
        top: 16px;
        left: 16px;
        z-index: 2000;
        display: flex;
        gap: 10px;
        
        :deep(.el-button) {
            background: rgba(30, 33, 45, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 50%;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        :deep(.el-button:hover) {
            background: rgba(40, 44, 58, 0.9);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            border-color: rgba(255, 255, 255, 0.25);
        }
    }
    
    hr.x-vertical-divider {
        background: rgba(255, 255, 255, 0.15);
        height: 100%;
        width: 1px;
        border: none;
        margin: 0;
        align-self: stretch;
    }
</style>
