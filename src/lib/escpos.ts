// Universal ESC/POS Thermal Receipt Command Encoder
// Compatible with Epson TM-T88/TM-m30, Star TSP100/mC-Print, Munbyn, Bixolon, Sunmi, Xprinter (80mm & 58mm)

import { getStoreSettings } from "./storeSettings";

export interface PrinterSettings {
  type: "network" | "usb" | "bluetooth" | "system";
  paperWidth: "80mm" | "58mm"; // 80mm = ~48 chars, 58mm = ~32 chars
  ipAddress: string;
  port: number;
  autoPrintReceipt: boolean;
  autoPrintKitchenChit: boolean;
  openCashDrawer: boolean;
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  type: "system",
  paperWidth: "80mm",
  ipAddress: "192.168.1.100",
  port: 9100,
  autoPrintReceipt: true,
  autoPrintKitchenChit: true,
  openCashDrawer: true,
};

// Raw ESC/POS Byte Commands
export const ESC_POS = {
  // Initialization
  INIT: [0x1b, 0x40], // ESC @

  // Text Alignment
  ALIGN_LEFT: [0x1b, 0x61, 0x00],
  ALIGN_CENTER: [0x1b, 0x61, 0x01],
  ALIGN_RIGHT: [0x1b, 0x61, 0x02],

  // Text Styling
  BOLD_ON: [0x1b, 0x45, 0x01],
  BOLD_OFF: [0x1b, 0x45, 0x00],
  DOUBLE_SIZE: [0x1d, 0x21, 0x11], // Double height + double width
  DOUBLE_HEIGHT: [0x1d, 0x21, 0x01],
  DOUBLE_WIDTH: [0x1d, 0x21, 0x10],
  NORMAL_SIZE: [0x1d, 0x21, 0x00],
  INVERT_ON: [0x1d, 0x42, 0x01],
  INVERT_OFF: [0x1d, 0x42, 0x00],

  // Paper Handling
  FEED_LINES: (n: number) => [0x1b, 0x64, n],
  FULL_CUT: [0x1d, 0x56, 0x00], // GS V 0
  PARTIAL_CUT: [0x1d, 0x56, 0x01], // GS V 1

  // Cash Drawer Kick-out
  KICK_DRAWER: [0x1b, 0x70, 0x00, 0x19, 0xfa], // ESC p 0 25 250 (pulse pin 2)
  BEEP: [0x1b, 0x42, 0x02, 0x02], // ESC B 2 2 (2 beeps)
};

export class EscPosBuilder {
  private buffer: number[] = [];
  private maxChars: number;

  constructor(paperWidth: "80mm" | "58mm" = "80mm") {
    this.maxChars = paperWidth === "80mm" ? 48 : 32;
    this.init();
  }

  init() {
    this.buffer.push(...ESC_POS.INIT);
    return this;
  }

  alignCenter() {
    this.buffer.push(...ESC_POS.ALIGN_CENTER);
    return this;
  }

  alignLeft() {
    this.buffer.push(...ESC_POS.ALIGN_LEFT);
    return this;
  }

  alignRight() {
    this.buffer.push(...ESC_POS.ALIGN_RIGHT);
    return this;
  }

  bold(enable: boolean = true) {
    this.buffer.push(...(enable ? ESC_POS.BOLD_ON : ESC_POS.BOLD_OFF));
    return this;
  }

  size(type: "normal" | "double" | "double-width" | "double-height") {
    if (type === "double") this.buffer.push(...ESC_POS.DOUBLE_SIZE);
    else if (type === "double-width") this.buffer.push(...ESC_POS.DOUBLE_WIDTH);
    else if (type === "double-height") this.buffer.push(...ESC_POS.DOUBLE_HEIGHT);
    else this.buffer.push(...ESC_POS.NORMAL_SIZE);
    return this;
  }

