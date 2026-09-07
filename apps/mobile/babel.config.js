// apps/mobile/babel.config.js
// Preset mínimo exigido pelo Expo SDK 54 com expo-router.
module.exports = (api) => {
  api.cache(true)
  return {
    presets: ["babel-preset-expo"],
  }
}
