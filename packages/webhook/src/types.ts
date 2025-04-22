export type WebhookOptions<WebhookNames extends string> = (
  | { webhookUrl: string }
  | { webhooks: Record<WebhookNames, string> }
) & { name: string }

export type WebhookTargets<Options extends WebhookOptions<any>> = Options extends {
  webhooks: infer Webhooks
}
  ? { [key in keyof Webhooks]?: boolean }
  : { webhookUrl: string }
