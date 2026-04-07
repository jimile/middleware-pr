# Product Editor

A simple web app for managing uniforms product data in Supabase. Built with Node.js, Express, EJS, and Tailwind CSS (via CDN). No build step — just `node server.js`.

## Features

- **Product list** with search, brand/category/status filters, and pagination (25/page)
- **Product editing** — name, SKU, pricing, classification, specs (JSON), and more
- **One-click active/inactive toggle** per product
- **Color swatches** — add with color picker, manage per product
- **Sizes** — quick-add standard sizes (XS–5XL) or custom sizes
- **Images** — add by pasting a URL, set view type (front/back/side/detail)
- **Pricing tiers** — quantity-based pricing brackets per product
- **Create and delete** products with cascade cleanup
- **Simple password auth** via shared password (no user accounts)

## Tech Stack

| Layer | Choice |
|---|---|
| Server | Node.js + Express |
| Templates | EJS with express-ejs-layouts |
| Styling | Tailwind CSS via CDN |
| Database | Supabase (Postgres) via @supabase/supabase-js |
| Auth | express-session with shared password |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/jimile/middleware-pr.git
cd middleware-pr
npm install
```

### 2. Set environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key (bypasses RLS) |
| `APP_PASSWORD` | Shared login password |
| `SESSION_SECRET` | Random string for session encryption |
| `PORT` | Optional, defaults to 3000 |

### 3. Run

```bash
node server.js
```

Open `http://localhost:3000` and log in with your `APP_PASSWORD`.

## Replit Setup

1. Import from GitHub: `jimile/middleware-pr`
2. Add the 4 required env vars as **Secrets** in Replit
3. Click **Run** — the `.replit` file is preconfigured

## Project Structure

```
server.js                     # Express entry point
lib/supabase.js               # Supabase client (service_role key)
middleware/auth.js             # Password session gate
routes/
  products.js                 # List, edit, create, delete, toggle active
  swatches.js                 # Color swatch CRUD
  sizes.js                    # Size CRUD with quick-add
  images.js                   # Image CRUD
  pricing.js                  # Pricing tier CRUD
views/
  layout.ejs                  # Shared HTML shell (nav, Tailwind CDN, flash msgs)
  login.ejs                   # Login page
  products/index.ejs          # Product table
  products/edit.ejs           # Product edit form
  products/new.ejs            # New product form
  swatches/manage.ejs         # Color swatch manager
  sizes/manage.ejs            # Size manager
  images/manage.ejs           # Image gallery manager
  pricing/manage.ejs          # Pricing tier manager
```

## Platform Safety

The database is shared with another platform (print-room). This app **always** filters by `platform = 'uniforms'` on every query and sets it on every insert. The platform field is never exposed in forms. Products outside the uniforms platform are never visible or editable.

## Database Tables

| Table | Purpose |
|---|---|
| `products` | Main product data (name, SKU, pricing, specs, etc.) |
| `product_color_swatches` | Color variants with hex values and images |
| `sizes` | Size options per product |
| `product_images` | Product photos with view type |
| `product_pricing_tiers` | Quantity-based pricing brackets |
| `brands` | Brand reference (read-only) |
| `categories` | Category reference (read-only) |
