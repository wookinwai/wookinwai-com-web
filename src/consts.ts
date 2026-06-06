// Single source of truth for site chrome (header nav + footer). Header and
// Footer both read from here so there's one place to edit links/identity.

export const SITE = {
  author: 'Woo Kin Wai',
  org: 'Tiny Edges',
  orgUrl: 'https://www.tinyedges.com/',
  location: 'Kuala Lumpur',
  email: 'hello@wookinwai.com',
} as const;

// Section links point at the homepage (`/#id`) so they work from ANY page —
// e.g. clicking "Work" on /blog navigates home and scrolls to the section.
export const NAV: { label: string; href: string }[] = [
  { label: 'Work', href: '/#work' },
  { label: 'Process', href: '/#process' },
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/#contact' },
  { label: 'Blog', href: '/blog' },
];

export const SOCIALS: { label: string; href: string }[] = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/wookinwai/' },
];
