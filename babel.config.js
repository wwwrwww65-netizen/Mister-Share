module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Required for react-native-worklets-core (used by vision-camera)
    ['react-native-worklets-core/plugin'],
    // Reanimated plugin must be listed last
    'react-native-reanimated/plugin',
  ],
};