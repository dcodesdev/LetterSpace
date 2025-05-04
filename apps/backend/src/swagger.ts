import swaggerJSDoc from "swagger-jsdoc"

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Cat Letter API",
    version: "1.0.0",
  },
}

const options = {
  swaggerDefinition,
  apis: ["./src/api/server.ts"],
}

const swaggerSpec = swaggerJSDoc(options)

export default swaggerSpec
