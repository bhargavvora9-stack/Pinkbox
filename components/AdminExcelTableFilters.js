'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownAZ, ArrowDownWideNarrow, ArrowUpAZ, ArrowUpWideNarrow, Check, RotateCcw, Search, X } from 'lucide-react';

const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const cellValue = (row, columnIndex) => normalize(row?.children?.[columnIndex]?.textContent);
const compareText = (a, b) => normalize(a).localeCompare(normalize(b), undefined, { numeric: true, sensitivity: 'base' });
const parseNumeric = value => {
  const cleaned = String(value ?? '').replace(/[₹$,%\s,]/g, '');
  if (!cleaned) return NaN;
  return Number(cleaned);
};
const isNumericColumn = values => {
  const nonEmpty = values.map(normalize).filter(Boolean);
  return nonEmpty.length > 0 && nonEmpty.every(value => Number.isFinite(parseNumeric(value)));
};

const filterCss = `
.pb-excel-filter-button{
  position:absolute;right:7px;top:50%;transform:translateY(-50%);
  display:inline-flex;align-items:center;justify-content:center;
  width:26px;height:26px;padding:0;border:1px solid #f3d4df;border-radius:8px;
  background:#fff7fa;color:#c0266f;cursor:pointer;opacity:1;
  transition:background .16s ease,border-color .16s ease,color .16s ease,box-shadow .16s ease;
}
.pb-excel-filter-button svg{width:13px;height:13px;display:block}
.pb-excel-filter-button:hover{
  border-color:#e9a9c2;background:#fce7f3;color:#9d174d;
  box-shadow:0 2px 7px rgba(190,24,93,.10);
}
.pb-excel-filter-button.pb-excel-filter-active,
.pb-excel-filter-button.pb-excel-sort-active{
  border-color:#db2777;background:#fce7f3;color:#9d174d;
  box-shadow:0 0 0 3px rgba(219,39,119,.10);
}
.pb-excel-filter-menu{
  position:fixed;z-index:99999;width:328px;max-width:calc(100vw - 20px);
  max-height:min(560px,calc(100vh - 20px));overflow-y:auto;overscroll-behavior:contain;
  border:1px solid #f0d2de;border-radius:18px;
  background:#fff;box-shadow:0 20px 55px rgba(52,22,39,.18),0 3px 12px rgba(52,22,39,.06);
  color:#332633;font-family:var(--font-manrope,Manrope),ui-sans-serif,system-ui,sans-serif;
  font-size:12px;line-height:1.45;isolation:isolate;scrollbar-width:thin;scrollbar-color:#e8bfd0 transparent;
}
.pb-excel-filter-menu *{box-sizing:border-box}
.pb-excel-filter-menu button{font-family:inherit}
.pb-excel-filter-menu .pb-filter-header{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:14px 15px;background:linear-gradient(135deg,#fff3f8 0%,#fffaf8 100%);
  border-bottom:1px solid #f3e4ea;
}
.pb-excel-filter-menu .pb-filter-kicker{
  color:#be185d;font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
}
.pb-excel-filter-menu .pb-filter-title{
  margin-top:3px;color:#352432;font-size:14px;font-weight:800;line-height:1.3;
}
.pb-excel-filter-menu .pb-filter-subtitle{margin-top:3px;color:#8b7280;font-size:10px;font-weight:500}
.pb-excel-filter-menu .pb-filter-close{
  display:inline-flex;width:30px;height:30px;flex-shrink:0;align-items:center;justify-content:center;
  border:1px solid #f0d8e2;border-radius:9px;background:#fff;color:#8b6478;cursor:pointer;
  transition:all .16s ease;
}
.pb-excel-filter-menu .pb-filter-close:hover{border-color:#e8b1c8;background:#fce7f3;color:#9d174d}
.pb-excel-filter-menu .pb-filter-section{padding:11px 13px;border-bottom:1px solid #f4edf0}
.pb-excel-filter-menu .pb-filter-search{position:relative}
.pb-excel-filter-menu .pb-filter-input{
  display:block;width:100%;height:39px;padding:8px 10px 8px 34px;
  border:1px solid #eadde4;border-radius:11px;background:#fff;color:#352432;
  font:500 12px/1.4 var(--font-manrope,Manrope),ui-sans-serif,system-ui,sans-serif;
  outline:none;transition:border-color .16s ease,box-shadow .16s ease;
}
.pb-excel-filter-menu .pb-filter-input::placeholder{color:#a6929d}
.pb-excel-filter-menu .pb-filter-input:focus{
  border-color:#e879a7;box-shadow:0 0 0 3px rgba(219,39,119,.10);
}
.pb-excel-filter-menu .pb-filter-menu-action{
  display:flex;width:100%;min-height:37px;align-items:center;gap:10px;
  padding:8px 10px;border:1px solid transparent;border-radius:10px;background:transparent;
  color:#574253;text-align:left;font-size:12px;font-weight:650;cursor:pointer;
  transition:background .14s ease,border-color .14s ease,color .14s ease;
}
.pb-excel-filter-menu .pb-filter-menu-action svg{flex-shrink:0;color:#c0266f}
.pb-excel-filter-menu .pb-filter-menu-action:hover{border-color:#f5dce6;background:#fff4f8;color:#9d174d}
.pb-excel-filter-menu .pb-filter-menu-action:focus-visible,
.pb-excel-filter-menu .pb-filter-value:focus-visible,
.pb-excel-filter-menu button:focus-visible{outline:2px solid #e879a7;outline-offset:2px}
.pb-excel-filter-menu .pb-filter-rule{height:1px;margin:7px 2px;background:#f1e6eb}
.pb-excel-filter-menu .pb-filter-muted{color:#927f8a}
.pb-excel-filter-menu .pb-filter-list-head{
  display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:9px 14px;background:#fff9fb;border-bottom:1px solid #f3e8ed;
  color:#594657;font-size:11px;font-weight:700;
}
.pb-excel-filter-menu .pb-filter-list-head input[type="checkbox"]{width:14px;height:14px;margin:0;accent-color:#db2777}
.pb-excel-filter-menu .pb-filter-link{
  padding:4px 5px;border:0;border-radius:6px;background:transparent;color:#be185d;
  font:700 10px/1.2 var(--font-manrope,Manrope),ui-sans-serif,system-ui,sans-serif;cursor:pointer;
}
.pb-excel-filter-menu .pb-filter-link:hover{background:#fce7f3;color:#9d174d}
.pb-excel-filter-menu .pb-filter-values{max-height:190px;overflow-y:auto;padding:6px}
.pb-excel-filter-menu .pb-filter-value{
  display:flex;width:100%;min-height:34px;align-items:center;gap:9px;
  padding:7px 9px;border:1px solid transparent;border-radius:9px;background:#fff;
  color:#493646;text-align:left;font-size:11px;font-weight:550;cursor:pointer;
  transition:background .13s ease,border-color .13s ease;
}
.pb-excel-filter-menu .pb-filter-value:hover{border-color:#f4dce6;background:#fff5f9}
.pb-excel-filter-menu .pb-filter-check{
  display:inline-flex;width:16px;height:16px;flex-shrink:0;align-items:center;justify-content:center;
  border:1px solid #d8c5ce;border-radius:5px;background:#fff;color:#fff;
}
.pb-excel-filter-menu .pb-filter-check.is-checked{border-color:#db2777;background:#db2777}
.pb-excel-filter-menu .pb-filter-footer{
  position:sticky;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:11px 13px;border-top:1px solid #f0e4e9;background:rgba(255,250,252,.97);
  backdrop-filter:blur(10px);
}
.pb-excel-filter-menu .pb-filter-btn{
  min-height:34px;padding:7px 13px;border:1px solid #eadde4;border-radius:10px;
  background:#fff;color:#695565;font:700 11px/1.2 var(--font-manrope,Manrope),ui-sans-serif,system-ui,sans-serif;
  cursor:pointer;transition:all .15s ease;
}
.pb-excel-filter-menu .pb-filter-btn:hover{border-color:#e8b1c8;background:#fff4f8;color:#9d174d}
.pb-excel-filter-menu .pb-filter-btn-primary{
  min-width:68px;border-color:#db2777;background:#db2777;color:#fff;
  box-shadow:0 3px 8px rgba(219,39,119,.16);
}
.pb-excel-filter-menu .pb-filter-btn-primary:hover{border-color:#be185d;background:#be185d;color:#fff}
@media(max-width:480px){
  .pb-excel-filter-menu{width:calc(100vw - 20px);max-height:calc(100vh - 20px);border-radius:16px}
  .pb-excel-filter-menu .pb-filter-header{padding:12px}
}
`;

