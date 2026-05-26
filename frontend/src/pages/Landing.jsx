import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: '▦',
    title: 'Patrimoine structuré',
    titleEn: 'Structured Patrimony',
    desc: 'Hiérarchie complète : Entité → Bâtiment → Étage → Espace → Objet locatif. Inspiré de SAP RE-FX.',
    descEn: 'Full hierarchy: Entity → Building → Floor → Space → Rental Object. SAP RE-FX inspired.',
  },
  {
    icon: '◇',
    title: 'Baux & Conditions',
    titleEn: 'Leases & Conditions',
    desc: 'Contrats time-dependent avec révisions IPC, loyer basé sur CA, charges locatives et IFRS 16.',
    descEn: 'Time-dependent contracts with IPC revisions, sales-based rent, service charges and IFRS 16.',
  },
  {
    icon: '⚡',
    title: 'Moteur de posting',
    titleEn: 'Posting Engine',
    desc: 'Générez vos écritures comptables par période avec mode dry-run. Multi-devise, RERAPP-style.',
    descEn: 'Generate accounting entries by period with dry-run mode. Multi-currency, RERAPP-style.',
  },
  {
    icon: '📄',
    title: 'Export PDF',
    titleEn: 'PDF Export',
    desc: 'Quittances de loyer et états locatifs complets générés en un clic, prêts à envoyer.',
    descEn: 'Rent receipts and full lease statements generated in one click, ready to send.',
  },
  {
    icon: '🔔',
    title: 'Alertes automatiques',
    titleEn: 'Automatic Alerts',
    desc: 'Emails sur loyers en retard, contrats expirants et maintenance non résolue. Résumé mensuel.',
    descEn: 'Emails on overdue rents, expiring contracts and unresolved maintenance. Monthly summary.',
  },
  {
    icon: '▲',
    title: 'Module hôtelier',
    titleEn: 'Hotel Module',
    desc: 'Gestion complète des hôtels, chambres, réservations et profils clients avec chiffrement PII.',
    descEn: 'Complete hotel, room, booking and guest profile management with PII encryption.',
  },
];

