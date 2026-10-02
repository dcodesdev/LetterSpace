import type express from "express"

type FakeRequestOptions = {
  body?: unknown
  headers?: Record<string, string>
  query?: Record<string, unknown>
  params?: Record<string, string>
}

/**
 * The webhook sandbox modules only read `body`, `headers`, `query` and `params`
 * off the request, so a plain object is enough.
 */
export const fakeRequest = (options: FakeRequestOptions = {}) =>
  ({
    body: options.body ?? {},
    headers: options.headers ?? {},
    query: options.query ?? {},
    params: options.params ?? {},
  }) as unknown as express.Request
