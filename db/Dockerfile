# postgres 

FROM postgres:latest

ARG POSTGRES_USER
ARG POSTGRES_PASSWORD
ARG POSTGRES_DB

ENV POSTGRES_USER=${POSTGRES_USER}
ENV POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
ENV POSTGRES_DB=${POSTGRES_DB}

# install postgres extensions
RUN apt-get update && apt-get install -y postgresql-contrib

COPY ./sql/schemas/auth_internal/client_servers.sql /docker-entrypoint-initdb.d/
COPY ./sql/schemas/client_servers/client_server_template.sql /docker-entrypoint-initdb.d/

EXPOSE 5432


