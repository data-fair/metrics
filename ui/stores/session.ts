import { defineStore } from 'pinia'
import { Ref, ref } from 'vue'
import { useCookies } from '@vueuse/integrations/useCookies'
import { useRoute } from 'vue-router'
import { ofetch } from 'ofetch'
// import { useFetch } from '@vueuse/core'
import jwtDecode from 'jwt-decode'
import Debug from 'debug'

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

interface SessionOptions {
  directoryUrl?: string
}

export interface Session {
  user: Ref<User | undefined>,
  account?: Ref<Account | undefined>
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

export const useSessionStore = defineStore('session', () => {
  const options = ref<SessionOptions>({ directoryUrl: '/simple-directory' })
  const initialized = ref<boolean>(false)

  const init = (initOptions: SessionOptions) => {
    options.value = { ...options.value, ...initOptions }
    debug(`init directoryUrl=${options.value.directoryUrl}`)
    readCookies()
    initialized.value = true

    // sessionData is also stored in localStorage as a way to access it in simpler pages that do not require sd-vue
    // and in order to listen to storage event from other contexts and sync session info accross windows and tabs
    if (typeof window === undefined) {
      const storageListener = (event: StorageEvent) => {
        if (event.key === 'sd-session') readCookies()
      }
      window.addEventListener('storage', storageListener)
      onUnmounted(() => window.removeEventListener('storage', storageListener))
    }
  }

  // use vue-router to detect page change and maintain a reference to the current page location
  // top page if we are in iframe context
  const route = useRoute()
  const topLocation = computed(() => {
    // eslint-disable-next-line no-unused-expressions
    route // adds reactivity
    return getTopLocation()
  })

  // the core state of the session
  const user = ref<User>()
  const lang = ref<string>()
  const dark = ref(false)

  // cookies are the source of truth and this information is transformed into the sessionData reactive object
  const cookies = useCookies(['id_token', 'id_token_org'], { doNotParse: true })
  const readCookies = () => {
    const darkCookie = cookies.get('theme_dark') as string | null
    dark.value = darkCookie === '1' || darkCookie === 'true'

    const langCookie = cookies.get('i18n_lang') as string | null
    if (langCookie) lang.value = langCookie
    else delete lang.value

    const idToken = cookies.get('id_token') as string | null
    user.value = jwtDecodeAlive(idToken)
    /*  */
  }

  // compute the active account (user or org) and the role of the user in this account
  const organization = computed<OrganizationMembership | undefined>(() => {
    if (!user.value) return
    const organizationId = cookies.get('id_token_org') as string | null
    const departmentId = cookies.get('id_token_dep') as string | null
    let organization
    if (organizationId) {
      organization = user.value.organizations.find(org => org.id === organizationId)
      if (departmentId) {
        organization = user.value.organizations.find(o => o.id === organizationId && o.department === departmentId)
      }
      return organization
    }
  })
  const account = computed<Account | undefined>(() => {
    if (!user.value) return
    if (organization.value) {
      return {
        type: 'organization',
        id: organization.value.id,
        name: organization.value.name,
        department: organization.value.department,
        departmentName: organization.value.departmentName
      }
    } else {
      return { type: 'user', id: user.value.id, name: user.value.name }
    }
  })
  const accountRole = computed(() => {
    if (!user.value) return
    return organization.value ? organization.value.role : 'admin'
  })

  // trigger some full page refresh when some key session elements are changed
  // the danger of simply using reactivity is too high, data must be re-fetched, etc.
  watch(account, (account, oldAccount) => {
    if (!initialized.value) return
    if (account?.type !== oldAccount?.type || account?.id !== oldAccount?.id || account?.department !== oldAccount?.department) {
      topLocation.value?.reload()
    }
  })
  watch(lang, (lang, oldLang) => {
    if (!initialized.value) return
    if (lang !== oldLang) topLocation.value?.reload()
  })
  watch([user, organization, account, accountRole, lang, dark], ([user, organization, account, accountRole, lang, dark]) => {
    if (typeof window !== undefined) {
      window.localStorage.setItem('sd-session', JSON.stringify({ user, organization, account, accountRole, lang, dark }))
    }
  })

  // login can be performed as a simple link (please use target=top) or as a function
  const loginUrl = (redirect?: string, extraParams: {[key: string]: string} = {}, immediateRedirect?: true) => {
    // login can also be used to redirect user immediately if he is already logged
    if (redirect && user.value && immediateRedirect) return redirect
    if (!redirect && topLocation.value) redirect = topLocation.value.href
    let url = `${options.value.directoryUrl}/login?redirect=${encodeURIComponent(redirect ?? '')}`
    Object.keys(extraParams).filter(key => ![null, undefined, ''].includes(extraParams[key])).forEach((key) => {
      url += `&${key}=${encodeURIComponent(extraParams[key])}`
    })
    return url
  }
  const login = (redirect?: string, extraParams: {[key: string]: string} = {}, immediateRedirect?: true) => {
    return goTo(loginUrl(redirect, extraParams, immediateRedirect))
  }

  const switchOrganization = (org: string, dep: string) => {
    if (org) cookies.set('id_token_org', org)
    else cookies.remove('id_token_org')
    if (org) cookies.set('id_token_dep', dep)
    else cookies.remove('id_token_dep')
    readCookies()
  }

  const setAdminMode = async (adminMode: boolean, redirect?: string) => {
    if (adminMode) {
      const params: {[key: string]: string} = { adminMode: 'true' }
      if (user.value) params.email = user.value.email
      const url = loginUrl(redirect, params, true)
      goTo(url)
    } else {
      await ofetch(`${options.value.directoryUrl}/api/auth/adminmode`, { method: 'DELETE' })
      readCookies()
    }
  }

  /* return {
    initialized,
    init,
    user,
    organization,
    account,
    accountRole,
    lang,
    dark,
    loginUrl,
    login,
    switchOrganization,
    setAdminMode,
    topLocation
  } */
  return <Session>{ user, account }
})
