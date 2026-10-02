import { describe, expect, it } from "vitest"
import { escapeHtml } from "./escape-html"

describe("escapeHtml", () => {
  it("escapes &, <, >, double and single quotes", () => {
    expect(escapeHtml(`<b>Bob</b> & "Al's"`)).toBe(
      "&lt;b&gt;Bob&lt;/b&gt; &amp; &quot;Al&#39;s&quot;"
    )
  })

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("Jane Doe")).toBe("Jane Doe")
  })
})
