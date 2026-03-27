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

# Create data dirs
RUN mkdir -p data/uploads

# Expose proxy port
EXPOSE 4000

# Environment defaults
ENV EXPO_PORT=8082 \
    ADMIN_PORT=3000 \
    PROXY_PORT=4000 \
    ADMIN_USER=admin \
    ADMIN_PASS=obama44

ENTRYPOINT ["./entrypoint.sh"]
