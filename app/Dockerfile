FROM node:23-alpine AS dependencies
WORKDIR /usr/src/app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm i --only=production || (cat /root/.npm/_logs/*-debug.log && exit 1)

FROM node:23-alpine AS builder
WORKDIR /usr/src/app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm i || (cat /root/.npm/_logs/*-debug.log && exit 1)
COPY . .
RUN npm run build

FROM node:23-alpine AS production
WORKDIR /usr/src/app

LABEL org.opencontainers.image.version="1.0.0" \
    org.opencontainers.image.authors="Rafael Hueb" \
    org.opencontainers.image.description="BFF File Handler Service"

RUN apk add --no-cache curl tini \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001 \
    && chown -R nestjs:nodejs /usr/src/app

COPY --from=builder --chown=nestjs:nodejs /usr/src/app/dist ./dist
COPY --from=dependencies --chown=nestjs:nodejs /usr/src/app/node_modules ./node_modules
COPY package*.json ./

ENV NODE_ENV=production \
    PORT=3000

#HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
#    CMD curl -f http://localhost:${PORT}/health/check || exit 1

USER nestjs

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/main"]

EXPOSE ${PORT}