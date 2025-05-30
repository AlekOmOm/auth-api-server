# postgres 
FROM postgres:latest

ARG POSTGRES_USER
ARG POSTGRES_PASSWORD
ARG POSTGRES_DB
ARG POSTGRES_PORT

ENV POSTGRES_USER=${POSTGRES_USER}
ENV POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
ENV POSTGRES_DB=${POSTGRES_DB}
ENV POSTGRES_PORT=${POSTGRES_PORT}

# install postgres extensions
RUN apt-get update && apt-get install -y postgresql-contrib

# System schema (owners, admins, client management)
COPY ./sql/schemas/auth_internal_complete.sql /docker-entrypoint-initdb.d/

# Tenant template (users + sessions) 
# – kept for reference, executed once to create client_template
COPY ./sql/schemas/client_server_template.sql /docker-entrypoint-initdb.d/

EXPOSE ${POSTGRES_PORT}


