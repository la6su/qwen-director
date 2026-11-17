import { lstat, realpath, rm } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const attemptFolders = ['qwendirector_refs', 'qwendirector_refmods'] as const;

function isWithin(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/** Remove only attempt-owned ComfyUI inputs, when the local input root is explicitly configured. */
export async function cleanupComfyAttemptInputs(attemptId: string, configuredInputRoot = process.env.QWEN_COMFY_INPUT_ROOT): Promise<string[]> {
  if (!/^[a-zA-Z0-9_-]+$/.test(attemptId)) throw new Error('INVALID_COMFY_ATTEMPT_ID');
  if (!configuredInputRoot?.trim()) return [];

  let root: string;
  try { root = await realpath(configuredInputRoot); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('COMFY_INPUT_ROOT_NOT_FOUND');
    throw error;
  }
  const removed: string[] = [];
  for (const folder of attemptFolders) {
    const parentPath = resolve(root, folder);
    let parent: string;
    try { parent = await realpath(parentPath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    if (!isWithin(root, parent)) throw new Error('COMFY_INPUT_FOLDER_OUTSIDE_ROOT');

    const targetPath = resolve(parent, attemptId);
    let entry;
    try { entry = await lstat(targetPath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error('COMFY_ATTEMPT_INPUT_NOT_DIRECTORY');
    const target = await realpath(targetPath);
    if (!isWithin(parent, target)) throw new Error('COMFY_ATTEMPT_INPUT_OUTSIDE_ROOT');
    await rm(target, { recursive: true, force: false });
    removed.push(`${folder}/${attemptId}`);
  }
  return removed;
}
