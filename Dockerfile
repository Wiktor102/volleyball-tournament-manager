FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5174
ENV DATA_DIR=/app/data
ENV DB_FILE=/app/data/tournament.db

RUN mkdir -p /app/data

EXPOSE 5174

CMD ["sh", "-c", "npm run db:migrate && npm start"]