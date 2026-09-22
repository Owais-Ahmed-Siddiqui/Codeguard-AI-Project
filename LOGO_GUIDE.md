# Logo Management - One Place Change

## How it works

All logo usages in the website now use **central component** `src/components/Logo.tsx` which loads from **public folder**.

### Files in public/:
- `public/logo.svg` (preferred, vector, crisp)
- `public/logo.png` (fallback, 512x512)
- `public/favicon.svg` / `favicon.png` (kept for compatibility, same as logo by default)
- `public/og-image.png` (for LinkedIn/Twitter share)

### Logo component logic:
1. Tries to load `/logo.svg`
2. If fails, tries `/logo.png`
3. If both fail, falls back to gold Shield icon (old logo)

### Where logo appears (automatically updates):
- Navbar in LandingPage (top left)
- Footer in LandingPage
- Final CTA section
- AuthPage (login)
- Dashboard header
- Workspace sidebar
- EditorPage review header
- Loading screen (App.tsx)
- ErrorBoundary footer
- NotFoundPage footer
- ProfilePage header

### How to change logo from one place:

**Option 1: Replace SVG (recommended)**
```bash
# Put your new logo as public/logo.svg
# Example: if you have my-logo.svg
cp my-logo.svg public/logo.svg
```

**Option 2: Replace PNG**
```bash
cp my-logo.png public/logo.png
# Make it 512x512 or larger, transparent background recommended
```

**Option 3: Both**
Replace both `logo.svg` and `logo.png` with same design, different formats.

After replacing, refresh browser (hard refresh Ctrl+Shift+R) — logo changes everywhere automatically. No code change needed.

### Tips for good logo:
- SVG preferred, transparent background
- Square or shield shape works best with existing rounded-xl wrapper
- Gold #D4AF37 on dark #0A0A0A matches theme, but any color works
- Keep it simple, minimal — like Shield with checkmark
- For favicon, same file is used, so your logo becomes browser tab icon too
- For OG image (LinkedIn share), you need to update `og-image.png` separately if you want new logo there — generate 1200x630 image

### Current placeholder:
`logo.svg` is a gold shield with checkmark (same as old Shield icon) — so website looks same until you replace it.

### If you want to remove background wrapper:
In `Logo.tsx`, set `withBackground={false}` where used, or edit component to always render just image without wrapper.

That's it — one file change, everywhere updates.
