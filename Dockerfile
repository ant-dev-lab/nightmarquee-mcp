# Built by Glama to run its security and quality checks, and to let users deploy
# the server from the directory. Not used by `npx nightmarquee`, which is how
# almost everyone actually installs this.
#
# Multi-stage so the shipped layer carries no toolchain and no TypeScript source.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Runs unprivileged. The only thing the server writes is the credential file the
# sign-in tool creates, so point it somewhere this user owns.
USER node
ENV NIGHTMARQUEE_HOME=/home/node/.nightmarquee

# A stdio server: no ports, no daemon. It speaks JSON-RPC on stdin/stdout.
CMD ["node", "dist/index.js"]
