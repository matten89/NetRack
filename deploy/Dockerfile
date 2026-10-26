# Multi-stage Dockerfile for NetRack DCIM
# Stage 1: Build static assets
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY deploy/nginx-netrack.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from builder stage
COPY --from=builder /app/dist /var/www/netrack-dcim/dist

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
