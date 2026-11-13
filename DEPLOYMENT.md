# 🌐 Cloud Database Deployment & Thermal Printer Guide

This guide covers connecting your **Artisan Cafe POS & Restaurant Management Suite** to production cloud databases and configuring industrial **ESC/POS thermal receipt printers**.

---

## 🖨️ Part 1: Receipt Printer Integrations

The suite supports 4 hardware connectivity methods for thermal receipt printers (Epson, Star Micronics, Munbyn, Bixolon, Sunmi, Xprinter):

### Supported Hardware Protocols
- **ESC/POS Command Set**: Formats bold text, double-height headers, itemized breakdowns, modifier tags, totals, barcodes, paper feeding, and automatic paper cutting.
- **Cash Drawer Solenoid Kick**: Emits the `ESC p 0 25 250` electrical pulse to fire standard cash drawers connected via RJ11 / RJ12 to the printer.

### Connectivity Modes

#### 1. Network / LAN / Wi-Fi IP Printing (Recommended for Multi-Station Cafes)
* Connect your thermal printer to your cafe router using an Ethernet cable or Wi-Fi.
* Note the printer's assigned IP (e.g. `192.168.1.150`).
* In the POS header, click the **Printer Icon** &rarr; select **Network LAN**.
* Set **IP Address** and **Port `9100`** (standard raw socket port).
* When orders are finalized or sent to the kitchen, the backend connects directly to the printer over raw TCP (`/api/print`) and streams the binary ESC/POS payload.

#### 2. WebUSB Direct Printing (Cable Connected to POS Terminal)
* Connect a USB thermal printer directly to your iPad (with Lightning/USB-C adapter), Android tablet, or desktop.
* Click **Printer Icon** &rarr; select **WebUSB**.
* Click **Test Print** &rarr; Chrome/Edge will display a hardware permission prompt to pair with the printer class device (`classCode: 7`).
* Prints instantly without third-party drivers or spoolers.

#### 3. Web Bluetooth (BLE) Mobile Printing
* Ideal for mobile servers and table-side handheld printers (e.g., Sunmi, Munbyn 58mm).
* Click **Printer Icon** &rarr; select **Bluetooth** &rarr; select your paired thermal printer.

#### 4. System Print Dialog (Universal Fallback)
* Formats receipts using responsive thermal CSS (`@media print`) targeting 80mm or 58mm paper rolls.

---

## ☁️ Part 2: Cloud Database Deployment

### Instant Provider Switching

The project includes an automatic database switcher:

```bash
# Switch to Cloud PostgreSQL (Supabase / Neon / AWS RDS / Cloud SQL)
node scripts/switch-db.js cloud

# Switch back to Local SQLite
node scripts/switch-db.js local
```

---

### Cloud Database Providers Setup

#### 1. Supabase (Recommended)
1. Create a free project at [supabase.com](https://supabase.com).
2. Under **Project Settings &rarr; Database &rarr; Connection Pooling**, copy the connection string.
3. Switch database mode:
   ```bash
   node scripts/switch-db.js cloud
   ```
4. Update your `.env`:
   ```env
   DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```
5. Push schema and seed demo data:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

#### 2. Neon Serverless Postgres
1. Create a project at [neon.tech](https://neon.tech).
2. Copy the pooled connection string into `.env`:
   ```env
   DATABASE_URL="postgresql://[USER]:[PASSWORD]@[ENDPOINT].neon.tech/neondb?sslmode=require"
   ```
3. Run `npx prisma db push && npx tsx prisma/seed.ts`.

#### 3. Self-Hosted Docker Compose with PostgreSQL
To host the full stack on an on-premise cafe server, mini PC, or VPS:

```bash
docker compose up -d --build
```
This boots:
* A containerized **PostgreSQL 16** database with health checks and persistent volume storage.
* The Next.js 14 POS application exposed on port `3005`.

---

## 📱 iPad / Tablet Deployment Checklist

1. Deploy app to Vercel, Railway, or your local cafe server IP (e.g. `http://192.168.1.50:3005`).
2. Open the URL on your iPad in **Safari**.
3. Tap the **Share icon &rarr; Add to Home Screen**.
4. The web application will launch in **fullscreen native mode** (no browser UI, no address bar, hardware acceleration enabled).
5. Open printer settings in the POS navigation bar to link to your counter and kitchen thermal printers.

