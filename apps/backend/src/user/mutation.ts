import { z } from "zod"
import { publicProcedure, authProcedure } from "../trpc"
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

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Invalid email address."),
})

export const updateProfile = authProcedure
  .input(updateProfileSchema)
  .mutation(async ({ ctx, input }) => {
    const { name, email } = input
    const userId = ctx.user.id

    if (email) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
      })
      if (currentUser?.email !== email) {
        const existingUserWithEmail = await prisma.user.findFirst({
          where: {
            email: email,
            id: { not: userId },
          },
        })
        if (existingUserWithEmail) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email address is already in use by another account.",
          })
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        UserOrganizations: {
          include: {
            Organization: true,
          },
        },
      },
    })

    return { user: updatedUser }
  })

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
})

export const changePassword = authProcedure
  .input(changePasswordSchema)
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id
    const { currentPassword, newPassword } = input

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, pwdVersion: true },
    })

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found." })
    }

    const isValidPassword = await comparePasswords(
      currentPassword,
      user.password
    )
    if (!isValidPassword) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Incorrect current password.",
      })
    }

    const hashedNewPassword = await hashPassword(newPassword)
    const newPwdVersion = (user.pwdVersion || 0) + 1

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        pwdVersion: newPwdVersion,
      },
    })

    const newToken = generateToken(userId, newPwdVersion)

    return { success: true, token: newToken }
  })
