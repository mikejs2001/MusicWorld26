# Lumière Hair & Beauty Studio — Demo Site

A mobile-first demo site for a fictional hair & beauty studio, built with React, TypeScript, Vite, and Tailwind CSS v4. Includes a full booking flow, service menu, retail shop, gallery, and "Lumi" — an in-browser AI chat assistant that answers questions about services, products, and studio policies.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser.

## Scripts

- `npm run dev` — start the local dev server with hot reload
- `npm run build` — type-check and build for production (output in `dist/`)
- `npm run preview` — preview the production build locally
- `npm run lint` — run Oxlint

## Notes

- This is a front-end-only demo: booking and contact forms simulate submission in the browser and don't persist data.
- Photography is hot-linked from Unsplash. See `src/components/ui/Img.tsx` for the fallback behavior if an image fails to load.
- Site content (services, prices, products, team, FAQs) lives in `src/data/` — edit those files to reflect a real studio.
