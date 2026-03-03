const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
    resolver: {
        blockList: [
            // Block all Android/iOS build directories (project + node_modules)
            /android\/.*\/build\/.*/,
            /ios\/.*\/build\/.*/,
            /node_modules\/.*\/android\/build\/.*/,
            /node_modules\/.*\/ios\/build\/.*/,
        ],
    },
    // Disable filesystem watcher for build dirs
    watcher: {
        additionalExts: [],
    },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);