import { cp, mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: false,
    });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`))
    );
  });
}

await rm('dist', { recursive: true, force: true });
await rm('declarations', { recursive: true, force: true });
await rm('build', { recursive: true, force: true });
await mkdir('dist/types', { recursive: true });

await run(process.execPath, [
  './node_modules/typescript/bin/tsc',
  '--project',
  './tsconfig.json',
  '--declaration',
  '--emitDeclarationOnly',
  '--outDir',
  './declarations',
]);
await rm('dist/types', { recursive: true, force: true });
await cp('declarations/src/public', 'dist/types', { recursive: true });
await rm('declarations', { recursive: true, force: true });

await cp('css/fonts', 'dist/fonts', { recursive: true, force: true });
await cp('sounds', 'dist/sounds', { recursive: true, force: true });
await run(process.execPath, [
  './node_modules/less/bin/lessc',
  'css/mathlive-static.less',
  'dist/mathlive-static.css',
]);
await run(process.execPath, [
  './node_modules/less/bin/lessc',
  'css/mathlive-fonts.less',
  'dist/mathlive-fonts.css',
]);

await run(process.execPath, ['./scripts/build.mjs']);
await run(process.execPath, ['./scripts/make-publish-package.json.js']);
