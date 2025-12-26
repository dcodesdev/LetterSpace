import { router } from "../trpc"
import { changePassword, login, signup, updateProfile } from "./mutation"
import { isFirstUser, me } from "./query"

export const userRouter = router({
  signup,
  login,
  me,
  isFirstUser,
  updateProfile,
  changePassword,
})
