import { APP_VERSION } from "@repo/shared"

export const constants = {
  env: {
    DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL!,
    GITHUB_URL: process.env.NEXT_PUBLIC_GITHUB_URL!,
    X_URL: "https://x.com/dcodesdev",
  },
  version: APP_VERSION,
}

Object.entries(constants.env).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`${key} is not defined`)
  }
})

export default constants
