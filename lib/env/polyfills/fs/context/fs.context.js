/* eslint-disable */
import * as fsBase from 'node:fs';

export var { readFile } = fsBase;
export var { promises } = fsBase;

const fs = {
  readFile: fsBase.readFile,
  promises: fsBase.promises,
};

export default fs;
