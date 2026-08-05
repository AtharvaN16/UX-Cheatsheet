import { join } from 'node:path';
import { loadMethods } from '../lib/content/load';

const dir = join(import.meta.dir, '..', 'content', 'methods');
const { methods, errors } = loadMethods(dir);

if (errors.length > 0) {
  console.error(`\n${errors.length} content error(s):\n`);
  for (const e of errors) console.error(`  ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ ${methods.length} methods valid`);
