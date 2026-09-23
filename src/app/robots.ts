import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/learn', '/library'],
        disallow: ['/api/', '/onboarding/', '/dashboard/', '/progress/', '/profile/'],
      },
    ],
  };
}
