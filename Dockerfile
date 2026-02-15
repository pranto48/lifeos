# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies
# Ensure devDependencies are installed (vite is a devDependency)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Clear Supabase env vars so self-hosted mode is detected at runtime
RUN rm -f .env

# Build with placeholder Supabase vars to force self-hosted mode
# These are valid-format but non-functional values so createClient() doesn't crash
# The selfHostedConfig.ts detection checks for 'supabase' in URL, so localhost triggers self-hosted mode
# IMPORTANT: Use port 9999 (not port 0) to avoid ERR_UNSAFE_PORT browser errors
ENV VITE_SUPABASE_URL="http://localhost:9999"
ENV VITE_SUPABASE_PUBLISHABLE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.ZopqoUt20nEV9cklpv9e3yw3PVyZLmKs5qLD6nGL1SI"

# Build the application
RUN ./node_modules/.bin/vite build

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
