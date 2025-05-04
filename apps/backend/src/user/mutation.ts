import { z } from "zod"
import { publicProcedure } from "../trpc"
import { prisma } from "../utils/prisma"
import { comparePasswords, generateToken, hashPassword } from "../utils/auth"
import { TRPCError } from "@trpc/server"

const signUpSchema = z.object({
  email: z.string().email().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
  name: z.string().min(1, "Name is required"),
})

export const signup = publicProcedure
  .input(signUpSchema)
  .mutation(async ({ input }) => {
    const { email, password, name } = input

    if (await prisma.user.count()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Bad request",
      })
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    })

    if (existingUser) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `User with email ${email} already exists`,
      })
    }

    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        pwdVersion: true,
      },
    })

    const token = generateToken(user.id, user.pwdVersion)

    return {
      token,
    }
  })

export const login = publicProcedure
  .input(
    z.object({
      email: z.string().email().min(1, "Email is required"),
      password: z.string().min(1, "Password is required"),
    })
  )
  .mutation(async ({ input }) => {
    const { email, password } = input

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        pwdVersion: true,
        UserOrganizations: true,
      },
    })

    if (!user) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Invalid credentials",
      })
    }

    const isValidPassword = await comparePasswords(password, user.password)
    if (!isValidPassword) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Invalid credentials",
      })
    }

    const token = generateToken(user.id, user.pwdVersion)

    return {
      token,
      user,
    }
  })
