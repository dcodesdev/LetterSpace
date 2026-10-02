import { config } from "dotenv"
import { beforeEach } from "vitest"
import resetDb from "./reset-db"

config({ path: ".env.test" })

beforeEach(async () => {
  await resetDb()
})
