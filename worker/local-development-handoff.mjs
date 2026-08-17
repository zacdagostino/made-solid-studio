import { chmod, cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const localDevelopmentHandoffVersion = 7;

const handoffTemplateDirectory = fileURLToPath(
  new URL('./local-development-handoff/', import.meta.url),
);

async function makeLocalDevelopmentSourceWritable(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await chmod(path, (await stat(path)).mode | 0o700);
      await makeLocalDevelopmentSourceWritable(path);
    } else if (entry.isFile()) {
      await chmod(path, (await stat(path)).mode | 0o600);
    }
  }
}

export async function applyLocalDevelopmentHandoff(projectDirectory, origin) {
  await cp(handoffTemplateDirectory, projectDirectory, { recursive: true, force: true });
  const madeSolidDirectory = join(projectDirectory, '.made-solid');
  await mkdir(join(madeSolidDirectory, 'evidence'), { recursive: true });
  await writeFile(
    join(madeSolidDirectory, 'origin.json'),
    `${JSON.stringify(
      {
        schemaVersion: localDevelopmentHandoffVersion,
        exportedAt: new Date().toISOString(),
        ...origin,
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(join(madeSolidDirectory, 'refinement-log.jsonl'), '', { flag: 'a' });

  const packagePath = join(projectDirectory, 'package.json');
  const packageDocument = JSON.parse(await readFile(packagePath, 'utf8'));
  const existingScripts = packageDocument.scripts ?? {};
  const developmentCommand =
    existingScripts.dev ??
    (typeof packageDocument.dependencies?.next === 'string' ? 'next dev' : undefined);
  if (!developmentCommand) {
    throw new Error('The editable workspace has no supported website development command.');
  }
  packageDocument.scripts = {
    dev: developmentCommand,
    ...existingScripts,
    'made-solid:log': 'node .made-solid/scripts/refinement-log.mjs add',
    'made-solid:summary': 'node .made-solid/scripts/refinement-log.mjs summary',
    'made-solid:bundle': 'node .made-solid/scripts/refinement-log.mjs bundle',
  };
  await writeFile(packagePath, `${JSON.stringify(packageDocument, null, 2)}\n`);
}

export async function copyLocalDevelopmentSource(sourceDirectory, destinationDirectory) {
  await mkdir(destinationDirectory, { recursive: true });
  await cp(sourceDirectory, destinationDirectory, {
    recursive: true,
    force: true,
    filter: (source) => {
      const relativePath = source.slice(sourceDirectory.length).replaceAll('\\', '/');
      return !/(?:^|\/)(?:node_modules|\.next|out|\.git)(?:\/|$)/.test(relativePath);
    },
  });
  // Builder inputs are deliberately read-only while Codex runs. The exported
  // handoff is an editable workspace, so do not preserve that protection in
  // the copied source (it also prevents the handoff from extending package.json).
  await makeLocalDevelopmentSourceWritable(destinationDirectory);
}

export async function writeDownloadedBuildFile(projectDirectory, relativePath, body) {
  const normalizedPath = relativePath.replaceAll('\\', '/').replace(/^\/+/, '');
  if (!normalizedPath || normalizedPath.split('/').some((segment) => segment === '..')) {
    throw new Error(`Unsafe local-development path: ${relativePath}`);
  }
  const destination = join(projectDirectory, ...normalizedPath.split('/'));
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, body);
}
