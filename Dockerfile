# Keep this tag in sync with .bun-version
FROM oven/bun:1.3.14-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN bun build src/index.ts --outdir dist --target bun


FROM oven/bun:1.3.14-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/dist ./dist

USER bun

EXPOSE 3001

CMD ["bun", "dist/index.js"]
