import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://finanzapp.de';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.8 },
    { url: `${base}/register`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.9 },
    { url: `${base}/impressum`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/datenschutz`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/agb`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];
}
