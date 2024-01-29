import { join } from 'path';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';

import { VercelUtils, feedback, getAbsoluteLibDirPath } from '#utils';
import { mapAndAdaptFunctions } from './mapping/index.js';
import { assetsPaths } from './mapping/assets.js';
import { processVercelOutput } from './mapping/process-mapping.js';

const { loadVercelConfigs } = VercelUtils;

/**
 * Construct a record for the build output map.
 * @param {object} item The build output item to construct a record for.
 * @returns {string} Record for the build output map.
 */
function constructBuildOutputRecord(item) {
  if (item.type === 'static') {
    return `{ type: ${JSON.stringify(item.type)} }`;
  }

  if (item.type === 'override') {
    return `{
				type: ${JSON.stringify(item.type)},
				path: ${item.path ? JSON.stringify(item.path) : undefined},
				headers: ${item.headers ? JSON.stringify(item.headers) : undefined}
			}`;
  }

  return `{
				type: ${JSON.stringify(item.type)},
				entrypoint: ${item.type === 'node' ? 'null' : `require('${item.entrypoint}')`}
			}`;
}

/**
 *Write the output references file.
 * @param {string} functionsFile The path to the file to write.
 * @param {object} vercelOutput The Vercel output to write to the file.
 */
function writeOutputReferencesFile(functionsFile, vercelOutput) {
  feedback.prebuild.info('writing references file ...');
  try {
    writeFileSync(
      functionsFile,
      `globalThis.__BUILD_OUTPUT__ = {${[...vercelOutput.entries()]
        .map(([name, item]) => `"${name}": ${constructBuildOutputRecord(item)}`)
        .join(',')}};`,
    );
  } catch (error) {
    throw new Error(error.message);
  }
}

/**
 * Build the application.
 * @returns {Promise<object>} The build result.
 */
async function run() {
  const targetDir = process.cwd();
  //   const workerDir = join(this.targetDir, '.');

  const applicationMapping = {
    invalidFunctions: new Set(),
    functionsMap: new Map(),
    webpackChunks: new Map(),
    wasmIdentifiers: new Map(),
    prerenderedRoutes: new Map(),
  };

  const tmpFunctionsDir = join(tmpdir(), Math.random().toString(36).slice(2));
  //   const dirName = dirname(__filename);

  const config = loadVercelConfigs();

  feedback.prebuild.info('Mapping and transforming functions ...');

  // adapt functions and set application mapping
  await mapAndAdaptFunctions(applicationMapping, tmpFunctionsDir);

  //   if (this.applicationMapping.functionsMap.size <= 0) {
  //       throw new MiddlewareManifestHandlerError("No functions was provided");
  //   }

  const assetsDir = join(targetDir, '.vercel/output/static');
  const assetsManifest = assetsPaths(assetsDir);

  const processedVercelOutput = processVercelOutput(
    config,
    assetsManifest,
    applicationMapping.prerenderedRoutes,
    applicationMapping.functionsMap,
  );

  const outputReferencesFilePath = join(
    tmpdir(),
    `functions-${Math.random().toString(36).slice(2)}.js`,
  );

  writeOutputReferencesFile(
    outputReferencesFilePath,
    processedVercelOutput.vercelOutput,
  );

  return {
    filesToInject: [
      // libs used in routing
      // `${getAbsoluteLibDirPath()}/presets/custom/next/compute/default/handler/routing/libs.js`,
      // node custom server
      `${getAbsoluteLibDirPath()}/presets/custom/next/compute/node/handler/index.js`,
      // file to generate Output. It contains functions references to build
      outputReferencesFilePath,
    ],
    workerGlobalVars: {
      __CONFIG__: JSON.stringify(processedVercelOutput.vercelConfig),
    },
    builderPlugins: [],
  };
}

export default run;