const STATS = [
  { value: '5', label: 'niveaux de hiérarchie', labelEn: 'hierarchy levels' },
  { value: '4', label: 'rôles utilisateurs', labelEn: 'user roles' },
  { value: '100%', label: 'données isolées par client', labelEn: 'data isolated per client' },
  { value: '2FA', label: 'sécurité incluse', labelEn: 'security included' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [lang, setLang] = useState('fr');
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const t = (fr, en) => lang === 'fr' ? fr : en;

  return (
    <div style={{ background: '#0a0b14', minHeight: '100vh', color: '#fff', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 40px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(10,11,20,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all .3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: '#4361ee', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>P</div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em' }}>PropManager</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '5px 14px', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '.04em' }}>
            {lang === 'fr' ? 'EN' : 'FR'}
          </button>
          <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 18px', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {t('Connexion', 'Log in')}
          </button>
          <button onClick={() => navigate('/register')} style={{ background: '#4361ee', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {t('Essai gratuit', 'Free trial')}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', textAlign: 'center', position: 'relative' }}>

        {/* Background glows */}
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: '#4361ee', filter: 'blur(120px)', opacity: .12, top: '10%', left: '20%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: '#7209b7', filter: 'blur(100px)', opacity: .1, bottom: '15%', right: '15%', pointerEvents: 'none' }} />

        {/* Grid overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 760 }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(67,97,238,0.15)', border: '1px solid rgba(67,97,238,0.3)', borderRadius: 20, padding: '6px 16px', fontSize: 12, fontWeight: 600, color: '#818cf8', marginBottom: 32, letterSpacing: '.04em' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            {t('PLATEFORME IMMOBILIÈRE COMMERCIALE', 'COMMERCIAL REAL ESTATE PLATFORM')}
          </div>

          <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-.03em', margin: '0 0 24px', fontFamily: "'DM Serif Display', Georgia, serif" }}>
            {t('Gérez votre patrimoine', 'Manage your real estate')}<br />
            <span style={{ color: '#4361ee' }}>{t('comme un pro', 'like a pro')}</span>
          </h1>

          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px', fontWeight: 400 }}>
            {t(
              'Gestion de baux commerciaux, posting comptable, alertes automatiques et exports PDF — tout en un.',
              'Commercial lease management, accounting posting, automatic alerts and PDF exports — all in one.'
            )}
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/register')} style={{ background: '#4361ee', border: 'none', borderRadius: 10, padding: '14px 32px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-.01em', boxShadow: '0 0 40px rgba(67,97,238,0.4)' }}>
              {t('Commencer gratuitement', 'Start for free')} →
            </button>
            <button onClick={() => navigate('/login')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '14px 28px', color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
              {t('Voir la démo', 'View demo')}
            </button>
          </div>

          <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            {t('Essai gratuit · Aucune carte requise · Données sécurisées', 'Free trial · No credit card · Secure data')}
          </p>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '20px 16px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#4361ee', fontFamily: "'DM Serif Display', serif", letterSpacing: '-.02em' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontWeight: 500 }}>{t(s.label, s.labelEn)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: '#4361ee', textTransform: 'uppercase', marginBottom: 12 }}>
              {t('FONCTIONNALITÉS', 'FEATURES')}
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-.02em', margin: 0, fontFamily: "'DM Serif Display', serif" }}>
              {t('Tout ce qu\'il faut pour gérer', 'Everything you need to manage')}<br />
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>{t('votre immobilier commercial', 'your commercial real estate')}</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14, padding: '28px', transition: 'border-color .2s, background .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(67,97,238,0.4)'; e.currentTarget.style.background = 'rgba(67,97,238,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              >
                <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em' }}>{t(f.title, f.titleEn)}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{t(f.desc, f.descEn)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECURITY STRIP ── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '60px 24px', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#4361ee', textTransform: 'uppercase', marginBottom: 8 }}>
              {t('SÉCURITÉ', 'SECURITY')}
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px', fontFamily: "'DM Serif Display', serif" }}>
              {t('Vos données sont protégées', 'Your data is protected')}
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0, maxWidth: 420, lineHeight: 1.6 }}>
              {t(
                'JWT + 2FA TOTP, chiffrement Fernet sur les données sensibles, SSL en base, audit log complet et isolation totale entre clients.',
                'JWT + 2FA TOTP, Fernet encryption on sensitive data, SSL on DB, full audit log and complete data isolation between clients.'
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {['🔐 JWT + 2FA', '🔒 Fernet PII', '📋 Audit log', '🛡 RBAC 4 rôles'].map(tag => (
              <span key={tag} style={{ background: 'rgba(67,97,238,0.12)', border: '1px solid rgba(67,97,238,0.25)', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#818cf8' }}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '100px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: '#4361ee', filter: 'blur(120px)', opacity: .1, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-.03em', margin: '0 0 20px', fontFamily: "'DM Serif Display', serif" }}>
            {t('Prêt à moderniser', 'Ready to modernize')}<br />
            {t('votre gestion ?', 'your management?')}
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', marginBottom: 36, lineHeight: 1.6 }}>
            {t(
              'Créez votre compte en 2 minutes. Importez vos données existantes via CSV.',
              'Create your account in 2 minutes. Import your existing data via CSV.'
            )}
          </p>
          <button onClick={() => navigate('/register')} style={{ background: '#4361ee', border: 'none', borderRadius: 12, padding: '16px 40px', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 60px rgba(67,97,238,0.35)', letterSpacing: '-.01em' }}>
            {t('Créer mon compte gratuit', 'Create my free account')} →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, background: '#4361ee', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>P</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>PropManager</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          © {new Date().getFullYear()} PropManager · {t('Tous droits réservés', 'All rights reserved')}
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: t('Connexion', 'Login'), path: '/login' },
            { label: t('Inscription', 'Register'), path: '/register' },
          ].map(({ label, path }) => (
            <button key={path} onClick={() => navigate(path)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
