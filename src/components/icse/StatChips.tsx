'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Layers, Database, TrendingUp, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { KnowledgeStats } from './types';

interface StatChipsProps {
  variant?: 'hero' | 'footer';
  className?: string;
}

export function StatChips({ variant = 'hero', className = '' }: StatChipsProps) {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/knowledge/stats');
        if (!res.ok) return;
        const data = (await res.json()) as KnowledgeStats;
        if (!cancelled) {
          setStats(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <Badge variant="secondary" className="gap-1.5">
          <Loader2 className="size-3 animate-spin" />
          Loading stats…
        </Badge>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <Badge variant="outline" className="gap-1.5">
          <Database className="size-3" /> Stats unavailable
        </Badge>
      </div>
    );
  }

  const cacheHits = stats.cache.llmCacheHits + stats.cache.imageCacheHits;
  const hitRate =
    stats.cache.totalEntries > 0
      ? Math.round((cacheHits / (cacheHits + stats.cache.totalEntries)) * 100)
      : 0;

  const chips =
    variant === 'hero'
      ? [
          { icon: BookOpen, label: 'KB chunks', value: stats.knowledgeBase.totalChunks },
          { icon: Layers, label: 'Subjects', value: stats.knowledgeBase.subjects.length },
          { icon: TrendingUp, label: 'Cache hits', value: cacheHits },
        ]
      : [
          { icon: BookOpen, label: 'KB chunks', value: stats.knowledgeBase.totalChunks },
          { icon: TrendingUp, label: 'Cache hit rate', value: `${hitRate}%` },
          { icon: Database, label: 'Entries', value: stats.cache.totalEntries },
        ];

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {chips.map((chip, i) => (
        <motion.div
          key={chip.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i, duration: 0.3 }}
        >
          <Badge
            variant="outline"
            className="gap-2 px-3 py-1 bg-card/45 border-black/5 dark:border-white/5 backdrop-blur-md shadow-xs hover:border-brand/40 transition-all duration-300 group"
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand"></span>
            </span>
            <chip.icon className="size-3.5 text-brand transition-transform duration-200" />
            <span className="font-semibold tabular-nums text-foreground">{chip.value}</span>
            <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">{chip.label}</span>
          </Badge>
        </motion.div>
      ))}
    </div>
  );
}
