FROM oven/bun:1.1.20-alpine

# Install system dependencies
RUN apk add --no-cache python3 make g++ gcc sqlite-dev

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN bun run db:generate

# Build Next.js
RUN NODE_OPTIONS="--max-old-space-size=2048" bun run build

# Expose port and configure environment
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run database push and start Next.js application
CMD ["sh", "-c", "bun run db:push && bun run start"]
