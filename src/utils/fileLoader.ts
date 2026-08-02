import fs from 'fs';
import path from 'path';

const VALID_EXTENSIONS = new Set(['.js', '.ts']);

function isLoadableFile(fileName: string): boolean {
  if (fileName.endsWith('.d.ts')) return false;
  return VALID_EXTENSIONS.has(path.extname(fileName));
}

/**
 * Recursively collects absolute file paths of loadable modules (.ts/.js,
 * excluding declaration files) under a directory.
 */
export function getModuleFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...getModuleFiles(fullPath));
    } else if (entry.isFile() && isLoadableFile(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}
