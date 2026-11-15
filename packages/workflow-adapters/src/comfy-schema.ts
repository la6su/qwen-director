export function validateComfyApiWorkflowSchema(graph: Record<string, any>, schema: Record<string, any>, code = 'COMFY_WORKFLOW_SCHEMA_MISMATCH'): { classes: string[]; nodes: number } {
  const issues: string[] = [];
  let nodes = 0;
  for (const [nodeId, node] of Object.entries(graph)) {
    if (!node || typeof node !== 'object' || typeof node.class_type !== 'string') { issues.push(`${nodeId}:INVALID_NODE`); continue; }
    nodes++;
    const definition = schema[node.class_type];
    if (!definition) { issues.push(`${nodeId}:${node.class_type}:CLASS_MISSING`); continue; }
    const declared = definition.input ?? {};
    const inputTypes = { ...(declared.required ?? {}), ...(declared.optional ?? {}), ...(declared.hidden ?? {}) } as Record<string, any>;
    const resolveType = (name: string): any => {
      if (inputTypes[name]) return inputTypes[name];
      const [root, ...path] = name.split('.'); const descriptor = inputTypes[root];
      if (!descriptor || !path.length) return undefined;
      let options = descriptor[0] === 'COMFY_AUTOGROW_V3' ? descriptor[1]?.template?.input : undefined;
      if (descriptor[0] === 'COMFY_DYNAMICCOMBO_V3') {
        const selected = descriptor[1]?.options?.find((option: any) => option.key === node.inputs?.[root]);
        options = selected?.inputs;
      }
      if (descriptor[0] === 'COMFY_AUTOGROW_V3') {
        const template = descriptor[1]?.template;
        if (template?.names?.includes(path[0]) || template?.prefix && path[0].startsWith(template.prefix)) return template.input?.required?.value ?? template.input?.required?.[Object.keys(template.input?.required ?? {})[0]] ?? template.input?.optional?.[Object.keys(template.input?.optional ?? {})[0]];
      }
      let resolved: any;
      for (const part of path) {
        resolved = options?.required?.[part] ?? options?.optional?.[part];
        options = resolved?.[0] === 'COMFY_DYNAMICCOMBO_V3'
          ? resolved[1]?.options?.find((option: any) => option.key === node.inputs?.[name.split('.').slice(0, name.split('.').indexOf(part) + 1).join('.')])?.inputs
          : resolved?.[0] === 'COMFY_AUTOGROW_V3' ? resolved[1]?.template?.input : undefined;
      }
      return resolved;
    };
    const allowsInput = (name: string): boolean => Boolean(resolveType(name));
    const outputType = (source: any, slot: number, seen = new Set<string>()): unknown => {
      const sourceId = Object.entries(graph).find(([, item]: [string, any]) => item === source)?.[0];
      if (!sourceId || seen.has(sourceId)) return '*';
      seen.add(sourceId);
      const type = schema[source.class_type]?.output?.[slot];
      if (type !== 'COMFY_MATCHTYPE_V3') return type;
      const branches = ['on_false', 'on_true'].map((name) => source.inputs?.[name]).filter((value) => Array.isArray(value) && typeof value[0] === 'string');
      const branchTypes = branches.map(([id, branchSlot]) => outputType(graph[id], Number(branchSlot), new Set(seen))).filter((value) => typeof value === 'string' && value !== '*');
      return branchTypes.length && branchTypes.every((value) => value === branchTypes[0]) ? branchTypes[0] : '*';
    };
    const typeCompatible = (expected: unknown, actual: unknown) => typeof expected !== 'string' || expected === '*' || expected === 'COMFY_MATCHTYPE_V3' || actual === '*' || expected.split(',').includes(String(actual));
    for (const [inputName, value] of Object.entries(node.inputs ?? {})) {
      const target = resolveType(inputName);
      if (!target) { issues.push(`${nodeId}:${node.class_type}:INPUT_MISSING:${inputName}`); continue; }
      if (Array.isArray(value) && typeof value[0] === 'string') {
        const source = graph[value[0]]; const slot = value[1];
        if (!source || !Number.isInteger(slot) || slot < 0) { issues.push(`${nodeId}:${node.class_type}:LINK_INVALID:${inputName}`); continue; }
        const sourceDefinition = schema[source.class_type];
        const sourceType = outputType(source, slot);
        const targetType = target[0];
        if (!sourceDefinition || sourceType === undefined || !typeCompatible(targetType, sourceType)) issues.push(`${nodeId}:${node.class_type}:LINK_TYPE_MISMATCH:${inputName}`);
      } else if (value !== null && value !== undefined) {
        const actual = typeof value;
        const kind = target[0];
        const primitiveValid = kind === 'STRING' ? actual === 'string'
          : kind === 'INT' ? actual === 'number' && Number.isSafeInteger(value)
            : kind === 'FLOAT' ? actual === 'number' && Number.isFinite(value)
              : kind === 'BOOLEAN' ? actual === 'boolean'
                : undefined;
        if (primitiveValid === false) issues.push(`${nodeId}:${node.class_type}:INPUT_VALUE_TYPE_INVALID:${inputName}:${String(kind)}`);
        else if (primitiveValid === undefined && Array.isArray(target) && target.length > 0 && target.every((item: unknown) => typeof item === 'string') && !target.some((option: unknown) => Object.is(option, value))) {
          issues.push(`${nodeId}:${node.class_type}:INPUT_VALUE_OPTION_INVALID:${inputName}`);
        }
      }
    }
    for (const inputName of Object.keys(declared.required ?? {})) {
      const descriptor = declared.required[inputName];
      if (descriptor?.[0] === 'COMFY_AUTOGROW_V3') {
        if (descriptor[1]?.template?.min > 0 && !Object.keys(node.inputs ?? {}).some((name) => name.startsWith(`${inputName}.`))) issues.push(`${nodeId}:${node.class_type}:REQUIRED_INPUT_MISSING:${inputName}`);
      } else if (descriptor?.[0] !== 'COMFY_DYNAMICCOMBO_V3' && !(inputName in (node.inputs ?? {}))) issues.push(`${nodeId}:${node.class_type}:REQUIRED_INPUT_MISSING:${inputName}`);
    }
    for (const [inputName, descriptor] of Object.entries(inputTypes) as Array<[string, any]>) if (descriptor?.[0] === 'COMFY_DYNAMICCOMBO_V3') {
      const option = descriptor[1]?.options?.find((item: any) => item.key === node.inputs?.[inputName]);
      for (const child of Object.keys(option?.inputs?.required ?? {})) if (!(`${inputName}.${child}` in (node.inputs ?? {}))) issues.push(`${nodeId}:${node.class_type}:REQUIRED_INPUT_MISSING:${inputName}.${child}`);
    }
  }
  if (issues.length) throw new Error(`${code}:${issues.slice(0, 20).join(';')}`);
  return { classes: [...new Set(Object.values(graph).map((node: any) => node.class_type))], nodes };
}
