const isDevelopment =
  process.env.BIVAQUE_MOBILE_ENV === "development" ||
  (!process.env.EAS_BUILD_PROFILE && process.env.NODE_ENV === "development")

const allowDevelopmentCleartext =
  isDevelopment &&
  process.env.NODE_ENV !== "production" &&
  process.env.EAS_BUILD_PROFILE !== "production"

module.exports = ({ config }) => {
  const android = { ...(config.android ?? {}) }

  if (allowDevelopmentCleartext) {
    android.usesCleartextTraffic = true
  } else {
    delete android.usesCleartextTraffic
  }

  return {
    ...config,
    android,
  }
}
