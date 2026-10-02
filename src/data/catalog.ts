// Catalogue-driven content. In production this is replaced by the commerce
// platform / CMS (see brief §15–17); the UI only depends on these shapes.
// NOTE: prices, ratings and reviews below are SAMPLE placeholders, not real data.

export type Tone = "sage" | "sand" | "sky" | "blush" | "ink";
export type VisualKind =
  | "stand"
  | "holder"
  | "privacy"
  | "cable"
  | "charger"
  | "lamp";

export interface Category {
  slug: string;
  name: string;
  blurb: string;
  tone: Tone;
  kind: VisualKind;
  live: boolean;
}

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  price: number;
  compareAt?: number;
  rating: number;
  reviews: number;
  kind: VisualKind;
  tone: Tone;
  badge?: "New" | "Bestseller" | "Bundle";
  collection: "best" | "new";
  inStock: boolean;
}

export const categories: Category[] = [
  { slug: "tech-workspace", name: "Tech & Workspace", blurb: "Stands, holders, screens & desk gear", tone: "sage", kind: "stand", live: true },
  { slug: "home-kitchen", name: "Home & Kitchen", blurb: "Smarter ways to run the house", tone: "sand", kind: "lamp", live: false },
  { slug: "pet-supplies", name: "Pet Supplies", blurb: "Grooming, toys & smart accessories", tone: "blush", kind: "holder", live: false },
  { slug: "fitness-wellness", name: "Fitness & Wellness", blurb: "Bands, mats & recovery tools", tone: "sky", kind: "charger", live: false },
];

export const products: Product[] = [
  { slug: "aero-laptop-stand", name: "Aero Laptop Stand", tagline: "Six angles. Folds flat.", category: "Tech & Workspace", price: 1499, compareAt: 1999, rating: 4.8, reviews: 214, kind: "stand", tone: "sage", badge: "Bestseller", collection: "best", inStock: true },
  { slug: "flex-phone-holder", name: "Flex Phone Holder", tagline: "Desk-clamp, any angle.", category: "Tech & Workspace", price: 699, rating: 4.6, reviews: 158, kind: "holder", tone: "sand", collection: "best", inStock: true },
  { slug: "privacy-screen-14", name: "Privacy Screen Filter", tagline: "Your screen, your eyes only.", category: "Tech & Workspace", price: 1899, compareAt: 2399, rating: 4.7, reviews: 96, kind: "privacy", tone: "sky", badge: "New", collection: "new", inStock: true },
  { slug: "tidy-cable-box", name: "Tidy Cable Box", tagline: "Hide the clutter in one go.", category: "Tech & Workspace", price: 899, rating: 4.5, reviews: 121, kind: "cable", tone: "blush", collection: "best", inStock: true },
  { slug: "gan-65-charger", name: "GaN 65W Charger", tagline: "Laptop-ready, pocket-sized.", category: "Tech & Workspace", price: 2199, rating: 4.9, reviews: 187, kind: "charger", tone: "ink", badge: "New", collection: "new", inStock: true },
  { slug: "halo-desk-lamp", name: "Halo Desk Lamp", tagline: "Warm to cool, one touch.", category: "Tech & Workspace", price: 2499, compareAt: 2999, rating: 4.7, reviews: 73, kind: "lamp", tone: "sand", collection: "new", inStock: false },
];

export const reviews = [
  { name: "Aarav M.", role: "Product designer, Bengaluru", product: "Aero Laptop Stand", rating: 5, text: "Looks like it belongs on a design studio desk, not an import catalogue. My neck thanked me in a week." },
  { name: "Neha K.", role: "Remote analyst, Pune", product: "Tidy Cable Box", rating: 5, text: "The listing told me exactly what fits inside. It did. No surprises, which is rare online." },
  { name: "Rohan S.", role: "Engineering student, Delhi", product: "GaN 65W Charger", rating: 4, text: "Specs were clear and compatibility was spelled out. Charges my laptop and phone together." },
];

export const faqs = [
  { q: "How does Tarf choose its products?", a: "We start with a real everyday problem, then shortlist products that solve it well at a fair price. Each one is checked and explained before it earns a place in the catalogue." },
  { q: "What is your return policy?", a: "Return and warranty terms are shown on every product page and in our Help centre, so you know exactly where you stand before you buy." },
  { q: "How long will delivery take?", a: "You'll see an estimated delivery window on the product page and at checkout, based on your pincode." },
  { q: "Can I track my order without an account?", a: "Yes. Use your order number on the Track Order page. Creating an account is always optional." },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
