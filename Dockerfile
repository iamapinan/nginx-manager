FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create data directory for SQLite (needed during build time)
RUN mkdir -p /app/data

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Install nginx, supervisor, certbot and openssl
RUN apk add --no-cache nginx supervisor certbot openssl

# Create nginx directories
RUN mkdir -p /etc/nginx/conf.d
RUN mkdir -p /var/log/nginx
RUN mkdir -p /var/lib/nginx/tmp
RUN mkdir -p /run/nginx

# Create data directory for SQLite
RUN mkdir -p /app/data

# Create nginx-config directory (for generated configs)
RUN mkdir -p /app/nginx-config

# Create certbot directories
RUN mkdir -p /var/www/certbot
RUN mkdir -p /etc/letsencrypt

# Set the correct permission for prerender cache
RUN mkdir .next

# Automatically leverage output traces to reduce image size
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy and setup crontab for auto-renewal
COPY crontab /etc/crontabs/root
RUN chmod 0600 /etc/crontabs/root

# Set permissions
RUN chown -R root:root /app
RUN chown -R nginx:nginx /var/log/nginx
RUN chown -R nginx:nginx /var/lib/nginx
RUN chown -R nginx:nginx /run/nginx

EXPOSE 80 3000

# Use supervisor to run both nginx and Next.js
CMD ["sh", "-c", "mkdir -p /var/log/supervisor /var/log/nginx /run/nginx && chown -R nginx:nginx /var/log/nginx /run/nginx && nginx -t && exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf"] 