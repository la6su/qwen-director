export function extractComfyApiGraph(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('WORKFLOW_JSON_MUST_BE_OBJECT');
  const record = value as Record<string, unknown>;
  const graph = record.graph && typeof record.graph === 'object' && !Array.isArray(record.graph) ? record.graph as Record<string, unknown> : record;
  if (!Object.keys(graph).length) throw new Error('WORKFLOW_GRAPH_EMPTY');
  if (Object.values(graph).every((node) => node && typeof node === 'object' && !Array.isArray(node) && typeof (node as any).class_type === 'string')) return graph;
  if (Array.isArray(record.nodes) && Array.isArray(record.links)) throw new Error('WORKFLOW_UI_FORMAT_UNSUPPORTED: export API format from ComfyUI');
  throw new Error('WORKFLOW_API_FORMAT_REQUIRED');
}

type UiNode = { id: string | number; type: string; mode?: number; inputs?: Array<{ name: string; link?: number | null; widget?: unknown }>; outputs?: Array<{ type?: string; links?: Array<number> | null }>; widgets_values?: unknown[] | Record<string, unknown>; widgets_values_named?: Record<string, unknown>; properties?: Record<string, unknown> };
type UiWorkflow = { nodes: UiNode[]; links: Array<[number, string | number, number, string | number, number, string]>; definitions?: unknown };

