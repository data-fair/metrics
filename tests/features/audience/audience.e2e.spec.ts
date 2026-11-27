import { expect } from '@playwright/test'
import { test } from '../../fixtures/login.ts'
import { clean, dailyApiMetrics } from '../../support/index.ts'

// the page shows the last 7 days by default, the metrics are written on today
const today = new Date().toISOString().slice(0, 10)

const metric = (resourceId: string, title: string, operationTrack: string, nbRequests: number) => ({
  owner: { type: 'user', id: 'test_metrics_superadmin', name: 'Super Admin' },
  day: today,
  resource: { type: 'datasets', id: resourceId, title },
  operationTrack,
  statusClass: 'ok',
  userClass: 'anonymous',
  refererDomain: 'a.fr',
  refererCategory: 'embed',
  nbRequests,
  bytes: nbRequests * 1000,
  duration: nbRequests * 0.1
})

test.describe('audience page', () => {
  test.beforeEach(clean)
  test.afterAll(clean)

  test('shows the requests of the account on the period @smoke', async ({ page, goToWithAuth }) => {
    await (await dailyApiMetrics()).insertMany([
      metric('d1', 'Dataset one', 'readDataAPI', 12),
      metric('d2', 'Dataset two', 'readDataFiles', 3)
    ])
    await goToWithAuth('/metrics/embed/home', 'test_metrics_superadmin')
    await expect(page.getByText('API calls / dataset')).toBeVisible()
    // the key figures: a card with its value over its title
    const keyFigure = (title: string) => page.locator('.v-card').filter({ has: page.getByText(title, { exact: true }) })
    await expect(keyFigure('API calls')).toContainText('12')
    await expect(keyFigure('downloaded files')).toContainText('3')
    await expect(keyFigure('downloaded volume')).toContainText(/3 kb/i)
  })

  test('the export link carries the period', async ({ page, goToWithAuth }) => {
    await goToWithAuth('/metrics/embed/home?start=2026-01-01&end=2026-01-31', 'test_metrics_superadmin')
    await expect(page.getByRole('link', { name: 'Export' })).toHaveAttribute('href', /_export\?start=2026-01-01&end=2026-01-31/)
  })
})
