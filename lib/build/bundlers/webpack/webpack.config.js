import webpack from 'webpack';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);

const projectRoot = process.cwd();
const isWindows = process.platform === 'win32';
const outputPath = isWindows
  ? fileURLToPath(new URL(`file:///${join(projectRoot, '.edge')}`))
  : join(projectRoot, '.edge');

const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
};

const defaultModuleRules = [
  {
    test: /\.wasm$/,
    type: 'asset/inline',
  },
];

/**
 * Define the loader typescript rules if the tsconfig.json file exists
 * @param {Array} moduleRules - array with previous rules
 * @returns {Array} - Module rules
 */
const defineLoaderTypescriptRules = (moduleRules) => {
  const rules = [...moduleRules];
  const tsConfigPath = join(projectRoot, 'tsconfig.json');
  const tsConfigExist = fileExists(tsConfigPath);
  if (tsConfigExist) {
    rules.push({
      test: /\.ts?$/,
      use: [
        {
          loader: require.resolve('ts-loader'),
          options: {
            transpileOnly: true,
          },
        },
      ],
      exclude: /node_modules/,
    });
  }

  return rules;
};

export default {
  experiments: {
    outputModule: true,
  },
  output: {
    path: outputPath,
    filename: 'worker.js',
    globalObject: 'globalThis',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    mainFields: ['browser', 'main', 'module'],
  },
  // loaders
  module: {
    rules: defineLoaderTypescriptRules(defaultModuleRules),
  },
  mode: 'production',
  target: ['webworker', 'es2022'],
  plugins: [
    new webpack.ProgressPlugin(),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
  ],
};
