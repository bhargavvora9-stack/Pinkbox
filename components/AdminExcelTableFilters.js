'use client';

import { useEffect, useState } from 'react';
import { Check, RotateCcw, Search, X } from 'lucide-react';

const normalize = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const getCellValue = (cell) => normalize(cell?.textContent);

export default function AdminExcelTableFilters() {
  const [activeMenu, setActiveMenu] = useState(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [anchor, setAnchor] = useState(null);
  const [menuValues, setMenuValues] = useState([]);

  const scanTables = () => {
    document.querySelectorAll('.website-admin main table').forEach((table, tableIndex) => {
      const headerRow = table.querySelector('thead tr');
      if (!headerRow) return;

      Array.from(headerRow.children).forEach((th, colIndex) => {
        if (th.dataset.excelFilterMounted === '1') return;

        const original = normalize(th.textContent);
        if (!original || /^(actions|action)$/i.test(original)) return;

        th.dataset.excelFilterMounted = '1';
        th.dataset.excelFilterLabel = original;
        th.style.position = 'relative';
        th.style.paddingRight = '34px';

        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', 'Filter ' + original);
        button.title = 'Filter ' + original;
        button.className = 'pb-excel-filter-button';
        button.innerHTML = '<span style="font-size:11px">▼</span>';

        button.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();

          const rect = button.getBoundingClientRect();
          const nextAnchor = {
            tableIndex,
            colIndex,
            label: original,
            rect: {
              top: rect.bottom + 6,
              left: Math.max(8, Math.min(rect.left - 8, window.innerWidth - 330)),
            },
          };

          const currentTable = table;
          const values = Array.from(new Set(
            Array.from(currentTable.querySelectorAll('tbody > tr'))
              .filter(row => row.style.display !== 'none')
              .map(row => getCellValue(row.children[colIndex]))
              .filter(Boolean)
          )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

          setQuery('');
          setSelected(new Set());
          setMenuValues(values);
          setAnchor(nextAnchor);
          setActiveMenu(tableIndex + ':' + colIndex);
        };

        th.appendChild(button);
      });
    });
  };

  useEffect(() => {
    scanTables();

    const observer = new MutationObserver(() => {
      clearTimeout(window.__pbExcelFilterTimer);
      window.__pbExcelFilterTimer = setTimeout(scanTables, 80);
    });

    const root = document.querySelector('.website-admin main') || document.body;
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      clearTimeout(window.__pbExcelFilterTimer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const close = () => setActiveMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const visibleValues = query.trim()
    ? menuValues.filter(v => v.toLowerCase().includes(query.trim().toLowerCase()))
    : menuValues;

  const apply = (values) => {
    if (!anchor) return;

    const table = Array.from(document.querySelectorAll('.website-admin main table'))[anchor.tableIndex];
    if (!table) return;

    const normalized = Array.from(values).map(v => normalize(v).toLowerCase());
    const useFilter = normalized.length > 0;

    Array.from(table.querySelectorAll('tbody > tr')).forEach(row => {
      const raw = getCellValue(row.children[anchor.colIndex]).toLowerCase();
      const show = !useFilter || normalized.some(v => raw === v || raw.includes(v));
      row.style.display = show ? '' : 'none';
    });

    const th = table.querySelector('thead tr > *:nth-child(' + (anchor.colIndex + 1) + ')');
    const button = th?.querySelector('.pb-excel-filter-button');
    if (button) button.classList.toggle('pb-excel-filter-active', useFilter);

    setActiveMenu(null);
  };

  const clear = () => {
    if (!anchor) return;

    const table = Array.from(document.querySelectorAll('.website-admin main table'))[anchor.tableIndex];
    if (!table) return;

    Array.from(table.querySelectorAll('tbody > tr')).forEach(row => { row.style.display = ''; });

    const th = table.querySelector('thead tr > *:nth-child(' + (anchor.colIndex + 1) + ')');
    th?.querySelector('.pb-excel-filter-button')?.classList.remove('pb-excel-filter-active');

    setSelected(new Set());
    setQuery('');
    setActiveMenu(null);
  };

  const toggleValue = (value) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const selectAllVisible = () => setSelected(new Set(visibleValues));
  const allChecked = visibleValues.length > 0 && visibleValues.every(v => selected.has(v));

  return (
    <>
      <style>{`
        .pb-excel-filter-button{
          position:absolute;right:7px;top:50%;transform:translateY(-50%);
          display:inline-flex;align-items:center;justify-content:center;
          width:20px;height:20px;border:0;border-radius:5px;background:transparent;
          color:#6b7280;cursor:pointer;opacity:.65;
        }
        .pb-excel-filter-button:hover{background:#e5e7eb;color:#111827;opacity:1}
        .pb-excel-filter-button.pb-excel-filter-active{background:#111827;color:#fff;opacity:1}
        .pb-excel-filter-menu{
          position:fixed;z-index:99999;width:310px;max-width:calc(100vw - 16px);
          overflow:hidden;border:1px solid #d1d5db;border-radius:12px;background:#fff;
          box-shadow:0 18px 50px rgba(0,0,0,.18);color:#111827;
        }
        .pb-excel-filter-menu button{font:inherit}
      `}</style>

      {activeMenu && anchor && (
        <div
          className="pb-excel-filter-menu"
          style={{ top: anchor.rect.top, left: anchor.rect.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <div>
              <div className="text-xs font-semibold">Filter: {anchor.label}</div>
              <div className="text-[10px] text-gray-400">Excel-style value filter</div>
            </div>
            <button type="button" onClick={() => setActiveMenu(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
              <X size={15} />
            </button>
          </div>

          <div className="border-b p-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search values..."
                className="w-full rounded-lg border px-8 py-2 text-xs outline-none focus:border-gray-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2 text-[11px]">
            <button type="button" onClick={allChecked ? () => setSelected(new Set()) : selectAllVisible} className="font-semibold text-gray-700 hover:text-black">
              {allChecked ? 'Clear visible' : 'Select all'}
            </button>
            <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-gray-500 hover:text-black">
              <RotateCcw size={12} /> Clear Filter
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {!visibleValues.length ? (
              <div className="px-3 py-8 text-center text-xs text-gray-400">No values found.</div>
            ) : (
              visibleValues.map(value => {
                const checked = selected.has(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleValue(value)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-gray-50"
                  >
                    <span className={'flex h-4 w-4 shrink-0 items-center justify-center rounded border ' + (checked ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white')}>
                      {checked && <Check size={11} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate" title={value}>{value}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t bg-gray-50 px-3 py-2.5">
            <span className="text-[10px] text-gray-500">{selected.size ? selected.size + ' selected' : 'No value selected'}</span>
            <button type="button" onClick={() => apply(selected)} className="rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-black">
              Apply
            </button>
          </div>
        </div>
      )}
    </>
  );
}
