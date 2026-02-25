import type { SkillOpportunity } from '@/lib/types';

export function detectSkillOpportunities(input: {
  incidents: Array<{ type: string; message: string; source: string }>;
  recommendations: Array<{ id: string; title: string; impact: 'low' | 'medium' | 'high'; confidence: number }>;
}): SkillOpportunity[] {
  const patternCounts = new Map<string, { count: number; source: string }>();

  for (const incident of input.incidents) {
    const key = `${incident.source}:${incident.type}`;
    const entry = patternCounts.get(key) || { count: 0, source: incident.source };
    entry.count += 1;
    patternCounts.set(key, entry);
  }

  const cards: SkillOpportunity[] = [];
  for (const [pattern, meta] of patternCounts.entries()) {
    if (meta.count < 2) continue;
    const payoffEstimate: SkillOpportunity['payoffEstimate'] =
      meta.count >= 6 ? 'high' : meta.count >= 3 ? 'medium' : 'low';

    cards.push({
      id: `skill-${pattern.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
      title: `Automate recurring ${pattern.split(':')[1]} workflow`,
      pattern,
      frequency: meta.count,
      payoffEstimate,
      confidence: Number(Math.min(0.95, 0.5 + meta.count * 0.06).toFixed(2))
    });
  }

  for (const rec of input.recommendations) {
    if (!/cron|pairing|memory/i.test(rec.id)) continue;
    cards.push({
      id: `skill-candidate-${rec.id}`,
      title: `Skill candidate from optimization: ${rec.title}`,
      pattern: rec.id,
      frequency: Math.max(1, Math.round(rec.confidence * 10)),
      payoffEstimate: rec.impact,
      confidence: rec.confidence
    });
  }

  return cards
    .sort((a, b) => b.frequency - a.frequency || b.confidence - a.confidence)
    .slice(0, 8);
}