function applyTableView(table, tableKey, allFilters, allSorts) {
  if (!table) return;
  const tableFilters = allFilters[tableKey] || {};
  const rows = Array.from(table.querySelectorAll('tbody > tr'));

  rows.forEach(row => {
    const visible = Object.entries(tableFilters).every(([columnKey, allowed]) => {
      const value = cellValue(row, Number(columnKey));
      return Array.isArray(allowed) && allowed.some(item => normalize(item).toLocaleLowerCase() === value.toLocaleLowerCase());
    });
    row.style.display = visible ? '' : 'none';
  });

  const sort = allSorts[tableKey];
  if (sort) {
    const sorted = [...rows].sort((rowA, rowB) => {
      const a = cellValue(rowA, sort.columnIndex);
      const b = cellValue(rowB, sort.columnIndex);
      let order;
      if (sort.type === 'number') {
        const numA = parseNumeric(a);
        const numB = parseNumeric(b);
        order = Number.isFinite(numA) && Number.isFinite(numB)
          ? numA - numB
          : Number.isFinite(numA) ? -1 : Number.isFinite(numB) ? 1 : compareText(a, b);
      } else {
        order = compareText(a, b);
      }
      return sort.direction === 'desc' ? -order : order;
    });
    if (sorted.some((row, index) => row !== rows[index])) {
      const body = table.querySelector('tbody');
      sorted.forEach(row => body.appendChild(row));
    }
  } else {
    const originalOrder = [...rows].sort((a, b) => Number(a.dataset.pbExcelOriginalOrder || 0) - Number(b.dataset.pbExcelOriginalOrder || 0));
    if (originalOrder.some((row, index) => row !== rows[index])) {
      const body = table.querySelector('tbody');
      originalOrder.forEach(row => body.appendChild(row));
    }
  }

  Array.from(table.querySelectorAll('thead tr')).forEach(headerRow => Array.from(headerRow.children).forEach((th, columnIndex) => {
    const button = th.querySelector('.pb-excel-filter-button');
    if (!button) return;
    const filtered = Object.prototype.hasOwnProperty.call(tableFilters, String(columnIndex));
    button.classList.toggle('pb-excel-filter-active', filtered);
    button.classList.toggle('pb-excel-sort-active', sort?.columnIndex === columnIndex);
    button.title = (th.dataset.pbExcelFilterLabel || normalize(th.textContent)) +
      (filtered ? ' — filter active' : '') +
      (sort?.columnIndex === columnIndex ? (sort.direction === 'asc' ? ' — ascending' : ' — descending') : '');
  }));
}

