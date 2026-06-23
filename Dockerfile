# Dockerfile for ICSE/CBSE Project Forge
# Works with Railway, Render, Fly.io, or any Docker-capable host

FROM node:20-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
        build-essential \
            && rm -rf /var/lib/apt/lists/*

            # Install Bun
            RUN npm install -g bun

            # === Builder stage ===
            FROM base AS builder
            WORKDIR /app

            # Copy package files
            COPY package.json bun.lock* ./
            RUN bun install --frozen-lockfile

            # Copy source
            COPY . .

            # Generate Prisma client
            RUN bun run db:generate

            # Build Next.js
            RUN NODE_OPTIONS="--max-old-space-size=2048" bun run build

            # === Runner stage ===
            FROM base AS runner
            WORKDIR /app
            ENV NODE_ENV=production
            ENV NODE_OPTIONS="--max-old-space-size=1024"
            ENV PORT=3000
            ENV HOSTNAME=0.0.0.0

            # Copy standalone build
            COPY --from=builder /app/.next_user/standalone ./
            COPY --from=builder /app/.next_user/static ./.next_user/static
            COPY --from=builder /app/public ./public

            # Install Prisma CLI
            RUN bun add prisma@6.11.1

            # Copy Prisma files for DB access
            COPY --from=builder /app/prisma ./prisma
            COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
            COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

            # Create data directory for SQLite
            RUN mkdir -p /app/data /app/public/generated /app/db

            # Copy ingestion scripts
            COPY --from=builder /app/scripts ./scripts
            COPY --from=builder /app/upload ./upload

            EXPOSE 3000

            # Start script: push schema + start server
            CMD [ "sh", "-c", "bun run prisma db push && node server.js" ]
            
