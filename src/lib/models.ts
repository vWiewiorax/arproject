export type ModelStatus = "active" | "draft";

export type ArModel = {
  id: string;
  name: string;
  status: ModelStatus;
  scans: number;
  createdAt: string;
  fileSize: string;
  polygons: string;
  slug: string;
};

export const models: ArModel[] = [
  { id: "nike-sneaker", name: "Nike Sneaker", status: "active", scans: 3412, createdAt: "2026-08-14", fileSize: "4.2 MB", polygons: "48k", slug: "k7x2p" },
  { id: "coffee-mug", name: "Coffee Mug", status: "active", scans: 1288, createdAt: "2026-08-21", fileSize: "1.8 MB", polygons: "12k", slug: "m3ug9" },
  { id: "desk-lamp", name: "Desk Lamp", status: "draft", scans: 0, createdAt: "2026-09-02", fileSize: "3.1 MB", polygons: "31k", slug: "l4mp1" },
  { id: "leather-bag", name: "Leather Handbag", status: "active", scans: 2764, createdAt: "2026-09-05", fileSize: "5.6 MB", polygons: "62k", slug: "b4g7q" },
  { id: "ceramic-vase", name: "Ceramic Vase", status: "active", scans: 947, createdAt: "2026-09-11", fileSize: "2.4 MB", polygons: "22k", slug: "v4s3z" },
  { id: "headphones", name: "Wireless Headphones", status: "draft", scans: 0, createdAt: "2026-09-18", fileSize: "3.9 MB", polygons: "41k", slug: "h3dp8" },
  { id: "sunglasses", name: "Aviator Sunglasses", status: "active", scans: 1603, createdAt: "2026-09-22", fileSize: "1.2 MB", polygons: "9k", slug: "s9ngl" },
  { id: "armchair", name: "Velvet Armchair", status: "active", scans: 2466, createdAt: "2026-09-27", fileSize: "7.8 MB", polygons: "85k", slug: "ch41r" },
];

export const getModel = (id: string) => models.find((m) => m.id === id);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const shortUrl = (slug: string) => `ar.yourdomain.com/${slug}`;

export function scanSeries(seed: string, days = 30) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  return Array.from({ length: days }, (_, i) => Math.round(20 + i * 2.2 + rand() * 40 + Math.sin(i / 3) * 10));
}