export default function AdminExcelTableFilters() {
  const [activeMenu, setActiveMenu] = useState(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [menuValues, setMenuValues] = useState([]);
  const [filters, setFilters] = useState({});
  const [sorts, setSorts] = useState({});
  const filtersRef = useRef({});
  const sortsRef = useRef({});

  useEffect(() => {
    filtersRef.current = filters;
    sortsRef.current = sorts;
  }, [filters, sorts]);

  const scanTables = () => {
    const tables = Array.from(document.querySelectorAll('.website-admin main table'));
    tables.forEach((table, tableIndex) => {
      const pathname = window.location.pathname || '/admin';
      const tableKey = pathname + '::' + tableIndex;
      table.dataset.pbExcelFilterTableId = tableKey;

      const bodyRows = Array.from(table.querySelectorAll('tbody > tr'));
      if (bodyRows.some(row => row.dataset.pbExcelOriginalOrder === undefined)) {
        bodyRows.forEach((row, index) => { row.dataset.pbExcelOriginalOrder = String(index); });
      }
      Array.from(table.querySelectorAll('thead tr')).forEach(headerRow => Array.from(headerRow.children).forEach((th, colIndex) => {
        if (th.tagName !== 'TH') return;
        const original = th.dataset.pbExcelFilterLabel || normalize(th.textContent);
        if (!original || /^(actions|action)$/i.test(original)) return;
        th.dataset.pbExcelFilterLabel = original;
        if (!th.dataset.pbExcelFilterPositionApplied) {
          th.dataset.pbExcelFilterOldPosition = th.style.position || '';
          th.style.position = th.style.position || 'relative';
          th.dataset.pbExcelFilterPositionApplied = '1';
        }
        if (!th.dataset.pbExcelFilterPaddingApplied) {
          th.dataset.pbExcelFilterOldPaddingRight = th.style.paddingRight || '';
          th.style.paddingRight = '39px';
          th.dataset.pbExcelFilterPaddingApplied = '1';
        }

        let button = th.querySelector('.pb-excel-filter-button');
        if (!button) {
          button = document.createElement('button');
          button.type = 'button';
          button.className = 'pb-excel-filter-button';
          button.setAttribute('aria-label', 'Filter ' + original);
          button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6.2 7.2v5.1l-3.6 1.9v-7L4 5z"/></svg>';
          button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            const rect = button.getBoundingClientRect();
            const currentTable = button.closest('table');
            if (!currentTable) return;
            const currentTableIndex = Array.from(document.querySelectorAll('.website-admin main table')).indexOf(currentTable);
            const currentPath = window.location.pathname || '/admin';
            const currentTableKey = currentPath + '::' + currentTableIndex;
            currentTable.dataset.pbExcelFilterTableId = currentTableKey;
            const tableFilters = filtersRef.current[currentTableKey] || {};
            const columnKey = String(colIndex);
            const values = Array.from(new Set(
              Array.from(currentTable.querySelectorAll('tbody > tr'))
                .filter(row => Object.entries(tableFilters)
                  .filter(([key]) => key !== columnKey)
                  .every(([key, allowed]) => allowed.some(item => normalize(item).toLocaleLowerCase() === cellValue(row, Number(key)).toLocaleLowerCase())))
                .map(row => cellValue(row, colIndex))
            )).sort((a, b) => {
              if (!a) return 1;
              if (!b) return -1;
              return compareText(a, b);
            });
            const currentSelection = Object.prototype.hasOwnProperty.call(tableFilters, columnKey)
              ? tableFilters[columnKey]
              : values;
            setQuery('');
            setMenuValues(values);
            setSelected(new Set(currentSelection));
            setActiveMenu({
              tableKey: currentTableKey,
              tableIndex: currentTableIndex,
              colIndex,
              label: original,
              numeric: isNumericColumn(values),
              rect: {
                top: Math.max(10, Math.min(rect.bottom + 6, window.innerHeight - 570)),
                left: Math.max(10, Math.min(rect.left - 8, window.innerWidth - 338))
              }
            });
          });
          th.appendChild(button);
        }
        button.title = 'Filter / Sort ' + original;
      }));

      applyTableView(table, tableKey, filtersRef.current, sortsRef.current);
    });
  };

  useEffect(() => {
    scanTables();
    let timer;
    const root = document.querySelector('.website-admin main') || document.body;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(scanTables, 100);
    });
    observer.observe(root, { childList: true, subtree: true });
    const close = () => setActiveMenu(null);
    const closeOnScroll = () => setActiveMenu(null);
    document.addEventListener('click', close);
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnScroll);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener('click', close);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
      document.querySelectorAll('.pb-excel-filter-button').forEach(button => button.remove());
      document.querySelectorAll('.website-admin main table th[data-pb-excel-filter-padding-applied="1"], .website-admin main table th[data-pb-excel-filter-position-applied="1"]').forEach(th => {
        if (th.dataset.pbExcelFilterPaddingApplied) th.style.paddingRight = th.dataset.pbExcelFilterOldPaddingRight || '';
        if (th.dataset.pbExcelFilterPositionApplied) th.style.position = th.dataset.pbExcelFilterOldPosition || '';
        delete th.dataset.pbExcelFilterPaddingApplied;
        delete th.dataset.pbExcelFilterOldPaddingRight;
        delete th.dataset.pbExcelFilterPositionApplied;
        delete th.dataset.pbExcelFilterOldPosition;
        delete th.dataset.pbExcelFilterLabel;
      });
    };
  }, []);

  const visibleValues = query.trim()
    ? menuValues.filter(value => (value === '' ? '(Blanks)' : value).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    : menuValues;

  const apply = () => {
    if (!activeMenu) return;
    const next = { ...filtersRef.current };
    const tableFilters = { ...(next[activeMenu.tableKey] || {}) };
    const columnKey = String(activeMenu.colIndex);
    const allSelected = menuValues.length > 0 && menuValues.every(value => selected.has(value)) && selected.size === menuValues.length;
    if (allSelected) delete tableFilters[columnKey];
    else tableFilters[columnKey] = Array.from(selected);
    if (Object.keys(tableFilters).length) next[activeMenu.tableKey] = tableFilters;
    else delete next[activeMenu.tableKey];
    filtersRef.current = next;
    setFilters(next);
    const table = Array.from(document.querySelectorAll('.website-admin main table'))[activeMenu.tableIndex];
    applyTableView(table, activeMenu.tableKey, next, sortsRef.current);
    setActiveMenu(null);
  };

  const clearColumnFilter = () => {
    if (!activeMenu) return;
    const next = { ...filtersRef.current };
    const tableFilters = { ...(next[activeMenu.tableKey] || {}) };
    delete tableFilters[String(activeMenu.colIndex)];
    if (Object.keys(tableFilters).length) next[activeMenu.tableKey] = tableFilters;
    else delete next[activeMenu.tableKey];
    filtersRef.current = next;
    setFilters(next);
    const table = Array.from(document.querySelectorAll('.website-admin main table'))[activeMenu.tableIndex];
    applyTableView(table, activeMenu.tableKey, next, sortsRef.current);
    setSelected(new Set(menuValues));
    setQuery('');
    setActiveMenu(null);
  };

  const sortBy = (type, direction) => {
    if (!activeMenu) return;
    const next = { ...sortsRef.current };
    next[activeMenu.tableKey] = { columnIndex: activeMenu.colIndex, type, direction };
    sortsRef.current = next;
    setSorts(next);
    const table = Array.from(document.querySelectorAll('.website-admin main table'))[activeMenu.tableIndex];
    applyTableView(table, activeMenu.tableKey, filtersRef.current, next);
    setActiveMenu(null);
  };

  const clearSort = () => {
    if (!activeMenu) return;
    const next = { ...sortsRef.current };
    delete next[activeMenu.tableKey];
    sortsRef.current = next;
    setSorts(next);
    const table = Array.from(document.querySelectorAll('.website-admin main table'))[activeMenu.tableIndex];
    applyTableView(table, activeMenu.tableKey, filtersRef.current, next);
    setActiveMenu(null);
  };

  const toggleValue = value => setSelected(previous => {
    const next = new Set(previous);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
  const allVisibleSelected = visibleValues.length > 0 && visibleValues.every(value => selected.has(value));
  const selectAllVisible = () => setSelected(previous => {
    const next = new Set(previous);
    if (allVisibleSelected) visibleValues.forEach(value => next.delete(value));
    else visibleValues.forEach(value => next.add(value));
    return next;
  });

  return (
    <>
      <style>{filterCss}</style>
      {activeMenu && (
        <div className="pb-excel-filter-menu" style={{ top: activeMenu.rect.top, left: activeMenu.rect.left }} onClick={event => event.stopPropagation()}>
          <div className="pb-filter-header">
            <div>
              <div className="pb-filter-kicker">PinkBox Admin · Table tools</div>
              <div className="pb-filter-title">Sort &amp; Filter · {activeMenu.label}</div>
              <div className="pb-filter-subtitle">Arrange values or narrow this column</div>
            </div>
            <button type="button" aria-label="Close" onClick={() => setActiveMenu(null)} className="pb-filter-close"><X size={15}/></button>
          </div>

          <div className="pb-filter-section">
            <button type="button" className="pb-filter-menu-action" onClick={() => sortBy('text','asc')}><ArrowUpAZ size={16}/> Sort A to Z</button>
            <button type="button" className="pb-filter-menu-action" onClick={() => sortBy('text','desc')}><ArrowDownAZ size={16}/> Sort Z to A</button>
            {activeMenu.numeric && <>
              <div className="pb-filter-rule"/>
              <button type="button" className="pb-filter-menu-action" onClick={() => sortBy('number','asc')}><ArrowDownWideNarrow size={16}/> Sort Smallest to Largest</button>
              <button type="button" className="pb-filter-menu-action" onClick={() => sortBy('number','desc')}><ArrowUpWideNarrow size={16}/> Sort Largest to Smallest</button>
            </>}
            {sorts[activeMenu.tableKey] && <button type="button" className="pb-filter-menu-action" onClick={clearSort}><RotateCcw size={15}/> Clear Sort</button>}
          </div>

          <div className="pb-filter-section">
            <div className="pb-filter-search">
              <Search size={14} style={{position:'absolute',left:9,top:10,color:'#666'}}/>
              <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search values" className="pb-filter-input"/>
            </div>
          </div>

          <div className="pb-filter-list-head">
            <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer'}}>
              <input type="checkbox" checked={allVisibleSelected} onChange={selectAllVisible}/>
              <span>Select All</span>
            </label>
            <button type="button" className="pb-filter-link" onClick={clearColumnFilter}>Clear Filter</button>
          </div>

          <div className="pb-filter-values">
            {!visibleValues.length ? (
              <div className="pb-filter-muted" style={{padding:'18px 8px',textAlign:'center'}}>No values found</div>
            ) : visibleValues.map((value,index) => {
              const checked = selected.has(value);
              return <button type="button" key={value === '' ? '__blank__' : value + ':' + index} onClick={() => toggleValue(value)} className="pb-filter-value">
                <span className={'pb-filter-check' + (checked ? ' is-checked' : '')}>{checked && <Check size={11}/>}</span>
                <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={value === '' ? '(Blanks)' : value}>{value === '' ? '(Blanks)' : value}</span>
              </button>;
            })}
          </div>

          <div className="pb-filter-footer">
            <span className="pb-filter-muted" style={{fontSize:11}}>{selected.size} selected</span>
            <div style={{display:'flex',gap:7}}>
              <button type="button" onClick={() => setActiveMenu(null)} className="pb-filter-btn">Cancel</button>
              <button type="button" onClick={apply} className="pb-filter-btn pb-filter-btn-primary">OK</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
