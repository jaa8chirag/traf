import { products, type Tone, type VisualKind } from "./catalog";

export { inr, getProduct } from "./catalog";

export interface Collection {
  slug: string;
  name: string;
  headline: string;
  problem: string;
  tone: Tone;
  kind: VisualKind;
  products: string[];
}

export const collections: Collection[] = [
  { slug: "workspace", name: "Workspace", headline: "The desk that doesn't hurt.", problem: "Long days at a laptop shouldn't cost you your neck, your wrists or your focus. Raise the screen, clear the cables and light the space properly.", tone: "sage", kind: "stand", products: ["aero-laptop-stand", "tidy-cable-box", "halo-desk-lamp", "privacy-screen-14"] },
  { slug: "charge-and-carry", name: "Charge & Carry", headline: "Power that travels light.", problem: "Between commutes, cafés and client sites, your gear needs to keep up. Compact power and hands-free holders for life on the move.", tone: "ink", kind: "charger", products: ["gan-65-charger", "flex-phone-holder", "aero-laptop-stand"] },
  { slug: "gifting", name: "Gifting", headline: "Useful gifts people keep.", problem: "Skip the forgettable. These are practical, good-looking pieces that get used every day.", tone: "blush", kind: "lamp", products: ["halo-desk-lamp", "aero-laptop-stand", "flex-phone-holder"] },
];

export const bundles = [
  { slug: "workspace-set", name: "The Workspace Set", collection: "workspace", products: ["aero-laptop-stand", "tidy-cable-box", "halo-desk-lamp"], saving: 500 },
  { slug: "travel-set", name: "The Travel Set", collection: "charge-and-carry", products: ["gan-65-charger", "flex-phone-holder"], saving: 250 },
];

// SAMPLE promo for UI demonstration only.
export const promos: Record<string, number> = { WELCOME10: 0.1 };

export const helpTopics = [
  { id: "orders", title: "Orders & tracking", items: [
    { q: "How do I track my order?", a: "Open Track Order and enter your order number. You'll see each step from confirmation to delivery." },
    { q: "Can I change or cancel my order?", a: "Contact us as soon as possible. If your order hasn't been packed yet, we can usually update or cancel it." },
  ] },
  { id: "shipping", title: "Shipping", items: [
    { q: "How long does delivery take?", a: "The estimated delivery window is shown on each product page and at checkout, based on your pincode." },
    { q: "Do you charge for shipping?", a: "Any shipping charge is shown clearly in your cart and at checkout before you pay." },
  ] },
  { id: "returns", title: "Returns & refunds", items: [
    { q: "What is the return policy?", a: "Read our Refund Policy for eligibility and timelines. If something isn't right, contact us and we'll help." },
    { q: "When will I get my refund?", a: "Once a return is received and inspected, we notify you and process the refund to your original payment method." },
  ] },
  { id: "warranty", title: "Warranty & product support", items: [
    { q: "Do products come with a warranty?", a: "Warranty details are listed in the specifications on each product page." },
    { q: "My product isn't working. What now?", a: "Contact support with your order number and a short description or photo. We'll arrange a fix or replacement." },
  ] },
  { id: "payments", title: "Payments", items: [
    { q: "Which payment methods are accepted?", a: "UPI, cards and net banking, once the payment gateway is connected. Available options are shown at checkout." },
    { q: "Is my payment secure?", a: "Payments are handled by a PCI-compliant payment provider. Tarf never stores your card details." },
  ] },
];

