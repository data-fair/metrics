import Vue from 'vue'
import Vuex from 'vuex'
import { sessionStoreBuilder } from '@koumoul/sd-vue/src'

Vue.use(Vuex)

export default () => {
  return new Vuex.Store({
    modules: {
      session: sessionStoreBuilder()
    },
    state: {},
    mutations: {
      setAny (state, params) {
        Object.assign(state, params)
      }
    },
    actions: {}
  })
}
