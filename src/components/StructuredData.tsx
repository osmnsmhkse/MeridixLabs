import { SITE, SITE_URL, socialLinks } from "@/lib/site";
import { jsonLdString } from "@/lib/jsonld";

/**
 * Site-wide JSON-LD structured data.
 *
 * Declares the Meridix Labs *entity* to search engines: the Organization, its
 * logo, founder, and the social profiles it owns (`sameAs`), plus the WebSite
 * it publishes. This is the strongest on-page signal for getting meridixlabs.com
 * to rank #1 for the brand name and for stopping the "Did you mean: meridian labs"
 * autocorrect — it tells Google that "Meridix Labs" / "meridixlabs" is a real
 * entity tied to this domain and these profiles.
 */
export default function StructuredData({ nonce }: { nonce?: string }) {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE.name,
        alternateName: SITE.alternateNames,
        url: SITE.url,
        logo: {
          "@type": "ImageObject",
          "@id": `${SITE_URL}/#logo`,
          url: SITE.logo,
          width: 512,
          height: 512,
          caption: SITE.name,
        },
        image: { "@id": `${SITE_URL}/#logo` },
        description: SITE.description,
        email: SITE.email,
        founder: {
          "@type": "Person",
          name: SITE.founder,
        },
        sameAs: socialLinks,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE.url,
        name: SITE.name,
        description: SITE.description,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // jsonLdString() escapes `<` so the payload can't break out of the tag.
      dangerouslySetInnerHTML={{ __html: jsonLdString(graph) }}
    />
  );
}
