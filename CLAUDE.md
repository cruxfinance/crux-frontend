# crux-frontend

Web application for Crux Finance. See [../CLAUDE.md](../CLAUDE.md) for full architecture.

## Role in Architecture

- User-facing interface for trading and analytics
- Consumes ci-api for all backend data
- Handles wallet integration and transaction signing

## Tech Stack

- Next.js 13 with React 18
- TypeScript
- Material-UI MUI v5
- tRPC for type-safe API calls
- Prisma for local database
- NextAuth.js for authentication

## Key Features

- Token trading and swaps via Spectrum DEX
- Portfolio management
- Accounting/reporting Koinly integration
- Real-time charts Visx, TradingView
- Wallet integration @nautilus-wallet

## Environment Variables

- CRUX_API - ci-api endpoint
- ERGOPAD_API - ErgoPad API endpoint
- EXPLORER_API - Ergo explorer API

## Upstream Dependencies

- ci-api for all backend data
