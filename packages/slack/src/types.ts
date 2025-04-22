export type SlackOptions<WebhooksNames extends string> =
  | { webhooks?: { [key in WebhooksNames]: string } }
  | { webhookUrl: string }

export type SlackTargets<Options extends SlackOptions<any>> = Options extends {
  webhooks: infer Webhooks
}
  ? { [key in keyof Webhooks]?: boolean }
  : { webhookUrl: string }
