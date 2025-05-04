import { prisma } from "@src/utils/prisma"

type ListOptions = {
  name: string
  organizationId: string
  description?: string
}

export const createList = async (data: ListOptions) => {
  return prisma.list.create({ data })
}
