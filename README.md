# ☕ Artisan Cafe POS & Restaurant Management Suite

A comprehensive, production-grade **Cafe Point of Sale (POS)** and **Restaurant Management Suite** engineered with **Next.js 14**, **Tailwind CSS**, **Framer Motion**, **Prisma ORM**, and **SQLite**. 

Designed as a high-performance **Universal Progressive Web Application (PWA)** that runs natively on **iPads, iPhones, Android tablets & phones**, kitchen touch monitors, and desktop web browsers.

---

## 🚀 Key Modules & Capabilities

### 1. ☕ Point of Sale (POS Station)
- **Fluid Touch Interface**: Responsive layout optimized for iPad & Android tablet touch gestures.
- **Visual Menu Explorer**: Category sliding pills, search filter, and instant item photo cards.
- **Dynamic Item Customizer**:
  - Milk choices (Whole, Barista Oat, Almond, Skim).
  - Sweetness intensity (Unsweetened, 50% Light, Regular, Extra Sweet).
  - Espresso add-ons (+1 Extra Shot, Decaf, Flavored syrups).
  - Custom barista/kitchen instructions.
- **Interactive Cart & Order Types**:
  - Dine-In with visual table assignment.
  - Quick Takeaway & Delivery tabs.
  - Item increment/decrement steppers and instant delete.
- **Tender & Payment Processing**:
  - 💳 **Credit Card**: Tap, chip, and swipe simulation.
  - 💵 **Cash Tender**: Fast preset bills ($10, $20, $50, $100), tender input, and automatic change return calculation.
  - 📱 **QR / Apple Pay**: Dynamic QR code rendering for contactless guest checkout.
  - 👥 **Split Bill**: Real-time calculation per guest (2 to 5 way split).
  - **Discounts & Gratuity**: 0%, 5%, 10%, 15% discount buttons and tip selectors.
  - **Confetti celebration** on successful checkout.
- **Thermal Receipt Engine**:
  - Realistic printed thermal bill with serrated paper aesthetic, barcode, itemized modifier breakdown, tax calculation, and direct print (`window.print()`).

---

### 2. 🍳 Kitchen Display System (KDS)
- **Live Ticket Board**: Categorized tickets with real-time status transitions (`PENDING -> PREPARING -> READY -> SERVED`).
- **Urgency Timers**: Second-by-second countdown with color indicators:
  - 🟢 Green: Fresh order (< 4 mins).
  - 🟡 Amber: Moderate wait (4 - 8 mins).
  - 🔴 Flashing Rose: Overdue alert (> 8 mins).
- **Modifier Highlights**: Emphasized custom options (e.g., Oat Milk, Extra Shot, Decaf) so the barista/chef never misses a detail.
- **Synthetic Audio Chimes**: Web Audio API synthesized order bell and bump chimes.

---

### 3. 🪑 Floor Plan & Table Manager
- **Section Categorization**: Indoor Lounge, Terrace Garden, VIP Private Booth, Bar Counter.
- **Live Table Status**:
  - 🟢 `AVAILABLE`: Ready for seating.
  - 🔴 `OCCUPIED`: Displays active order number and running tab total.
  - 🟡 `BILLED`: Order completed awaiting table turnover.
- **Quick Table Order**: Tapping any table immediately opens a new POS order pre-linked to that table.
- **Add Table Modal**: Create custom tables with seating capacity and section allocation.

---

### 4. 📦 Inventory & Recipe Ingredients (BOM)
- **Automatic Recipe Stock Deduction**: Every order placed in the POS automatically deducts raw materials based on the recipe (e.g. 18g coffee beans, 220ml milk, 1 cup).
- **Low Stock Radar**: Alerts when ingredients drop below reorder threshold.
- **Stock Valuation**: Real-time inventory asset calculation based on unit purchase costs.
- **Restock Modal**: Restock supplies, update cost per unit, and audit supplier transactions.

---

### 5. 📋 Menu & Dynamic Pricing Manager
- **Instant 86 Toggle**: One-click out-of-stock toggle immediately prevents ordering 86'd items across all POS tablets.
- **Inline Price Editor**: Edit retail prices directly in the table with instant database synchronization.
- **Profit Margin Radar**: Computes gross profit margins `((Price - Cost) / Price * 100)%` per item.
- **Add Menu Offering**: Dialog to add new drinks/food with photo, preparation time, and modifier groups.

---

### 6. 📊 Executive Business Intelligence & Analytics
- **Live KPI Metrics**: Net revenue, order count, average ticket spend, and total staff tips.
- **Top Offerings Leaderboard**: Ranked by units sold and revenue share.
- **Payment Method Breakdown**: Cash vs Card vs Apple Pay distribution.
- **Transaction Audit Trail**: Live log of all customer transactions.

---

### 7. 🔐 Staff Switching & Security PINs
- **Quick 4-Digit PIN Access**: Switch between staff roles in seconds with numpad:
  - `1111` &mdash; **Julian Vance** (Admin)
  - `3333` &mdash; **Mateo Silva** (Barista)
  - `4444` &mdash; **Chloe Bennett** (Cashier)

---

## 📱 Running on iOS & Android Tablets / Phones (PWA)

1. Start the server (default port `3005` or `3000`).
2. Open the URL in Safari (iOS / iPadOS) or Chrome (Android).
3. **On iPad / iPhone**:
   - Tap the **Share** button in Safari.
   - Select **"Add to Home Screen"**.
   - Launch from your home screen for a **100% fullscreen, native app experience** with no browser bars or distractions!
4. **On Android Tablets**:
   - Tap the three dots menu in Chrome.
   - Select **"Install App"** or **"Add to Home screen"**.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **ORM & Database**: Prisma 5 LTS with SQLite (`prisma/dev.db`)
- **Icons**: Lucide React
- **Audio Effects**: Native Web Audio API Synthesizer (Zero asset dependencies)
- **Animations**: Framer Motion & CSS hardware-accelerated transforms
- **Effects**: Canvas Confetti

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Push database schema
npx prisma db push

# 3. Seed demo cafe data
npx tsx prisma/seed.ts

# 4. Start production server
npm run build
npx next start -p 3005
# Open http://localhost:3005 in your browser or tablet
```
# cafe-pos-suite
