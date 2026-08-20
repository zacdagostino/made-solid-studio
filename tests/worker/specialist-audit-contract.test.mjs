import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL(
  '../../supabase/migrations/20260818130000_specialist_website_audits.sql',
  import.meta.url,
);
const workerUrl = new URL('../../worker/audit-specialist-worker.mjs', import.meta.url);
const curationMigrationUrl = new URL(
  '../../supabase/migrations/20260819143000_ux_first_report_curation.sql',
  import.meta.url,
);

test('specialist audit migration requires a complete current evidence set before report freeze', async () => {
  const source = await readFile(migrationUrl, 'utf8');

  assert.match(source, /task_total = 6 and ready_total = 6/i);
  assert.match(source, /task_count <> 6 or ready_task_count <> 6/i);
  assert.match(source, /target_audit\.crawl_run_id is distinct from latest_capture_id/i);
  assert.match(source, /review_state = 'needs_review'/i);
  assert.match(source, /review_state = 'approved' and confidence = 'low'/i);
  assert.match(source, /facts\.crawl_run_id = target_audit\.crawl_run_id/i);
  assert.match(source, /artifacts\.crawl_run_id = target_audit\.crawl_run_id/i);
  assert.match(source, /every approved observation needs resolvable evidence/i);
  assert.match(source, /grant update \(review_state\).*audit_observations/is);
  assert.match(source, /revoke all on function public\.refresh_specialist_audit\(uuid\)/i);
});

test('responsive specialist uses dedicated current-task screenshots and safe viewport captures', async () => {
  const source = await readFile(workerUrl, 'utf8');

  assert.match(source, /\{ label: 'mobile', width: 375, height: 812/);
  assert.match(source, /\{ label: 'tablet', width: 768, height: 1024/);
  assert.match(source, /\{ label: 'desktop', width: 1440, height: 900/);
  assert.match(source, /artifact\.metadata\?\.specialistTaskId === task\.id/);
  assert.match(source, /redirect: 'manual'/);
  assert.match(source, /await assertPublicUrl\(currentUrl, dnsCache\)/);
  assert.match(source, /undersizedTargets: undersizedTargets\.slice\(0, 8\)/);
  assert.match(source, /chromeViewportRatio/);
  assert.match(source, /oversizedLogo/);
  assert.match(source, /image-based-feedback/);
  assert.match(source, /focusedRegion/);
});

test('client report curation groups raw cases and caps the main UX story', async () => {
  const source = await readFile(curationMigrationUrl, 'utf8');

  assert.match(source, /client_theme_count > 8/);
  assert.match(source, /reportGroupKey/);
  assert.match(source, /occurrenceCount/);
  assert.match(source, /kind = 'screenshot'/);
  assert.match(source, /'topPriorities'/);
  assert.match(source, /'actionPlan'/);
  assert.match(source, /Screenshots are current evidence, not a proposed after-state/);
});

test('report creation freezes the approved shortlist without forcing decisions on private observations', async () => {
  const migration = await readFile(
    new URL(
      '../../supabase/migrations/20260819174500_curated_report_selection.sql',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(migration, /review_state = 'approved'/);
  assert.match(migration, /Unselected observations remain private audit material/);
  assert.doesNotMatch(migration, /review_pending_count/);
  assert.doesNotMatch(migration, /Every specialist observation must be approved or excluded/);
});
