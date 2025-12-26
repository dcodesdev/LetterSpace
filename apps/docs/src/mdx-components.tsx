import { useMDXComponents as getThemeComponents } from "nextra-theme-docs"
import "./app/globals.css"
import { WebhookEventsReference } from "./components"

const themeComponents = getThemeComponents()

export function useMDXComponents(
  components: Record<string, React.ComponentType<unknown>>
) {
  return {
    ...themeComponents,
    WebhookEventsReference,
    ...components,
  }
}
