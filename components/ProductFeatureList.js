import {
  BadgeCheck,
  CheckCircle2,
  Droplets,
  Feather,
  Flower2,
  Leaf,
  PackageCheck,
  PencilLine,
  Ruler,
  ShieldCheck,
  Sparkles,
  Wind,
} from 'lucide-react';

function splitIntoFeatures(value) {
  const source = String(value || '').replace(/\s+/g, ' ').trim();
  if (!source) return [];

  const sentences = source.split(/(?<=[.!?])\s+/).filter(Boolean);
  const features = [];

  for (const sentence of sentences) {
    const commaParts = sentence.split(/,\s*/);
    const parts = commaParts.length >= 3
      ? commaParts.flatMap((part, index) => index === commaParts.length - 1
        ? part.split(/\s+and\s+/i)
        : [part])
      : [sentence];

    for (let part of parts) {
      part = part
        .replace(/^\s*(?:and|also)\s+/i, '')
        .replace(/\s+as (?:the )?(?:key )?features? of the .+$/i, '')
        .replace(/\s+as listed features?\s*$/i, '')
        .replace(/[.;,]+\s*$/g, '')
        .trim();
      if (part.length > 2 && !features.some((item) => item.toLowerCase() === part.toLowerCase())) {
        features.push(part);
      }
    }
  }

  return features;
}

function iconForFeature(feature) {
  const value = feature.toLowerCase();
  if (/anti.?bacterial|hygiene|infection|shield|leak|leak.?lock|guard/.test(value)) return ShieldCheck;
  if (/gel|absorb|moisture|dry cover|dry-net|wetness|sap|channel/.test(value)) return Droplets;
  if (/odou?r|fresh|breathable|scent/.test(value)) return Wind;
  if (/wing/.test(value)) return Feather;
  if (/cotton|soft|fabric|material/.test(value)) return Leaf;
  if (/embroider|floral|daisy|butterfly|lotus|hummingbird|wildflower/.test(value)) return Flower2;
  if (/name|personal|custom/.test(value)) return PencilLine;
  if (/size|mm|cm|dimension|length|wide|high|deep/.test(value)) return Ruler;
  if (/pack|pieces|pads|pcs/.test(value)) return PackageCheck;
  if (/layer|protection/.test(value)) return BadgeCheck;
  if (/fresh|cool/.test(value)) return Sparkles;
  return CheckCircle2;
}

export default function ProductFeatureList({ description, compact = false, maxItems = 3 }) {
  const features = splitIntoFeatures(description);
  const visible = compact ? features.slice(0, maxItems) : features;
  if (!visible.length) return null;

  return (
    <ul className={compact ? 'mt-2 space-y-1.5' : 'mt-3 space-y-3'}>
      {visible.map((feature, index) => {
        const Icon = iconForFeature(feature);
        return (
          <li key={index} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="font-medium">{feature}</span>
          </li>
        );
      })}
      {compact && features.length > visible.length && (
        <li className="pl-6 text-xs font-semibold text-primary">+{features.length - visible.length} more features</li>
      )}
    </ul>
  );
}
