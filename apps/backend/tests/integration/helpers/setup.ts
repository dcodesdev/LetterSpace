import { execSync } from "child_process"
import { config } from "dotenv"
import { beforeEach } from "vitest"

config({ path: ".env.test" })

execSync("prisma migrate deploy", { stdio: "ignore" })

beforeEach(async () => {
  // await resetDb()
})
