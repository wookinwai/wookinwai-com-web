// Single source of truth for site chrome (header nav + footer). Header and
// Footer both read from here so there's one place to edit links/identity.

export const SITE = {
  author: 'Woo Kin Wai',
  role: 'Software builder & technical partner',
  org: 'Tiny Edges',
  orgUrl: 'https://www.tinyedges.com/',
  location: 'Kuala Lumpur',
  email: 'hello@wookinwai.com',
  // Canonical base — matches the fallback in SEO.astro. The /card QR encodes this.
  url: 'https://www.wookinwai.com',
} as const;

// Section links point at the homepage (`/#id`) so they work from ANY page —
// e.g. clicking "Work" on /notes navigates home and scrolls to the section.
export const NAV: { label: string; href: string }[] = [
  { label: 'Work', href: '/#work' },
  { label: 'Process', href: '/#process' },
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Notes', href: '/notes' },
];

export const SOCIALS: { label: string; href: string }[] = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/wookinwai/' },
];

// Source of truth for the digital business card (/card). Kept separate from
// SOCIALS so the footer chip set stays untouched. `icon` keys map to SocialIcon.
export type IconName = 'email' | 'linkedin' | 'x' | 'facebook' | 'instagram' | 'studio';
export const PROFILE_LINKS: {
  label: string;
  value: string;
  href: string;
  icon: IconName;
  external?: boolean;
}[] = [
  { label: 'Email', value: SITE.email, href: `mailto:${SITE.email}`, icon: 'email' },
  { label: 'LinkedIn', value: 'linkedin.com/in/wookinwai', href: 'https://linkedin.com/in/wookinwai', icon: 'linkedin', external: true },
  { label: 'X', value: 'x.com/wookinwai', href: 'https://twitter.com/wookinwai', icon: 'x', external: true },
  { label: 'Facebook', value: 'facebook.com/wookinwai', href: 'https://facebook.com/wookinwai', icon: 'facebook', external: true },
  { label: 'Instagram', value: 'instagram.com/wookinwai', href: 'https://instagram.com/wookinwai', icon: 'instagram', external: true },
  { label: 'Tiny Edges', value: 'tinyedges.com', href: SITE.orgUrl, icon: 'studio', external: true },
];
