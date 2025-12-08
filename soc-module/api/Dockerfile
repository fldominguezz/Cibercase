FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --force
COPY . .
ENV DATABASE_URL="postgresql://user:password@db:5432/soc_db"
RUN npx prisma generate
CMD ["npm", "run", "dev"]
