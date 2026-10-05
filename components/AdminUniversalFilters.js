'use client';

import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

const getTableMeta = () => {
  const tables = Array.from(document.querySelectorAll('.website-admin main table'));
  return tables.map((table, index) => {
    const headers = Array.from(table.querySelectorAll('thead th')).map((th, i) => ({
      index: i,
      label: (th.textContent || '').trim().replace(/\s+/g, ' ') || `Column ${i + 1}`,
    }));
    const rows = Array.from(table.querySelectorAll('tbody > tr'));
    return { table, index, headers, rows };
  }).filter(x => x.headers.length && x.rows.length);
};

export default function AdminUniversalFilters() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tables, setTables] = useState([]);
  const [tableIndex, setTableIndex] = useState(0);
  const [column, setColumn] = useState(-1);
  const [value, setValue] = useState('');
  const [active, setActive] = useState(false);

  const scan = () => {
    const next = getTableMeta();
    setTables(next);
    setTableIndex(i => Math.min(i, Math.max(next.length - 1, 0)));
  };

  useEffect(() => {
    setOpen(false);
    setValue('');
    setColumn(-1);
    setActive(false);
    const t = setTimeout(scan, 250);
    const observer = new MutationObserver(() => {
      clearTimeout(window.__pinkboxFilterScanTimer);
      window.__pinkboxFilterScanTimer = setTimeout(scan, 120);
    });
    observer.observe(document.querySelector('.website-admin main') || document.body, { childList: true, subtree: true });
    return () => {
      clearTimeout(t);
      clearTimeout(window.__pinkboxFilterScanTimer);
      observer.disconnect();
    };
  }, [pathname]);

  const current = tables[tableIndex];
  const options = useMemo(() => {
    if (!current) return [];
    return current.headers.map(h => {
      const values = new Set();
      current.rows.forEach(row => {
        const text = (row.children[h.index]?.textContent || '').trim().replace(/\s+/g, ' ');
        if (text && text !== '—') values.add(text);
      });
      return { ...h, values: Array.from(values).slice(0, 80) };
    });
  }, [current]);

  const apply = () => {
    if (!current) return;
    const needle = value.trim().toLowerCase();
    current.rows.forEach(row => {
      const cellText = column >= 0
        ? (row.children[column]?.textContent || '')
        : (row.textContent || '');
      row.style.display = !needle || cellText.toLowerCase().includes(needle) ? '' : 'none';
    });
    setActive(Boolean(needle));
    setOpen(false);
  };

  const reset = () => {
    tables.forEach(({ rows }) => rows.forEach(row => { row.style.display = ''; }));
    setValue('');
    setColumn(-1);
    setActive(false);
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => { scan(); setOpen(v => !v); }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-gray-200 transition hover:bg-white/10 hover:text-white"
      >
        <SlidersHorizontal size={14} />
        Filter
        {active && <span className="rounded-full bg-pink-500 px-1.5 py-0.5 text-[9px] font-bold text-white">ON</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-[80] w-[min(92vw,380px)] rounded-2xl border border-white/10 bg-[#151515] p-4 text-white shadow-2xl ring-1 ring-black/20">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Filter current Admin list</div>
              <div className="mt-0.5 text-[11px] text-gray-400">Works with tables on the current page.</div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {tables.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-gray-400">
              No table/list is available on this page.
            </div>
          ) : (
            <div className="space-y-3">
              {tables.length > 1 && (
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-gray-300">List</span>
                  <select
                    value={tableIndex}
                    onChange={e => { setTableIndex(Number(e.target.value)); setColumn(-1); }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
                  >
                    {tables.map((t, i) => (
                      <option key={i} value={i} className="bg-[#151515]">
                        List {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-gray-300">Column</span>
                <select
                  value={column}
                  onChange={e => setColumn(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
                >
                  <option value={-1} className="bg-[#151515]">All columns</option>
                  {options.map(h => (
                    <option key={h.index} value={h.index} className="bg-[#151515]">{h.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-gray-300">Contains</span>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') apply(); }}
                    placeholder="e.g. active, diaper, Surat, pending..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs outline-none placeholder:text-gray-500 focus:border-pink-500"
                  />
                </div>
              </label>

              {column >= 0 && options.find(x => x.index === column)?.values?.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold text-gray-300">Quick values</div>
                  <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                    {options.find(x => x.index === column).values.map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setValue(v)}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-gray-300 hover:bg-white/10 hover:text-white"
                        title={v}
                      >
                        {v.length > 24 ? v.slice(0, 24) + '…' : v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5">
                  <RotateCcw size={13} /> Reset
                </button>
                <button type="button" onClick={apply} className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-4 py-2 text-xs font-semibold text-white hover:bg-pink-500">
                  Apply Filter
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
