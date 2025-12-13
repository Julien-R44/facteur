import { processCLIArgs, configure, run } from '@japa/runner'
import { expectTypeOf } from '@japa/expect-type'
import { assert } from '@japa/assert'

processCLIArgs(process.argv.slice(2))
configure({
  files: ['tests/**/*.spec.ts'],
  plugins: [assert(), expectTypeOf()],
})

run()
