import { PrismaClient } from "../../prisma/client"

export const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
      pwdVersion: true,
    },
    apiKey: {
      key: true,
    },
  },
}).$extends({
  query: {
    subscriber: {
      $allOperations({ args, query }) {
        if (
          "data" in args &&
          "email" in args.data &&
          typeof args.data.email === "string"
        ) {
          args.data.email = args.data.email.toLowerCase()
        }
        return query(args)
      },
    },
  },
})
