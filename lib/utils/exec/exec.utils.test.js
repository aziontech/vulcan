import { spawn } from 'child_process';
import signale from 'signale';
import { describe, test, expect, beforeEach, vi } from 'vitest';

import exec from './index.js';

vi.mock('child_process');
vi.mock('signale');

describe('exec utils', () => {
  let mockSignaleInstance;
  let mockChildProcess;

  beforeEach(() => {
    mockSignaleInstance = {
      info: vi.fn(),
      error: vi.fn(),
    };
    signale.Signale.mockReturnValue(mockSignaleInstance);

    mockChildProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    };
    spawn.mockReturnValue(mockChildProcess);
  });

  test('Should resolve when process closes with code 0', async () => {
    mockChildProcess.on.mockImplementation((event, callback) => {
      if (event === 'close') {
        callback(0);
      }
    });

    await expect(exec('echo test')).resolves.toBeUndefined();
  });

  test('Should reject when process closes with non-zero code', async () => {
    mockChildProcess.on.mockImplementation((event, callback) => {
      if (event === 'close') {
        callback(1);
      }
    });

    await expect(exec('echo test')).rejects.toThrow(
      "Command 'echo test' failed with code 1",
    );
  });

  test('Should reject when process emits an error', async () => {
    const error = new Error('Test error');

    mockChildProcess.on.mockImplementation((event, callback) => {
      if (event === 'error') {
        callback(error);
      }
    });

    await expect(exec('echo test')).rejects.toEqual(error);
  });

  test('Should log stdout and stderr when verbose is true', async () => {
    mockChildProcess.on.mockImplementation((event, callback) => {
      if (event === 'close') {
        callback(0);
      }
    });

    mockChildProcess.stdout.on.mockImplementation((event, callback) => {
      if (event === 'data') {
        callback('Test stdout');
      }
    });

    mockChildProcess.stderr.on.mockImplementation((event, callback) => {
      if (event === 'data') {
        callback('Test stderr');
      }
    });

    await exec('echo test', 'Test', true);

    expect(mockSignaleInstance.info).toHaveBeenCalledWith('Test stdout');
  });
});
