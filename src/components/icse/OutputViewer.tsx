'use client';

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Download, ChevronRight,
  ImageIcon, ListTree, ScrollText, Eye, EyeOff,
  FileText, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  type PipelineResponse, type AgentLog,
} from './types';

interface OutputViewerProps {
  result: PipelineResponse | null;
  allResults?: PipelineResponse[];
  onSelectResult?: (result: PipelineResponse) => void;
}

function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
  return Promise.resolve();
}

export function OutputViewer({ result, allResults, onSelectResult }: OutputViewerProps) {

  const safeImages = useMemo(() => {
    if (!result) return [];
    return Array.isArray(result.images) ? result.images : [];
  }, [result]);

  if (!result) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <ScrollText className="size-6" />
          </div>
          <div>
            <p className="font-medium">Your forged project will appear here</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Upload a file and run the pipeline. The 7-agent output (markdown, diagrams,
              outline, logs) shows up in this panel.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCopy = async () => {
    try {
      await copyToClipboard(result.finalOutput || '');
      toast.success('Markdown copied to clipboard');
    } catch {
      toast.error('Could not copy markdown');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([result.finalOutput || ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (result.topic || 'icse-project')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    a.download = `${safeName || 'icse-project'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded markdown file');
  };

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!result) return;
    setDownloadingPdf(true);
    try {
      toast.info('Generating school-ready PDF workbook...', { duration: 5000 });

      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: result.topic || 'ICSE Project',
          subject: result.subject || 'General',
          className: result.className || '10',
          board: result.board || 'ICSE',
          outline: result.outline || { sections: [] },
          finalOutput: result.finalOutput || '',
          images: result.images || [],
          studentName: '',
          schoolName: '',
          teacherName: '',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'PDF generation failed' }));
        throw new Error(errData.error || `Server error ${response.status}`);
      }

      // Download the PDF blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (result.topic || 'icse-project')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      a.download = `${safeName || 'icse-project'}-workbook.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Successfully exported school-ready project PDF!');
    } catch (err: any) {
      console.error('PDF export error:', err);
      toast.error(`PDF generation failed: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };



  return (
    <div className="space-y-4">
      <Card>
        {allResults && allResults.length > 1 && (
          <div className="flex flex-wrap gap-2 p-4 border-b border-black/5 dark:border-white/5 bg-muted/20 rounded-t-xl overflow-x-auto">
            {allResults.map((res, i) => (
              <Button
                key={res.projectId}
                variant={result?.projectId === res.projectId ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSelectResult?.(res)}
                className={[
                  'gap-1.5 text-xs transition-all duration-200',
                  result?.projectId === res.projectId
                    ? 'bg-brand text-brand-foreground shadow-xs'
                    : 'bg-background hover:bg-muted/55 border-brand-soft/20'
                ].join(' ')}
              >
                <FileText className="size-3.5" />
                <span className="max-w-[150px] truncate">{res.topic || `Project ${i + 1}`}</span>
              </Button>
            ))}
          </div>
        )}
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-brand to-teal text-brand-foreground text-sm font-bold shadow-sm">
                  3
                </span>
                Forged output
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-foreground">
                  {result.topic}
                </span>
                <Badge className="bg-brand/15 text-brand border-brand/30">
                  {result.subject}
                </Badge>
                <Badge variant="secondary">Class {result.className}</Badge>
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                    <Copy className="size-3.5" /> Copy
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy markdown to clipboard</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                    <Download className="size-3.5" /> .md
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download as markdown file</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="gap-1.5 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 border-brand-soft hover:border-brand/40 text-brand font-medium"
                  >
                    {downloadingPdf ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <FileText className="size-3.5" />
                    )}
                    PDF Workbook
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download School-Ready PDF</TooltipContent>
              </Tooltip>

            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        {/* Markdown output */}
        <Card className="overflow-hidden">
          <CardContent className="pt-6">
            <article className="prose-icse max-w-none">
              <ReactMarkdown>{result.finalOutput || '_(no content generated)_'}</ReactMarkdown>
            </article>
          </CardContent>
        </Card>

        {/* Sidebar: images + outline + logs */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="size-4 text-brand" />
                Generated Images
                <Badge variant="secondary" className="ml-auto tabular-nums">
                  {safeImages.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {safeImages.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No diagrams were generated for this project.
                </p>
              ) : (
                safeImages.map((img, i) => (
                  <figure key={i} className="space-y-1.5">
                    <img
                      src={img.path}
                      alt={img.caption || `Generated diagram ${i + 1}`}
                      className="w-full rounded-md border bg-muted"
                      loading="lazy"
                    />
                    <figcaption className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Fig {i + 1}.</span>{' '}
                      {img.caption}
                    </figcaption>
                  </figure>
                ))
              )}
            </CardContent>
          </Card>

          {/* Outline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListTree className="size-4 text-brand" />
                Outline
              </CardTitle>
              <CardDescription className="text-xs">
                ICSE structure the Writer followed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result.outline?.sections?.length ? (
                <Accordion type="multiple" className="w-full">
                  {result.outline.sections.map((s, i) => (
                    <AccordionItem key={i} value={`sec-${i}`}>
                      <AccordionTrigger className="py-2 text-sm">
                        <span className="flex items-center gap-2">
                          <ChevronRight className="size-3 text-brand" />
                          {s.name}
                        </span>
                      </AccordionTrigger>
                      {s.description && (
                        <AccordionContent className="text-xs text-muted-foreground">
                          {s.description}
                        </AccordionContent>
                      )}
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-xs text-muted-foreground">No outline available.</p>
              )}
            </CardContent>
          </Card>

          {/* Agent logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ScrollText className="size-4 text-brand" />
                Agent Logs
              </CardTitle>
              <CardDescription className="text-xs">
                Per-agent runtime + cache status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="logs" className="border-b-0">
                  <AccordionTrigger className="py-2 text-sm">
                    Show all {result.logs.length} agents
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2">
                      {result.logs.map((l: AgentLog, i) => (
                        <li
                          key={i}
                          className="flex items-start justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">{l.agent}</p>
                            <p className="text-muted-foreground truncate">
                              {l.output || l.error || l.status}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-0.5">
                            <Badge
                              variant="outline"
                              className={
                                l.status === 'completed'
                                  ? 'border-brand/40 text-brand'
                                  : l.status === 'failed'
                                  ? 'border-destructive/40 text-destructive'
                                  : 'text-muted-foreground'
                              }
                            >
                              {l.status}
                            </Badge>
                            <span className="tabular-nums text-muted-foreground">
                              {l.durationMs != null
                                ? `${(l.durationMs / 1000).toFixed(1)}s`
                                : '—'}
                            </span>
                            {l.cached && (
                              <span className="text-[10px] text-brand">cached</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>



      <Separator />
    </div>
  );
}


