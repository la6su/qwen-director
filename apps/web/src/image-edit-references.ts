type ImageReference = { assetVersionId: string; role?: string; [key: string]: unknown };

const rolePriority: Record<string, number> = { actor: 0, set: 1, prop: 2, layout: 3, picture: 4 };

/** One selected AssetVersion is one Qwen Image input even when the shot binds it to multiple roles. */
export function compactImageEditReferences<T extends ImageReference>(references: T[]): T[] {
  const compacted: T[] = [];
  const indexByAsset = new Map<string, number>();
  for (const reference of references) {
    const index = indexByAsset.get(reference.assetVersionId);
    if (index === undefined) {
      indexByAsset.set(reference.assetVersionId, compacted.length);
      compacted.push(reference);
      continue;
    }
    const current = compacted[index];
    if ((rolePriority[reference.role ?? 'picture'] ?? 4) < (rolePriority[current.role ?? 'picture'] ?? 4)) compacted[index] = reference;
  }
  return compacted.map((reference) => ({
    ...reference,
    role: reference.role === 'first-frame' || reference.role === 'last-frame' ? 'picture' : reference.role ?? 'picture',
  }));
}
