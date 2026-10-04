# Bulk Sending

When sending notifications to many recipients, Facteur provides options to control performance, error handling, and progress tracking.

## Basic usage

Pass an array or async iterable of recipients to `to()`. The current implementation collects an async iterable into an array before sending: it is not a bounded-memory stream. Chunking controls processing, not initial collection.

```typescript
const users = await User.all()

await facteur.notification(WelcomeNotification).to(users).send()
```

## Chunking and concurrency

For large recipient lists, you can control how notifications are processed.

```typescript
await facteur
  .notification(WelcomeNotification)
  .to(users)
  .chunkSize(100) // Process 100 recipients at a time
  .concurrency(5) // Max 5 concurrent sends per chunk
  .send()
```

## Error handling

By default, a recipient failure rejects the bulk send; already-started operations may still complete. Use `continueOnError()` to process the remaining recipients. Use `.throwOnError(false)` to return per-channel failures rather than rejecting each recipient.

```typescript
const result = await facteur.notification(WelcomeNotification).to(users).continueOnError().send()

console.log(`Success: ${result.success}, Failed: ${result.failed}`)
```

## Retries and timeout

In normal bulk mode, builder retries/timeouts apply to the entire recipient operation, including hooks and every channel. Global/per-channel retry configuration still applies to individual channel sends. A retry may resend an already successful channel, so design for duplicates.

```typescript
await facteur
  .notification(WelcomeNotification)
  .to(users)
  .retries(3) // Retry up to 3 times on failure
  .timeout('30s') // Timeout after 30 seconds
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
await facteur.notification(PushNotification).to(users).useDriverBatching().send()
```

## Reference

In driver batch mode:

- Concurrency controls recipient preparation; channels send their grouped batches independently.
- Builder retries/timeouts wrap each channel's grouped send operation, not individual recipients. Returned failed batch items are not automatically retried.
- Progress is reported per completed chunk rather than per recipient.
- `afterSend()` and notification-level events are not run; message-level events still fire.
- Channels without a batch API fall back to individual sends. `.disableDriverBatch()` forces this fallback while retaining batch-mode orchestration.
- `continueOnError()` handles recipient preparation failures; batch item failures are returned as channel results. `.throwOnError()` is not applied to returned batch item failures.

For real delivery, `success`/`failed` count channel deliveries, not users. A failed recipient caught by `continueOnError()` contributes one failure without channel details. A one-recipient array uses the single-send path; bulk options such as progress and driver batching do not apply.

| Method                 | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `chunkSize(n)`         | Number of recipients per chunk (default: unlimited)        |
| `concurrency(n)`       | Max concurrent operations per chunk (default: 10)          |
| `continueOnError()`    | Continue on individual failures instead of stopping        |
| `retries(n)`           | Number of retries with exponential backoff                 |
| `timeout(duration)`    | Per-operation timeout ('30s', '1m', etc.)                  |
| `onProgress(callback)` | Progress callback `(completed, total) => void`             |
| `useDriverBatching()`  | Use channel's native batch API when available              |
| `disableDriverBatch()` | Send individually within driver batch mode                 |
| `throwOnError(false)`  | Return channel failures in normal mode instead of throwing |
