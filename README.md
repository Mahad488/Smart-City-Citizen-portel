# Smart City Citizen Portal

A React and Vite citizen portal backed by an Express API and MySQL. Citizens can register and sign in, submit and manage complaints, report emergencies, and view notifications.

## Requirements

- Node.js 20.19+ or 22.12+
- A MySQL database with the tables used by the API

## Setup

Install dependencies:

```sh
npm install
```

Create a root `.env` file with the database connection values:

```dotenv
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=citizen_portal
DB_PORT=3306
PORT=5000
```

Start the API and frontend in separate terminals:

```sh
npm run start
```

```sh
npm run dev
```

The API listens on port 5000 by default. Vite proxies `/api` requests to it during development. To use a separately hosted API, set `VITE_API_URL` to its origin when building the frontend, for example `https://api.example.com`.

## Checks

```sh
npm run lint
npm run build
```
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
