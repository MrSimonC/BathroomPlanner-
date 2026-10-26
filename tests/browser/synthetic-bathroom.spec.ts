import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { savedProjects } from './storage';

// Synthetic, redistributable authoring example; coordinates and dimensions are cm.
const fixture = resolve('tests/fixtures/synthetic-bathroom.openplan.json');

async function importProject(page: Page, path: string) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(path);
  await expect(page.getByRole('button', { name: 'Synthetic Bathroom', exact: true })).toBeVisible();
  await expect(page.getByRole('application')).toContainText('1 room');
}

async function exportProject(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  const path = (await (await pending).path())!;
  return { path, project: JSON.parse(await readFile(path, 'utf8')) };
}

for (const width of [1440, 390]) test(`synthetic bathroom imports, saves, reloads and roundtrips at ${width}px`, async ({ page }, testInfo) => {
  test.slow();
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door'])));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const source = JSON.parse(await readFile(fixture, 'utf8'));
  await page.goto('/editor');
  await importProject(page, fixture);
  await expect(page.getByRole('application')).toContainText('4 walls');
  await expect(page.getByRole('application')).toContainText('3 objects');
  await expect(page.getByRole('application').getByLabel('Floor plan editor canvas')).toBeVisible();

  // Verify the explicit basin override in the editor rather than its 60×45 catalog default.
  await page.getByRole('button', { name: 'Save', exact: true }).press('l');
  await page.getByRole('button', { name: '🪥 Sink', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Width (cm)', exact: true })).toHaveValue('55');
  await expect(page.getByRole('spinbutton', { name: 'Depth (cm)', exact: true })).toHaveValue('42');
  await expect(page.getByRole('spinbutton', { name: 'Height (cm)', exact: true })).toHaveValue('85');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(async () => (await savedProjects(page))[source.id]?.floors).toEqual(source.floors);
  await page.reload();
  await expect(page.getByRole('application')).toContainText('1 room');
  const downloaded = await exportProject(page);
  expect(downloaded.project.floors).toEqual(source.floors);
  await testInfo.attach(`synthetic-bathroom-2d-${width}`, { body: await page.screenshot(), contentType: 'image/png' });

  // Import the actual downloaded bytes, then inspect both editor views again.
  await importProject(page, downloaded.path);
  expect((await exportProject(page)).project.floors).toEqual(downloaded.project.floors);
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const viewer = page.getByRole('region', { name: '3D floor plan viewer' });
  await expect(viewer.locator('canvas').first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: 'Top-Down View', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Top-Down View', exact: true }).click();
  await testInfo.attach(`synthetic-bathroom-3d-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
  expect(errors).toEqual([]);
});
