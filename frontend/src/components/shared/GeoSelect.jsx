/**
 * GeoSelect — cascading continent → country → state → city
 *
 * Props:
 *   value        = { continent, country, state, city }
 *   onChange     = (field, value) => void
 *   showContinent = true
 *   showCity      = true
 *   required     = { continent, country, state, city }   (booleans)
 *   inheritFrom  = { continent, country, state, city }   (parent values to suggest)
 *   label        = optional prefix for field labels
 */
import { useEffect, useRef, useState } from 'react';
import {
  CONTINENTS,
  getCountriesByContinent,
  getCountries,
  getCities,
  getContinentForCountry,
  getStateNames,
  hasStates,
  isValidState,
  isValidCity,
} from '../../data/geo';

const sel = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14,
  boxSizing: 'border-box', background: 'white', outline: 'none',
};
const selErr = { ...sel, borderColor: '#f59e0b', background: '#fffbeb' };
const lbl = {
  display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.08em', color: 'var(--slate)', marginBottom: 6,
};
const inheritBtn = {
  fontSize: 10, color: 'var(--gold)', cursor: 'pointer', fontWeight: 700,
  background: 'none', border: 'none', padding: '2px 0', textDecoration: 'underline',
  fontFamily: 'DM Sans',
};
const warnStyle = {
  fontSize: 11, color: '#b45309', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4,
};

export default function GeoSelect({
  value = {},
  onChange,
  showContinent = true,
  showCity = true,
  required = {},
  inheritFrom = null,
  label = '',
}) {
  const continent = value.continent || '';
  const country   = value.country   || '';
  const state     = value.state     || '';
  const city      = value.city      || '';

  // Track previous country to only reset on real changes
  const prevCountryRef = useRef(country);
  const prevStateRef   = useRef(state);
  const mountedRef     = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (country && !continent) {
        const inferred = getContinentForCountry(country);
        if (inferred) onChange('continent', inferred);
      }
      prevCountryRef.current = country;
      prevStateRef.current   = state;
      return;
    }
    if (country !== prevCountryRef.current) {
      prevCountryRef.current = country;
      onChange('state', '');
      onChange('city', '');
      if (!continent && country) {
        const inferred = getContinentForCountry(country);
        if (inferred) onChange('continent', inferred);
      }
    }
  }, [country]);

  useEffect(() => {
    if (!mountedRef.current) return;
    if (state !== prevStateRef.current) {
      prevStateRef.current = state;
      onChange('city', '');
    }
  }, [state]);

  const countries  = continent ? getCountriesByContinent(continent) : getCountries();
  const stateNames = getStateNames(country);
  const showState  = stateNames.length > 0;
  const cities     = getCities(country, state);

  // Validation warnings
  const stateInvalid = state && !isValidState(country, state);
  const cityInvalid  = city && !isValidCity(country, state, city) && cities.length > 0;

  // Inherit helpers
  const canInheritContinent = inheritFrom?.continent && !continent;
  const canInheritCountry   = inheritFrom?.country   && !country;
  const canInheritState     = inheritFrom?.state     && !state;
  const canInheritCity      = inheritFrom?.city      && !city;

  const applyInherit = () => {
    if (inheritFrom) {
      if (inheritFrom.continent && !continent) onChange('continent', inheritFrom.continent);
      if (inheritFrom.country   && !country)   onChange('country',   inheritFrom.country);
      if (inheritFrom.state     && !state)     onChange('state',     inheritFrom.state);
      if (inheritFrom.city      && !city)      onChange('city',      inheritFrom.city);
    }
  };

  const handleContinent = (v) => {
    onChange('continent', v);
    onChange('country', '');
    onChange('state', '');
    onChange('city', '');
  };

  const handleCountry = (v) => {
    onChange('country', v);
    if (!continent && v) onChange('continent', getContinentForCountry(v));
  };

  const colCount = [showContinent, true, showState, showCity].filter(Boolean).length;
  const gridCols = Array(colCount).fill('1fr').join(' ');

  const pfx = label ? `${label} ` : '';

  return (
    <div>
      {/* Inherit banner */}
      {inheritFrom && (inheritFrom.country || inheritFrom.city) && (
        <div style={{ marginBottom: 8, padding: '7px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: '#15803d' }}>
            📍 Héritage disponible : <strong>{[inheritFrom.country, inheritFrom.state, inheritFrom.city].filter(Boolean).join(', ')}</strong>
          </span>
          <button style={inheritBtn} onClick={applyInherit}>Appliquer ↓</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10 }}>
        {/* Continent */}
        {showContinent && (
          <div>
            <label style={lbl}>
              {pfx}Continent{required.continent ? ' *' : ''}
              {canInheritContinent && <button style={{ ...inheritBtn, marginLeft: 8 }} onClick={() => onChange('continent', inheritFrom.continent)}>← hériter</button>}
            </label>
            <select style={sel} value={continent} onChange={e => handleContinent(e.target.value)}>
              <option value="">— Tous —</option>
              {CONTINENTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Country */}
        <div>
          <label style={lbl}>
            {pfx}Pays{required.country ? ' *' : ''}
            {canInheritCountry && <button style={{ ...inheritBtn, marginLeft: 8 }} onClick={() => handleCountry(inheritFrom.country)}>← hériter</button>}
          </label>
          <select style={sel} value={country} onChange={e => handleCountry(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* State / Province */}
        {showState && (
          <div>
            <label style={lbl}>
              {pfx}{country === 'Canada' ? 'Province' : 'État'}{required.state ? ' *' : ''}
              {canInheritState && <button style={{ ...inheritBtn, marginLeft: 8 }} onClick={() => onChange('state', inheritFrom.state)}>← hériter</button>}
            </label>
            <select style={stateInvalid ? selErr : sel} value={state} onChange={e => onChange('state', e.target.value)}>
              <option value="">— Sélectionner —</option>
              {stateNames.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {stateInvalid && <div style={warnStyle}>⚠️ "{state}" n'appartient pas à {country}</div>}
          </div>
        )}

        {/* City */}
        {showCity && (
          <div>
            <label style={lbl}>
              {pfx}Ville{required.city ? ' *' : ''}
              {canInheritCity && <button style={{ ...inheritBtn, marginLeft: 8 }} onClick={() => onChange('city', inheritFrom.city)}>← hériter</button>}
            </label>
            {cities.length > 0 ? (
              <select style={cityInvalid ? selErr : sel} value={city} onChange={e => onChange('city', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__other__">Autre (saisir ci-dessous)</option>
              </select>
            ) : (
              <input style={sel} value={city} onChange={e => onChange('city', e.target.value)} placeholder="Nom de la ville" />
            )}
            {city === '__other__' && (
              <input style={{ ...sel, marginTop: 6 }} placeholder="Saisir la ville" onChange={e => onChange('city', e.target.value)} autoFocus />
            )}
            {cityInvalid && <div style={warnStyle}>⚠️ "{city}" ne correspond pas à {state || country}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
