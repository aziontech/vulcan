/* eslint-disable */
/** This polyfill is referenced in #build/bundlers/polyfills/polyfills-manager.js
 *
 * FS_CONTEXT is defined in runtime.env.js for use on the local server
 */

export var { promises } = FS_CONTEXT;

export default FS_CONTEXT.promises;
