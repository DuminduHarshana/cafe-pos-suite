export interface Staff {
  id: string;
  name: string;
  role: string;
  avatar?: string | null;
}

export interface ModifierOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  isRequired: boolean;
  options: ModifierOption[];
}

export interface ItemModifierGroup {
  modifierGroup: ModifierGroup;
}

export interface RecipeItem {
  id: string;
  quantity: number;
  unit: string;
  inventoryItem: {
    id: string;
    name: string;
    currentStock: number;
    unit: string;
  };
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  costPrice: number;
  image?: string | null;
  categoryId: string;
  category?: { id: string; name: string };
  isAvailable: boolean;
  prepTimeMinutes: number;
  modifierGroups?: ItemModifierGroup[];
  recipeItems?: RecipeItem[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
  items: MenuItem[];
}

export interface CartItem {
  id: string; // unique cart line id
  menuItemId: string;
  menuItemName: string;
  unitPrice: number;
  quantity: number;
  selectedModifiers: string[];
  total: number;
  notes?: string;
}

export interface Table {
  id: string;
  number: string;
  name: string;
  section: string;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "BILLED";
  orders?: Order[];
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  notes?: string | null;
  status: string;
  selectedModifiers?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  tableId?: string | null;
  table?: Table | null;
  status: "PENDING" | "PREPARING" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED";
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
  paymentMethod?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  staff?: Staff | null;
  items: OrderItem[];
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  currentStock: number;
  minStockAlert: number;
  costPerUnit: number;
  supplierName?: string | null;
  recipes?: { menuItem: { id: string; name: string } }[];
  transactions?: {
    id: string;
    type: string;
    quantity: number;
    reason: string | null;
    staffName: string | null;
    createdAt: string;
  }[];
}
