# Multi-stage Dockerfile for Playwright Automation Framework

# Stage 1: Base image with Node.js
FROM node:18-bullseye as base

# Set working directory
WORKDIR /app

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Install dependencies
FROM base as dependencies

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Install Playwright browsers
RUN npx playwright install --with-deps chromium firefox webkit

# Stage 3: Final image
FROM dependencies as final

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV CI=true

# Run tests by default
CMD ["npm", "test"]