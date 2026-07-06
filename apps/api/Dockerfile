# Starnes API — deployable to Render / Railway / Fly.io (demo/staging) or the
# client's ECS Fargate / Azure Container Apps (production, per architecture §7).
FROM node:22-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN npm ci --workspaces --include-workspace-root --omit=optional
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @starnes/shared && npm run build -w @starnes/api

FROM node:22-slim
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/packages/shared packages/shared
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/apps/api/package.json apps/api/
COPY apps/api/src/database/migrations apps/api/dist/database/migrations
EXPOSE 3001
# Runs migrations then starts the API. Requires: DATABASE_URL, HITL_TOKEN_SIGNING_KEY, CORS_ALLOWLIST, PORT
CMD ["sh", "-c", "node apps/api/dist/database/migrate.js && node apps/api/dist/main.js"]
