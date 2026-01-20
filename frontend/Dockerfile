FROM node:20-alpine

WORKDIR /app

COPY package.json ./ 
ENV CYPRESS_INSTALL_BINARY=0
RUN npm install

COPY . .

RUN npm run build
RUN npm install -g serve

CMD ["serve", "-s", "build", "-l", "tcp://0.0.0.0:3000"]
