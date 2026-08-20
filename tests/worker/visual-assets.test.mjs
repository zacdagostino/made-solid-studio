import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectVisualAssets, visualAssetKey } from '../../worker/visual-assets.mjs';

const assetWorkerUrl = new URL('../../worker/asset-analysis-worker.mjs', import.meta.url);
const runScopeMigrationUrl = new URL(
  '../../supabase/migrations/20260808130000_asset_analysis_run_scoping.sql',
  import.meta.url,
);
const workerContractMigrationUrl = new URL(
  '../../supabase/migrations/20260808131000_asset_analysis_worker_contract.sql',
  import.meta.url,
);
const optionalSvgMigrationUrl = new URL(
  '../../supabase/migrations/20260808135000_optional_svg_logo_generation.sql',
  import.meta.url,
);

test('deduplicates Wix rendition URLs to their original media file', () => {
  const first = {
    type: 'image',
    url: 'https://static.wixstatic.com/media/project-photo.jpg/v1/fill/w_400,h_300,enc_avif/photo.jpg',
  };
  const second = {
    type: 'image',
    url: 'https://static.wixstatic.com/media/project-photo.jpg/v1/fill/w_1200,h_900,enc_avif/photo.jpg',
  };

  assert.equal(visualAssetKey(first), visualAssetKey(second));
});

test('reserves visual-capture capacity for supporting images', () => {
  const candidates = [
    ...Array.from({ length: 20 }, (_, index) => ({
      type: 'logo',
      url: `https://example.com/logo-${index}.svg`,
      isHeaderLogo: index === 0,
    })),
    ...Array.from({ length: 20 }, (_, index) => ({
      type: 'image',
      url: `https://example.com/project-${index}.jpg`,
      width: 1200,
      height: 800,
    })),
  ];
  const selection = selectVisualAssets(candidates, 10);

  assert.equal(selection.selected.length, 10);
  assert.equal(selection.logoCount, 4);
  assert.equal(selection.supportingCount, 6);
});

test('logo-version runs stay scoped while refreshing primary/accent evidence', async () => {
  const worker = await readFile(assetWorkerUrl, 'utf8');

  assert.match(
    worker,
    /const assetsNeedingAnalysis = analysisScope === 'full' \? selectedAssets : \[\]/,
  );
  assert.match(worker, /asset\.id === retryEditableLogoAssetId/);
  assert.match(worker, /isSelectedForAnalysis\(asset\)/);
  assert.match(worker, /uniqueAssetsByContent\(\s*\(assets \?\? \[\]\)\.filter/);
  assert.match(worker, /readString\(asset\.sha256\) \|\| `artifact:\$\{asset\.id\}`/);
  assert.match(worker, /Detecting primary and accent evidence from the logo and captured pages/);
  assert.doesNotMatch(
    worker,
    /if \(!retryEditableLogoAssetId\) \{\s*await cancellation\.assertActive\(\);\s*await updateProgress[\s\S]*collecting_brand_evidence/,
  );
});

test('starts every requested asset analysis with clean mode and run scoping', async () => {
  const [worker, migration, workerContractMigration] = await Promise.all([
    readFile(assetWorkerUrl, 'utf8'),
    readFile(runScopeMigrationUrl, 'utf8'),
    readFile(workerContractMigrationUrl, 'utf8'),
  ]);

  assert.match(migration, /run_token = gen_random_uuid\(\)/);
  assert.match(migration, /editable_logo_retry_asset_id = null/);
  assert.match(migration, /editable_logo_retry_token = null/);
  assert.match(migration, /analysis_run_token uuid/);
  assert.match(worker, /analysis_run_token: job\.run_token/);
  assert.match(worker, /progress_phase: 'failed'/);
  assert.match(worker, /\$\{completionLabel\}: \$\{completedOutputs\.join/);
  assert.match(worker, /claim_next_asset_analysis_v2/);
  assert.match(workerContractMigration, /worker_contract_version < 2/);
  assert.match(workerContractMigration, /worker_contract_version <= supported_contract_version/);
});

test('keeps editable SVG generation default-off and preserves existing SVGs when disabled', async () => {
  const [worker, migration] = await Promise.all([
    readFile(assetWorkerUrl, 'utf8'),
    readFile(optionalSvgMigrationUrl, 'utf8'),
  ]);

  assert.match(worker, /const createEditableSvg = job\.editable_logo_generation_enabled === true/);
  assert.match(worker, /if \(createEditableSvg\) \{/);
  assert.match(migration, /editable_logo_generation_enabled boolean not null default false/);
  assert.match(migration, /include_editable_svg boolean default false/);
  assert.match(migration, /or \(create_editable_svg and coalesce/);
  assert.match(migration, /SVG creation off/);
});
