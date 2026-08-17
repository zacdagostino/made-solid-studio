import type { ResearchArtifact } from './domain';

export type VisualAssetGroup = {
  asset: ResearchArtifact;
  assets: ResearchArtifact[];
  pageUrls: string[];
  sourceUrls: string[];
};

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
}

function metadataUrls(asset: ResearchArtifact, singular: string, plural: string) {
  const value = asset.metadata[singular];
  return [
    ...(typeof value === 'string' && value.trim() ? [value] : []),
    ...strings(asset.metadata[plural]),
  ];
}

function groupKey(asset: ResearchArtifact) {
  if (asset.sha256) return `sha256:${asset.sha256}`;
  const sourceUrl = metadataUrls(asset, 'sourceUrl', 'sourceUrls')[0];
  return sourceUrl ? `source:${sourceUrl}` : `artifact:${asset.id}`;
}

export function groupVisualAssets(assets: ResearchArtifact[]): VisualAssetGroup[] {
  const groups = new Map<string, VisualAssetGroup>();
  for (const asset of assets) {
    const key = groupKey(asset);
    const existing = groups.get(key);
    const pageUrls = metadataUrls(asset, 'pageUrl', 'pageUrls');
    const sourceUrls = metadataUrls(asset, 'sourceUrl', 'sourceUrls');
    if (!existing) {
      groups.set(key, {
        asset,
        assets: [asset],
        pageUrls: [...new Set(pageUrls)],
        sourceUrls: [...new Set(sourceUrls)],
      });
      continue;
    }
    existing.assets.push(asset);
    existing.pageUrls = [...new Set([...existing.pageUrls, ...pageUrls])];
    existing.sourceUrls = [...new Set([...existing.sourceUrls, ...sourceUrls])];
  }
  return [...groups.values()];
}
