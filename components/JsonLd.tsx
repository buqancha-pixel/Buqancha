export function JsonLd({ data }: { data: unknown }) {
  // "<" belgisini qochiramiz — skript ichida xavfsiz
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
