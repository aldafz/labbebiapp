/* La Bebi App v4.11 — gravidanza + 12-18 anni + sezione genitori + Infografica Cerebrale Interattiva (PNG-based) */
import { useState, useEffect, useRef } from "react";

/* ─── GLOSSARY LINK RENDERER ─────────────────────────────────────────────── */
let _globalSetSection = null;
let _globalSetHighlight = null;
let _globalChecklistOverride = null;
let _globalShowZonePicker = null;
let _glossaryReturnSection = null;
let _glossaryReturnScrollY = 0;
let _globalCurrentSection = null;

function GlossLink({ term, display, children }) {
  const label = display || children || term;
  return (
    <button onClick={() => {
      const matched = findGlossaryTerm(term);
      _glossaryReturnSection = _globalCurrentSection;
      _glossaryReturnScrollY = window.scrollY;
      if (_globalSetSection) _globalSetSection("glossario");
      if (_globalSetHighlight) _globalSetHighlight(matched ? matched.term : term);
    }} style={{
      background: "none", border: "none", padding: "0 2px",
      color: "#CC2268", fontFamily: "inherit", fontSize: "inherit",
      fontWeight: 700, cursor: "pointer", textDecoration: "underline",
      textDecorationStyle: "dotted", textUnderlineOffset: 3,
    }}>{label}</button>
  );
}

