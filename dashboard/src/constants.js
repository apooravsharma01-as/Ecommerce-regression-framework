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
  }
];

export const PIPELINE_STEPS = [
  { id: 'impact', label: 'Impact Analysis', icon: '🔍' },
  { id: 'generate', label: 'Test Generation', icon: '⚡' },
  { id: 'select', label: 'Smart Selection', icon: '🎯' },
  { id: 'execute', label: 'Playwright Run', icon: '🚀' },
  { id: 'report', label: 'Allure Report', icon: '📈' }
];
