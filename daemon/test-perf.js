const lines = []
for (let i = 0; i < 10000000; i++) {
  lines.push(`{"type":"${Math.random() > 0.5 ? 'user' : 'organization'}","id":"${Math.round(Math.random() * 10000)}"}`)
}

gc()

const extractParse = (line) => {
  const o = JSON.parse(line)
  return o.id
}

// cf https://stackoverflow.com/a/14350155
const typeRegexp = /"type":"((\\"|[^"])*)"/i
const idRegexp = /"id":"((\\"|[^"])*)"/i

const extractRegexp = (line) => {
  // const type = line.match(typeRegexp)[1]
  // const id = line.match(idRegexp)[1]
  const id = idRegexp.exec(line)[1]
  return id
}

console.time('extract')
for (const line of lines) {
  // extractParse(line)
  extractRegexp(line)
}

console.log(Math.round(process.memoryUsage().heapUsed / 1024 / 1024))
gc()

console.timeEnd('extract')
