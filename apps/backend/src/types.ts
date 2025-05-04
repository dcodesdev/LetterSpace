import { Organization } from "../prisma/client"

declare global {
  export namespace Express {
    export interface Request {
      organization: Organization
    }
  }
}
