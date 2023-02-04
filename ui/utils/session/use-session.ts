import { ref } from 'vue'
import { useCookies } from '@vueuse/integrations/useCookies'
// import { useFetch } from '@vueuse/core'
// import jwtDecode from 'jwt-decode'

interface User {
  name: string,
  id: string
}

/* function jwtDecodeAlive (jwt: string) {
  if (!jwt) return null
  const decoded = jwtDecode<any>(jwt)
  if (!decoded) { return null }
  const now = Math.ceil(Date.now().valueOf() / 1000)
  if (typeof decoded.exp !== 'undefined' && decoded.exp < now) {
    console.error(`token expired: ${decoded.exp}<${now},  ${JSON.stringify(decoded)}`)
    return null
  }
  if (typeof decoded.nbf !== 'undefined' && decoded.nbf > now) {
    console.warn(`token not yet valid: ${decoded.nbf}>${now}, ${JSON.stringify(decoded)}`)
    // do not return null here, this is probably a false flag due to a slightly mismatched clock
    // return null
  }
  return decoded
} */

function goTo (url: string) {
  try {
    window.top!.location.href = url
  } catch (err) {
    window.location.href = url
  }
}

export const useSession = (directoryUrl: string) => {
  if (directoryUrl.endsWith('/')) { directoryUrl = directoryUrl.slice(0, -1) }
  const cookies = useCookies(['id_token', 'id_token_org'])
  cookies.addChangeListener(() => {
    console.log('update cookie', cookies.get('id_token'))
  })
  const user = ref<User>({ id: 'id', name: 'Alban' })
  setTimeout(() => {
    user.value = { id: 'id', name: 'test' }
  }, 1000)

  const loginUrl = directoryUrl + '/login'
  const login = () => goTo(loginUrl)

  return {
    loginUrl,
    login,
    user
  }
}
