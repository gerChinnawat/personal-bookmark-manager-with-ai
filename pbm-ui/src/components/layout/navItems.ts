export interface NavItem {
  label: string
  path: string
}

export const navItems: NavItem[] = [
  { label: 'Collections', path: '/collections' },
  { label: 'Bookmarks', path: '/bookmarks' },
  { label: 'All', path: '/all' },
]
