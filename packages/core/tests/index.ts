import { processCLIArgs, configure, run } from '@japa/runner'
import { expectTypeOf } from '@japa/expect-type'
import { assert } from '@japa/assert'

processCLIArgs(process.argv.slice(2))
configure({
  suites: [
    { name: 'drivers', files: ['tests/drivers/**/*.spec.ts'] },
    { name: 'unit', files: ['tests/**/*.spec.ts', '!tests/drivers/**/*.spec.ts'] },
  ],
  plugins: [assert(), expectTypeOf()],
})

run()
