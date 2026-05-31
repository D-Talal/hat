/**
 * GeoSelect — cascading continent/country/state/city dropdowns
 * Props: value={continent,country,state,city}, onChange(field, value), style
 */
import { useState, useEffect } from 'react';
import { CONTINENTS, getCountriesByContinent, getCountries, getCities, getContinentForCountry, getStates, hasStates } from '../../data/geo';

const sel = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14, boxSizing: 'border-box', background: 'white' };
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--slate)', marginBottom: 6 };

export default function GeoSelect({ value = {}, onChange, showContinent = true, showCity = true, required = {} }) {
  const { continent = '', country = '', state = '', city = '' } = value;

  // When country changes externally, infer continent
  useEffect(() => {
    if (country && !continent) {
      const inferred = getContinentForCountry(country);
      if (inferred) onChange('continent', inferred);
    }
  }, [country]);

  const countries  = continent ? getCountriesByContinent(continent) : getCountries();
  const cities     = country ? getCities(country) : [];
  const states     = country ? getStates(country) : [];
  const showState  = states.length > 0;

  const handleContinent = (v) => {
    onChange('continent', v);
    onChange('country', '');
    onChange('state', '');
    onChange('city', '');
  };

  const handleCountry = (v) => {
    onChange('country', v);
    onChange('state', '');
    onChange('city', '');
    if (!continent && v) {
      onChange('continent', getContinentForCountry(v));
    }
  };

  const handleState = (v) => {
    onChange('state', v);
    onChange('city', '');
  };

  // Compute grid columns dynamically
  const colCount = [showContinent, true, showState, showCity].filter(Boolean).length;
  const gridCols = Array(colCount).fill('1fr').join(' ');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10 }}>
      {showContinent && (
        <div>
          <label style={lbl}>Continent{required.continent ? ' *' : ''}</label>
          <select style={sel} value={continent} onChange={e => handleContinent(e.target.value)}>
            <option value="">— All —</option>
            {CONTINENTS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      <div>
        <label style={lbl}>Country{required.country ? ' *' : ''}</label>
        <select style={sel} value={country} onChange={e => handleCountry(e.target.value)}>
          <option value="">— Select —</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {showState && (
        <div>
          <label style={lbl}>
            {country === 'Canada' ? 'Province' : 'State'}{required.state ? ' *' : ''}
          </label>
          <select style={sel} value={state} onChange={e => handleState(e.target.value)}>
            <option value="">— Select —</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {showCity && (
        <div>
          <label style={lbl}>City{required.city ? ' *' : ''}</label>
          {cities.length > 0 ? (
            <select style={sel} value={city} onChange={e => onChange('city', e.target.value)}>
              <option value="">— Select —</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__other__">Other (type below)</option>
            </select>
          ) : (
            <input style={sel} value={city} onChange={e => onChange('city', e.target.value)} placeholder="City name" />
          )}
          {city === '__other__' && (
            <input style={{ ...sel, marginTop: 6 }} placeholder="Enter city name" onChange={e => onChange('city', e.target.value)} autoFocus />
          )}
        </div>
      )}
    </div>
  );
}
