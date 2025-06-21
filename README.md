# LetterSpace

![LetterSpace Cover](/apps/landing-page/public/cover.png)

## Open Source Self-Hosted Newsletter Platform

LetterSpace is an open source newsletter application that gives you complete control over your subscriber lists and email campaigns.

## Features

- **Full Ownership**: Self-host your newsletter infrastructure
- **Subscriber Management**: Organize and segment your audience
- **Email Campaigns**: Create and send beautiful emails
- **Analytics**: Track open rates, clicks, and subscriber growth
- **Custom Domains**: Use your own domain for professional branding
- **API Access**: Integrate with your existing tools and workflows

## Tech Stack

- NextJS
- TypeScript
- TailwindCSS
- Shadcn UI
- PostgreSQL
- TRPC
- Prisma

## Environment Variables

### Required Variables

- `JWT_SECRET` - Secret key for JWT token signing
- `DATABASE_URL` - PostgreSQL database connection string

### Optional Variables

- `WEBHOOK_MEMORY_LIMIT` - Memory limit for webhook transformer runtime in bytes (default: 16777216 = 16MB)
- `WEBHOOK_MAX_STACK_SIZE` - Maximum stack size for webhook transformer in bytes (default: 262144 = 256KB)

## Getting Started

## Deployment

Detailed deployment instructions are available in our [deployment guide](docs/deployment.md).

## Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for more details.

## License

[MIT](LICENSE)

## Support

- [Documentation](https://docs.letterspace.app)
- [GitHub Issues](https://github.com/dcodesdev/letterspace/issues)

---

Visit [letterspace.app](https://letterspace.app) for more information.
