import mitt from 'mitt'

function inIframe () {
  try {
    return window.self !== window.top
  } catch (e) {
    return false
  }
}

interface Notification {
  type?: string
  msg: string,
  error?: any,
  errorMsg?: string
}

type Events = {
  'notification': Notification
};

export default defineNuxtPlugin(() => {
  const emitter = mitt<Events>()

  // this UI is made to be always embedded
  // no need for a notification component, just forward to parent
  emitter.on('notification', (notif) => {
    if (typeof notif === 'string') notif = { msg: notif }
    if (notif.error) {
      notif.type = 'error'
      notif.errorMsg = (notif.error.response && (notif.error.response.data || notif.error.response.status)) || notif.error.message || notif.error
    }
    notif.type = notif.type || 'default'
    if (inIframe()) {
      window.top?.postMessage({ vIframe: true, uiNotification: notif }, '*')
    } else {
      console.log('notification', notif)
    }
  })

  return {
    provide: {
      bus: {
        emit: emitter.emit,
        on: emitter.on,
        off: emitter.off
      }
    }
  }
})
