import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { SCHEMES } from "../data/schemes";
import "../styles/SchemesPage.css";

const ALL_STATES = [
  "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Gujarat","Haryana",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha",
  "Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh",
  "Uttarakhand","West Bengal"
];

const CATEGORIES = [
  {id:'all', label:'All Schemes'},
  {id:'income', label:'Income Support'},
  {id:'insurance', label:'Insurance'},
  {id:'credit', label:'Credit & Loans'},
  {id:'organic', label:'Organic Farming'},
  {id:'employment', label:'Employment'},
  {id:'infrastructure', label:'Infrastructure'},
];

export default function SchemesPage() {
  const { t } = useLanguage();
  const [stateFilter, setStateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = SCHEMES.filter(s => {
    const matchState = stateFilter === 'all' ||
      s.states === 'all' ||
      s.states.includes(stateFilter);
    const matchCat = categoryFilter === 'all' || s.category === categoryFilter;
    const matchSearch = !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())) ||
      s.fullName.toLowerCase().includes(search.toLowerCase());
    return matchState && matchCat && matchSearch;
  });

  return (
    <div className="schemes-page container">
      <header className="schemes-header">
        <h1>{t("schemes") || "Government Schemes"}</h1>
        <p className="schemes-lead">
          Find the right agricultural schemes. Filter by your state and needs to check exact eligibility and documentation.
        </p>
      </header>

      <div className="schemes-filters" style={{ marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <input 
            type="text"
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder="Search schemes (e.g. organic, PM)..." 
            style={{ flex: 1, padding: '10px 15px', borderRadius: '8px', border: '1px solid #ddd', minWidth: '200px' }}
          />
          <select 
            value={stateFilter} 
            onChange={e => setStateFilter(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minWidth: '150px' }}
          >
            <option value="all">All States</option>
            {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        
        <div className="category-pills" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button 
              key={c.id} 
              onClick={() => setCategoryFilter(c.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: categoryFilter === c.id ? 'var(--primary-600, #2e7d32)' : '#e0e0e0',
                color: categoryFilter === c.id ? 'white' : '#333',
                fontWeight: categoryFilter === c.id ? '600' : '400',
                transition: 'all 0.2s'
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <strong>{filtered.length}</strong> scheme(s) found
      </div>

      <section className="schemes-grid">
        {filtered.map((s) => (
          <article key={s.id} className="scheme-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 className="scheme-title" style={{ margin: 0 }}>{s.title}</h2>
              <span style={{ fontSize: '12px', background: '#e8f5e9', color: '#2e7d32', padding: '4px 8px', borderRadius: '4px', textTransform: 'capitalize' }}>
                {s.category}
              </span>
            </div>
            <p className="scheme-summary" style={{ fontWeight: '500', marginTop: '8px' }}>{s.fullName}</p>
            
            <ul className="scheme-meta" style={{ flexGrow: 1, paddingLeft: '20px', margin: '15px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Benefit:</strong> {s.benefit}</li>
              <li><strong>Eligibility:</strong> {s.eligibility}</li>
              <li><strong>Documents:</strong> {s.documents.join(', ')}</li>
              <li><strong>Deadline:</strong> {s.deadline}</li>
            </ul>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '15px' }}>
              {s.tags.map(tag => (
                <span key={tag} style={{ fontSize: '11px', background: '#f5f5f5', color: '#666', padding: '2px 8px', borderRadius: '10px' }}>#{tag}</span>
              ))}
            </div>

            <div className="scheme-actions" style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid #eee' }}>
              <a
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="scheme-link"
                style={{ fontWeight: '600' }}
              >
                Check Details / Apply →
              </a>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
