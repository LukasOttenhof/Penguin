# Builds and runs apps/api. apps/web (a Vite frontend) isn't part of this
# image — it wants static hosting, not a long-running Node process.

FROM node:22-bookworm AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate

# Manifests only, first — lets Docker cache the install layer separately from
# source changes. pnpm needs every workspace member's package.json present
# (even ones we won't build) to validate the lockfile against the full
# workspace shape declared in pnpm-workspace.yaml.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/shared/package.json ./apps/shared/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY apps/shared ./apps/shared
RUN pnpm exec turbo run build --filter=api

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/shared/package.json ./apps/shared/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --prod --filter=api...

COPY --from=builder /app/apps/api/dist ./apps/api/dist

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
