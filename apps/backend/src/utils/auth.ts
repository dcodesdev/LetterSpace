import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { env } from "../constants"

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function comparePasswords(
  password: string,
  hashedPassword: string
) {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: string, version: number) {
  return jwt.sign({ id: userId, version }, env.JWT_SECRET, { expiresIn: "30d" })
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET)
}
