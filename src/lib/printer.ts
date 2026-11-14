// Multi-Transport Thermal Receipt Printer Manager
import {
  PrinterSettings,
  DEFAULT_PRINTER_SETTINGS,
  generateThermalReceiptBytes,
  generateKitchenChitBytes,
  generateTestReceiptBytes,
} from "./escpos";

const STORAGE_KEY = "lillys_pos_printer_settings";

export function getStoredPrinterSettings(): PrinterSettings {
  if (typeof window === "undefined") return DEFAULT_PRINTER_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(raw) } : DEFAULT_PRINTER_SETTINGS;
  } catch {
    return DEFAULT_PRINTER_SETTINGS;
  }
}

export function saveStoredPrinterSettings(settings: PrinterSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

// Convert Uint8Array to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Send bytes over WebUSB
async function printViaWebUSB(bytes: Uint8Array): Promise<boolean> {
  const nav = navigator as unknown as { usb?: { requestDevice: (opts: unknown) => Promise<{
    open: () => Promise<void>;
    selectConfiguration: (c: number) => Promise<void>;
    claimInterface: (i: number) => Promise<void>;
    transferOut: (ep: number, data: Uint8Array) => Promise<void>;
    close: () => Promise<void>;
    configuration?: { interfaces: { interfaceNumber: number }[] };
  }> } };

  if (!nav.usb) {
    throw new Error("WebUSB is not supported in this browser. Use Chrome or Edge.");
  }

  const device = await nav.usb.requestDevice({
    filters: [{ classCode: 7 }], // USB Printer Class
  });

  await device.open();
  await device.selectConfiguration(1);
  const interfaceNumber = device.configuration?.interfaces[0]?.interfaceNumber ?? 0;
  await device.claimInterface(interfaceNumber);
  await device.transferOut(1, bytes);
  await device.close();
  return true;
}

// Send bytes over Web Bluetooth (BLE)
async function printViaBluetooth(bytes: Uint8Array): Promise<boolean> {
  const nav = navigator as unknown as { bluetooth?: { requestDevice: (opts: unknown) => Promise<{
    gatt?: {
      connect: () => Promise<{
        getPrimaryServices: () => Promise<{
          getCharacteristics: () => Promise<{
            properties: { write: boolean; writeWithoutResponse: boolean };
            writeValue: (data: Uint8Array) => Promise<void>;
          }[]>;
        }[]>;
      }>;
    };
  }> } };

  if (!nav.bluetooth) {
    throw new Error("Web Bluetooth is not supported in this browser.");
  }

  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      "000018f0-0000-1000-8000-00805f9b34fb",
      "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
      "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    ],
  });

  const server = await device.gatt?.connect();
  if (!server) throw new Error("Could not connect to Bluetooth printer GATT server");

  const services = await server.getPrimaryServices();
  for (const service of services) {
    const chars = await service.getCharacteristics();
    for (const char of chars) {
      if (char.properties.write || char.properties.writeWithoutResponse) {
        // Chunk write for BLE MTU limit (512 bytes)
        const chunkSize = 256;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize);
          await char.writeValue(chunk);
        }
        return true;
      }
    }
  }

  throw new Error("No writable BLE characteristic found on printer");
}

// Universal Print Dispatcher
export async function executePrint(
  bytes: Uint8Array,
  settings: PrinterSettings = getStoredPrinterSettings()
): Promise<{ success: boolean; message: string }> {
  if (settings.type === "network") {
    const base64Buffer = uint8ArrayToBase64(bytes);
    const res = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64Buffer,
        ipAddress: settings.ipAddress,
        port: settings.port,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Network printer did not respond");
    }
    return { success: true, message: `Printed to ${settings.ipAddress}:${settings.port}` };
  } else if (settings.type === "usb") {
    await printViaWebUSB(bytes);
    return { success: true, message: "Printed via WebUSB Thermal connection" };
  } else if (settings.type === "bluetooth") {
    await printViaBluetooth(bytes);
    return { success: true, message: "Printed via Bluetooth Thermal connection" };
  } else {
    // System dialog fallback
    if (typeof window !== "undefined") {
      window.print();
    }
    return { success: true, message: "Opened system print dialog" };
  }
}

// Public API
export async function printReceipt(
  order: Parameters<typeof generateThermalReceiptBytes>[0],
  customSettings?: PrinterSettings
) {
  const settings = customSettings || getStoredPrinterSettings();
  const bytes = generateThermalReceiptBytes(order, settings);
  return executePrint(bytes, settings);
}

export async function printKitchenChit(
  order: Parameters<typeof generateKitchenChitBytes>[0],
  customSettings?: PrinterSettings
) {
  const settings = customSettings || getStoredPrinterSettings();
  const bytes = generateKitchenChitBytes(order, settings);
  return executePrint(bytes, settings);
}

export async function printTestPage(customSettings?: PrinterSettings) {
  const settings = customSettings || getStoredPrinterSettings();
  const bytes = generateTestReceiptBytes(settings);
  return executePrint(bytes, settings);
}

export async function openCashDrawer(customSettings?: PrinterSettings) {
  const settings = customSettings || getStoredPrinterSettings();
  if (settings.type === "network") {
    const res = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isKickDrawer: true,
        ipAddress: settings.ipAddress,
        port: settings.port,
      }),
    });
    return res.json();
  } else {
    // Send ESC p command
    const kickBytes = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    return executePrint(kickBytes, settings);
  }
}

