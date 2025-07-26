export type HTTPMethod = 'get' | 'post' | 'put' | 'patch'

export interface HTTPRequest {
  body: Record<string, any>
  params: Record<string, any>
  query: Record<string, any>
  headers: Record<string, string | undefined>
}

export interface HTTPResponse {
  status: number
  body: Record<string, any>
}

export interface RouteDefinition {
  method: HTTPMethod
  route: string
  handler: (request: HTTPRequest) => Promise<HTTPResponse>
}

export interface ServerAdapter {
  setRoutes(routes: RouteDefinition[]): void
}
