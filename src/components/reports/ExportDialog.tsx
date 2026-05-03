import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  buildCSV, ColumnDef, ExportFilters, ROW_HARD_CAP, ROW_WARN_THRESHOLD,
} from '@/lib/csvExport';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  filename: string;
  columns: ColumnDef[];
  fetcher: (f: ExportFilters) => Promise<any[]>;
  summariser?: (rows: any[]) => Record<string, any>;
  showSemester?: boolean;
  showProgram?: boolean;
  showDateRange?: boolean;
  dateLabel?: string;
};

export function ExportDialog({
  open, onOpenChange, title, filename, columns, fetcher, summariser,
  showSemester = true, showProgram = true, showDateRange = true, dateLabel = 'Date range',
}: Props) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ExportFilters>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [includeSummary, setIncludeSummary] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(Object.fromEntries(columns.map((c) => [c.key, c.default ?? true])));
      setFilters({});
    }
  }, [open, columns]);

  const { data: semesters } = useQuery({
    queryKey: ['exp-semesters'],
    queryFn: async () => (await supabase.from('semesters').select('id, name').order('start_date', { ascending: false })).data || [],
    enabled: open && showSemester,
  });
  const { data: programs } = useQuery({
    queryKey: ['exp-programs'],
    queryFn: async () => (await supabase.from('programs').select('id, name').order('name')).data || [],
    enabled: open && showProgram,
  });

  const setF = (k: keyof ExportFilters, v: any) => setFilters((p) => ({ ...p, [k]: v || undefined }));

  const handleExport = async () => {
    setBusy(true);
    try {
      const cols = columns.filter((c) => selected[c.key]);
      if (!cols.length) throw new Error('Pick at least one column.');
      const rows = await fetcher(filters);
      if (!rows.length) throw new Error('No records match the selected filters.');
      if (rows.length > ROW_HARD_CAP) {
        throw new Error(`Result set exceeds the ${ROW_HARD_CAP.toLocaleString()}-row cap. Narrow the filters and retry.`);
      }
      if (rows.length > ROW_WARN_THRESHOLD) {
        if (!window.confirm(`This export contains ${rows.length.toLocaleString()} rows and may take a moment to open in Excel. Continue?`)) {
          setBusy(false);
          return;
        }
      }
      buildCSV(filename, rows, cols, includeSummary && summariser ? summariser(rows) : null);
      toast({ title: 'Exported', description: `${rows.length} rows downloaded.` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Export failed', description: e.message || String(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Choose filters and the columns to include in the CSV.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            {showSemester && (
              <div className="space-y-1.5">
                <Label>Term / Semester</Label>
                <Select value={filters.semester_id || 'all'} onValueChange={(v) => setF('semester_id', v === 'all' ? undefined : v)}>
                  <SelectTrigger><SelectValue placeholder="All terms" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All terms</SelectItem>
                    {semesters?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showProgram && (
              <div className="space-y-1.5">
                <Label>Class / Program</Label>
                <Select value={filters.program_id || 'all'} onValueChange={(v) => setF('program_id', v === 'all' ? undefined : v)}>
                  <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {programs?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showDateRange && (
              <>
                <div className="space-y-1.5">
                  <Label>{dateLabel} — From</Label>
                  <Input type="date" value={filters.date_from || ''} onChange={(e) => setF('date_from', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{dateLabel} — To</Label>
                  <Input type="date" value={filters.date_to || ''} onChange={(e) => setF('date_to', e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Columns to include</Label>
              <div className="flex gap-2 text-xs">
                <button type="button" className="text-primary hover:underline" onClick={() => setSelected(Object.fromEntries(columns.map((c) => [c.key, true])))}>All</button>
                <button type="button" className="text-primary hover:underline" onClick={() => setSelected(Object.fromEntries(columns.map((c) => [c.key, false])))}>None</button>
                <button type="button" className="text-primary hover:underline" onClick={() => setSelected(Object.fromEntries(columns.map((c) => [c.key, c.default ?? true])))}>Default</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border bg-muted/30 max-h-56 overflow-y-auto">
              {columns.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={!!selected[c.key]} onCheckedChange={(v) => setSelected((p) => ({ ...p, [c.key]: !!v }))} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          {summariser && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={includeSummary} onCheckedChange={(v) => setIncludeSummary(!!v)} />
              Append totals / summary row
            </label>
          )}

          <p className="text-xs text-muted-foreground">
            Maximum {ROW_HARD_CAP.toLocaleString()} rows per export. You'll be warned if the result exceeds {ROW_WARN_THRESHOLD.toLocaleString()} rows.
          </p>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleExport} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
