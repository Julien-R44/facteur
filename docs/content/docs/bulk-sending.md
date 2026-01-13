# Bulk Sending

When sending notifications to many recipients, Facteur provides options to control performance, error handling, and progress tracking.

## Basic usage

Pass an array of recipients to the `to` method to send notifications in bulk.

```typescript
const users = await User.all()

await facteur
  .notification(WelcomeNotification)
  .to(users)
  .send()
```

## Chunking and concurrency

For large recipient lists, you can control how notifications are processed.

```typescript
await facteur
  .notification(WelcomeNotification)
  .to(users)
  .chunkSize(100)    // Process 100 recipients at a time
  .concurrency(5)    // Max 5 concurrent sends per chunk
  .send()
```

## Error handling

By default, Facteur stops on the first error. Use `continueOnError` to process all recipients regardless of individual failures.

```typescript
const result = await facteur
  .notification(WelcomeNotification)
  .to(users)
  .continueOnError()
  .send()

console.log(`Success: ${result.success}, Failed: ${result.failed}`)
```

## Retries and timeout

Configure automatic retries with exponential backoff and per-operation timeouts.

```typescript
await facteur
  .notification(WelcomeNotification)
  .to(users)
  .retries(3)        // Retry up to 3 times on failure
  .timeout('30s')    // Timeout after 30 seconds
  .send()
```

## Progress tracking

Track progress for long-running bulk operations.

```typescript
await facteur
  .notification(WelcomeNotification)
  .to(users)
  .onProgress((completed, total) => {
    console.log(`Progress: ${completed}/${total}`)
  })
  .send()
```

## Driver batching

Some channels like FCM or Expo support native batch APIs. Enable driver batching to group messages by channel and use these optimized APIs when available.

```typescript
await facteur
  .notification(PushNotification)
  .to(users)
  .useDriverBatching()
  .send()
```

## Reference

| Method | Description |
|--------|-------------|
| `chunkSize(n)` | Number of recipients per chunk (default: unlimited) |
| `concurrency(n)` | Max concurrent operations per chunk (default: 10) |
| `continueOnError()` | Continue on individual failures instead of stopping |
| `retries(n)` | Number of retries with exponential backoff |
| `timeout(duration)` | Per-operation timeout ('30s', '1m', etc.) |
| `onProgress(callback)` | Progress callback `(completed, total) => void` |
| `useDriverBatching()` | Use channel's native batch API when available |
| `throwOnError()` | Throw an exception on any failure |
