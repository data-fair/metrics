import { test as base, expect, request, type BrowserContext } from '@playwright/test'
import { processLogs } from '../support/process-logs.ts'

/**
 * The `test` of every e2e spec.
 *
 * Sessions come from simple-directory's API, not its login form: one login per user
 * (POST /api/auth/password, then its callback), shared by every test of the worker.
 * Sharing is safe because no page ever presents the exchange token (id_token_ex): lib-vue skips
 * its session keepalive while localStorage['sd-keepalive'] is recent, and the init script below
 * sets it in the future. Without that, each page load would rotate the single-use token and the
 * next test replaying the old one outside simple-directory's 60 s grace would be logged out.
 * The id_token itself expires after 15 min, so a session older than 10 min is logged in again.
 */
type Cookies = Parameters<BrowserContext['addCookies']>[0]

const baseUrl = `http://${process.env.DEV_HOST}:${process.env.NGINX_PORT}`
const directoryUrl = `${baseUrl}/simple-directory`
const maxAge = 10 * 60 * 1000
const sessions = new Map<string, { at: number, cookies: Cookies }>()

const apiLogin = async (user: string): Promise<Cookies> => {
  const ctx = await request.newContext()
  try {
    // every test account uses the same password
    const password = 'passwd'
    const res = await ctx.post(`${directoryUrl}/api/auth/password`, {
      params: { redirect: `${baseUrl}/metrics/` },
      data: { email: `${user}@test.com`, password }
    })
    expect(res.ok(), `login of ${user} failed: ${res.status()} ${await res.text()}`).toBe(true)
    // the callback sets the session cookies and redirects to the app
    const callback = await ctx.get(await res.text(), { maxRedirects: 0 })
    expect(callback.status(), `login callback of ${user} failed: ${callback.headers().location}`).toBe(302)
    return (await ctx.storageState()).cookies
  } finally {
    await ctx.dispose()
  }
}

const sessionCookies = async (user: string) => {
  let session = sessions.get(user)
  if (!session || Date.now() - session.at > maxAge) {
    session = { at: Date.now(), cookies: await apiLogin(user) }
    sessions.set(user, session)
  }
  return session.cookies
}

/**
 * - `goToWithAuth(url, user)`: lands on url logged in as user.
 * - `page` override: English, and no session keepalive (see above).
 * - on a failure, the last lines of the api and daemon logs are attached to the report and the trace.
 */
export const test = base.extend<{
  goToWithAuth: (url: string, user: string) => Promise<void>,
  diagnostics: void
}>({
  page: async ({ page }, use) => {
    await page.context().addCookies([{ name: 'i18n_lang', value: 'en', url: baseUrl }])
    await page.context().addInitScript(() => {
      window.localStorage.setItem('sd-keepalive', String(Date.now() + 365 * 86400_000))
    })
    await use(page)
  },

  goToWithAuth: async ({ page, context }, use) => {
    await use(async (url, user) => {
      // replace the session of a previous call (another user) as a whole
      await context.clearCookies({ name: /^id_token/ })
      await context.addCookies(await sessionCookies(user))
      await page.goto(url)
    })
  },

  // eslint-disable-next-line no-empty-pattern -- playwright requires a destructuring pattern here
  diagnostics: [async ({}, use, testInfo) => {
    await use()
    if (testInfo.status === testInfo.expectedStatus) return
    for (const name of ['api', 'daemon']) {
      const logs = processLogs(name)
      if (logs) await testInfo.attach(`${name}.log`, { body: logs, contentType: 'text/plain' })
    }
  }, { auto: true }]
})

export { expect }
