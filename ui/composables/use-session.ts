import { Ref } from 'vue'
import { useCookies } from '@vueuse/integrations/useCookies'
import { useRoute } from 'vue-router'
import { ofetch } from 'ofetch'
import jwtDecode from 'jwt-decode'
import * as Debug from 'debug'

const debug = Debug('session')
debug.log = console.log.bind(console)

interface OrganizationMembership {
  id: string,
  name: string,
  role: string,
  department?: string,
  departmentName?: string,
  default?: boolean
}

interface User {
  id: string,
  name: string,
  email: string,
  organizations: OrganizationMembership[],
  isAdmin?: boolean
  adminMode?: boolean,
  asAdmin?: {
    id: string,
    name: string
  },
  plannedDeletion?: string,
  ignorePersonalAccount?: string
}

interface Account {
  type: string,
  id: string,
  name: string,
  department?: string,
  departmentName?: string
}

export interface SessionOptions {
  directoryUrl?: string
}

interface SessionState {
  user?: User,
  organization?: OrganizationMembership,
  account?: Account,
  accountRole?: string,
  lang?: string,
  dark?: boolean
}

export interface Session {
  state: SessionState,
  loginUrl: (redirect?: string, extraParams?: { [key: string]: string;}, immediateRedirect?: true) => string,
  login: (redirect?: string, extraParams?: { [key: string]: string;}, immediateRedirect?: true) => void,
  switchOrganization: (org: string | null, dep: string | undefined) => void,
  setAdminMode: (adminMode: boolean, redirect?: string) => Promise<void>,
  topLocation: Ref<Location | undefined>,
  options: SessionOptions
}

function jwtDecodeAlive (jwt: string | null) {
  if (!jwt) return
  const decoded = jwtDecode<any>(jwt)
  if (!decoded) return
  const now = Math.ceil(Date.now().valueOf() / 1000)
  if (typeof decoded.exp !== 'undefined' && decoded.exp < now) {
    console.error(`token expired: ${decoded.exp}<${now},  ${JSON.stringify(decoded)}`)
    return
  }
  if (typeof decoded.nbf !== 'undefined' && decoded.nbf > now) {
    console.warn(`token not yet valid: ${decoded.nbf}>${now}, ${JSON.stringify(decoded)}`)
    // do not return null here, this is probably a false flag due to a slightly mismatched clock
    // return null
  }
  decoded.organizations = decoded.organizations || []
  for (const org of decoded.organizations) {
    if (org.dflt) org.default = true
    delete org.dflt
  }
  if (decoded.pd) decoded.plannedDeletion = decoded.pd
  delete decoded.pd
  if (decoded.ipa) decoded.ignorePersonalAccount = true
  delete decoded.ipa
  return decoded as User
}

const getTopLocation = () => {
  if (typeof window === undefined) return undefined
  try {
    return window.top!.location
  } catch (err) {
    return window.location
  }
}

const goTo = (url: string) => {
  const topLocation = getTopLocation()
  if (!topLocation) {
    throw new TypeError('session.goTo was called without access to the window object or its location')
  }
  topLocation.href = url
}

