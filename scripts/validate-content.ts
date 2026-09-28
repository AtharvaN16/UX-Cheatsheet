import { join } from 'node:path';
import { loadMethods } from '../lib/content/load';
import { checkImageFiles } from '../lib/content/images';
import { checkUseCases } from '../lib/content/vocab';

const root = join(import.meta.dir, '..');
const dir = join(root, 'content', 'methods');
const { methods, errors } = loadMethods(dir);

// Asset existence is checked here rather than inside loadMethods, which is
// imported by Server Components and must stay free of filesystem reads into
// public/. See lib/content/images.ts.
const allErrors = [
  ...errors,
  ...checkImageFiles(methods, join(root, 'public')),
  ...checkUseCases(methods),
];

if (allErrors.length > 0) {
  console.error(`\n${allErrors.length} content error(s):\n`);
  for (const e of allErrors) console.error(`  ${e}`);
  console.error('');
  process.exit(1);
}

// Written here rather than in a separate step because this script already has
// the parsed methods in hand, and because anything that changes the content
// tree must run validate anyway. lib/authoring/resolve.ts imports this file
// statically so it survives into the serverless bundle, where content/ does not.
// Only on the success path above: a manifest derived from invalid content would
// be worse than none.
const manifest = Object.fromEntries(methods.map((m) => [m.id, m.domain]));
await Bun.write(
  join(root, 'lib', 'content', 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

const withImages = methods.filter((m) => m.image).length;
console.log(`✓ ${methods.length} methods valid (${withImages} with an image)`);
