#!/bin/bash
echo "Setting up environment..."
if [ ! -f .env ]; then
    echo "Creating .env from template..."
    cp .env.template .env
else
    echo ".env already exists, skipping..."
fi