export const useSession = async (initOptions?: SessionOptions) => {
  const options = { directoryUrl: '/simple-directory', ...initOptions }
  debug(`init directoryUrl=${options.directoryUrl}`)

  // sessionData is also stored in localStorage as a way to access it in simpler pages that do not require sd-vue
  // and in order to listen to storage event from other contexts and sync session info accross windows and tabs
  if (typeof window === undefined) {
    const storageListener = (event: StorageEvent) => {
      if (event.key === 'sd-session') readCookies()
    }
    window.addEventListener('storage', storageListener)
    onUnmounted(() => window.removeEventListener('storage', storageListener))
  }

  // use vue-router to detect page change and maintain a reference to the current page location
  // top page if we are in iframe context
  const route = useRoute()
  const topLocation = computed(() => {
    // eslint-disable-next-line no-unused-expressions
    route // adds reactivity
    return getTopLocation()
  })

  // the core state of the session that is filled by reading cookies
  const state = <SessionState>{}

  // cookies are the source of truth and this information is transformed into the sessionData reactive object
  const cookies = useCookies(['id_token', 'id_token_org'], { doNotParse: true })
  const readCookies = () => {
    const darkCookie = cookies.get('theme_dark') as string | null
    state.dark = darkCookie === '1' || darkCookie === 'true'

    const langCookie = cookies.get('i18n_lang') as string | null
    if (langCookie) state.lang = langCookie
    else delete state.lang

    const idToken = cookies.get('id_token') as string | null
    state.user = jwtDecodeAlive(idToken)

    if (!state.user) {
      delete state.organization
      delete state.account
      delete state.accountRole
      return
    }
    const organizationId = cookies.get('id_token_org') as string | null
    const departmentId = cookies.get('id_token_dep') as string | null
    if (organizationId) {
      if (departmentId) {
        state.organization = state.user.organizations.find(o => o.id === organizationId && o.department === departmentId)
      } else {
        state.organization = state.user.organizations.find(org => org.id === organizationId)
      }
    } else {
      delete state.organization
    }
    if (state.organization) {
      state.account = {
        type: 'organization',
        id: state.organization.id,
        name: state.organization.name,
        department: state.organization.department,
        departmentName: state.organization.departmentName
      }
      state.accountRole = state.organization.role
    } else {
      state.account = {
        type: 'user',
        id: state.user.id,
        name: state.user.name
      }
      state.accountRole = 'admin'
    }
  }
  readCookies()

  // trigger some full page refresh when some key session elements are changed
  // the danger of simply using reactivity is too high, data must be re-fetched, etc.
  watch(() => state.account, (account, oldAccount) => {
    if (account?.type !== oldAccount?.type || account?.id !== oldAccount?.id || account?.department !== oldAccount?.department) {
      topLocation.value?.reload()
    }
  })
  watch(() => state.lang, (lang, oldLang) => {
    if (lang !== oldLang) topLocation.value?.reload()
  })
  watch(state, (state) => {
    if (typeof window !== undefined) {
      window.localStorage.setItem('sd-session', JSON.stringify(state))
    }
  })

  // login can be performed as a simple link (please use target=top) or as a function
  const loginUrl = (redirect?: string, extraParams: {[key: string]: string} = {}, immediateRedirect?: true) => {
    // login can also be used to redirect user immediately if he is already logged
    if (redirect && state.user && immediateRedirect) return redirect
    if (!redirect && topLocation.value) redirect = topLocation.value.href
    let url = `${options.directoryUrl}/login?redirect=${encodeURIComponent(redirect ?? '')}`
    Object.keys(extraParams).filter(key => ![null, undefined, ''].includes(extraParams[key])).forEach((key) => {
      url += `&${key}=${encodeURIComponent(extraParams[key])}`
    })
    return url
  }
  const login = (redirect?: string, extraParams: {[key: string]: string} = {}, immediateRedirect?: true) => {
    return goTo(loginUrl(redirect, extraParams, immediateRedirect))
  }

  const switchOrganization = (org: string | null, dep: string | undefined) => {
    if (org) cookies.set('id_token_org', org)
    else cookies.remove('id_token_org')
    if (org) cookies.set('id_token_dep', dep)
    else cookies.remove('id_token_dep')
    readCookies()
  }

  const setAdminMode = async (adminMode: boolean, redirect?: string) => {
    if (adminMode) {
      const params: {[key: string]: string} = { adminMode: 'true' }
      if (state.user) params.email = state.user.email
      const url = loginUrl(redirect, params, true)
      goTo(url)
    } else {
      await ofetch(`${options.directoryUrl}/api/auth/adminmode`, { method: 'DELETE' })
      readCookies()
    }
  }

  const asAdmin = async (user: any) => {
    if (user) {
      await fetch(`${options.directoryUrl}/api/auth/asadmin`, { method: 'POST', body: user })
    } else {
      await fetch(`${options.directoryUrl}/api/auth/asadmin`, { method: 'DELETE' })
    }
    readCookies()
  }

  const cancelDeletion = async () => {
    if (!state.user) return
    await fetch(`${options.directoryUrl}/api/users/${state.user.id}`, { method: 'PATCH', body: <any>{ plannedDeletion: null } })
    readCookies()
  }

  const keepalive = async () => {
    if (!state.user) return
    const res = await fetch(`${options.directoryUrl}/api/auth/keepalive`, { method: 'POST' })
    readCookies()
    return res.body as unknown as User
  }
  // immediately performe a keepalive, but only on top windows (not iframes or popups)
  // and only if it was not done very recently (maybe from a refreshed page next to this one)
  if (typeof window !== undefined && window.top === window.self) {
    const lastKeepalive = window.localStorage.getItem('sd-keepalive')
    if (!lastKeepalive || (new Date().getTime() - Number(lastKeepalive)) < 10000) {
      await keepalive()
    }
  }

  return <Session>{
    state,
    loginUrl,
    login,
    switchOrganization,
    setAdminMode,
    asAdmin,
    cancelDeletion,
    keepalive,
    topLocation,
    options
  }
}
