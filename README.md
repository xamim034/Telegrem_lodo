# Telegram Ludo Mini App (starter MVP)

This is a starter project for a Telegram Mini App with 2-player and 4-player online rooms. It uses **virtual points only**. It does not implement deposits, wagers, cash prizes, or withdrawals.

## Included
- Telegram `/start` command with a Mini App button
- Create/join room by code
- 2 or 4 player room selection
- Server-authoritative dice rolls and basic pawn movement
- Simple board UI and turn display

## Important MVP limitations
This is a foundation, not a finished commercial Ludo product. It currently has simplified rules and a compact demonstration board. It does not yet implement official Ludo safe squares, captures, home lanes, reconnect recovery, persistent database, anti-cheat hardening, moderation, or an ad-network SDK. Do not use it for real-money play.

## Run locally
1. Install Node.js 20 or newer.
2. Extract this ZIP and open a terminal in the project folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Create a bot with `@BotFather`, then put its token in `BOT_TOKEN`.
6. For local browser testing, leave `WEB_APP_URL` unset and run `npm start`; open `http://localhost:3000`.
7. To open inside Telegram, deploy to a public HTTPS host, set `WEB_APP_URL` to that HTTPS URL, restart the app, and use `/start` in your bot.

## Deploying
Choose a Node.js host that supports persistent WebSocket connections. Set the environment variables `BOT_TOKEN` and `WEB_APP_URL`. Free hosting availability and sleep limits can change; test WebSocket support before relying on a host.

## Next development steps
1. Finish a proper 15x15 Ludo board and full official rules.
2. Add secure reconnect/session handling and persistent storage.
3. Add virtual coin ledger, daily bonus, badges, and leaderboard.
4. Add admin-managed sponsored placements. Add a third-party ad SDK only after checking its current Telegram Mini App support and terms.
5. Validate Telegram Mini App `initData` on the server before trusting Telegram user identity.

## Security
- Never share your BotFather token in chat or commit `.env`.
- Rotate the token with BotFather if it is exposed.
- Before public launch, validate Telegram `initData`, add rate limits, database persistence, and server-side move validation.
