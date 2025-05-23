FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE ${DEV_FRONTEND_PORT}

# Assuming 'dev' script in package.json starts the development server
CMD [ "npm", "run", "dev", "--", "--host" ] 