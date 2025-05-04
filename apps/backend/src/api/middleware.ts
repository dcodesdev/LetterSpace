import { prisma } from "../utils/prisma"
import express, { NextFunction } from "express"

export const authenticateApiKey = async (
  req: express.Request,
  res: express.Response,
  next: NextFunction
) => {
  const apiKey = req.header("x-api-key")
  if (!apiKey) {
    res.status(401).json({ error: "Missing API Key" })
    return
  }

  try {
    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      select: { Organization: true },
    })

    if (!keyRecord) {
      res.status(401).json({ error: "Invalid API Key" })
      return
    }

    req.organization = keyRecord.Organization
    next()
  } catch (error) {
    console.error("Error validating API key", error)
    res.status(500).json({ error: "Server error" })
  }
}
