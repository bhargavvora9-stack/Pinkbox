'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, RotateCcw, Search, X } from 'lucide-react';

const normalize = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const getCellValue = (cell) => normalize(cell?.textContent);

export default function AdminExcelTableFilters() {
  const [activeMenu, setActiveMenu] = useState(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [anchor, setAnchor] = useState(null);
  const [menuValues, setMenuValues] = useState([]);
  const [filters, setFilters] = useState({});
  const filtersRef = useRef({});
  filtersRef.current = filters;

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
          const prefix = String(tableIndex) + ':';
          const filterKey = prefix + String(colIndex);
          const tableFilters = filtersRef.current;
          const values = Array.from(new Set(
            Array.from(currentTable.querySelectorAll('tbody > tr'))
              .filter(row => Object.entries(tableFilters)
                .filter(([key]) => key.startsWith(prefix) && key !== filterKey)
                .every(([key, allowed]) => {
                  const column = Number(key.split(':')[1]);
                  const raw = getCellValue(row.children[column]).toLowerCase();
                  return allowed.some(value => normalize(value).toLowerCase() === raw);
                }))
              .map(row => getCellValue(row.children[colIndex]))
          ))).sort((a, b) => {
            if (!a) return 1;
            if (!b) return -1;
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
          });
          const currentSelection = Object.prototype.hasOwnProperty.call(tableFilters, filterKey)
            ? tableFilters[filterKey]
            : values;
          setQuery('');
          setSelected(new Set(currentSelection));
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
    ? menuValues.filter(v => (v === '' ? '(Blanks)' : v).toLowerCase().includes(query.trim().toLowerCase()))
    : menuValues;

  const apply = (values) => {
    if (!anchor) return;
    const table = Array.from(document.querySelectorAll('.website-admin main table'))[anchor.tableIndex];
    if (!table) return;
    const prefix = String(anchor.tableIndex) + ':';
    const filterKey = prefix + String(anchor.colIndex);
    const nextFilters = { ...filtersRef.current };
    const selectedValues = Array.from(values);
    const allSelected = menuValues.length > 0 && selectedValues.length === menuValues.length && menuValues.every(value => values.has(value));
    if (allSelected) delete nextFilters[filterKey];
    else nextFilters[filterKey] = selectedValues;
    filtersRef.current = nextFilters;
    setFilters(nextFilters);
    const activeFilters = Object.entries(nextFilters).filter(([key]) => key.startsWith(prefix));
    Array.from(table.querySelectorAll('tbody > tr')).forEach(row => {
      const show = activeFilters.every(([key, allowed]) => {
        const column = Number(key.split(':')[1]);
        const raw = getCellValue(row.children[column]).toLowerCase();
        return allowed.some(value => normalize(value).toLowerCase() === raw);
      });
      row.style.display = show ? '' : 'none';
    });
    const th = table.querySelector('thead tr > *:nth-child(' + (anchor.colIndex + 1) + ')');
    th?.querySelector('.pb-excel-filter-button')?.classList.toggle('pb-excel-filter-active', Object.prototype.hasOwnProperty.call(nextFilters, filterKey));
    setActiveMenu(null);
  };

  const clear = () => {
    if (!anchor) return;
    const table = Array.from(document.querySelectorAll('.website-admin main table'))[anchor.tableIndex];
    if (!table) return;
    const prefix = String(anchor.tableIndex) + ':';
    const filterKey = prefix + String(anchor.colIndex);
    const nextFilters = { ...filtersRef.current };
    delete nextFilters[filterKey];
    filtersRef.current = nextFilters;
    setFilters(nextFilters);
    const activeFilters = Object.entries(nextFilters).filter(([key]) => key.startsWith(prefix));
    Array.from(table.querySelectorAll('tbody > tr')).forEach(row => {
      const show = activeFilters.every(([key, allowed]) => {
        const column = Number(key.split(':')[1]);
        const raw = getCellValue(row.children[column]).toLowerCase();
        return allowed.some(value => normalize(value).toLowerCase() === raw);
      });
      row.style.display = show ? '' : 'none';
    });
    Array.from(table.querySelectorAll('thead tr')).forEach(headerRow => {
      Array.from(headerRow.children).forEach((header, columnIndex) => {
        const key = prefix + String(columnIndex);
        header.querySelector('.pb-excel-filter-button')?.classList.toggle('pb-excel-filter-active', Object.prototype.hasOwnProperty.call(nextFilters, key));
      });
    });
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

  const selectAllVisible = () => setSelected(previous => {
    const next = new Set(previous);
    if (visibleValues.length > 0 && visibleValues.every(value => next.has(value))) visibleValues.forEach(value => next.delete(value));
    else visibleValues.forEach(value => next.add(value));
    return next;
  });
  const allChecked = visibleValues.length > 0 && visibleValues.every(v => selected.has(v));

  return (
    <>
      <style>{`.pb-excel-filter-button{position:absolute;right:7px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:1px solid transparent;border-radius:3px;background:transparent;color:#64748b;cursor:pointer;font-size:9px;opacity:.9}
.pb-excel-filter-button:hover{border-color:#c8c8c8;background:#eaf2fb;color:#1f2937;opacity:1}
.pb-excel-filter-button.pb-excel-filter-active{border-color:#8aaee0;background:#dceafa;color:#174ea6;opacity:1}
.pb-excel-filter-menu{position:fixed;z-index:99999;width:304px;max-width:calc(100vw - 16px);overflow:hidden;border:1px solid #b8b8b8;border-radius:3px;background:#fff;box-shadow:0 5px 18px rgba(0,0,0,.22);color:#222;font-family:Arial,Helvetica,sans-serif;font-size:13px}
.pb-excel-filter-menu button{font:inherit;color:#222}
.pb-excel-filter-menu .filter-muted{color:#666!important}
.pb-excel-filter-menu .filter-border{border-color:#dedede!important}
.pb-excel-filter-menu .filter-surface{background:#f6f6f6!important}
.pb-excel-filter-menu .filter-input{width:100%;border:1px solid #a6a6a6!important;background:#fff!important;color:#222!important;border-radius:2px;outline:none;box-shadow:none!important}
.pb-excel-filter-menu .filter-input::placeholder{color:#777!important}
.pb-excel-filter-menu .filter-input:focus{border-color:#217346!important;box-shadow:0 0 0 1px #217346!important}
.pb-excel-filter-menu .value-row:hover{background:#eaf2fb!important}
.pb-excel-filter-menu .select-box{border:1px solid #777;background:#fff;color:#fff}
.pb-excel-filter-menu .select-box.checked{border-color:#217346;background:#217346;color:#fff}
.pb-excel-filter-menu .apply-btn{background:#217346!important;color:#fff!important;border:1px solid #1b5e39;box-shadow:none}
.pb-excel-filter-menu .apply-btn:hover{background:#185c37!important}
.pb-excel-filter-menu .close-btn:hover,.pb-excel-filter-menu .action-link:hover{background:#eee!important;color:#111!important}`}</style>

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
                    <span className="min-w-0 flex-1 truncate" title={value === '' ? '(Blanks)' : value}>{value === '' ? '(Blanks)' : value}</span>
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
