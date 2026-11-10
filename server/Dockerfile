# Vuntum MCP server, HTTP transport. Build: docker build -t vuntum-mcp .
FROM node:22.20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22.20-alpine
WORKDIR /app
ENV NODE_ENV=production MCP_HOST=0.0.0.0 MCP_PORT=3001
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3001/health || exit 1
CMD ["node", "dist/server-http.js"]
