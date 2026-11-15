import { resolveWorkbenchPrompt } from '../apps/worker/src/workbench-prompt.ts';

const generationPrompt = 'A monumental obsidian world. No monitor, no text.';
const imageGenerate = resolveWorkbenchPrompt({
  kind: 'image-generate',
  workflowPrompt: 'workflow default prompt',
  directorPrompt: generationPrompt,
  compiledPrompt: `${generationPrompt}\nCamera: Low angle\nTransition: cut to monitor`,
});
if (imageGenerate !== generationPrompt || imageGenerate.includes('Transition:')) throw new Error('image-generate prompt must remain the explicit image prompt');

const workflowFallback = resolveWorkbenchPrompt({ kind: 'image-generate', workflowPrompt: 'workflow-owned prompt', compiledPrompt: 'compiled prompt' });
if (workflowFallback !== 'workflow-owned prompt') throw new Error('image-generate must preserve its graph prompt when no director prompt is supplied');

const imageEdit = resolveWorkbenchPrompt({ kind: 'image-edit', workflowPrompt: 'workflow prompt', directorPrompt: 'edit direction', compiledPrompt: 'compiled edit prompt' });
if (imageEdit !== 'compiled edit prompt') throw new Error('image-edit must continue using its compiled prompt');

console.log('workbench prompt routing smoke: ok');
