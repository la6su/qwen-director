import { createH3StarterWorkflow } from '../packages/workflow-adapters/src/h3-profile.ts';
import { validateH3Workflow, preflightH3Runtime } from '../packages/workflow-adapters/src/h3-workflow.ts';
const baseUrl = process.env.COMFYUI_URL ?? 'http://192.168.10.103:8188';
const graph = createH3StarterWorkflow();
const boundary = validateH3Workflow(graph);
const runtime = await preflightH3Runtime(baseUrl);
console.log(JSON.stringify({ baseUrl, boundary, runtime, submit: false }, null, 2));
