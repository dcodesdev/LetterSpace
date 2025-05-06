import { replacePlaceholders } from "./placeholder-parser"
import { describe, it, expect } from "vitest"

describe("replacePlaceholders", () => {
  it("should replace a single placeholder", () => {
    const template = "Hello {{subscriber.name}}!"
    const data = { "subscriber.name": "John" }
    expect(replacePlaceholders(template, data)).toBe("Hello John!")
  })

  it("should replace multiple placeholders", () => {
    const template = "Order for {{subscriber.name}} from {{organization.name}}."
    const data = {
      "subscriber.name": "Alice",
      "organization.name": "Org Inc",
    }
    expect(replacePlaceholders(template, data)).toBe(
      "Order for Alice from Org Inc."
    )
  })

  it("should handle templates with no placeholders", () => {
    const template = "This is a static string."
    const data = { "subscriber.name": "Bob" }
    expect(replacePlaceholders(template, data)).toBe("This is a static string.")
  })

  it("should handle empty data", () => {
    const template = "Hello {{subscriber.name}}!"
    const data = {}
    expect(replacePlaceholders(template, data)).toBe(
      "Hello {{subscriber.name}}!"
    )
  })

  it("should handle empty template string", () => {
    const template = ""
    const data = { "subscriber.name": "Eve" }
    expect(replacePlaceholders(template, data)).toBe("")
  })

  it("should handle placeholders with special characters in keys", () => {
    const template = "Link: {{unsubscribe_url}}"
    const data = { unsubscribe_url: "http://example.com/unsubscribe" }
    expect(replacePlaceholders(template, data)).toBe(
      "Link: http://example.com/unsubscribe"
    )
  })

  it("should replace all occurrences of a placeholder", () => {
    const template = "Hi {{subscriber.name}}, welcome {{subscriber.name}}."
    const data = { "subscriber.name": "Charlie" }
    expect(replacePlaceholders(template, data)).toBe(
      "Hi Charlie, welcome Charlie."
    )
  })

  it("should not replace partial matches", () => {
    const template = "Hello {{subscriber.name}} and {{subscriber.names}}"
    const data = { "subscriber.name": "David" }
    expect(replacePlaceholders(template, data)).toBe(
      "Hello David and {{subscriber.names}}"
    )
  })

  it("should correctly replace various types of placeholders", () => {
    const template =
      "Email: {{subscriber.email}}, Campaign: {{campaign.name}}, Org: {{organization.name}}, Unsub: {{unsubscribe_url}}, Web: {{web_version_url}}, Date: {{current_date}}"
    const data = {
      "subscriber.email": "test@example.com",
      "campaign.name": "Newsletter Q1",
      "organization.name": "MyCompany",
      unsubscribe_url: "domain.com/unsub",
      web_version_url: "domain.com/web",
      current_date: "2024-01-01",
    }
    expect(replacePlaceholders(template, data)).toBe(
      "Email: test@example.com, Campaign: Newsletter Q1, Org: MyCompany, Unsub: domain.com/unsub, Web: domain.com/web, Date: 2024-01-01"
    )
  })

  it("should handle data with undefined values gracefully", () => {
    const template = "Hello {{subscriber.name}} and {{campaign.name}}!"
    const data = {
      "subscriber.name": "DefinedName",
      "campaign.name": undefined,
    } as { [key: string]: string | undefined } // Added type assertion for clarity
    expect(replacePlaceholders(template, data)).toBe(
      "Hello DefinedName and {{campaign.name}}!"
    )
  })

  it("should replace placeholders with leading spaces inside braces", () => {
    const template = "Hello {{ subscriber.name }}!"
    const data = { "subscriber.name": "SpacedJohn" }
    expect(replacePlaceholders(template, data)).toBe("Hello SpacedJohn!")
  })

  it("should replace placeholders with trailing spaces inside braces", () => {
    const template = "Hello {{subscriber.name   }}!"
    const data = { "subscriber.name": "SpacedAlice" }
    expect(replacePlaceholders(template, data)).toBe("Hello SpacedAlice!")
  })

  it("should replace placeholders with leading and trailing spaces inside braces", () => {
    const template = "Hello {{  subscriber.name  }}!"
    const data = { "subscriber.name": "SpacedBob" }
    expect(replacePlaceholders(template, data)).toBe("Hello SpacedBob!")
  })

  it("should replace multiple placeholders with various spacing", () => {
    const template =
      "Hi {{subscriber.name}}, welcome {{ organization.name   }}. Date: {{current_date}}."
    const data = {
      "subscriber.name": "SpacedEve",
      "organization.name": "Org Spaced Inc.",
      current_date: "2024-02-20",
    }
    expect(replacePlaceholders(template, data)).toBe(
      "Hi SpacedEve, welcome Org Spaced Inc.. Date: 2024-02-20."
    )
  })
})
