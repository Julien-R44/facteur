import { assert } from '@japa/assert'
import { processCLIArgs, configure, run } from '@japa/runner'

processCLIArgs(process.argv.slice(2))
configure({
  suites: [{ name: 'unit', files: ['tests/**/*.spec.ts'] }],
  plugins: [assert()],
})

run()
