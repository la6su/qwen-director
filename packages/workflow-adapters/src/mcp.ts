export interface ComfyMcpConfig { command: string; args: string[]; enabled: boolean; mode: 'discovery' | 'authoring'; }

/** Boundary for an optional local Comfy MCP stdio client. No process is spawned here. */
export interface ComfyMcpClient {
  listWorkflows(): Promise<Array<{ id: string; digest?: string; title?: string }>>;
  inspectWorkflow(id: string): Promise<unknown>;
}

export function defaultComfyMcpConfig(): ComfyMcpConfig {
  return { command: 'comfy-mcp', args: [], enabled: false, mode: 'discovery' };
}
