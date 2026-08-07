import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const localDevelopmentHandoffVersion = 1;

const handoffTemplateDirectory = fileURLToPath(
  new URL('./local-development-handoff/', import.meta.url),
);

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
  packageDocument.scripts = {
    ...(packageDocument.scripts ?? {}),
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
