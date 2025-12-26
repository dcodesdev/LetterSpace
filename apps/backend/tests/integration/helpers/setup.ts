import { config } from "dotenv"
config({ path: ".env.test" })
import { beforeEach } from "vitest"
import { execSync } from "child_process"

execSync("prisma migrate deploy", { stdio: "ignore" })

beforeEach(async () => {
  // await resetDb()
})
