// const { describe } = require('@jest/globals');
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mountSSG from './mountSSG.hooks.js';

describe('mountSSG', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch.mockRestore();
  });

  it('should construct the assetPath for assets correctly', async () => {
    const requestURL = 'http://example.com/assets/image.png';
    const versionId = '1234567890';

    const expectedAssetPath = new URL(
      `/${versionId}/assets/image.png`,
      'file://',
    );

    global.fetch.mockResolvedValue({});

    return mountSSG(requestURL, versionId).then(() => {
      expect(global.fetch).toHaveBeenCalledWith(expectedAssetPath);
    });
  });

  it('should construct a requestPath that does not have a file extension', async () => {
    const requestURL = 'http://example.com/';
    const versionId = '1234567890';

    const expectedAssetPath = new URL(`/${versionId}/index.html`, 'file://');

    global.fetch.mockResolvedValue({});

    return mountSSG(requestURL, versionId).then(() => {
      expect(global.fetch).toHaveBeenCalledWith(expectedAssetPath);
    });
  });
});
