# Testing Patterns Reference

Guidelines for generating test files for channels.

## Test File Location

Tests should be placed in `packages/core/tests/{channel-name}.spec.ts`

## Test Framework

The project uses Japa test runner. Import pattern:

```typescript
import { test } from '@japa/runner'
```

## Message Class Tests

Focus on testing the Message class fluent API and serialization:

```typescript
import { test } from '@japa/runner'

import { XxxMessage } from '../src/channels/xxx/message.js'

test.group('XxxMessage', () => {
  test('creates message with static create()', ({ assert }) => {
    const message = XxxMessage.create()
    assert.instanceOf(message, XxxMessage)
  })

  test('chains setters correctly', ({ assert }) => {
    const message = XxxMessage.create()
      .setTitle('Test Title')
      .setBody('Test Body')

    assert.instanceOf(message, XxxMessage)
  })

  test('serializes with all properties', ({ assert }) => {
    const message = XxxMessage.create()
      .setTitle('Test Title')
      .setBody('Test Body')
      .setData({ key: 'value' })

    const serialized = message.serialize()

    assert.equal(serialized.title, 'Test Title')
    assert.equal(serialized.body, 'Test Body')
    assert.deepEqual(serialized.data, { key: 'value' })
  })

  test('serializes without optional properties', ({ assert }) => {
    const message = XxxMessage.create()
      .setTitle('Test Title')

    const serialized = message.serialize()

    assert.equal(serialized.title, 'Test Title')
    assert.isUndefined(serialized.body)
  })

  test('addData appends to existing data', ({ assert }) => {
    const message = XxxMessage.create()
      .setData({ key1: 'value1' })
      .addData('key2', 'value2')

    const serialized = message.serialize()

    assert.deepEqual(serialized.data, { key1: 'value1', key2: 'value2' })
  })
})
```

## Webhook Message Tests

For messages extending `WebhookMessage`, also test parent class functionality:

```typescript
import { test } from '@japa/runner'

import { XxxMessage } from '../src/channels/xxx/message.js'

test.group('XxxMessage (Webhook)', () => {
  test('creates message with static create()', ({ assert }) => {
    const message = XxxMessage.create()
    assert.instanceOf(message, XxxMessage)
  })

  test('includes webhook base properties in serialization', ({ assert }) => {
    const message = XxxMessage.create()
      .setHeader('Authorization', 'Bearer token')
      .setHeader('Content-Type', 'application/json')
      .setText('Hello World')

    const serialized = message.serialize()

    assert.equal(serialized.headers['Authorization'], 'Bearer token')
    assert.equal(serialized.headers['Content-Type'], 'application/json')
    assert.equal(serialized.body.text, 'Hello World')
  })

  test('includes query parameters', ({ assert }) => {
    const message = XxxMessage.create()
      .setQueryParameters({ wait: 'true', thread_id: '123' })
      .setText('Test')

    const serialized = message.serialize()

    assert.deepEqual(serialized.queryParameters, { wait: 'true', thread_id: '123' })
  })
})
```

## Channel Integration Tests

For testing the channel class with the Facteur system:

```typescript
import { test } from '@japa/runner'
import EventEmitter from 'node:events'
import { pEvent } from 'p-event'

import { Facteur } from '../src/index.js'
import { xxxChannel } from '../src/channels/xxx/channel.js'

// Create a test notification class
class TestNotification {
  asXxxMessage() {
    return XxxMessage.create().setTitle('Test').setBody('Body')
  }
}

test.group('XxxChannel', () => {
  test('sends notification successfully', async ({ assert }) => {
    // Mock the SDK or use a test server
    const channel = xxxChannel({ apiKey: 'test-key' })

    // Test implementation depends on whether you can mock the external API
  })
})
```

## Test Helpers

The project has test helpers in `packages/core/tests/helpers/index.js`:

```typescript
import { FakeNotification, testProvider } from './helpers/index.js'
```

- `testProvider()` - Creates a mock channel provider for testing
- `FakeNotification` - A test notification class

## Assertion Patterns

Common assertions used in the project:

```typescript
// Instance checking
assert.instanceOf(message, XxxMessage)

// Equality
assert.equal(value, expected)
assert.deepEqual(object, expectedObject)

// Existence
assert.isDefined(value)
assert.isUndefined(value)

// Type checking
assert.isArray(value)
assert.isObject(value)
```

## Test Naming Conventions

- Use descriptive test names that explain the behavior being tested
- Start with verb: "creates", "serializes", "chains", "includes", "handles"
- Focus on behavior, not implementation details

Examples:
- "creates message with static create()"
- "serializes with all properties"
- "handles optional properties correctly"
- "chains setters and returns instance"
