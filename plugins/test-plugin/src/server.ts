import {defineServer} from "@supergrowthai/plugin-dev-kit";

export default defineServer({
    hooks: {
        // Blog lifecycle hooks
        'blog:beforeCreate': async (sdk, payload) => {
            console.log('🟢 Server Hook: blog:beforeCreate', payload);
            return payload;
        },

        'blog:afterCreate': async (sdk, payload) => {
            console.log('🟢 Server Hook: blog:afterCreate', payload);
        },

        'blog:beforeUpdate': async (sdk, payload) => {
            console.log('🟢 Server Hook: blog:beforeUpdate', payload);
            return payload;
        },

        'blog:afterUpdate': async (sdk, payload) => {
            console.log('🟢 Server Hook: blog:afterUpdate', payload);
        },

        'blog:beforeDelete': async (sdk, payload) => {
            console.log('🟢 Server Hook: blog:beforeDelete', payload);
        },

        'blog:afterDelete': async (sdk, payload) => {
            console.log('🟢 Server Hook: blog:afterDelete', payload);
        },

        'blog:onRead': async (sdk, payload) => {
            console.log('🟢 Server Hook: blog:onRead', payload);
            return payload;
        },

        'blog:onList': async (sdk, payload) => {
            console.log('🟢 Server Hook: blog:onList', payload);
            return payload;
        },

        // User lifecycle hooks
        'user:beforeCreate': async (sdk, payload) => {
            console.log('🟢 Server Hook: user:beforeCreate', payload);
            return payload;
        },

        'user:afterCreate': async (sdk, payload) => {
            console.log('🟢 Server Hook: user:afterCreate', payload);
        },

        'user:beforeUpdate': async (sdk, payload) => {
            console.log('🟢 Server Hook: user:beforeUpdate', payload);
            return payload;
        },

        'user:afterUpdate': async (sdk, payload) => {
            console.log('🟢 Server Hook: user:afterUpdate', payload);
        },

        'user:beforeDelete': async (sdk, payload) => {
            console.log('🟢 Server Hook: user:beforeDelete', payload);
        },

        'user:afterDelete': async (sdk, payload) => {
            console.log('🟢 Server Hook: user:afterDelete', payload);
        },

        // Authentication hooks
        'auth:beforeLogin': async (sdk, payload) => {
            console.log('🟢 Server Hook: auth:beforeLogin', payload);
        },

        'auth:afterLogin': async (sdk, payload) => {
            console.log('🟢 Server Hook: auth:afterLogin', payload);
        },

        'auth:beforeLogout': async (sdk, payload) => {
            console.log('🟢 Server Hook: auth:beforeLogout', payload);
        },

        'auth:afterLogout': async (sdk, payload) => {
            console.log('🟢 Server Hook: auth:afterLogout', payload);
        },

        // Category hooks
        'category:beforeCreate': async (sdk, payload) => {
            console.log('🟢 Server Hook: category:beforeCreate', payload);
            return payload;
        },

        'category:afterCreate': async (sdk, payload) => {
            console.log('🟢 Server Hook: category:afterCreate', payload);
        },

        'category:beforeUpdate': async (sdk, payload) => {
            console.log('🟢 Server Hook: category:beforeUpdate', payload);
            return payload;
        },

        'category:afterUpdate': async (sdk, payload) => {
            console.log('🟢 Server Hook: category:afterUpdate', payload);
        },

        'category:beforeDelete': async (sdk, payload) => {
            console.log('🟢 Server Hook: category:beforeDelete', payload);
        },

        'category:afterDelete': async (sdk, payload) => {
            console.log('🟢 Server Hook: category:afterDelete', payload);
        },

        // Tag hooks
        'tag:beforeCreate': async (sdk, payload) => {
            console.log('🟢 Server Hook: tag:beforeCreate', payload);
            return payload;
        },

        'tag:afterCreate': async (sdk, payload) => {
            console.log('🟢 Server Hook: tag:afterCreate', payload);
        },

        'tag:beforeUpdate': async (sdk, payload) => {
            console.log('🟢 Server Hook: tag:beforeUpdate', payload);
            return payload;
        },

        'tag:afterUpdate': async (sdk, payload) => {
            console.log('🟢 Server Hook: tag:afterUpdate', payload);
        },

        'tag:beforeDelete': async (sdk, payload) => {
            console.log('🟢 Server Hook: tag:beforeDelete', payload);
        },

        'tag:afterDelete': async (sdk, payload) => {
            console.log('🟢 Server Hook: tag:afterDelete', payload);
        },

        // Plugin management hooks
        'plugin:beforeInstall': async (sdk, payload) => {
            console.log('🟢 Server Hook: plugin:beforeInstall', payload);
        },

        'plugin:afterInstall': async (sdk, payload) => {
            console.log('🟢 Server Hook: plugin:afterInstall', payload);
        },

        'plugin:beforeUninstall': async (sdk, payload) => {
            console.log('🟢 Server Hook: plugin:beforeUninstall', payload);
        },

        'plugin:afterUninstall': async (sdk, payload) => {
            console.log('🟢 Server Hook: plugin:afterUninstall', payload);
        },

        'plugin:beforeEnable': async (sdk, payload) => {
            console.log('🟢 Server Hook: plugin:beforeEnable', payload);
        },

        'plugin:afterEnable': async (sdk, payload) => {
            console.log('🟢 Server Hook: plugin:afterEnable', payload);
        },

        'plugin:beforeDisable': async (sdk, payload) => {
            console.log('🟢 Server Hook: plugin:beforeDisable', payload);
        },

        'plugin:afterDisable': async (sdk, payload) => {
            console.log('🟢 Server Hook: plugin:afterDisable', payload);
        },

        // Settings hooks
        'setting:beforeUpdate': async (sdk, payload) => {
            console.log('🟢 Server Hook: setting:beforeUpdate', payload);
            return payload;
        },

        'setting:afterUpdate': async (sdk, payload) => {
            console.log('🟢 Server Hook: setting:afterUpdate', payload);
        },
    },

    rpcs: {
        'test-plugin:ping': async (sdk, request) => {
            console.log('🟡 RPC Called: test-plugin:ping', request);
            return {message: 'pong', timestamp: new Date().toISOString()};
        }
    }
});