export function convertComfyUiWorkflowToApi(value: unknown, schema: Record<string, any>): Record<string, any> {
  if (!value || typeof value !== 'object' || !Array.isArray((value as any).nodes) || !Array.isArray((value as any).links)) throw new Error('WORKFLOW_UI_FORMAT_REQUIRED');
  const workflow = expandComfySubgraphs(value as UiWorkflow);
  const nodes = new Map(workflow.nodes.map((node) => [String(node.id), node]));
  const links = new Map(workflow.links.map(([id, from, fromSlot, to, toSlot]) => [id, { from: String(from), fromSlot, to: String(to), toSlot }]));
  const incoming = new Map<string, Map<number, number>>();
  for (const [id, , , to, toSlot] of workflow.links) {
    const slots = incoming.get(String(to)) ?? new Map<number, number>(); slots.set(toSlot, id); incoming.set(String(to), slots);
  }
  const setters = new Map<string, UiNode[]>();
  for (const node of workflow.nodes.filter((item) => item.type === 'SetNode')) {
    const name = String(Array.isArray(node.widgets_values) ? node.widgets_values[0] : node.widgets_values?.value ?? ''); if (!name) throw new Error(`WORKFLOW_SET_NAME_MISSING:${node.id}`);
    setters.set(name, [...(setters.get(name) ?? []), node]);
  }
  const resolve = (nodeId: string, slot: number, seen = new Set<string>()): [string, number] | null => {
    if (seen.has(nodeId)) throw new Error(`WORKFLOW_LINK_CYCLE:${nodeId}`);
    seen.add(nodeId);
    const node = nodes.get(nodeId); if (!node) throw new Error(`WORKFLOW_NODE_MISSING:${nodeId}`);
    if (node.type === 'GetNode') {
      const name = String(Array.isArray(node.widgets_values) ? node.widgets_values[0] : node.widgets_values?.value ?? ''), matches = setters.get(name) ?? [];
      if (matches.length !== 1) throw new Error(`WORKFLOW_GET_BINDING_AMBIGUOUS:${nodeId}:${name}`);
      const setter = matches[0], linkId = incoming.get(String(setter.id))?.get(0), link = linkId === undefined ? undefined : links.get(linkId);
      if (!link) throw new Error(`WORKFLOW_SET_INPUT_UNLINKED:${setter.id}`);
      return resolve(link.from, link.fromSlot, seen);
    }
    if (node.type === 'Reroute' || node.mode === 4) {
      const linkId = incoming.get(nodeId)?.get(0), link = linkId === undefined ? undefined : links.get(linkId);
      if (!link) return null;
      return resolve(link.from, link.fromSlot, seen);
    }
    return [nodeId, slot];
  };
  const api: Record<string, any> = {};
  for (const node of workflow.nodes) {
    if (node.mode === 2 || node.type === 'Note' || node.type === 'MarkdownNote' || node.type === 'ImageCompare' || node.type === 'SetNode' || node.type === 'GetNode') continue;
    if (node.mode && node.mode !== 4) throw new Error(`WORKFLOW_NODE_MODE_UNSUPPORTED:${node.id}:${node.mode}`);
    if (node.mode === 4) continue;
    if (!schema[node.type]) throw new Error(`WORKFLOW_NODE_CLASS_UNKNOWN:${node.id}:${node.type}`);
    const input = schema[node.type].input ?? {}, inputOrder = schema[node.type].input_order ?? {};
    const inputTypes = { ...(input.required ?? {}), ...(input.optional ?? {}), ...(input.hidden ?? {}) } as Record<string, any>;
    const apiInputName = (name: string): string | undefined => {
      if (inputTypes[name] || name.includes('.')) return name;
      for (const [root, descriptor] of Object.entries(inputTypes) as Array<[string, any]>) {
        if (descriptor?.[0] === 'COMFY_DYNAMICCOMBO_V3') {
          const selected = descriptor[1]?.options?.find((item: any) => item.key === (apiInputs[root] ?? (Array.isArray(values) ? undefined : values[root])));
          if (selected?.inputs?.required?.[name] || selected?.inputs?.optional?.[name]) return `${root}.${name}`;
        }
        if (descriptor?.[0] === 'COMFY_AUTOGROW_V3') {
          const template = descriptor[1]?.template;
          if (template?.names?.includes(name) || (typeof template?.prefix === 'string' && name.startsWith(template.prefix))) return `${root}.${name}`;
        }
      }
      return undefined;
    };
    const apiInputs: Record<string, unknown> = {};
    let widgetIndex = 0;
    const values = node.widgets_values ?? [];
    const namedValues = node.widgets_values_named ?? (node.properties?.widgets_values_named && typeof node.properties.widgets_values_named === 'object' && !Array.isArray(node.properties.widgets_values_named) ? node.properties.widgets_values_named as Record<string, unknown> : undefined);
    const acceptsPrimitive = (descriptor: any, value: unknown): boolean => {
      switch (descriptor?.[0]) {
        case 'STRING': return typeof value === 'string';
        case 'INT': return typeof value === 'number' && Number.isSafeInteger(value);
        case 'FLOAT': return typeof value === 'number' && Number.isFinite(value);
        case 'BOOLEAN': return typeof value === 'boolean';
        default: return false;
      }
    };
    const orderedInputs = [...(inputOrder.required ?? []), ...(inputOrder.optional ?? [])];
    for (const socket of node.inputs ?? []) {
      const currentWidget = socket.widget && Array.isArray(values) ? widgetIndex++ : -1;
      if (socket.link) {
        const link = links.get(socket.link); if (!link) throw new Error(`WORKFLOW_LINK_MISSING:${node.id}:${socket.name}`);
        const resolved = resolve(link.from, link.fromSlot);
        if (resolved) apiInputs[socket.name] = resolved;
      } else if (socket.widget && namedValues && Object.hasOwn(namedValues, socket.name)) {
        const name = apiInputName(socket.name);
        if (name) {
          const namedValue = namedValues[socket.name];
          const positionalValue = Array.isArray(values) && currentWidget >= 0 ? values[currentWidget] : undefined;
          const descriptor = inputTypes[name];
          apiInputs[name] = descriptor && !acceptsPrimitive(descriptor, namedValue) && acceptsPrimitive(descriptor, positionalValue)
            ? positionalValue
            : namedValue;
        }
      } else if (socket.widget && !Array.isArray(values) && Object.hasOwn(values, socket.name)) {
        const name = apiInputName(socket.name); if (name) apiInputs[name] = values[socket.name];
      } else if (currentWidget >= 0 && Array.isArray(values) && currentWidget < values.length) {
        const name = apiInputName(socket.name); if (name) apiInputs[name] = values[currentWidget];
      }
    }
    // Some legacy workflows omit widget socket records. Use ComfyUI's declared input order for the remaining values.
    for (const name of orderedInputs) {
      if (apiInputs[name] !== undefined || (node.inputs ?? []).some((socket) => socket.name === name && socket.widget)) continue;
      const descriptor = input.required?.[name] ?? input.optional?.[name];
      if (!descriptor || !['COMBO','STRING','INT','FLOAT','BOOLEAN','COMFY_DYNAMICCOMBO_V3','COMFY_AUTOGROW_V3'].includes(descriptor[0])) continue;
      if (Array.isArray(values) && widgetIndex < values.length) apiInputs[name] = values[widgetIndex++];
    }
    const id = String(node.id);
    api[id] = { class_type: node.type, inputs: apiInputs };
  }
  const needed = new Set<string>();
  const visit = (id: string) => {
    if (needed.has(id) || !api[id]) return;
    needed.add(id);
    for (const value of Object.values(api[id].inputs)) if (Array.isArray(value) && typeof value[0] === 'string') visit(value[0]);
  };
  for (const [id, node] of Object.entries(api)) if (schema[node.class_type]?.output_node) visit(id);
  for (const id of Object.keys(api)) if (!needed.has(id)) delete api[id];
  for (const node of workflow.nodes) {
    if (!schema[node.type] || node.mode === 2 || node.mode === 4 || ['Note','MarkdownNote','ImageCompare','SetNode','GetNode','Reroute'].includes(node.type)) continue;
    for (const socket of node.inputs ?? []) if (socket.link) {
      const apiNode = api[String(node.id)]; if (!apiNode || !(socket.name in apiNode.inputs)) continue;
      const link = apiNode.inputs[socket.name]; if (Array.isArray(link) && !api[link[0]]) throw new Error(`WORKFLOW_LINK_SOURCE_NOT_EXECUTABLE:${node.id}:${socket.name}`);
    }
  }
  if (!Object.keys(api).length) throw new Error('WORKFLOW_API_GRAPH_EMPTY');
  return api;
}

