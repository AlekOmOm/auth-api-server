FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

# Copy the client server SQL template for dynamic schema creation
# Ensure backend/src/db/schemas/client_servers/client_server_template.sql exists locally.
COPY src/db/schemas/client_servers/client_server_template.sql /usr/src/app/src/db/schemas/client_servers/client_server_template.sql

COPY . .

EXPOSE ${DEV_BACKEND_PORT}

CMD [ "npm", "start" ] 