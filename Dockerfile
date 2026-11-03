FROM node:22-slim
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build
COPY frontend/ /app/frontend/
EXPOSE 3000
CMD ["node", "dist/main.js"]