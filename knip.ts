import type { KnipConfig } from "knip"

export default {
  workspaces: {
    "apps/web": {},
    "apps/docs": {
      entry: ["src/app/**/_meta.{ts,js}", "src/app/**/page.mdx"],
      // TODO: knip's built-in MDX compiler doesn't resolve path aliases like @/components
      // so imports from MDX files aren't traced. Ignoring components for now.
      ignore: ["src/components/**"],
    },
    "apps/backend": {
      ignore: ["prisma/client/**/*"],
    },
  },
} satisfies KnipConfig
