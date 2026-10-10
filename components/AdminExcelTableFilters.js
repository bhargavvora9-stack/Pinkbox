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

const filterCss = [
  '.pb-excel-filter-button{position:absolute;right:5px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;width:21px;height:21px;padding:0;border:1px solid transparent;border-radius:3px;background:transparent;color:#64748b;cursor:pointer;font-size:9px;line-height:1;opacity:.9}',
  '.pb-excel-filter-button:hover{border-color:#c8c8c8;background:#eaf2fb;color:#1f2937;opacity:1}',
  '.pb-excel-filter-button.pb-excel-filter-active,.pb-excel-filter-button.pb-excel-sort-active{border-color:#8aaee0;background:#dceafa;color:#174ea6;opacity:1}',
  '.pb-excel-filter-menu{position:fixed;z-index:99999;width:304px;max-width:calc(100vw - 16px);max-height:min(520px,calc(100vh - 16px));overflow-y:auto;border:1px solid #b8b8b8;border-radius:3px;background:#fff;box-shadow:0 5px 18px rgba(0,0,0,.22);color:#222;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.35}',
  '.pb-excel-filter-menu *{box-sizing:border-box}',
  '.pb-excel-filter-menu button{font:inherit;color:#222}',
  '.pb-excel-filter-menu .pb-filter-muted{color:#666}',
  '.pb-excel-filter-menu .pb-filter-header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:#f6f6f6;border-bottom:1px solid #dedede}',
  '.pb-excel-filter-menu .pb-filter-section{padding:9px 11px;border-bottom:1px solid #dedede}',
  '.pb-excel-filter-menu .pb-filter-search{position:relative}',
  '.pb-excel-filter-menu .pb-filter-input{display:block;width:100%;height:34px;padding:6px 9px 6px 30px;border:1px solid #a6a6a6;border-radius:2px;background:#fff;color:#222;outline:none}',
  '.pb-excel-filter-menu .pb-filter-input:focus{border-color:#217346;box-shadow:0 0 0 1px #217346}',
  '.pb-excel-filter-menu .pb-filter-menu-action{display:flex;width:100%;align-items:center;gap:9px;padding:7px 9px;border:0;background:transparent;text-align:left;cursor:pointer}',
  '.pb-excel-filter-menu .pb-filter-menu-action:hover{background:#eaf2fb}',
  '.pb-excel-filter-menu .pb-filter-rule{height:1px;margin:4px 0;background:#e2e2e2}',
  '.pb-excel-filter-menu .pb-filter-list-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;background:#fafafa;border-bottom:1px solid #ededed}',
  '.pb-excel-filter-menu .pb-filter-link{padding:3px 4px;border:0;background:transparent;color:#1a5fb4;cursor:pointer}',
  '.pb-excel-filter-menu .pb-filter-link:hover{text-decoration:underline}',
  '.pb-excel-filter-menu .pb-filter-values{max-height:165px;overflow-y:auto;padding:4px}',
  '.pb-excel-filter-menu .pb-filter-value{display:flex;width:100%;align-items:center;gap:8px;padding:6px 7px;border:1px solid transparent;border-radius:2px;background:#fff;text-align:left;cursor:pointer}',
  '.pb-excel-filter-menu .pb-filter-value:hover{background:#eaf2fb;border-color:#d4e4f8}',
  '.pb-excel-filter-menu .pb-filter-check{display:inline-flex;width:15px;height:15px;flex-shrink:0;align-items:center;justify-content:center;border:1px solid #777;border-radius:2px;background:#fff;color:#fff}',
  '.pb-excel-filter-menu .pb-filter-check.is-checked{border-color:#217346;background:#217346}',
  '.pb-excel-filter-menu .pb-filter-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 11px;background:#f6f6f6;border-top:1px solid #dedede}',
  '.pb-excel-filter-menu .pb-filter-btn{min-height:29px;padding:5px 13px;border:1px solid #b6b6b6;border-radius:2px;background:#fff;cursor:pointer}',
  '.pb-excel-filter-menu .pb-filter-btn:hover{background:#f1f1f1}',
  '.pb-excel-filter-menu .pb-filter-btn-primary{border-color:#185c37;background:#217346;color:#fff}',
  '.pb-excel-filter-menu .pb-filter-btn-primary:hover{background:#185c37}'
].join('\n');

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
  filtersRef.current = filters;
  sortsRef.current = sorts;

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
          th.style.paddingRight = '30px';
          th.dataset.pbExcelFilterPaddingApplied = '1';
        }

        let button = th.querySelector('.pb-excel-filter-button');
        if (!button) {
          button = document.createElement('button');
          button.type = 'button';
          button.className = 'pb-excel-filter-button';
          button.setAttribute('aria-label', 'Filter ' + original);
          button.innerHTML = '<span aria-hidden="true">▼</span>';
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
                top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 445)),
                left: Math.max(8, Math.min(rect.left - 8, window.innerWidth - 316))
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
              <div style={{fontWeight:600,color:'#222'}}>Sort / Filter: {activeMenu.label}</div>
              <div className="pb-filter-muted" style={{fontSize:11,marginTop:2}}>Excel-style column controls</div>
            </div>
            <button type="button" aria-label="Close" onClick={() => setActiveMenu(null)} className="pb-filter-btn"><X size={14}/></button>
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
