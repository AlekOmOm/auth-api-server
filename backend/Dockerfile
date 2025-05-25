FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE ${DEV_BACKEND_PORT}

CMD [ "npm", "start" ] 