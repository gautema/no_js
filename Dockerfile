# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies (including devDependencies for build)
RUN bun install

# Copy source files
COPY . .

# Build the static site
RUN bun run build

# Runtime stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy only production dependencies
COPY package.json ./
RUN bun install --production

# Copy built site and proxy server from builder
COPY --from=builder /app/_site ./_site
COPY proxy-server.js ./

# Expose port
EXPOSE 8080

# Start the server with Bun
CMD ["bun", "run", "proxy-server.js"]
