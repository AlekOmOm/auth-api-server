# Simple Auth Server

## usage

```Bash
cp .env.template .env
# add values to .env
```

```Bash
make setup-frontend && make dev-frontend # bash

# in another terminal run:
make setup-backend && make dev-backend # bash
```

powershell 
```powershell
make setup-frontend; make dev-frontend

# in another terminal run:
make setup-backend; make dev-backend
```

## docs

[backend docs](./backend/README.md)

## UI testing 

[seed users](./backend/src/db/connection/seedData.json)

```json
   "seedUsers": [
      {
         "name": "admin",
         "role": "admin",
         "email": "admin@admin.com",
         "password": "admin"
      },
      {
         "name": "mother-theresa",
         "role": "user",
         "email": "mother@world.com",
         "password": "the-big-g"
      },
      {
         "name": "john-mccarmack",
         "role": "user",
         "email": "john@meta.com",
         "password": "john-creator-of-doom"
      },
      {
         "name": "Linus-Torvalds",
         "role": "user",
         "email": "linus@linux.com",
         "password": "linux-creator_thats-me"
      }
   ]
```


