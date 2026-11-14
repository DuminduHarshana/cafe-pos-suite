import { Category, ModifierGroup, Table, Staff, Order } from "@/types";

const KEY_MENU = "lilly_pos_cache_menu";
const KEY_TABLES = "lilly_pos_cache_tables";
const KEY_STAFF = "lilly_pos_cache_staff";
const KEY_OFFLINE_ORDERS = "lilly_pos_offline_orders_queue";
const SYNC_EVENT = "lilly_pos_offline_sync_event";

export interface NetworkState {
  online: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt?: string | null;
}

// 1. Network Status
export function isDeviceOnline(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return true;
  return navigator.onLine;
}

// 2. Local Cache Helpers
export function setCachedMenu(data: { categories: Category[]; modifierGroups?: ModifierGroup[] }): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_MENU, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to cache menu locally:", err);
  }
}

export function getCachedMenu(): { categories: Category[]; modifierGroups: ModifierGroup[] } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_MENU);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      categories: parsed.categories || [],
      modifierGroups: parsed.modifierGroups || [],
    };
  } catch {
    return null;
  }
}

export function setCachedTables(tables: Table[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_TABLES, JSON.stringify(tables));
  } catch (err) {
    console.warn("Failed to cache tables locally:", err);
  }
}

export function getCachedTables(): Table[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_TABLES);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedStaff(staff: Staff[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_STAFF, JSON.stringify(staff));
  } catch (err) {
    console.warn("Failed to cache staff locally:", err);
  }
}

export function getCachedStaff(): Staff[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_STAFF);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// 3. Offline Order Queue Management
export function getOfflineOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY_OFFLINE_ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineOrders(orders: Order[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_OFFLINE_ORDERS, JSON.stringify(orders));
    notifySyncListeners();
  } catch (err) {
    console.error("Failed to save offline orders queue:", err);
  }
}

export function enqueueOfflineOrder(order: Order): void {
  const current = getOfflineOrders();
  // Prevent duplicate insertion
  if (!current.some((o) => o.id === order.id)) {
    const updated = [order, ...current];
    saveOfflineOrders(updated);
  }
}

export function removeOfflineOrder(orderId: string): void {
  const current = getOfflineOrders();
  const updated = current.filter((o) => o.id !== orderId);
  saveOfflineOrders(updated);
}

export function clearOfflineOrders(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_OFFLINE_ORDERS);
  notifySyncListeners();
}

export function getPendingOfflineCount(): number {
  return getOfflineOrders().length;
}

// 4. Notifications & Event Dispatcher
function notifySyncListeners(state?: Partial<NetworkState>): void {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  const detail: NetworkState = {
    online: isDeviceOnline(),
    pendingCount: getPendingOfflineCount(),
    isSyncing: false,
    ...state,
  };
  try {
    if (typeof CustomEvent !== "undefined") {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail }));
    }
  } catch {
    // Ignore in non-browser envs
  }
}

export function subscribeNetworkState(callback: (state: NetworkState) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleEvent = (e: Event) => {
    const custom = e as CustomEvent<NetworkState>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback({
        online: isDeviceOnline(),
        pendingCount: getPendingOfflineCount(),
        isSyncing: false,
      });
    }
  };

  const handleOnline = () => notifySyncListeners({ online: true });
  const handleOffline = () => notifySyncListeners({ online: false });

  window.addEventListener(SYNC_EVENT, handleEvent);
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Initial notify
  callback({
    online: isDeviceOnline(),
    pendingCount: getPendingOfflineCount(),
    isSyncing: false,
  });

  return () => {
    window.removeEventListener(SYNC_EVENT, handleEvent);
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

// 5. Cloud Synchronization
let isCurrentlySyncing = false;

export async function syncOfflineOrders(): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  total: number;
}> {
  if (typeof window === "undefined") return { success: true, synced: 0, failed: 0, total: 0 };
  if (!navigator.onLine) {
    return { success: false, synced: 0, failed: 0, total: getPendingOfflineCount() };
  }
  if (isCurrentlySyncing) {
    return { success: true, synced: 0, failed: 0, total: getPendingOfflineCount() };
  }

  const queue = getOfflineOrders();
  if (queue.length === 0) {
    return { success: true, synced: 0, failed: 0, total: 0 };
  }

  isCurrentlySyncing = true;
  notifySyncListeners({ isSyncing: true });

  let synced = 0;
  let failed = 0;

  for (const order of queue) {
    try {
      const payload = {
        type: order.type,
        tableId: order.tableId || null,
        customerName: order.customerName || "Offline Guest",
        customerPhone: order.customerPhone || null,
        staffId: order.staff?.id || null,
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        tip: order.tip,
        total: order.total,
        paymentMethod: order.paymentMethod || "CASH",
        paymentStatus: order.paymentStatus || "PAID",
        notes: (order.notes ? order.notes + " " : "") + `[Synced from Offline Terminal: ${order.orderNumber}]`,
        items: (order.items || []).map((ci) => {
          let mods: string[] | undefined;
          if (ci.selectedModifiers) {
            try {
              mods = typeof ci.selectedModifiers === "string" 
                ? JSON.parse(ci.selectedModifiers) 
                : ci.selectedModifiers;
            } catch {
              mods = [];
            }
          }
          return {
            menuItemId: ci.menuItemId || null,
            menuItemName: ci.menuItemName,
            unitPrice: ci.unitPrice,
            quantity: ci.quantity,
            total: ci.total,
            notes: ci.notes,
            selectedModifiers: mods,
          };
        }),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        removeOfflineOrder(order.id);
        synced++;
      } else {
        failed++;
      }
    } catch (err) {
      console.warn(`Sync failed for offline order ${order.orderNumber}:`, err);
      failed++;
    }
  }

  isCurrentlySyncing = false;
  notifySyncListeners({
    isSyncing: false,
    pendingCount: getPendingOfflineCount(),
    lastSyncedAt: new Date().toLocaleTimeString(),
  });

  return {
    success: failed === 0,
    synced,
    failed,
    total: queue.length,
  };
}
