# Production Dockerfile for TakTak Jobs Scraper Runner
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for Docker layer caching
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm install --omit=dev && cd backend && npm install --omit=dev

# Copy source code and scripts
COPY index.js ./
COPY backend/ ./backend/

# Create persistent storage directories
RUN mkdir -p /app/database /app/out

# Default environment variables
ENV NODE_ENV=production
ENV DRY_RUN=false
ENV FIRECRAWL_API_URL=http://firecrawl:3002
ENV TAKTAK_API_URL=https://taktakjobs.buildstart.io/api/public/jobs/ingest
ENV MAX_JOBS_PER_BOARD=50
ENV MIN_DELAY_MS=1000
ENV MAX_DELAY_MS=3000

# Mount persistent volumes
VOLUME ["/app/database", "/app/out"]

# Run the ingestion scraper
CMD ["node", "index.js"]
