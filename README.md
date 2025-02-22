# Spotifai

A modern, AI-powered music platform built with the T3 Stack and Next.js.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![tRPC](https://img.shields.io/badge/tRPC-2596BE?style=for-the-badge&logo=trpc&logoColor=white)

## Features

- AI-powered music recommendations using Groq AI
- Beautiful, modern UI with Shadcn and KokonutUI components
- Secure authentication with NextAuth.js
- Fully responsive design
- Dark/Light mode support
- Type-safe API with tRPC
- Prisma ORM for database management

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/spotifai.git
cd spotifai
```

2. Install dependencies:

```bash
npm install
```

3. Set up your environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your configuration.

4. Set up the database:

```bash
npm run db:generate
npm run db:push
```

5. Start the development server:

```bash
npm run dev
```

Visit `http://localhost:3000` to see your app in action!

## Tech Stack

[Next.js](https://nextjs.org/)
[TypeScript](https://www.typescriptlang.org/)
[Tailwind CSS](https://tailwindcss.com/)
[Shadcn](https://ui.shadcn.com), [KokonutUI](https://kokonutui.com/)
[Prisma](https://www.prisma.io/)
[tRPC](https://trpc.io/)
[NextAuth.js](https://next-auth.js.org/)
[Groq](https://groq.com/)
[Zustand](https://zustand-demo.pmnd.rs/)

## Project Structure

```
spotifai/
├── src/
│   ├── app/         # Next.js App Router pages
│   ├── components/  # React components
│   ├── lib/         # Utility functions
│   ├── server/      # Server-side code and API routes
│   └── styles/      # Global styles
├── prisma/          # Database schema and migrations
└── public/          # Static assets
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run db:push` - Push database changes

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with using the [T3 Stack](https://create.t3.gg/)
