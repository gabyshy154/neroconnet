# figma-make-app

React + Vite + Tailwind CSS project running inside Figma Make.

## Development Server

A Vite development server is **always running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Key Files

- `src/App.tsx` - Main application component
- `src/main.tsx` - React entry point
- `src/index.css` - Global styles and Tailwind CSS import
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite configuration
- `.mise.toml` - Toolchain versions (Node.js, pnpm)

## Styling

This project uses **Tailwind CSS v4** for styling. Use Tailwind utility classes directly in JSX. Tailwind is loaded via the Vite plugin — no PostCSS config needed.

## NeroConnect workflow rules

- No in-page camera or QR scanning library anywhere in the app. Do not use `getUserMedia`, `html5-qrcode`, `@zxing/browser`, `qr-scanner`, or similar libraries.
- Production QR codes encode scan-page links. Staff scan them with the phone's own camera app, which opens the order's scan link in the browser. `qrcode.react` is for QR generation only.
- Keep a manual **QR Code / Number** field as fallback and for handheld scanners.
- NPC Lookup and walk-in Enrollment are manual-entry workflows only.
- Production stage completion must match the selected station, move only one stage forward, and record the signed-in staff member, completed stage, time, and whether it was opened by Phone scan or Manual entry.
