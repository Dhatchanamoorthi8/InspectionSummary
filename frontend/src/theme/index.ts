import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';
import { qcColors, chakraColors } from './colors';

// Helper to convert plain color palette objects to Chakra v3 { value: string } token format
function wrapTokenValues(obj: any): any {
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      result[key] = { value: val };
    } else if (typeof val === 'object' && val !== null) {
      result[key] = wrapTokenValues(val);
    }
  }
  return result;
}

const rawColors = {
  qc: qcColors,
  ...chakraColors,
  brand: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#2563EB',
    600: '#1D4ED8',
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#172554',
  },
  industrial: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#090D16',
  },
};

const rawSemanticTokens = {
  // Backgrounds
  bg: { default: '{colors.gray.50}', _dark: '{colors.gray.900}' },
  'bg.subtle': { default: '{colors.gray.50}', _dark: '{colors.gray.850}' },
  'bg.muted': { default: '{colors.gray.100}', _dark: '{colors.gray.800}' },
  'bg.emphasized': { default: '{colors.gray.200}', _dark: '{colors.gray.700}' },
  'bg.inverted': { default: '{colors.gray.900}', _dark: 'white' },
  'bg.panel': { default: 'white', _dark: '{colors.gray.900}' },
  'bg.error': { default: '{colors.red.50}', _dark: 'rgba(239, 68, 68, 0.2)' },
  'bg.warning': { default: '{colors.orange.50}', _dark: 'rgba(249, 115, 22, 0.2)' },
  'bg.success': { default: '{colors.green.50}', _dark: 'rgba(34, 197, 94, 0.2)' },
  'bg.info': { default: '{colors.blue.50}', _dark: 'rgba(59, 130, 246, 0.2)' },

  // Foregrounds
  fg: { default: '{colors.industrial.900}', _dark: '{colors.gray.100}' },
  'fg.default': { default: '{colors.industrial.900}', _dark: '{colors.gray.100}' },
  'fg.muted': { default: '{colors.gray.600}', _dark: '{colors.gray.400}' },
  'fg.subtle': { default: '{colors.gray.400}', _dark: '{colors.gray.500}' },
  'fg.inverted': { default: 'white', _dark: '{colors.gray.900}' },
  'fg.error': { default: '{colors.red.600}', _dark: '{colors.red.400}' },
  'fg.warning': { default: '{colors.orange.600}', _dark: '{colors.orange.400}' },
  'fg.success': { default: '{colors.green.600}', _dark: '{colors.green.400}' },
  'fg.info': { default: '{colors.blue.600}', _dark: '{colors.blue.400}' },

  // Borders
  border: { default: '{colors.industrial.200}', _dark: '{colors.gray.700}' },
  'border.default': { default: '{colors.industrial.200}', _dark: '{colors.gray.700}' },
  'border.muted': { default: '{colors.industrial.100}', _dark: '{colors.gray.800}' },
  'border.subtle': { default: '{colors.industrial.100}', _dark: '{colors.gray.750}' },
  'border.emphasized': { default: '{colors.industrial.300}', _dark: '{colors.gray.600}' },
  'border.inverted': { default: '{colors.gray.900}', _dark: 'white' },
  'border.error': { default: '{colors.red.300}', _dark: '{colors.red.600}' },
  'border.warning': { default: '{colors.orange.300}', _dark: '{colors.orange.600}' },
  'border.success': { default: '{colors.green.300}', _dark: '{colors.green.600}' },
  'border.info': { default: '{colors.blue.300}', _dark: '{colors.blue.600}' },

  // Status
  'status.ok': { default: '#2E7D32', _dark: '#2E7D32' },
  'status.ok.light': { default: '#E8F5E9', _dark: 'rgba(22, 101, 52, 0.3)' },
  'status.ok.border': { default: '#81C784', _dark: '#22c55e' },
  'status.ok.text': { default: '#1B5E20', _dark: '#bbf7d0' },
  'status.notOk': { default: '#D32F2F', _dark: '#D32F2F' },
  'status.notOk.light': { default: '#FFEBEE', _dark: 'rgba(153, 27, 27, 0.3)' },
  'status.notOk.border': { default: '#E57373', _dark: '#ef4444' },
  'status.notOk.text': { default: '#B71C1C', _dark: '#fca5a5' },
  'status.pending': { default: '#ED6C02', _dark: '#ED6C02' },
  'status.pending.light': { default: '#FFF3E0', _dark: 'rgba(194, 65, 12, 0.3)' },
  'status.pending.border': { default: '#FFB74D', _dark: '#f97316' },
  'status.pending.text': { default: '#E65100', _dark: '#fed7aa' },
  'status.draft': { default: '#757575', _dark: '#757575' },
  'status.draft.light': { default: '#F5F5F5', _dark: 'rgba(71, 85, 105, 0.3)' },
  'status.draft.border': { default: '#BDBDBD', _dark: '#71717a' },
  'status.draft.text': { default: '#424242', _dark: '#d4d4d8' },

  // Surfaces & text
  'surface.bg': { default: '{colors.gray.50}', _dark: '{colors.gray.900}' },
  'surface.card': { default: 'white', _dark: '{colors.gray.800}' },
  'surface.cardMuted': { default: '{colors.gray.50}', _dark: '{colors.gray.850}' },
  'surface.header': { default: 'white', _dark: '{colors.gray.900}' },
  'surface.sidebar': { default: 'white', _dark: '{colors.gray.900}' },
  'surface.border': { default: '{colors.gray.200}', _dark: '{colors.gray.800}' },
  'surface.tableHeader': { default: '{colors.gray.50}', _dark: '{colors.gray.900}' },
  'surface.tableRowHover': { default: '{colors.gray.50}', _dark: '{colors.gray.800}' },
  'surface.input': { default: 'white', _dark: '{colors.gray.900}' },
  'text.primary': { default: '{colors.industrial.900}', _dark: '{colors.gray.100}' },
  'text.secondary': { default: '{colors.gray.600}', _dark: '{colors.gray.400}' },
  'text.muted': { default: '{colors.gray.400}', _dark: '{colors.gray.500}' },
};

