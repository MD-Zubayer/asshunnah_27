const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Blocklist native build folders to avoid unnecessary file watching and prevent ENOSPC
const additionalBlockList = [
  /.*\/android\/build\/.*/,
  /.*\/android\/app\/build\/.*/,
  /.*\/android\/\.cxx\/.*/,
  /.*\/node_modules\/.*\/android\/build\/.*/,
  /.*\/node_modules\/.*\/android\/\.cxx\/.*/,
];

if (Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList.push(...additionalBlockList);
} else if (config.resolver.blockList instanceof RegExp) {
  config.resolver.blockList = [config.resolver.blockList, ...additionalBlockList];
} else {
  config.resolver.blockList = additionalBlockList;
}

module.exports = config;
