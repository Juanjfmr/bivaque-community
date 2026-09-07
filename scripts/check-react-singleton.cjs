const path = require("node:path")

const CONSUMERS = [
  "apps/mobile",
  "node_modules/@react-navigation/elements",
  "node_modules/@react-navigation/native-stack",
  "node_modules/@react-navigation/core",
  "node_modules/react-native",
  "node_modules/react-native-screens",
  "node_modules/react-native-safe-area-context",
  "node_modules/expo-router",
]

const versionFrom = (dir) => {
  try {
    return require(require.resolve("react/package.json", { paths: [path.resolve(dir)] })).version
  } catch (error) {
    return `ERRO:${error.code}`
  }
}

const found = new Set()
for (const consumer of CONSUMERS) {
  const version = versionFrom(consumer)
  found.add(version)
  console.log(consumer.padEnd(55), version)
}

const mobilePkg = require(path.resolve("apps/mobile/package.json"))
const hasReactDom = Boolean(
  mobilePkg.dependencies?.["react-dom"] || mobilePkg.devDependencies?.["react-dom"],
)

console.log("\nversoes distintas de react:", [...found].join(", "))
console.log("react-dom declarado em apps/mobile:", hasReactDom)

const singleReact = found.size === 1 && !found.has("ERRO:MODULE_NOT_FOUND")

if (singleReact && !hasReactDom) {
  console.log("OK: instancia unica de React e sem react-dom no mobile")
  process.exit(0)
}
if (!singleReact) console.log("FALHA: mais de uma instancia de React (ou resolucao quebrada)")
if (hasReactDom) console.log("FALHA: react-dom ainda declarado em apps/mobile")
process.exit(1)
