FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
ENV DATABASE_URL="postgresql://user:password@db:5432/soc_db"
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npx prisma generate
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
