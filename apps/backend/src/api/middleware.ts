import express, { NextFunction } from "express"
import { prisma } from "../utils/prisma"

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
      select: { id: true, Organization: true },
    })

    if (!keyRecord) {
      res.status(401).json({ error: "Invalid API Key" })
      return
    }

    // Update lastUsed timestamp asynchronously, don't await
    prisma.apiKey
      .update({
        where: { id: keyRecord.id },
        data: { lastUsed: new Date() },
      })
      .catch((updateError) => {
        // Log the error but don't block the request
        console.error(
          "Failed to update API key lastUsed timestamp",
          updateError
        )
      })

    req.organization = keyRecord.Organization
    next()
  } catch (error) {
    console.error("Error validating API key", error)
    res.status(500).json({ error: "Server error" })
  }
}
