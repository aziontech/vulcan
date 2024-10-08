import * as esbuild from 'esbuild';
import lodash from 'lodash';

import { Messages } from '#constants';
import { debug } from '#utils';

import BaseBundlers from '../base.bundlers.js';
import AzionEsbuildConfig from './esbuild.config.js';
import ESBuildNodeModulePlugin from './plugins/node-polyfills/index.js';
import ESBuildAzionModulePlugin from './plugins/azion-polyfills/index.js';

/**
 * Class representing an ESBuild bundler, extending BaseBundlers.
 */
class Esbuild extends BaseBundlers {
  /**
   * Asynchronous method to run the ESBuild bundler.
   */
  async run() {
    let config = lodash.cloneDeep(AzionEsbuildConfig);
    config.entryPoints = [this.builderConfig.entry];

    if (!config.plugins) config.plugins = [];

    // merge config common
    config = super.mergeConfig(config);
    config = this.applyConfig(config);

    try {
      await esbuild.build(config);
    } catch (error) {
      debug.error(error);
      throw Error(Messages.build.error.vulcan_build_failed);
    }
  }

  /**
   * Applies specific configurations to the ESBuild config.
   * @param {object} config - ESBuild configuration object.
   * @returns {object} - Updated ESBuild configuration object.
   */
  applyConfig(config) {
    const updatedConfig = { ...config };
    // use polyfill with polyfills
    const polyfills =
      this.builderConfig?.polyfills ||
      this.customConfigPreset?.polyfills ||
      this.customConfigLocal?.polyfills;

    if (!updatedConfig.plugins) updatedConfig.plugins = [];
    if (polyfills) {
      updatedConfig.plugins.push(
        ESBuildNodeModulePlugin(globalThis.vulcan.buildProd),
      );
    }

    // plugin resolve azion:
    updatedConfig.plugins.push(
      ESBuildAzionModulePlugin(globalThis.vulcan.buildProd),
    );

    // inject content in worker initial code.
    if (this.builderConfig.contentToInject) {
      const workerInitContent = this.builderConfig.contentToInject;

      if (updatedConfig.banner?.js) {
        updatedConfig.banner.js = `${updatedConfig.banner.js} ${workerInitContent}`;
      } else {
        updatedConfig.banner = { js: workerInitContent };
      }
    }

    // define vars
    if (this.builderConfig.defineVars) {
      updatedConfig.define = {
        ...updatedConfig.define,
        ...this.builderConfig.defineVars,
      };
    }

    return updatedConfig;
  }
}

export default Esbuild;
