import { debug, readWorkerFile, feedback, helperHandlerCode } from '#utils';
import { Messages } from '#constants';
import { runServer, EdgeRuntime } from 'edge-runtime';
import chokidar from 'chokidar';
import runtime from './runtime.env.js';
import vulcan from './vulcan.env.js';
import buildCommand from '../commands/build.commands.js';

let currentServer;
let isChangeHandlerRunning = false;

/**
 * Read the worker code from a specified path.
 * @param {string} workerPath - Path to the worker file.
 * @returns {Promise<string>} - The worker code.
 * @throws {Error} - If unable to read the worker file.
 */
async function readWorkerCode(workerPath) {
  try {
    return await readWorkerFile(workerPath);
  } catch (error) {
    debug.error(error);
    feedback.server.error(
      Messages.env.server.errors.load_worker_failed(workerPath),
    );
    throw error;
  }
}

/**
 * Initialize and run the server with the given port and worker code.
 * @param {number} port - The port number.
 * @param {string} workerCode - The worker code.
 * @returns {Promise<EdgeRuntime>} - The initialized server.
 */
async function initializeServer(port, workerCode) {
  // Check if the code is a Firewall event and change it to a Fetch event
  // This is required at this point because the VM used for the local runtime
  // server does not support any other type of event than "fetch".
  const { matchEvent: isFirewallEvent, codeChanged } =
    helperHandlerCode.checkAndChangeAddEventListener(
      'firewall',
      'fetch',
      workerCode,
    );
  // Use the changed code if it's a Firewall event
  const initialCode = isFirewallEvent ? codeChanged : workerCode;

  const execution = runtime(initialCode, isFirewallEvent);
  return runServer({ port, host: '0.0.0.0', runtime: execution });
}

/**
 * Build to Local Server with polyfill external
 * @param {boolean} isFirewall - (Experimental) Enable isFirewall for local environment.
 */
async function buildToLocalServer(isFirewall) {
  const vulcanEnv = await vulcan.readVulcanEnv('local');

  if (!vulcanEnv) {
    const msg = Messages.env.server.errors.run_build_command;
    feedback.server.error(msg);
    throw new Error(msg);
  }
  globalThis.vulcan.buildProd = false;
  await buildCommand({}, isFirewall);
}

/**
 * Handle server operations: start, restart.
 * @param {string} workerPath - Path to the worker file.
 * @param {number} port - The port number.
 * @param {boolean} isFirewall - (Experimental) Enable isFirewall for local environment.
 */
async function manageServer(workerPath, port, isFirewall) {
  try {
    await buildToLocalServer(isFirewall);

    const workerCode = await readWorkerCode(workerPath);

    if (currentServer) {
      await currentServer.close();
    }

    try {
      currentServer = await initializeServer(port, workerCode);
      feedback.server.success(
        Messages.env.server.success.server_running(
          `0.0.0.0:${port}, url: http://localhost:${port}`,
        ),
      );
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        await manageServer(workerPath, port + 1, isFirewall);
      } else {
        throw error;
      }
    }
  } catch (error) {
    debug.error(error);
    process.exit(1);
  } finally {
    isChangeHandlerRunning = false;
  }
}

/**
 * Handle file changes and prevent concurrent execution.
 * @param {string} path - Path of the changed file.
 * @param {string} workerPath - Path to the worker file.
 * @param {number} port - The port number.
 * @param {boolean} isFirewall - (Experimental) Enable isFirewall for local environment.
 */
async function handleFileChange(path, workerPath, port, isFirewall) {
  if (isChangeHandlerRunning) return;

  if (
    path.startsWith('.vulcan') ||
    (path.startsWith('vulcan') && path.includes('.temp')) ||
    path.startsWith('.edge') ||
    path.startsWith('node_modules/.cache') ||
    path.startsWith('.vercel')
  ) {
    return;
  }

  isChangeHandlerRunning = true;

  try {
    feedback.build.info(Messages.build.info.rebuilding);
    await manageServer(workerPath, port, isFirewall);
  } catch (error) {
    debug.error(`Build or server restart failed: ${error}`);
  } finally {
    isChangeHandlerRunning = false;
  }
}

/**
 * Entry point function to start the server and watch for file changes.
 * @param {string} workerPath - Path to the worker file.
 * @param {number} port - The port number.
 * @param {boolean} isFirewall - (Experimental) Enable isFirewall for local environment.
 */
async function startServer(workerPath, port, isFirewall) {
  await manageServer(workerPath, port, isFirewall); // Initialize the server for the first time

  const watcher = chokidar.watch('./', {
    persistent: true,
    ignoreInitial: false,
    depth: 99,
  });

  watcher.on('change', async (path) => {
    await handleFileChange(path, workerPath, port, isFirewall);
  });

  watcher.on('error', (error) => debug.error(`Watcher error: ${error}`));
}

export default startServer;