/** Expand ComfyUI's saved UI subgraphs into the API graph expected by /prompt.
 * Boundary links are rewired by their declared input/output slot. Nested
 * subgraphs are expanded recursively; malformed or ambiguous boundaries fail closed.
 */
export function expandComfySubgraphs(source: UiWorkflow, depth = 0): UiWorkflow {
  if (depth > 8) throw new Error('WORKFLOW_SUBGRAPH_DEPTH_EXCEEDED');
  const definitions = (source as any).definitions?.subgraphs;
  if (!Array.isArray(definitions) || definitions.length === 0) return source;
  const definitionById = new Map(definitions.map((item: any) => [String(item.id), item]));
  if (!source.nodes.some((node) => definitionById.has(node.type))) return source;
  const nodes: UiNode[] = [];
  const links = [...source.links];
  let nextLink = Math.max(0, ...links.map(([id]) => Number(id))) + 1;
  for (const node of source.nodes) {
    const definition = definitionById.get(node.type) as any;
    if (!definition) { nodes.push(node); continue; }
    const internal = new Map<string, UiNode>((definition.nodes ?? []).map((item: UiNode) => [String(item.id), structuredClone(item)]));
    const internalLinks = (definition.links ?? []) as Array<{ id: number; origin_id: number|string; origin_slot: number; target_id: number|string; target_slot: number; type: string }>;
    const outerLinks = new Map(links.filter((link) => String(link[1]) === String(node.id) || String(link[3]) === String(node.id)).map((link) => [link[0], link]));
    const widgets = Array.isArray(node.widgets_values) ? node.widgets_values : [];
    let widgetIndex = 0;
    for (const [index, port] of (definition.inputs ?? []).entries()) {
      const socket = (node.inputs ?? []).find((item) => item.name === port.name);
      const widgetValue = socket?.widget ? widgets[widgetIndex++] : undefined;
      const upstream = socket?.link == null ? undefined : outerLinks.get(socket.link);
      const boundaryLinks = internalLinks.filter((link) => String(link.origin_id) === '-10' && link.origin_slot === index);
      if (upstream) {
        for (const boundary of boundaryLinks) {
          const target = internal.get(String(boundary.target_id));
          if (!target) throw new Error(`WORKFLOW_SUBGRAPH_TARGET_MISSING:${node.id}:${port.name}`);
          const id = nextLink++;
          links.push([id, upstream[1], upstream[2], `${node.id}:${boundary.target_id}`, boundary.target_slot, boundary.type]);
          const targetInput = target.inputs?.[boundary.target_slot]; if (!targetInput) throw new Error(`WORKFLOW_SUBGRAPH_INPUT_SLOT_MISSING:${node.id}:${port.name}`);
          targetInput.link = id;
        }
      } else if (socket?.widget) {
        const value = widgetValue;
        for (const boundary of boundaryLinks) {
          const target = internal.get(String(boundary.target_id));
          const targetInput = target?.inputs?.[boundary.target_slot];
          if (target && targetInput) {
            targetInput.link = null;
            target.widgets_values_named = { ...(target.widgets_values_named ?? {}), [targetInput.name]: value };
          }
        }
      } else {
        // Optional, unconnected subgraph inputs still have internal boundary
        // links in the definition. Remove those placeholder links from API nodes.
        for (const boundary of boundaryLinks) {
          const target = internal.get(String(boundary.target_id));
          const targetInput = target?.inputs?.[boundary.target_slot];
          if (targetInput) targetInput.link = null;
        }
      }
    }
    for (const [index, port] of (definition.outputs ?? []).entries()) {
      const boundary = internalLinks.find((link) => String(link.target_id) === '-20' && link.target_slot === index);
      if (!boundary) continue;
      const outer = links.filter((link) => String(link[1]) === String(node.id) && link[2] === index);
      for (const old of outer) {
        const at = links.findIndex((link) => link[0] === old[0]);
        links[at] = [old[0], `${node.id}:${boundary.origin_id}`, boundary.origin_slot, old[3], old[4], boundary.type];
      }
    }
    for (const link of internalLinks) {
      if (String(link.origin_id) === '-10' || String(link.target_id) === '-20') continue;
      const id = nextLink++;
      links.push([id, `${node.id}:${link.origin_id}`, link.origin_slot, `${node.id}:${link.target_id}`, link.target_slot, link.type]);
      const target = internal.get(String(link.target_id));
      const targetInput = target?.inputs?.[link.target_slot];
      if (!targetInput) throw new Error(`WORKFLOW_SUBGRAPH_INPUT_SLOT_MISSING:${node.id}:${link.target_id}:${link.target_slot}`);
      targetInput.link = id;
    }
    // Outer links into the subgraph have been replaced by inner links above.
    for (let index = links.length - 1; index >= 0; index--) if (String(links[index][3]) === String(node.id)) links.splice(index, 1);
    for (const item of internal.values()) {
      item.id = `${node.id}:${item.id}`;
      nodes.push(item);
    }
  }
  const expanded: UiWorkflow = { nodes, links, definitions: source.definitions };
  return expandComfySubgraphs(expanded, depth + 1);
}
