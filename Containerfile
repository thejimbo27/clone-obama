FROM node:20-slim

# better-sqlite3 needs build tools for native compilation
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install main app deps
COPY package.json package-lock.json ./
RUN npm ci

# Install admin deps
COPY admin/package.json admin/package-lock.json ./admin/
RUN cd admin && npm ci

# Copy source
COPY . .

# Create non-root user and data dirs
RUN useradd -m -s /bin/sh appuser && \
    mkdir -p data/uploads && \
    chown -R appuser:appuser /app

# Expose proxy port
EXPOSE 4000

# Environment defaults (creds must be set at runtime via -e flags)
ENV EXPO_PORT=8082 \
    ADMIN_PORT=3000 \
    PROXY_PORT=4000

USER appuser
ENTRYPOINT ["./entrypoint.sh"]