  text(str: string) {
    const bytes = new TextEncoder().encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  textLine(str: string = "") {
    this.text(str);
    this.buffer.push(0x0a); // LF newline
    return this;
  }

  divider(char: string = "-") {
    const line = char.repeat(this.maxChars);
    this.textLine(line);
    return this;
  }

  // Prints left-aligned text and right-aligned text on the same line
  twoColumnLine(left: string, right: string) {
    const spaces = Math.max(1, this.maxChars - left.length - right.length);
    const line = left + " ".repeat(spaces) + right;
    this.textLine(line);
    return this;
  }

  feed(lines: number = 3) {
    this.buffer.push(...ESC_POS.FEED_LINES(lines));
    return this;
  }

  cut(partial: boolean = false) {
    this.feed(2);
    this.buffer.push(...(partial ? ESC_POS.PARTIAL_CUT : ESC_POS.FULL_CUT));
    return this;
  }

  kickDrawer() {
    this.buffer.push(...ESC_POS.KICK_DRAWER);
    return this;
  }

  beep() {
    this.buffer.push(...ESC_POS.BEEP);
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  toBase64(): string {
    const bytes = this.build();
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// Generate ESC/POS Thermal Receipt Payload
export function generateThermalReceiptBytes(
  order: {
    orderNumber: string;
    type: string;
    customerName?: string | null;
    table?: { number: string; name: string } | null;
    staff?: { name: string } | null;
    createdAt: string;
    subtotal: number;
    discount: number;
    tax: number;
    tip: number;
    total: number;
    paymentMethod?: string | null;
    items: {
      quantity: number;
      menuItemName: string;
      total: number;
      selectedModifiers?: string | null;
      notes?: string | null;
    }[];
  },
  settings: PrinterSettings = DEFAULT_PRINTER_SETTINGS
): Uint8Array {
  const b = new EscPosBuilder(settings.paperWidth);

  if (settings.openCashDrawer && order.paymentMethod === "CASH") {
    b.kickDrawer();
  }

  const store = getStoreSettings();

  // Header
  b.alignCenter()
    .size("double")
    .bold(true)
    .textLine(store.storeName.toUpperCase())
    .size("normal")
    .bold(false);

  if (store.tagline) {
    b.textLine(store.tagline);
  }

  b.textLine(store.address)
    .textLine(`Tel: ${store.phone}`)
    .feed(1)
    .bold(true)
    .textLine(`ORDER #${order.orderNumber}`)
    .bold(false)
    .textLine(new Date(order.createdAt).toLocaleString())
    .divider("=");

  // Metadata
  b.alignLeft()
    .twoColumnLine("Order Type:", order.type.replace("_", " "))
    .twoColumnLine("Server:", order.staff?.name || "Cashier #1");

  if (order.table) {
    b.twoColumnLine("Dining Table:", `${order.table.number} (${order.table.name})`);
  }
  if (order.customerName) {
    b.twoColumnLine("Guest Name:", order.customerName);
  }
  b.divider("-");

  // Items List
  b.bold(true).twoColumnLine("ITEM", "AMOUNT").bold(false).divider("-");

  for (const item of order.items) {
    const itemLeft = `${item.quantity}x ${item.menuItemName}`;
    const itemRight = `Rs. ${item.total.toFixed(2)}`;
    b.twoColumnLine(itemLeft, itemRight);

    // Modifiers
    if (item.selectedModifiers) {
      try {
        const mods = JSON.parse(item.selectedModifiers);
        if (Array.isArray(mods) && mods.length > 0) {
          b.textLine(`  + ${mods.join(", ")}`);
        }
      } catch {}
    }

    if (item.notes) {
      b.textLine(`  * Note: ${item.notes}`);
    }
  }

  b.divider("-");

  // Totals
  b.twoColumnLine("Subtotal:", `Rs. ${order.subtotal.toFixed(2)}`);
  if (order.discount > 0) {
    b.twoColumnLine("Discount:", `-Rs. ${order.discount.toFixed(2)}`);
  }
  b.twoColumnLine("Tax (SSCL/VAT):", `Rs. ${order.tax.toFixed(2)}`);
  if (order.tip > 0) {
    b.twoColumnLine("Tip / Service:", `Rs. ${order.tip.toFixed(2)}`);
  }

  b.divider("=");
  b.size("double-height")
    .bold(true)
    .twoColumnLine("TOTAL DUE:", `Rs. ${order.total.toFixed(2)}`)
    .size("normal")
    .bold(false);

  b.feed(1)
    .alignCenter()
    .textLine(`PAID VIA ${order.paymentMethod ? order.paymentMethod.replace("_", " ") : "CARD"}`)
    .feed(1)
    .textLine(store.receiptFooterNote || "Thank you for dining with us!")
    .feed(2)
    .cut();

  return b.build();
}

// Generate Kitchen Order Ticket (KOT / Chit)
export function generateKitchenChitBytes(
  order: {
    orderNumber: string;
    type: string;
    table?: { number: string; name: string } | null;
    createdAt: string;
    customerName?: string | null;
    notes?: string | null;
    items: {
      quantity: number;
      menuItemName: string;
      selectedModifiers?: string | null;
      notes?: string | null;
    }[];
  },
  settings: PrinterSettings = DEFAULT_PRINTER_SETTINGS
): Uint8Array {
  const b = new EscPosBuilder(settings.paperWidth);

  b.beep()
    .alignCenter()
    .size("double")
    .bold(true)
    .textLine("--- KITCHEN ORDER (KOT) ---")
    .feed(1)
    .textLine(`ORDER #${order.orderNumber}`)
    .size("normal")
    .bold(false)
    .textLine(`Type: ${order.type.replace("_", " ")}`)
    .textLine(`Time: ${new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`)
    .textLine(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);

  if (order.table) {
    const tableName = order.table.name ? `${order.table.name} (T-${order.table.number})` : `TABLE ${order.table.number}`;
    b.size("double").bold(true).textLine(`TABLE: ${tableName}`).size("normal").bold(false);
  } else {
    b.size("double-height").bold(true).textLine("TABLE: TAKEAWAY / COUNTER").size("normal").bold(false);
  }

  if (order.customerName && order.customerName.trim() && order.customerName.toLowerCase() !== "guest") {
    b.bold(true).textLine(`Customer: ${order.customerName}`).bold(false);
  }

  b.divider("=").alignLeft();

  const items = order.items && Array.isArray(order.items) ? order.items : [];
  if (items.length === 0) {
    b.textLine("(No items in ticket)").feed(1);
  } else {
    for (const item of items) {
      b.size("double-height")
        .bold(true)
        .textLine(`[ ] ${item.quantity}x ${item.menuItemName}`)
        .size("normal")
        .bold(false);

      if (item.selectedModifiers) {
        try {
          const mods = typeof item.selectedModifiers === "string" 
            ? JSON.parse(item.selectedModifiers) 
            : item.selectedModifiers;
          if (Array.isArray(mods) && mods.length > 0) {
            b.bold(true).textLine(`    >> MODS: ${mods.join(", ")}`).bold(false);
          }
        } catch {}
      }

      if (item.notes) {
        b.bold(true).textLine(`    !! NOTE: ${item.notes}`).bold(false);
      }

      b.divider("-");
    }
  }

  if (order.notes) {
    b.bold(true).textLine(`SPECIAL INSTRUCTIONS: ${order.notes}`).bold(false).feed(1);
  }

  b.feed(2).cut();
  return b.build();
}

// Diagnostic Test Print
export function generateTestReceiptBytes(
  settings: PrinterSettings = DEFAULT_PRINTER_SETTINGS
): Uint8Array {
  const b = new EscPosBuilder(settings.paperWidth);

  b.alignCenter()
    .size("double")
    .bold(true)
    .textLine("PRINTER DIAGNOSTIC")
    .size("normal")
    .bold(false)
    .textLine("Lilly's Restaurant & Cafe")
    .divider("=")
    .alignLeft()
    .twoColumnLine("Mode:", settings.type.toUpperCase())
    .twoColumnLine("Paper Width:", settings.paperWidth)
    .twoColumnLine("Target IP:", settings.ipAddress)
    .twoColumnLine("Port:", settings.port.toString())
    .twoColumnLine("Date:", new Date().toLocaleDateString())
    .twoColumnLine("Time:", new Date().toLocaleTimeString())
    .divider("-")
    .alignCenter()
    .bold(true)
    .textLine("ALIGNMENT TEST")
    .bold(false)
    .alignLeft()
    .textLine("Left aligned text")
    .alignCenter()
    .textLine("Center aligned text")
    .alignRight()
    .textLine("Right aligned text")
    .divider("-")
    .alignCenter()
    .textLine("✓ ESC/POS Communication: READY")
    .feed(2)
    .cut();

  return b.build();
}
