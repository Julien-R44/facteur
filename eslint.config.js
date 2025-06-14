import { julr } from '@julr/tooling-configs/eslint'

export default await julr({
  rules: {
    'unicorn/custom-error-definition': 'off',
  },
})
