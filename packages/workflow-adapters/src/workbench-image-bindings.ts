import type { WorkbenchKind } from './workbenches.js';

/** Resolve image input order; Qwen edit ordering follows encoder image_N slots. */
export function resolveWorkbenchImageBindings(kind: WorkbenchKind, graph: Record<string, any>, imageNodeIds?: string[]) {
  const available = Object.entries(graph).filter(([, node]) => node?.class_type === 'LoadImage').map(([id]) => id);
  if (kind === 'image-generate' || kind === 'refmod-create') {
    if (imageNodeIds?.length) throw new Error('WORKBENCH_IMAGE_BINDINGS_UNEXPECTED');
    return [];
  }
  let semanticOrder = available;
  if (kind === 'image-edit') {
    const encoders = Object.values(graph).filter((node) => node?.class_type === 'TextEncodeQwenImage21');
    if (encoders.length !== 1) throw new Error('IMAGE_EDIT_BOUNDARY_INVALID');
    const slots = Object.entries(encoders[0].inputs ?? {}).flatMap(([name, value]) => {
      const match = /^images\.image_(\d+)$/.exec(name);
      return match ? [{ index: Number(match[1]), value }] : [];
    }).sort((a, b) => a.index - b.index);
    if (slots.length !== available.length || slots.some((slot, index) => slot.index !== index + 1)) throw new Error('IMAGE_EDIT_REFERENCE_IMAGE_SLOTS_INVALID');
    semanticOrder = slots.map(({ value }) => {
      const source = linkedSource(graph, value);
      if (!source || graph[source[0]]?.class_type !== 'LoadImage') throw new Error('IMAGE_EDIT_REFERENCE_IMAGE_BINDING_INVALID');
      return source[0];
    });
    if (new Set(semanticOrder).size !== semanticOrder.length || available.some((id) => !semanticOrder.includes(id))) throw new Error('IMAGE_EDIT_REFERENCE_IMAGE_BINDING_INVALID');
  }
  const bindings = imageNodeIds ?? semanticOrder;
  if (bindings.length !== available.length || bindings.some((id) => !available.includes(id)) || new Set(bindings).size !== bindings.length) throw new Error('WORKBENCH_IMAGE_BINDINGS_INVALID');
  if (kind === 'image-edit' && bindings.some((id, index) => id !== semanticOrder[index])) throw new Error('WORKBENCH_IMAGE_BINDINGS_ORDER_MISMATCH');
  return [...bindings];
}

function linkedSource(graph: Record<string, any>, link: unknown): [string, number] | undefined {
  let current = link;
  const visited = new Set<string>();
  while (Array.isArray(current) && typeof current[0] === 'string' && Number.isInteger(current[1])) {
    const [id, output] = current as [string, number];
    if (visited.has(id)) return undefined;
    const node = graph[id];
    visited.add(id);
    if (node?.class_type === 'ComfySwitchNode') current = node.inputs?.[node.inputs?.switch === false ? 'on_false' : 'on_true'];
    else if (node?.class_type === 'PreviewAny' && Array.isArray(node.inputs?.source)) current = node.inputs.source;
    else return [id, output];
  }
  return undefined;
}
