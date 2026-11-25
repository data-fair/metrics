import { expect } from '@playwright/test'
import { test as setup } from './fixtures/login.ts'

// The first hit on a Vite dev route compiles it on demand, which can exceed the per-test timeout:
// the audience page is visited once here, the e2e specs then find it compiled.
setup('warmup the audience page', async ({ page, goToWithAuth }) => {
  await goToWithAuth('/metrics/embed/home', 'test_metrics_superadmin')
  await expect(page.getByRole('link', { name: 'Export' })).toBeVisible({ timeout: 60_000 })
})
