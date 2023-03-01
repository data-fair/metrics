const childProcess = require('node:child_process')
const chalk = require('chalk')
const minimatch = require('minimatch')
const assert = require('assert').strict

const processWrapper = (name, cmd) => {
  const process = childProcess.spawn(cmd, { cwd: '..', shell: true })
  let buffer = []
  process.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n').map(l => l.trim())
    for (const line of lines) {
      buffer.push(line)
      checkWaitFor()
      console.log(chalk.blue(`\t>${name}> ${line}`))
    }
  })
  process.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n').map(l => l.trim())
    for (const line of lines) {
      buffer.push(line)
      checkWaitFor()
      console.log(chalk.red(`\t>${name}> ${line}`))
    }
  })

  let waitFor = null

  const checkWaitFor = () => {
    if (waitFor) {
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer[i]
        if (minimatch(line, waitFor.pattern)) {
          if (!waitFor.keepBuffer) buffer = buffer.slice(i, -1)
          waitFor.resolve(line)
          waitFor = null
        }
      }
    }
  }

  return {
    process,
    waitFor: (pattern, keepBuffer = false, timeout = 4000) => {
      return new Promise((resolve, reject) => {
        waitFor = { pattern, keepBuffer, resolve, reject }
        checkWaitFor()
        setTimeout(() => reject(new Error('process.waitFor timeout : ' + pattern)), timeout)
      })
    }
  }
}

describe('daily-api-metrics', () => {
  let daemon
  before('run daemon', async () => {
    childProcess.execSync('docker compose restart -t 0 nginx')
    daemon = processWrapper('daemon', 'docker compose up --no-build --no-log-prefix --no-color daemon')
    await daemon.waitFor('init queue*', true)
    await daemon.waitFor('socket was created', true)
  })
  after('shutdown daemon', async () => {
    childProcess.exec('docker compose stop daemon')
    await daemon.waitFor('test/stop-main')
  })

  it('should be collected by daemon', async function () {
    const dataset = (await globalThis.ax.superadmin.post('/data-fair/api/v1/datasets', {
      isRest: true,
      title: 'd1',
      schema: [{ key: 'prop1', type: 'string' }]
    })).data
    await globalThis.ws.superadmin.waitForJournal(dataset.id, 'finalize-end')
    await globalThis.ax.superadmin.get(`/data-fair/api/v1/datasets/${dataset.id}/lines`)
    const rawLine = JSON.parse((await daemon.waitFor('test/raw-line/*')).replace('test/raw-line/', ''))
    assert.equal(rawLine.h, 'localhost')
    assert.deepEqual(JSON.parse(rawLine.o), { type: 'user', id: 'superadmin' })
    await daemon.waitFor('test/bulk/1')
  })
})
