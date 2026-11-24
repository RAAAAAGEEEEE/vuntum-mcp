# Vuntum MCP server over stdio, on the in-memory demo database (three fictitious
# robots, no Vuntum data, no network, no secret). Used by MCP directories such as
# Glama to build and inspect the server. Build: docker build -t vuntum-mcp-demo .
# Run: docker run -i --rm vuntum-mcp-demo
# Your own data: docker run -i --rm -e DATABASE_URL=postgres://... vuntum-mcp-demo
# The hosted server needs nothing: https://vuntum.com/mcp (Streamable HTTP).
FROM node:22.20-alpine AS build
WORKDIR /app
COPY server/package.json server/package-lock.json server/.npmrc ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22.20-alpine
WORKDIR /app
ENV NODE_ENV=production DATABASE_URL=demo
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY server/sql ./sql
USER node
CMD ["node", "dist/server-stdio.js"]
