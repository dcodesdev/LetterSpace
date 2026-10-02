import { generateToken } from "@src/utils/auth"
import { createUser } from "./factories"

export const createAuthedUser = async () => {
  const { user, apiKey, orgId } = await createUser()

  return {
    user,
    orgId,
    apiKey,
    token: generateToken(user.id, user.pwdVersion),
  }
}
