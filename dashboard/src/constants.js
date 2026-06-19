export const DOMAIN_COLORS = {
  'product-creation': {
    bg: 'bg-violet-500/15',
    text: 'text-violet-300',
    border: 'border-violet-500/30',
    dot: 'bg-violet-400'
  },
  'sale-order': {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-300',
    border: 'border-cyan-500/30',
    dot: 'bg-cyan-400'
  },
  'login-auth': {
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400'
  },
  'vendor-catalog': {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400'
  },
  inventory: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-300',
    border: 'border-rose-500/30',
    dot: 'bg-rose-400'
  },
  dispatch: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-300',
    border: 'border-orange-500/30',
    dot: 'bg-orange-400'
  },
  shipment: {
    bg: 'bg-sky-500/15',
    text: 'text-sky-300',
    border: 'border-sky-500/30',
    dot: 'bg-sky-400'
  },
  picking: {
    bg: 'bg-teal-500/15',
    text: 'text-teal-300',
    border: 'border-teal-500/30',
    dot: 'bg-teal-400'
  },
  packing: {
    bg: 'bg-fuchsia-500/15',
    text: 'text-fuchsia-300',
    border: 'border-fuchsia-500/30',
    dot: 'bg-fuchsia-400'
  },
  putaway: {
    bg: 'bg-lime-500/15',
    text: 'text-lime-300',
    border: 'border-lime-500/30',
    dot: 'bg-lime-400'
  },
  grn: {
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-300',
    border: 'border-yellow-500/30',
    dot: 'bg-yellow-400'
  },
  returns: {
    bg: 'bg-red-500/15',
    text: 'text-red-300',
    border: 'border-red-500/30',
    dot: 'bg-red-400'
  }
};

export const DEFAULT_DOMAIN_STYLE = {
  bg: 'bg-indigo-500/15',
  text: 'text-indigo-300',
  border: 'border-indigo-500/30',
  dot: 'bg-indigo-400'
};

export const DEMO_PRESETS = [
  {
    label: 'GST / Product',
    story: 'GST validation changed for product creation',
    simulate:
      'UniwareCore/src/main/java/com/uniware/core/entity/ItemType.java',
    icon: '📦'
  },
  {
    label: 'Sale Order',
    story: 'sale order creation flow changed',
    icon: '🛒'
  },
  {
    label: 'Vendor Catalog',
    story: 'vendor catalog mapping changed',
    icon: '🏪'
  },
  {
    label: 'Inventory',
    story: 'inventory snapshot stock level changed',
    icon: '📊'
  },
  {
    label: 'Dispatch / OMS',
    story: 'Dispatch manifest RTS shipment flow changed',
    icon: '🚚'
  }
];

export const PIPELINE_STEPS = [
  { id: 'impact', label: 'Impact Analysis', icon: '🔍' },
  { id: 'generate', label: 'Test Generation', icon: '⚡' },
  { id: 'select', label: 'Smart Selection', icon: '🎯' },
  { id: 'execute', label: 'Playwright Run', icon: '🚀' },
  { id: 'report', label: 'Allure Report', icon: '📈' }
];
