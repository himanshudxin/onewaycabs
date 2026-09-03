# OneWayTaxiBihar (onewaytaxibihar.com) - Production Deployment Guide

This project is a high-performance, responsive web application ready for instant deployment to any cloud hosting provider or server.

- **GitHub Repository**: [https://github.com/himanshudxin/onewaycabs](https://github.com/himanshudxin/onewaycabs)
- **Production Domain**: `https://onewaytaxibihar.com`

---

## 1. Zero-Configuration Cloud Deployments

### Option A: Vercel (Recommended - 1 Click)
1. Install Vercel CLI or open [vercel.com](https://vercel.com).
2. Import this project folder or connect your Git repository.
3. Vercel automatically detects `vercel.json` (already pre-configured with security headers, clean URLs, and caching).
4. Click **Deploy**. Your site is live on global edge CDN with free SSL certificate!
5. Connect your custom domain `onewaytaxibihar.com` in Vercel Project Settings > Domains.

---

### Option B: Netlify (Drag & Drop or Git)
1. Open [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag and drop the `onewaycabs` project directory into the browser.
3. Netlify automatically detects `netlify.toml`, `_headers`, and `_redirects` (all pre-configured).
4. Your website is deployed in 15 seconds with global CDN and automated HTTPS.
5. In Domain Management, add `onewaytaxibihar.com`.

---

### Option C: Cloudflare Pages
1. Go to Cloudflare Dashboard > **Workers & Pages** > **Create application** > **Pages**.
2. Connect your Git repository or upload the directory asset bundle.
3. Build setting:
   - Framework preset: **None**
   - Build output directory: `.` (root directory)
4. `_headers` and `_redirects` are processed automatically by Cloudflare Edge.
5. Set custom domain to `onewaytaxibihar.com`.

---

### Option D: Traditional Apache / cPanel / Shared Hosting / Nginx
1. Upload all files from this directory to `public_html/` or `/var/www/html/`.
2. Ensure `index.html`, `favicon.svg`, `manifest.json`, `robots.txt`, and `sitemap.xml` reside at the root.
3. Enable HTTPS (Let's Encrypt SSL).

---

## 2. Pre-Configured Production Assets Included

| File | Purpose |
| :--- | :--- |
| `index.html` | Core responsive web application with Schema.org JSON-LD, SEO tags & Open Graph |
| `favicon.svg` | Crisp vector brand favicon (no 404s, renders sharp on Retina/OLED) |
| `manifest.json` | Progressive Web App (PWA) manifest for Android & iOS mobile "Add to Home Screen" |
| `robots.txt` | Directs Google, Bing, and search engines to index all pages |
| `sitemap.xml` | Search engine sitemap with all key sections and landing targets |
| `vercel.json` | Vercel production edge rules, cache lifetimes, and security headers |
| `_headers` | Netlify / Cloudflare Pages HTTP response security headers |
| `_redirects` | Netlify / Cloudflare Pages clean canonical routing |
| `netlify.toml` | Full Netlify build and cache headers configuration |
| `DEPLOYMENT_GUIDE.md` | Complete step-by-step production deployment instructions |

---

## 3. Verified Production Contacts

- **24/7 Call Now / Helpdesk**: `+91 80021 41816` (`tel:+918002141816`)
- **24/7 WhatsApp Dispatch**: `+91 72818 51011` (`https://wa.me/917281851011`)
- **Official Brand Domain**: `https://onewaytaxibihar.com`
- **Zero Childish Elements**: 100% vector SVGs, executive typography, zero raw emojis.
