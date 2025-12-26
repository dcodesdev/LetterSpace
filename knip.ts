import type { KnipConfig } from "knip"

export default {
  workspaces: {
    "apps/web": {},
    "apps/docs": {
      entry: [
        "src/app/**/_meta.{ts,js}",
        "src/app/**/page.mdx",
        "src/mdx-components.tsx",
      ],
    },
    "apps/backend": {
      ignore: ["prisma/client/**/*"],
    },
  },
} satisfies KnipConfig
