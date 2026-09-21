# Vanclod — website

Plain HTML, CSS and JavaScript. No build step: open `index.html`, or upload the whole folder to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages).

## Pages
- `index.html` — the main site
- `press.html` — press kit (bios in three lengths, key facts, photo and logo downloads)
- `404.html` — "page not found". Uses absolute paths, so it only renders properly once hosted.

## Things to edit — all in `assets/js/config.js`
- `bookingEmail` — **still a placeholder.** Put the real booking address here; every page picks it up.
- `formEndpoint` — leave empty and the booking form opens a pre-filled email draft. Paste a form endpoint (Formspree, Basin, Web3Forms…) and it sends silently instead, with the email draft as a fallback.
- `shows` — upcoming dates. Past dates hide themselves; an empty list shows the "follow for announcements" panel.

## Before going live
- In `index.html` and `press.html`, change `og:image` to a full URL (`https://your-domain/assets/img/og.jpg`) — link previews on WhatsApp and Instagram need it.
- The photos are the three from the original file (1600px and 1200px wide). Larger originals would look sharper on big screens; drop them into `assets/img/` under the same names and regenerate the `.webp` versions.
- Add photographer credits on the press page if they are required.