const formattedSemanticColors: any = {};
for (const [key, val] of Object.entries(rawSemanticTokens)) {
  formattedSemanticColors[key] = {
    value: {
      _light: val.default,
      _dark: val._dark,
    },
  };
}

const config = defineConfig({
  globalCss: {
    'html, body': {
      bg: { _light: 'gray.50', _dark: 'gray.900' },
      color: { _light: 'gray.900', _dark: 'gray.100' },
      minHeight: '100vh',
    },
    // Emil Kowalski Design Engineering: Snappy tactile button press & exact transitions
    'button, [role="button"]': {
      transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1), background-color 150ms ease-out, border-color 150ms ease-out, box-shadow 150ms ease-out',
      WebkitTapHighlightColor: 'transparent',
    },
    'button:not(:disabled):active, [role="button"]:not([aria-disabled="true"]):active': {
      transform: 'scale(0.97)',
      transition: 'transform 80ms cubic-bezier(0.23, 1, 0.32, 1)',
    },
    // Smooth, precise card hover states without layout shift
    '.chakra-card': {
      transition: 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 160ms ease-out, border-color 160ms ease-out',
    },
    // Dialog modal entrance: natural subtle scale with strong ease-out (<200ms)
    '[data-scope="dialog"][data-part="content"]': {
      animationDuration: '180ms !important',
      animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1) !important',
    },
    '[data-scope="dialog"][data-part="backdrop"]': {
      animationDuration: '180ms !important',
      animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1) !important',
    },
    // Popover / Datepicker positioning
    '[data-scope="date-picker"][data-part="content"]': {
      animationDuration: '160ms !important',
      animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1) !important',
    },
  },
  theme: {
    tokens: {
      colors: wrapTokenValues(rawColors),
      fonts: {
        heading: {
          value: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
        },
        body: {
          value: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
        },
        mono: {
          value: `'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
        },
      },
    },
    semanticTokens: {
      colors: formattedSemanticColors,
    },
  },
});

export const system = createSystem(defaultConfig, config);
export default system;
