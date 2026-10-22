import { CreditCard, FileText, LayoutDashboard, MonitorSmartphone, ReceiptText, Settings, Users } from 'lucide-react'

// Single source of truth for the sidebar, page titles and breadcrumbs.
// Every route that existed before the redesign is reachable from here.
export const NAV = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', to: '/layout', icon: LayoutDashboard, match: (path) => path === '/layout' || path === '/layout/' },
    ],
  },
  {
    section: 'Customers',
    items: [
      {
        label: 'Devices',
        to: '/layout/customer?tab=devices',
        icon: MonitorSmartphone,
        alertIds: ['expiring', 'expired'],
        match: (path, params) => path === '/layout/customer' && params.get('tab') === 'devices',
      },
      {
        label: 'Transactions',
        to: '/layout/customer?tab=transactions',
        icon: ReceiptText,
        match: (path, params) => path === '/layout/customer' && params.get('tab') !== 'devices',
      },
    ],
  },
  {
    section: 'Partners',
    items: [
      { label: 'Resellers', to: '/layout/reseller', icon: Users, match: (path) => path.startsWith('/layout/reseller') },
    ],
  },
  {
    section: 'Configuration',
    items: [
      {
        label: 'Pricing & payments',
        to: '/layout/activation',
        icon: CreditCard,
        alertIds: ['payment-keys', 'price'],
        match: (path) => path === '/layout/activation',
      },
      { label: 'App content', to: '/layout/editContent', icon: FileText, match: (path) => path === '/layout/editContent' },
    ],
  },
  {
    section: 'Account',
    items: [{ label: 'Settings', to: '/layout/setting', icon: Settings, match: (path) => path === '/layout/setting' }],
  },
]

/** Section + title (+ optional parent link) for the current location. */
export function getPageMeta(pathname, params) {
  if (pathname.startsWith('/layout/reseller/resellerCustomer/')) {
    return { section: 'Partners', parent: { label: 'Resellers', to: '/layout/reseller' }, title: 'Reseller customers' }
  }
  if (pathname === '/layout/providerCustomer') return { section: 'Customers', title: 'Provider customers' }
  for (const group of NAV) {
    const item = group.items.find((i) => i.match(pathname, params))
    if (item) return { section: group.section, title: item.label }
  }
  return { section: '', title: 'Servo' }
}
