import { faker } from "@faker-js/faker"
import { prisma } from "@src/utils/prisma"

type TemplateOptions = {
  organizationId: string
  name?: string
  description?: string
  content?: string
}

export const createTemplate = async (data: TemplateOptions) => {
  return prisma.template.create({
    data: {
      name: data.name ?? faker.word.noun(),
      description: data.description,
      content: data.content ?? "<p>Hello {{subscriber.email}}</p>",
      organizationId: data.organizationId,
    },
  })
}
