/**
 * Customer-Facing Display (CFD) Synchronization Manager
 * Communicates seamlessly with the secondary customer display (/display)
 * using BroadcastChannel with localStorage fallback.
 */

export interface CfdItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
  modifiers?: string[];
}

export type CfdStatus = "IDLE" | "ORDER_IN_PROGRESS" | "CHECKOUT" | "PAID";

export interface CfdState {
  status: CfdStatus;
  orderNumber?: string;
  type?: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  tableName?: string;
  items: CfdItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  serviceChargeRate?: number;
  discount: number;
  tip: number;
  total: number;
  paymentMethod?: string;
  amountPaid?: number;
  changeDue?: number;
  qrPayload?: string;
  updatedAt: number;
}

export const CFD_CHANNEL_NAME = "lilly_pos_cfd";
export const CFD_STORAGE_KEY = "lilly_pos_cfd_state";
export const CFD_EVENT_NAME = "lilly_pos_cfd_event";

export const DEFAULT_CFD_STATE: CfdState = {
  status: "IDLE",
  items: [],
  subtotal: 0,
  tax: 0,
  serviceCharge: 0,
  discount: 0,
  tip: 0,
  total: 0,
  updatedAt: Date.now(),
};

let cfdChannel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  // In Node test runner environments, avoid unclosed background channels
  if (typeof process !== "undefined" && process.versions?.node && typeof document === "undefined") {
    return null;
  }
  if (!cfdChannel && typeof BroadcastChannel !== "undefined") {
    try {
      cfdChannel = new BroadcastChannel(CFD_CHANNEL_NAME);
    } catch {
      cfdChannel = null;
    }
  }
  return cfdChannel;
}

/**
 * Broadcast updated state to customer-facing display
 */
export function broadcastCfdState(partial: Partial<CfdState>): CfdState {
  if (typeof window === "undefined") return DEFAULT_CFD_STATE;

  const current = getCfdState();
  const newState: CfdState = {
    ...current,
    ...partial,
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(CFD_STORAGE_KEY, JSON.stringify(newState));
  } catch {
    // Ignore storage quota
  }

  const channel = getChannel();
  if (channel) {
    try {
      channel.postMessage(newState);
    } catch {
      // Ignore
    }
  }

  // Dispatch local window event
  window.dispatchEvent(new CustomEvent(CFD_EVENT_NAME, { detail: newState }));
  return newState;
}

/**
 * Retrieve current CFD state
 */
export function getCfdState(): CfdState {
  if (typeof window === "undefined") return DEFAULT_CFD_STATE;
  try {
    const raw = localStorage.getItem(CFD_STORAGE_KEY);
    if (!raw) return DEFAULT_CFD_STATE;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CFD_STATE;
  }
}

/**
 * Clear CFD back to idle state
 */
export function resetCfdState(): CfdState {
  return broadcastCfdState({
    ...DEFAULT_CFD_STATE,
    updatedAt: Date.now(),
  });
}

/**
 * Subscribe to CFD state changes
 */
export function subscribeCfdState(callback: (state: CfdState) => void): () => void {
  if (typeof window === "undefined") return () => {};

  // BroadcastChannel listener
  const channel = getChannel();
  const handleMessage = (e: MessageEvent) => {
    if (e.data) {
      callback(e.data);
    }
  };

  if (channel) {
    channel.addEventListener("message", handleMessage);
  }

  // Window event listener
  const handleCustomEvent = (e: Event) => {
    const ce = e as CustomEvent<CfdState>;
    if (ce.detail) {
      callback(ce.detail);
    }
  };
  window.addEventListener(CFD_EVENT_NAME, handleCustomEvent);

  // Storage listener (for cross-window sync across tabs)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === CFD_STORAGE_KEY && e.newValue) {
      try {
        callback(JSON.parse(e.newValue));
      } catch {
        // Ignore
      }
    }
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    if (channel) {
      channel.removeEventListener("message", handleMessage);
    }
    window.removeEventListener(CFD_EVENT_NAME, handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
  };
}

/**
 * Generate standard LankaQR dynamic payload string for cafe payments
 */
export function generateLankaQrPayload(amount: number, reference: string): string {
  const formattedAmount = amount.toFixed(2);
  const cleanRef = reference.replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
  // Standard EMVCo / LankaQR format for Merchant Lilly's Restaurant & Cafe
  return `00020101021226500010COM.LANKAQR0108LILLYS010210000000005204581253031445405${formattedAmount}5802LK5928LILLYS RESTAURANT AND CAFE6010BALAPITIYA62190115${cleanRef}6304`;
}
