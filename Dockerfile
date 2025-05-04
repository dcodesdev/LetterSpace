FROM oven/bun:1

RUN apt-get update -y && apt-get install -y openssl
RUN bun i -g pnpm@10.3.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY apps/backend/package.json ./apps/backend/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

COPY . .

RUN cd apps/backend && pnpm run generate

ENV NODE_ENV=production

# There is a flaky bug that vite build hands forever
RUN cd apps/web && for i in 1 2 3; do timeout 180s pnpm run build && exit 0; echo "Retry $i..."; sleep 5; done; exit 1

EXPOSE 5000
WORKDIR /app/apps/backend
ENTRYPOINT ["./entrypoint.sh"]