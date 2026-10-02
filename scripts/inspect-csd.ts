/**
 * CLI Debug & Preview Utility
 * Run: npx tsx scripts/inspect-csd.ts [path-to-file]
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseCSDBuffer } from '../src/parser/csd-parser';
import { printCSDSummary } from '../src/parser/debug';

const targetFile = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(__dirname, '../20260929.csd');

if (!fs.existsSync(targetFile)) {
  console.error(`File not found: ${targetFile}`);
  process.exit(1);
}

const buffer = fs.readFileSync(targetFile);
const parsed = parseCSDBuffer(buffer, { encoding: 'windows-1252' }, path.basename(targetFile));

printCSDSummary(parsed);
