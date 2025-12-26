# Development Guide

## Release Process

Use the release script to bump version and create tags:

```bash
./scripts/release.sh          # Bumps patch version (default)
./scripts/release.sh patch     # Bumps patch version
./scripts/release.sh minor     # Bumps minor version
./scripts/release.sh major     # Bumps major version
```

The script will:

1. Read current version from `package.json`
2. Bump version based on type (patch/minor/major)
3. Update `package.json` and commit the change
4. Create git tag `vx.x.x`
5. Ask for confirmation before creating tag
6. Ask for confirmation before pushing tag
7. Push tag to remote (triggers GitHub Actions workflow)

The GitHub Actions workflow (`.github/workflows/docker.yaml`) automatically:

- Builds Docker images on tag push
- Creates GitHub release using `RELEASE_NOTES.md`

## Database

### Seed Database

```bash
pnpm --filter backend prisma db seed
```

### Reset and Reseed

```bash
cd apps/backend && pnpm prisma migrate reset --force
```

## Development

### Run Dev Server

```bash
pnpm dev
```

### Prevent Email Sending in Dev

Email sending is automatically disabled in development mode (`NODE_ENV=development`):

- Cron jobs that send emails are disabled
- Mailer returns mock success responses instead of sending