export const policies: Record<string, { title: string; updated: string; sections: { h: string; p: string }[] }> = {
  "privacy-policy": { title: "Privacy Policy", updated: "1 October 2026", sections: [
    { h: "Information we collect", p: "We collect the details you give us at checkout and when you contact us, such as name, email, phone number and delivery address, along with basic usage data to improve the site." },
    { h: "How we use it", p: "To process and deliver orders, provide support, send order updates and, only with your consent, share news and offers." },
    { h: "Sharing", p: "We share data only with service providers needed to fulfil your order (payments, logistics, messaging). We do not sell your personal information." },
    { h: "Your choices", p: "You can ask to access, correct or delete your data, or unsubscribe from marketing at any time via the Contact page." },
  ] },
  terms: { title: "Terms & Conditions", updated: "1 October 2026", sections: [
    { h: "Using this site", p: "By browsing or buying from Tarf you agree to these terms. Product information, prices and availability may change without notice." },
    { h: "Orders", p: "An order is confirmed when you receive an order confirmation. We may cancel orders affected by pricing errors or stock issues and will refund any payment." },
    { h: "Liability", p: "To the extent permitted by law, Tarf is not liable for indirect losses arising from use of the site or products." },
  ] },
  "refund-policy": { title: "Refund & Returns Policy", updated: "1 October 2026", sections: [
    { h: "Eligibility", p: "Products can be returned in their original condition and packaging within the return window stated at purchase. Final policy to be confirmed before launch." },
    { h: "Damaged or faulty items", p: "If your item arrives damaged or stops working, contact us with your order number and we'll arrange a replacement or refund." },
    { h: "Refunds", p: "Approved refunds are issued to the original payment method after the returned item is received and inspected." },
  ] },
  "shipping-policy": { title: "Shipping Policy", updated: "1 October 2026", sections: [
    { h: "Delivery estimates", p: "Estimated delivery dates depend on your pincode and the logistics partner, and are shown before you pay." },
    { h: "Tracking", p: "Once your order ships, you can follow it on the Track Order page." },
    { h: "Delays", p: "Weather, strikes or carrier issues can cause delays. We will keep you informed if your order is affected." },
  ] },
  "cookie-policy": { title: "Cookie Policy", updated: "1 October 2026", sections: [
    { h: "What we use", p: "Essential cookies keep your cart working. Analytics cookies, only with consent, help us understand how the site is used." },
    { h: "Managing cookies", p: "You can block or delete cookies in your browser settings, though parts of the site may not work without essential ones." },
  ] },
};

// SAMPLE product detail copy (replace with catalogue/CMS data).
export const details: Record<string, { desc: string; highlights: string[]; specs: [string, string][]; includes: string[] }> = {
  "aero-laptop-stand": { desc: "Raise your screen to eye level and give your wrists room to work. Folds flat to slip into a bag.", highlights: ["Six height angles", "Folds flat for travel", "Non-slip silicone grips"], specs: [["Material", "Aluminium alloy"], ["Fits", "Laptops 11–16 in"], ["Weight", "Approx. 280 g"], ["Warranty", "6 months"]], includes: ["Stand", "Carry pouch", "Quick-start card"] },
  "flex-phone-holder": { desc: "A sturdy desk clamp with a flexible arm that holds your phone at any angle for calls, recipes and video.", highlights: ["Clamp fits most desks", "Flexible 360° arm", "Fits phones 4–7 in"], specs: [["Material", "ABS + silicone"], ["Clamp range", "Up to 55 mm"], ["Arm length", "Approx. 40 cm"], ["Warranty", "6 months"]], includes: ["Holder", "Clamp base", "Instruction card"] },
  "privacy-screen-14": { desc: "Keeps side-angle viewers from reading your screen, so you can work in cafés, trains and open offices.", highlights: ["Narrow viewing angle", "Anti-glare finish", "Reusable, no residue"], specs: [["Size", "14 in (16:9)"], ["Type", "Removable filter"], ["Thickness", "Approx. 0.3 mm"], ["Warranty", "6 months"]], includes: ["Filter", "Mounting tabs", "Cleaning cloth"] },
  "tidy-cable-box": { desc: "Hides power strips and tangled cables in one neat box with ventilation and cable slots on both sides.", highlights: ["Fits standard power strips", "Ventilated body", "Cable slots both sides"], specs: [["Material", "Flame-retardant ABS"], ["Dimensions", "Approx. 32×13×13 cm"], ["Colour", "White"], ["Warranty", "6 months"]], includes: ["Cable box", "Cable ties", "Quick-start card"] },
  "gan-65-charger": { desc: "Charges a laptop and a phone together from a pocket-sized block, with two ports and smart power sharing.", highlights: ["65 W max output", "2 ports (USB-C + USB-A)", "Compact GaN design"], specs: [["Output", "65 W"], ["Ports", "USB-C, USB-A"], ["Input", "100–240 V"], ["Warranty", "12 months"]], includes: ["Charger", "1 m USB-C cable", "Manual"] },
  "halo-desk-lamp": { desc: "A soft, even desk light with adjustable warmth and brightness, controlled with a single touch.", highlights: ["Warm to cool light", "Touch dimming", "Flexible arm"], specs: [["Power", "Approx. 10 W"], ["Colour temp.", "2700–6000 K"], ["Power input", "USB-C"], ["Warranty", "12 months"]], includes: ["Lamp", "USB-C cable", "Manual"] },
};

export const productSlugs = products.map((p) => p.slug);
