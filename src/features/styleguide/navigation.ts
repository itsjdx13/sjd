export interface NavItem {
  name: string
  href: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navigation: NavSection[] = [
  {
    title: "Foundation",
    items: [{ name: "Design tokens", href: "/styleguide" }],
  },
  {
    title: "Components",
    items: [],
  },
]
