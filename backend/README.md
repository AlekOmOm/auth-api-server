# Authentication System Backend

A secure, Node.js-based authentication system with user management capabilities.

## Table of Contents

- [Authentication System Backend](#authentication-system-backend)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
    - [Technology Stack](#technology-stack)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Running the Server](#running-the-server)
  - [Features](#features)
  - [API Documentation](#api-documentation)
    - [Authentication Endpoints](#authentication-endpoints)
    - [User Management Endpoints](#user-management-endpoints)
  - [Architecture](#architecture)
  - [Security](#security)
  - [Development](#development)
    - [Project Structure](#project-structure)

## Overview

auth server setup for API access to user 
- authentication
- authorization


### Technology Stack

- **Node.js** & **Express.js** - Server framework
- **Express Session** - Session management
- **bcryptjs** - Password hashing
- **JSON File Storage** - Data persistence (for development)
- **Rate Limiting** - Protection against brute force attacks
- **CORS** - Cross-Origin Resource Sharing security

## Getting Started

### Prerequisites

- Node.js (14.x or higher)
- npm (6.x or higher)

### Installation

1. Clone the repository
2. Install dependencies

```bash
cd backend
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
BACKEND_PORT=3001
FRONTEND_PORT=3000
SESSION_SECRET=your_secret_key_here
RATE_LIMIT_WINDOW=15
RATE_LIMIT_LIMIT=300
```

use template: 

```
cp .env.template .env
```

### Running the Server

Development mode with auto-reload:

```bash
npm run dev
```

Production mode:

```bash
npm run start
```

## Features

- **User Registration**: Create new user accounts with secure password hashing
- **User Authentication**: Verify user credentials and manage sessions
- **Session Management**: Maintain authenticated user state with secure cookies
- **Rate Limiting**: Protect against brute force attacks
- **CORS Protection**: Secure cross-origin requests
- **Security Best Practices**: Follows OWASP guidelines for authentication

## API Documentation

### Authentication Endpoints

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/auth/register` | POST | Register a new user | `{ name, email, password }` | `{ message, user }` |
| `/api/auth/login` | POST | Authenticate a user | `{ email, password }` | `{ message, user }` |
| `/api/auth/logout` | POST | End a user session | None | `{ message }` |

### User Management Endpoints

| Endpoint | Method | Description | Request Body/Params | Response |
|----------|--------|-------------|--------------|----------|
| `/api/users` | GET | Get all users | None | `{ message, users }` |
| `/api/users/:id` | GET | Get a specific user | `:id` (URL param) | `{ user }` |
| `/api/users/:id` | PUT | Update a user | `:id` (URL param), `{ name, email, password }` | `{ message, user }` |


## Architecture

The system follows a modular architecture with clear separation of concerns:

- **Routes**: Define API endpoints and handle HTTP requests/responses
- **Services**: Implement business logic and handle data processing
- **Database**: Manage data persistence and retrieval
- **Utilities**: Provide helper functions for common tasks

## Security

- **Password Hashing**: All passwords are securely hashed using bcryptjs
- **Session Security**: HTTP-only cookies with secure configuration
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Validation of all user input

## Development

### Project Structure

```
backend/
├── src/                  # Source code
│   ├── db/              # Database operations
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── utils/           # Utility functions
├── package.json          # Dependencies
├── server.js             # Main application
└── README.md             # This file
```