FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app

# Install dependencies first (better Docker layer caching)
COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

# Folder for uploaded images (a Docker volume is mounted here)
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
