// apps/mobile/metro.config.js
// Configuração de Metro para apps/mobile dentro do monorepo pnpm.
//
// Sem esta configuração, o Metro não consegue resolver módulos de fora de
// apps/mobile (por exemplo, @bivaque/tokens em packages/tokens) e as
// alterações em arquivos irmãos passam despercebidas pelo watcher.
//
// O padrão Expo para monorepos é este (docs.expo.dev/guides/monorepos):
//   1. Acrescentar o raiz do monorepo em watchFolders;
//   2. Listar node_modules do projeto e do raiz em resolver.nodeModulesPaths.
//
// Esta configuração é estritamente LOCAL ao apps/mobile — não toca
// pnpm-workspace.yaml nem o tsconfig raiz, que estão travados por
// tests/scope/local-command-surface.test.mjs.
const { getDefaultConfig } = require("expo/metro-config")
const path = require("node:path")

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, "..", "..")

/** @type {import('metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot)

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot]

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
]

module.exports = config
