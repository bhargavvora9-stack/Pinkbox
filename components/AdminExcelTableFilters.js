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
          position:fixed;z-index:99999;width:320px;max-width:calc(100vw - 16px);
          overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:14px;
          background:linear-gradient(180deg,#11192d 0%,#0d1526 100%);
          box-shadow:0 24px 70px rgba(0,0,0,.55);color:#f4f6ff;
          backdrop-filter:blur(16px);
        }
        .pb-excel-filter-menu button{font:inherit;color:#e5e9f5}
        .pb-excel-filter-menu .filter-muted{color:#9aa7c6!important}
        .pb-excel-filter-menu .filter-border{border-color:rgba(255,255,255,.10)!important}
        .pb-excel-filter-menu .filter-surface{background:#151e34!important}
        .pb-excel-filter-menu .filter-input{
          width:100%;border:1px solid rgba(255,255,255,.18)!important;
          background:#151d30!important;color:#f4f6ff!important;border-radius:9px;
          outline:none;box-shadow:none!important;
        }
        .pb-excel-filter-menu .filter-input::placeholder{color:#8f9bb7!important}
        .pb-excel-filter-menu .filter-input:focus{
          border-color:rgba(236,63,157,.75)!important;
          box-shadow:0 0 0 3px rgba(236,63,157,.13)!important;
        }
        .pb-excel-filter-menu .value-row:hover{background:rgba(236,63,157,.08)!important}
        .pb-excel-filter-menu .select-box{
          border:1px solid rgba(255,255,255,.20);background:#0f1729;color:#fff
        }
        .pb-excel-filter-menu .select-box.checked{
          border-color:#ec3f9d;background:#ec3f9d;color:#fff
        }
        .pb-excel-filter-menu .apply-btn{
          background:linear-gradient(135deg,#ec3f9d,#ff5bb2)!important;color:#fff!important;
          box-shadow:0 8px 22px rgba(236,63,157,.22)
        }
        .pb-excel-filter-menu .apply-btn:hover{filter:brightness(1.05)}
        .pb-excel-filter-menu .close-btn:hover,
        .pb-excel-filter-menu .action-link:hover{background:rgba(255,255,255,.07)!important;color:#fff!important}
      `}</style>

      {activeMenu && anchor && (
        <div
          className="pb-excel-filter-menu"
          style={{ top: anchor.rect.top, left: anchor.rect.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b filter-border px-3 py-2.5">
            <div>
              <div className="text-sm font-semibold text-white">Filter: {anchor.label}</div>
              <div className="text-[11px] filter-muted">Excel-style value filter</div>
            </div>
            <button type="button" onClick={() => setActiveMenu(null)} className="close-btn rounded-lg p-1 filter-muted hover:bg-white/10">
              <X size={15} />
            </button>
          </div>

          <div className="border-b filter-border p-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search values..."
                className="filter-input px-8 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-b filter-border filter-surface px-3 py-2.5 text-xs">
            <button type="button" onClick={allChecked ? () => setSelected(new Set()) : selectAllVisible} className="action-link rounded-md px-2 py-1 font-semibold text-gray-200">
              {allChecked ? 'Clear visible' : 'Select all'}
            </button>
            <button type="button" onClick={clear} className="action-link rounded-md px-2 py-1 text-gray-300">
              <RotateCcw size={12} /> Clear Filter
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {!visibleValues.length ? (
              <div className="px-3 py-8 text-center text-xs filter-muted">No values found.</div>
            ) : (
              visibleValues.map(value => {
                const checked = selected.has(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleValue(value)}
                    className="value-row flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm"
                  >
                    <span className={'select-box flex h-4 w-4 shrink-0 items-center justify-center rounded ' + (checked ? 'checked' : '')}>
                      {checked && <Check size={11} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate" title={value}>{value}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t filter-border filter-surface px-3 py-2.5">
            <span className="text-[11px] filter-muted">{selected.size ? selected.size + ' selected' : 'No value selected'}</span>
            <button type="button" onClick={() => apply(selected)} className="apply-btn rounded-lg px-4 py-2.5 text-sm font-semibold">
              Apply
            </button>
          </div>
        </div>
      )}
    </>
  );
}
