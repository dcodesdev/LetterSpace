import { app } from "@src/app"
import superTest from "supertest"

export const request = superTest(app)
