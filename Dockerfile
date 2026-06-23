FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install Bun + tsx (for seed scripts)
RUN npm install -g bun@1.1.20 tsx

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

# Create data directories
RUN mkdir -p /app/data /app/public/generated

# Copy and prepare entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port and configure environment
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Use entrypoint that auto-seeds KB on first boot
CMD ["/app/entrypoint.sh"]
