FROM node:18-bullseye-slim AS base

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY . .
RUN npx prisma generate

RUN mkdir -p uploads logs
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
