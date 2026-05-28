/**
 * CurrencySelect — searchable currency dropdown
 * Shows common currencies first, then all others
 */
import { useState } from 'react';
import { CURRENCIES, COMMON_CURRENCIES, currencyLabel } from '../../data/currencies';

export default function CurrencySelect({ value, onChange, style = {} }) {
  const [search, setSearch] = useState('');

  const common = CURRENCIES.filter(c => COMMON_CURRENCIES.includes(c.code));
  const others  = CURRENCIES.filter(c => !COMMON_CURRENCIES.includes(c.code));

  const filterCur = (list) => search
    ? list.filter(c => c.code.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()))
    : list;

  const baseStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14, boxSizing: 'border-box', background: 'white', ...style };

  return (
    <div>
      <input
        style={{ ...baseStyle, marginBottom: 4 }}
        placeholder="🔍 Search currency…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <select style={baseStyle} value={value} onChange={e => { onChange(e.target.value); setSearch(''); }} size={search ? undefined : 1}>
        {!search && <option value="">— Select currency —</option>}
        {!search && (
          <optgroup label="Common currencies">
            {common.map(c => <option key={c.code} value={c.code}>{currencyLabel(c)}</option>)}
          </optgroup>
        )}
        {!search && (
          <optgroup label="All currencies">
            {others.map(c => <option key={c.code} value={c.code}>{currencyLabel(c)}</option>)}
          </optgroup>
        )}
        {search && filterCur([...common, ...others]).map(c => (
          <option key={c.code} value={c.code}>{currencyLabel(c)}</option>
        ))}
      </select>
    </div>
  );
}
