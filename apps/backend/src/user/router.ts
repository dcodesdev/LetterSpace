import { router } from "../trpc"
import { login, signup, updateProfile } from "./mutation"
import { me, isFirstUser } from "./query"

export const userRouter = router({
  signup,
  login,
  me,
  isFirstUser,
  updateProfile,
})