function parseLinks(text) {
  if (!text || typeof text !== "string") return text;
  const parts = text.split(/(\[\[.*?\]\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
    if (m) return <GlossLink key={i} term={m[1]} display={m[2]} />;
    return part;
  });
}

function findGlossaryTerm(term) {
  if (!term) return null;
  const lower = term.toLowerCase();
  return GLOSSARIO_TERMS.find(t => t.term.toLowerCase() === lower);
}

/* ─── MOBILE DETECTION HOOK ─── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function ChecklistNudge({ zone, variant = "bambino" }) {
  const messages = {
    gravidanza: { emoji: "🤰", text: "Vuoi esplorare come stai attraversando questa gravidanza?", cta: "Uno spazio dedicato a te →", action: "checklist" },
    papa:       { emoji: "🤝", text: "Come stai vivendo il tuo percorso verso la genitorialità?", cta: "Rifletti con noi →", action: "checklist" },
    "0-3":      { emoji: "🌱", text: "Vuoi capire meglio questa fase del tuo bambino?", cta: "Esplora le domande guidate →", action: "checklist" },
    "3-6":      { emoji: "🌸", text: "Hai domande su quello che osservi nel tuo bambino?", cta: "Trovi uno spazio per riflettere →", action: "checklist" },
    "6-12":     { emoji: "🌟", text: "Vuoi capire meglio come supportare tuo figlio in questa fase?", cta: "Esplora le domande guidate →", action: "checklist" },
    "12-15":    { emoji: "🌊", text: "Hai domande su quello che stai osservando nel tuo preadolescente?", cta: "Trovi uno spazio per riflettere →", action: "checklist" },
    "15-18":    { emoji: "✨", text: "Vuoi capire meglio come accompagnare il tuo adolescente?", cta: "Esplora le domande guidate →", action: "checklist" },
  };
  const genitoreMsg = { emoji: "💛", text: "Come stai tenendo il filo, tu che sei genitore?", cta: "C'è uno spazio anche per te →", action: "genitori" };
  const msg = variant === "genitore" ? genitoreMsg : (messages[zone] || messages["0-3"]);
  return (
    <div onClick={() => { if (_globalSetSection) _globalSetSection(msg.action); }} style={{
      background: "linear-gradient(135deg, #FFF9F2, #FBEAF2)",
      border: "1.5px solid rgba(204,34,104,0.18)",
      borderLeft: "4px solid #CC2268",
      borderRadius: "0 18px 18px 0",
      padding: "14px 18px", marginTop: 20, marginBottom: 8,
      cursor: "pointer", transition: "all 0.18s",
      display: "flex", alignItems: "flex-start", gap: 12,
    }}
    onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg, #FBEAF2, #FDE8EF)"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg, #FFF9F2, #FBEAF2)"; }}
    >
      <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>{msg.emoji}</span>
      <div>
        <p style={{ fontFamily: "'Nunito', sans-serif", color: "#4A3A4A", fontSize: 14, lineHeight: 1.6, margin: "0 0 4px" }}>{msg.text}</p>
        <span style={{ fontFamily: "'Nunito', sans-serif", color: "#CC2268", fontSize: 13, fontWeight: 800 }}>{msg.cta}</span>
      </div>
    </div>
  );
}

const ZONE_IMAGES = {
  "gravidanza": "/gravidanza.png",
  "0-3":        "/03anni.png",
  "3-6":        "/36anni.png",
  "6-12":       "/612anni.png",
  "12-15":      "/1215anni.png",
  "15-18":      "/1518anni.png",
};

const COLORS = {
  cream:        "#FFF9F5",      
  warmWhite:    "#FFFCFA",
  blush:        "#FFF2F0",
  rose:         "#CC2268",      
  roseLight:    "#FBEAF2",
  roseDark:     "#9A1A50",
  peach:        "#E8735A",      
  peachLight:   "#FDF0EC",
  peachDark:    "#C45540",
  gold:         "#E8A824",      
  goldLight:    "#FDF5DF",
  goldDark:     "#C8902A",
  mint:         "#52A37A",      
  mintLight:    "#E4F4EC",
  mintDark:     "#4A8C6A",
  lavender:     "#8B7AC0",      
  lavenderLight: "#EEE9F8",
  lavenderDark:  "#7060A0",
  sky:          "#4090C8",      
  skyLight:     "#E3F2FD",
  coral:        "#D4447A",
  coralLight:   "#FBEAF2",
  coral2:       "#E8735A",
  violet:       "#9B8EC4",
  violetLight:  "#EEE9F8",
  amber:        "#F0B84A",
  amberLight:   "#FDF5DF",
  pink:         "#D4447A",
  pinkLight:    "#FBEAF2",
  lime:         "#6BAE8A",
  limeLight:    "#E4F4EC",
  dustyRose:    "#D4847A",
  sage:         "#6BAE8A",
  sageMid:      "#9ACAB5",
  sageLight:    "#E4F4EC",
  terracotta:   "#E8735A",
  deepSlate:    "#2A1F2E",      
  slateLight:   "#6B5570",      
  goldAccent:   "#F0B84A",
  roseGold:     "#E8735A",
};

/* =========================================================================
   [MANTENERE QUI TUTTE LE COSTANTI DI TESTO ORIGINALI]
   =========================================================================
   DEVELOPMENT_DATA, SCREENS_DATA, CURIOSITA_DATA, GLOSSARIO_TERMS, 
   STRENGTHS, DIFFICULTIES, QUOTES ecc...
   Sostituisci questo blocco con i tuoi dati reali per il commit finale.
   ========================================================================= */

// INSERIRE QUI TUTTE LE COSTANTI DI TESTO ORIGINALI

/* ═══════════════════════════════════════════════════════════════
   🧠 NUOVA BRAIN INFOGRAPHIC INTERATTIVA (PNG BACKGROUND)
   Usa l'immagine esatta del libro di scienze e mappa zone cliccabili.
═══════════════════════════════════════════════════════════════ */

const BRAIN_CONTENT_MAPPING = {
  "gravidanza": {
    title: "La Formazione del Cervello",
    subtitle: "Un viaggio miracoloso: le fondamenta del sistema nervoso nel pancione.",
    lobes: {
      frontal: "Iniziano a formarsi le primissime connessioni che un giorno governeranno il pensiero logico e le emozioni.",
      parietal: "Si sviluppano i recettori sensoriali: il tuo bimbo percepisce il tatto e il tepore del grembo.",
      temporal: "L'udito si attiva: verso la fine del secondo trimestre, può già ascoltare il battito del tuo cuore e la tua voce.",
      occipital: "I nervi ottici si stanno formando, preparandosi a catturare la prima luce una volta nato.",
      cerebellum: "Cresce rapidamente per preparare il bambino ai primi riflessi motori istintivi."
    }
  },
  "0-3": {
    title: "L'Esplosione Neurale",
    subtitle: "Milioni di connessioni al secondo: il cervello assorbe il mondo come una spugna.",
    lobes: {
      frontal: "Si attivano le prime aree motorie e nascono le primissime sfide con l'autocontrollo.",
      parietal: "Esplora il mondo attraverso la bocca e il tatto, costruendo una mappa sensoriale complessa.",
      temporal: "L'udito e la memoria creano le basi per l'esplosione del linguaggio.",
      occipital: "La vista impara a mettere a fuoco, a riconoscere i volti e a seguire oggetti in movimento.",
      cerebellum: "Un lavoro incessante per sostenere la testa, imparare a gattonare e infine camminare."
    }
  },
  "3-6": {
    title: "L'Età della Fantasia",
    subtitle: "Il gioco simbolico e le emozioni modellano le nuove autostrade neurali.",
    lobes: {
      frontal: "Inizia a frenare gli impulsi (con fatica) e fiorisce la capacità di capire gli altri.",
      parietal: "Padronanza dello spazio e incredibile sviluppo della coordinazione occhio-mano.",
      temporal: "Esplosione del vocabolario: racconta storie, fa mille domande e costruisce ricordi strutturati.",
      occipital: "Elaborazione visiva complessa per riconoscere forme, colori e dettagli nei libri.",
      cerebellum: "L'equilibrio si affina: dalla corsa ai salti esplosivi, tutto diventa fluido."
    }
  },
  "6-12": {
    title: "Il Grande Ordine",
    subtitle: "La scuola, la logica e gli amici: il cervello diventa specializzato ed efficiente.",
    lobes: {
      frontal: "Migliora nettamente l'attenzione prolungata, la pianificazione e il pensiero logico.",
      parietal: "Sensibilità spaziale essenziale per scrivere, disegnare e per calcoli matematici.",
      temporal: "Lettura e regole sociali si solidificano. La memoria diventa una cassaforte.",
      occipital: "Perfetta sintonia con le altre aree per l'apprendimento formale e la lettura.",
      cerebellum: "Coordina i movimenti fini complessi: andare in bici, suonare uno strumento, danzare."
    }
  },
  "12-15": {
    title: "Il Cantiere Aperto",
    subtitle: "La pubertà innesca una ristrutturazione massiccia partendo dalle emozioni.",
    lobes: {
      frontal: "Ancora acerbo rispetto alle emozioni: fatica a valutare i rischi e a frenare le reazioni.",
      parietal: "Integra le informazioni sul proprio corpo in rapido cambiamento gestendo la nuova sensibilità fisica.",
      temporal: "L'amigdala è in overdrive: le emozioni si sentono a volume massimo.",
      occipital: "Maturo e rapido elabora costantemente gli stimoli sociali e visivi complessi.",
      cerebellum: "Ricalibra l'equilibrio di un corpo che è cresciuto troppo in fretta."
    }
  },
  "15-18": {
    title: "Verso la Maturità",
    subtitle: "Il pensiero astratto si rafforza e l'identità prende forma definitiva.",
    lobes: {
      frontal: "Si avvicina alla maturità: migliora la capacità di pensare al futuro, prendere decisioni e frenare gli impulsi.",
      parietal: "Gestisce il pensiero astratto avanzato permettendo la comprensione di concetti complessi.",
      temporal: "Si consolidano i circuiti legati alla gratificazione sociale e ai ricordi emotivi.",
      occipital: "Totalmente specializzato supporta il riconoscimento istantaneo di pattern visivi.",
      cerebellum: "Perfeziona la grazia e la potenza muscolare solidificando abilità avanzate."
    }
  }
};

const BRAIN_LOBO_VISUALS = {
  frontal: { label: "Lobo Frontale", icon: "🧠", color: "#EBC1C1" }, // Sfumature desaturate del libro
  parietal: { label: "Lobo Parietale", icon: "✋", color: "#C1DBEB" },
  temporal: { label: "Lobo Temporale", icon: "👂", color: "#EBE4C1" },
  occipital: { label: "Lobo Occipitale", icon: "👁️", color: "#C1EBC1" },
  cerebellum: { label: "Cervelletto", icon: "⚖️", color: "#DEC1EB" }
};

function BrainInfographic({ zone }) {
  const content = BRAIN_CONTENT_MAPPING[zone] || BRAIN_CONTENT_MAPPING['0-3'];
  const [activeLobe, setActiveLobe] = useState(null);
  const isMobile = useIsMobile();
  const infoSectionRef = useRef(null);

  // Focus automatico sul testo quando viene selezionato un lobo su mobile
  useEffect(() => {
    if (activeLobe && isMobile && infoSectionRef.current) {
      setTimeout(() => {
        infoSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [activeLobe, isMobile]);

  return (
    <div style={{
      fontFamily: "'Nunito', sans-serif",
      backgroundColor: "#ffffff",
      borderRadius: "28px",
      padding: isMobile ? "24px 16px" : "40px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
      border: "1px solid #F0F0F0",
      width: "100%", maxWidth: "950px", margin: "0 auto"
    }}>
      <div style={{ textAlign: "center", marginBottom: isMobile ? "24px" : "40px" }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#2D242E", fontSize: isMobile ? "24px" : "32px", marginBottom: "12px" }}>
          {content.title}
        </h3>
        <p style={{ color: "#7A6B7C", fontSize: "16px", fontStyle: "italic", maxWidth: "600px", margin: "0 auto" }}>
          {content.subtitle}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "20px" : "40px", alignItems: "center" }}>
        
        {/* IMMAGINE PNG ESATTA DEL LIBRO CON AREE CLICCABILI INVISIBILI */}
        <div style={{ flex: 1, position: "relative", minWidth: isMobile ? "100%" : "400px" }}>
          <img 
            src={process.env.PUBLIC_URL + '/brain_anatomy_textbook.png'} 
            alt="Illustrazione anatomica del cervello"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
          
          {/* Mappa delle zone interattive invisibili (le coordinate sono approssimative basate sull'anatomia standard dell'immagine fornita) */}
          <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
            {/* Frontale */}
            <div 
              onClick={() => setActiveLobe('frontal')} 
              style={{ position: "absolute", top: "15%", left: "5%", width: "40%", height: "60%", cursor: "pointer", borderRadius: "50% 10% 10% 50%" }}
            />
            {/* Parietale */}
            <div 
              onClick={() => setActiveLobe('parietal')} 
              style={{ position: "absolute", top: "10%", left: "45%", width: "35%", height: "45%", cursor: "pointer", borderRadius: "10% 50% 50% 10%" }}
            />
            {/* Temporale */}
            <div 
              onClick={() => setActiveLobe('temporal')} 
              style={{ position: "absolute", top: "55%", left: "30%", width: "35%", height: "35%", cursor: "pointer", borderRadius: "50%" }}
            />
            {/* Occipitale */}
            <div 
              onClick={() => setActiveLobe('occipital')} 
              style={{ position: "absolute", top: "50%", left: "70%", width: "25%", height: "35%", cursor: "pointer", borderRadius: "10% 50% 50% 10%" }}
            />
            {/* Cervelletto */}
            <div 
              onClick={() => setActiveLobe('cerebellum')} 
              style={{ position: "absolute", top: "75%", left: "55%", width: "20%", height: "20%", cursor: "pointer", borderRadius: "50%" }}
            />
          </div>
          <div style={{ textAlign: "center", fontSize: "13px", color: "#8E7A91", marginTop: "12px", fontStyle: "italic" }}>
            Tocca una zona colorata dell'immagine per approfondire
          </div>
        </div>

        {/* CONTENUTI INTERATTIVI CON AUTO-FOCUS */}
        <div ref={infoSectionRef} style={{ flex: 1.2, display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
          {Object.keys(BRAIN_LOBO_VISUALS).map((lobeKey) => {
            const visual = BRAIN_LOBO_VISUALS[lobeKey];
            const isActive = activeLobe === lobeKey;
            
            return (
              <div 
                key={lobeKey}
                onClick={() => setActiveLobe(isActive ? null : lobeKey)}
                style={{
                  padding: "20px", borderRadius: "20px",
                  backgroundColor: isActive ? "#FFF" : "#F8F8F8",
                  border: `1.5px solid ${isActive ? visual.color : "transparent"}`,
                  boxShadow: isActive ? `0 12px 30px ${visual.color}20` : "none",
                  transition: "all 0.4s ease",
                  cursor: "pointer",
                  display: isActive || !activeLobe ? "block" : "none" 
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: isActive ? "10px" : "0" }}>
                  <span style={{ fontSize: "24px" }}>{visual.icon}</span>
                  <span style={{ fontWeight: 700, color: "#2D242E", fontSize: "17px" }}>{visual.label}</span>
                </div>
                {isActive && (
                  <p style={{ margin: 0, color: "#5A4B5E", fontSize: "15px", lineHeight: "1.7", animation: "fadeIn 0.5s ease" }}>
                    {content.lobes[lobeKey]}
                  </p>
                )}
              </div>
            );
          })}
          {activeLobe && (
            <button onClick={() => setActiveLobe(null)} style={{ alignSelf: "center", background: "#F0F0F0", border: "none", color: "#6B5570", fontSize: "13px", fontWeight: 700, cursor: "pointer", marginTop: "10px", padding: "8px 24px", borderRadius: "20px" }}>
              ← Torna alla visione d'insieme
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RESTO DEI COMPONENTI DELLA BEBI APP
   (MANTENERE TUTTI GLI ALTRI COMPONENTI ESISTENTI INALTERATI)
   Header, SubNav, App, OnboardingScreen, GuidePage, ecc...
═══════════════════════════════════════════════════════════════ */

function Header({ activeSection, setActiveSection, zone, setZone, onCambiaFascia }) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  const ZONE_LABELS_HEADER = {
    "gravidanza": "🤰 Gravidanza", "0-3": "🌱 0–3 anni", "3-6": "🌸 3–6 anni",
    "6-12": "🌟 6–12 anni", "12-15": "🌊 12–15 anni", "15-18": "✨ 15–18 anni",
  };

  const nav = [
    { id: "gravidanza",     icon: "🤰", label: "Gravidanza",            zone: "gravidanza" },
    { id: "guide-0-3",      icon: "🌱", label: "0–3 anni",   zone: "0-3",  targetSection: "guide" },
    { id: "guide-3-6",      icon: "🌸", label: "3–6 anni",   zone: "3-6",  targetSection: "guide" },
    { id: "guide-6-12",     icon: "🌟", label: "6–12 anni",  zone: "6-12", targetSection: "guide" },
    { id: "preadolescenza", icon: "🌊", label: "12–15 anni",            zone: "12-15" },
    { id: "adolescenza",    icon: "✨", label: "15–18 anni",            zone: "15-18" },
    { id: "checklist",      icon: "🔍", label: "Che succede?",           },
    { id: "genitori",       icon: "💛", label: "Per te — genitori",      },
    { id: "screens",        icon: "📵", label: "Schermi",                },
    { id: "curiosita",      icon: "🇮🇹", label: "Curiosità",             },
    { id: "library",        icon: "📚", label: "Biblioteca",             },
    { id: "glossario",      icon: "📖", label: "Glossario",              },
  ];

  const handleSelect = (id) => {
    const navItem = nav.find(n => n.id === id);
    if (navItem?.zone && setZone) setZone(navItem.zone);
    setActiveSection(navItem?.targetSection || id);
    setMenuOpen(false);
  };

  return (
    <>
      <header style={{
        background: `linear-gradient(135deg, #C0196A 0%, #D4447A 20%, #E8735A 55%, #9B8EC4 85%, #7060A0 100%)`,
        position: "sticky", top: 0, zIndex: 200, height: 60,
        boxShadow: "0 4px 32px rgba(212,68,122,0.40), 0 1px 0 rgba(255,255,255,0.15) inset",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%", }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px", flexShrink: 0, }}>
            <img src="/logo-labebiapp.png" alt="La Bebi App" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, boxShadow: "0 2px 10px rgba(0,0,0,0.15)", }} />
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", color: "white", fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>La Bebi App</div>
              <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 11, fontFamily: "'Nunito', sans-serif", fontStyle: "italic" }}>a cura del Dr. Daniele Lami</div>
            </div>
          </div>
          <button onClick={() => setMenuOpen(o => !o)} aria-label={menuOpen ? "Chiudi menu" : "Apri menu"} aria-expanded={menuOpen} style={{ background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.40)", borderRadius: 12, height: 44, paddingLeft: 12, paddingRight: 14, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", touchAction: "manipulation", WebkitTapHighlightColor: "transparent", flexShrink: 0, }} >
            {menuOpen ? (
              <> <span style={{ color: "white", fontSize: 18, lineHeight: 1, fontFamily: "monospace" }}>✕</span> <span style={{ color: "rgba(255,255,255,0.90)", fontSize: 13, fontFamily: "'Nunito', sans-serif", fontWeight: 700, letterSpacing: "0.3px" }}>Menu</span> </>
            ) : (
              <> <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}> <span style={{ width: 20, height: 2, background: "white", borderRadius: 2, display: "block" }} /> <span style={{ width: 20, height: 2, background: "white", borderRadius: 2, display: "block" }} /> <span style={{ width: 14, height: 2, background: "white", borderRadius: 2, display: "block" }} /> </div> <span style={{ color: "rgba(255,255,255,0.90)", fontSize: 13, fontFamily: "'Nunito', sans-serif", fontWeight: 700, letterSpacing: "0.3px" }}>Menu</span> </>
            )}
          </button>
        </div>
      </header>
      {menuOpen && ( <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 190, background: "rgba(30,20,40,0.55)", backdropFilter: "blur(3px)", }} /> )}
      <div style={{ position: "fixed", top: 60, right: 0, width: Math.min(300, window.innerWidth - 40), maxHeight: `calc(100vh - 60px)`, overflowY: "auto", background: "linear-gradient(160deg, #2A1A30 0%, #3A1E3E 100%)", boxShadow: "-8px 0 40px rgba(0,0,0,0.35)", zIndex: 195, transform: menuOpen ? "translateX(0)" : "translateX(110%)", transition: "transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)", borderRadius: "16px 0 0 16px", paddingBottom: 24, }}>
        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 8, }}>
          <div style={{ fontFamily: "'Playfair Display', serif", color: "white", fontSize: 18, marginBottom: 2 }}>Menu</div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, fontFamily: "'Nunito', sans-serif" }}>La Bebi App · Dr. Daniele Lami</div>
        </div>
        {zone && nav.map((item) => {
          const active = item.targetSection ? activeSection === item.targetSection && zone === item.zone : activeSection === item.id;
          return (
            <button key={item.id} onClick={() => handleSelect(item.id)} style={{ display: "flex", alignItems: "center", width: "100%", textAlign: "left", background: active ? "linear-gradient(90deg, rgba(212,68,122,0.25), rgba(232,115,90,0.15))" : "transparent", border: "none", borderLeft: active ? "3px solid #D4447A" : "3px solid transparent", padding: "12px 20px", cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: active ? 800 : 500, color: active ? "white" : "rgba(255,255,255,0.72)", touchAction: "manipulation", WebkitTapHighlightColor: "transparent", transition: "background 0.15s, color 0.15s", gap: 12, }}>
              {ZONE_IMAGES[item.zone] ? ( <img src={ZONE_IMAGES[item.zone]} alt="" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0, opacity: active ? 1 : 0.85, }} /> ) : ( <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, width: 28, textAlign: "center" }}>{item.icon}</span> )} {item.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

/* =========================================================================
   LA FUNZIONE APP PRINCIPALE
═══════════════════════════════════════════════════════════════ */

export default function App() {
  const [section, setSectionRaw] = useState("guide");
  const setSection = (s) => { window.scrollTo({ top: 0, behavior: "instant" }); setSectionRaw(s); };
  const [zone, setZone] = useState(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState( () => !!localStorage.getItem("lba_onboarding_done") );
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [zonePickerCompact, setZonePickerCompact] = useState(false);
  const [legalPage, setLegalPage] = useState(null); 
  const isMobile = useIsMobile();

  _globalSetSection = setSection;
  _globalShowZonePicker = () => { window.scrollTo({ top: 0, behavior: "instant" }); setZonePickerCompact(true); setShowZonePicker(true); };

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  if (!zone) {
    const handleFirstSelect = (z) => { localStorage.setItem("lba_onboarding_done", "1"); setHasSeenOnboarding(true); setZone(z); setSection("guide"); };
    if (!hasSeenOnboarding) return <OnboardingScreen onSelect={handleFirstSelect} onLegal={setLegalPage} />;
    return <ZonePickerPage onSelect={z => { setZone(z); setSection("guide"); }} />;
  }

  const ZONE_COLORS_HEADER = {
    "gravidanza": { bg: "linear-gradient(135deg, #D4447A 0%, #E8735A 60%, #F0B84A 100%)", shadow: "rgba(212,68,122,0.35)" },
    "0-3":        { bg: "linear-gradient(135deg, #6BAE8A 0%, #9B8EC4 100%)", shadow: "rgba(107,174,138,0.35)" },
    "3-6":        { bg: "linear-gradient(135deg, #F0B84A 0%, #E8735A 100%)", shadow: "rgba(240,184,74,0.35)" },
    "6-12":       { bg: "linear-gradient(135deg, #E8735A 0%, #D4447A 100%)", shadow: "rgba(232,115,90,0.35)" },
    "12-15":      { bg: "linear-gradient(135deg, #5BA4D4 0%, #9B8EC4 100%)", shadow: "rgba(91,164,212,0.35)" },
    "15-18":      { bg: "linear-gradient(135deg, #F0B84A 0%, #E8735A 50%, #9B8EC4 100%)", shadow: "rgba(240,184,74,0.35)" },
  };
  const zoneStyle = ZONE_COLORS_HEADER[zone] || ZONE_COLORS_HEADER["0-3"];

  return (
    <div style={{ fontFamily: "'Nunito', Georgia, sans-serif", background: COLORS.cream, minHeight: "100vh" }}>
      <Header activeSection={section} setActiveSection={setSection} zone={zone} setZone={setZone} onCambiaFascia={() => { if (_globalShowZonePicker) _globalShowZonePicker(); }} />
      {/* Intestazione Fascia */}
      <div style={{ background: zoneStyle.bg, boxShadow: `0 6px 28px ${zoneStyle.shadow}`, padding: "18px 24px", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 12, }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", overflow: "hidden" }}>
            {ZONE_IMAGES[zone] && <img src={ZONE_IMAGES[zone]} alt={zone} style={{ width: 32, height: 32, objectFit: "contain" }} />}
          </div>
          <div>
            <div style={{ fontFamily: "'Nunito', sans-serif", color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Sei nella fascia</div>
            <div style={{ fontFamily: "'Playfair Display', serif", color: "white", fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{zone}</div>
          </div>
        </div>
        <button onClick={() => { if (_globalShowZonePicker) _globalShowZonePicker(); }} style={{ background: "rgba(255,255,255,0.22)", border: "1.5px solid rgba(255,255,255,0.6)", borderRadius: 50, padding: "9px 22px", color: "white", fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 800, cursor: "pointer", backdropFilter: "blur(4px)", boxShadow: "0 2px 12px rgba(0,0,0,0.12)", position: "relative", alignSelf: isMobile ? "flex-end" : "auto" }}>✦ Cambia fascia</button>
      </div>

      {section === "guide" && (
        <GuidePage zone={zone} setZone={setZone} />
      )}
      {/* Altre sezioni... (rimangono invariate rispetto al file originale) */}
    </div>
  );
}

// [MANTENERE TUTTI GLI ALTRI COMPONENTI ESISTENTI INALTERATI SOTTO QUESTA RIGA]
// OnboardingScreen, ZonePickerPage, GuidePage, ecc...
