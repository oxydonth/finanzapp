const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.resolver.extraNodeModules = {
  '@finanzapp/types': path.resolve(projectRoot, 'src/shared/types'),
  '@finanzapp/utils': path.resolve(projectRoot, 'src/shared/utils'),
  '@finanzapp/config': path.resolve(projectRoot, 'src/shared/config'),
};

module.exports = config;
