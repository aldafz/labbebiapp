/* ─── La Bebi App v4.12 — Integrazione Totale ─── */
import { useState, useEffect, useRef } from "react";

/* ─── LOGICA GLOBALE E UTILITY ────────────────────────────────────────────── */
let _globalSetSection = null;
let _globalSetHighlight = null;
let _globalCurrentSection = null;

const SECTION_LABELS = {
  guide: "Torna alla Guida",
  checklist: "Torna al Percorso",
  genitori: "Torna alla Sezione Genitori",
};

// Funzione per il parsing dei link del glossario
function parseLinks(text) {
  if (!text || typeof text !== "string") return text;
  const parts = text.split(/(\[\[.*?\]\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
    if (m) return <GlossLink key={i} term={m[1]} display={m[2]} />;
    return part;
  });
}

function GlossLink({ term, display, children }) {
  const label = display || children || term;
  return (
    <button onClick={() => {
      _globalCurrentSection = "guide";
      if (_globalSetSection) _globalSetSection("glossario");
      if (_globalSetHighlight) _globalSetHighlight(term);
    }} style={{
      background: "none", border: "none", padding: "0 2px", color: "#CC2268",
      fontFamily: "inherit", fontSize: "inherit", fontWeight: 700, cursor: "pointer",
      textDecoration: "underline", textDecorationStyle: "dotted"
    }}>{label}</button>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 640 : false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

/* ─── COSTANTI DI STILE ──────────────────────────────────────────────────── */
const COLORS = {
  cream: "#FFF9F5", rose: "#CC2268", roseLight: "#FBEAF2",
  slate: "#2D242E", slateLight: "#7A6B7C", gold: "#E8A824",
  mint: "#52A37A", sky: "#4090C8", lavender: "#8B7AC0"
};

/* ─── DATA: INFOGRAFICA (Breve) ───────────────────────────────────────────── */
const BRAIN_CONTENT_MAPPING = {
  "gravidanza": { title: "La Formazione del Cervello", lobes: { frontal: "Iniziano a formarsi le primissime connessioni per il pensiero futuro.", parietal: "Sviluppo dei recettori sensoriali: il tatto è attivo.", temporal: "L'udito si attiva: ascolta il battito del cuore materno.", occipital: "I nervi ottici si preparano alla luce.", cerebellum: "Sviluppo rapido dei primi riflessi motori istintivi." } },
  "0-3": { title: "L'Esplosione Neurale", lobes: { frontal: "Prime aree motorie e inizio del controllo degli impulsi.", parietal: "Esplorazione del mondo tramite bocca e mani.", temporal: "Basi per il linguaggio e memoria a breve termine.", occipital: "Sviluppo della messa a fuoco e riconoscimento volti.", cerebellum: "Fondamentale per imparare a gattonare e camminare." } },
  "3-6": { title: "L'Età della Fantasia", lobes: { frontal: "Fiorisce l'empatia e la capacità di capire gli altri.", parietal: "Coordinazione occhio-mano e padronanza dello spazio.", temporal: "Esplosione del vocabolario e narrazione di storie.", occipital: "Riconoscimento di forme e simboli (pre-lettura).", cerebellum: "Affinamento dell'equilibrio: corsa e salti." } },
  "6-12": { title: "Il Grande Ordine", lobes: { frontal: "Migliora l'attenzione e la pianificazione dei compiti.", parietal: "Essenziale per la scrittura e il calcolo matematico.", temporal: "La memoria diventa una cassaforte per le regole sociali.", occipital: "Sincronia perfetta per la lettura fluida.", cerebellum: "Movimenti fini: bici, musica e sport." } },
  "12-15": { title: "Il Cantiere Aperto", lobes: { frontal: "In ristrutturazione: fatica a valutare i rischi.", parietal: "Gestione della nuova sensibilità del corpo che cambia.", temporal: "Emozioni intense e ricerca di appartenenza sociale.", occipital: "Elaborazione rapida di stimoli visivi e social media.", cerebellum: "Ricalibrazione dell'equilibrio dopo la crescita." } },
  "15-18": { title: "Verso la Maturità", lobes: { frontal: "Stabilizzazione: capacità di pensare al futuro.", parietal: "Pensiero astratto e comprensione di sistemi complessi.", temporal: "Consolidamento dell'identità e dei valori personali.", occipital: "Specializzazione massima nel riconoscimento di pattern.", cerebellum: "Perfezione della coordinazione motoria avanzata." } }
};

/* ─── DATA: SVILUPPO (Testi Estesi) ───────────────────────────────────────── */
const DEVELOPMENT_DATA = {
  "0-3": {
    brain: "Il cervello del neonato ha solo un quarto del peso di quello di un adulto, ma contiene già cento miliardi di cellule nervose. Nei primi mesi si formano milioni di nuove connessioni ogni secondo.",
    attachment: "Secondo [[Bowlby]], il bambino nasce con un bisogno biologico di legarsi a qualcuno — non è una scelta, è un programma di sopravvivenza.",
    emozioni: "Il neonato abita un universo emotivo senza confini: la fame e il freddo si esprimono col corpo e col pianto perché non esistono ancora le parole.",
    tips: ["Rispondi al pianto prima possibile: insegnerai al suo corpo che può calmarsi.", "Il contatto pelle a pelle è il nutrimento più fondamentale."]
  },
  "3-6": {
    brain: "I [[neuroni specchio]] si attivano con forza: è la base biologica dell'empatia. I segnali nervosi diventano più veloci grazie alla [[mielinizzazione]].",
    attachment: "Quando il bambino ha una [[base sicura]], esplora il mondo con più coraggio. Il gioco diventa il suo laboratorio principale.",
    emozioni: "Emerge il sorriso sociale: non un riflesso, ma una risposta autentica al tuo volto.",
    tips: ["Gioca con lui a terra, al suo livello.", "Nomina quello che sente: 'Sei triste perché la palla è rotolata via'."]
  }
  // ... Aggiungi qui gli altri oggetti (6-12, 12-15, ecc.) seguendo lo stesso schema
};

/* ─── COMPONENTE INFOGRAFICA ─────────────────────────────────────────────── */
function BrainInfographic({ zone }) {
  const [activeLobe, setActiveLobe] = useState(null);
  const isMobile = useIsMobile();
  const infoRef = useRef(null);
  const content = BRAIN_CONTENT_MAPPING[zone] || BRAIN_CONTENT_MAPPING["0-3"];

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "32px", padding: isMobile ? "20px 15px" : "30px", boxShadow: "0 10px 40px rgba(0,0,0,0.05)", margin: "20px auto", maxWidth: "900px", border: "1px solid #F0F0F0" }}>
      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? "22px" : "28px", color: COLORS.slate }}>{content.title}</h3>
      </div>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "30px", alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative", width: "100%" }}>
          <img src="/brain_anatomy.jpg" alt="Anatomia" style={{ width: "100%", height: "auto", borderRadius: "16px" }} />
          <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
            <div onClick={() => setActiveLobe('frontal')} style={{ position: "absolute", top: "10%", left: "5%", width: "40%", height: "55%", cursor: "pointer" }} />
            <div onClick={() => setActiveLobe('parietal')} style={{ position: "absolute", top: "5%", left: "45%", width: "35%", height: "45%", cursor: "pointer" }} />
            <div onClick={() => setActiveLobe('temporal')} style={{ position: "absolute", top: "50%", left: "20%", width: "45%", height: "40%", cursor: "pointer" }} />
            <div onClick={() => setActiveLobe('occipital')} style={{ position: "absolute", top: "40%", left: "75%", width: "22%", height: "35%", cursor: "pointer" }} />
            <div onClick={() => setActiveLobe('cerebellum')} style={{ position: "absolute", top: "75%", left: "60%", width: "25%", height: "25%", cursor: "pointer" }} />
          </div>
        </div>
        <div ref={infoRef} style={{ flex: 1.2, width: "100%" }}>
          {Object.keys(BRAIN_LOBO_CONFIG).map((key) => {
            const lobe = BRAIN_LOBO_CONFIG[key];
            const isActive = activeLobe === key;
            if (activeLobe && !isActive) return null;
            return (
              <div key={key} onClick={() => setActiveLobe(isActive ? null : key)} style={{ padding: "15px", borderRadius: "18px", marginBottom: "10px", cursor: "pointer", backgroundColor: isActive ? "#fff" : "#F9F9F9", border: `2px solid ${isActive ? lobe.color : "transparent"}`, boxShadow: isActive ? `0 10px 20px ${lobe.color}20` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "22px" }}>{lobe.icon}</span>
                  <strong style={{ color: COLORS.slate }}>{lobe.label}</strong>
                </div>
                {isActive && <p style={{ marginTop: "10px", fontSize: "14px", lineHeight: "1.6", color: "#444" }}>{content.lobes[key]}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const BRAIN_LOBO_CONFIG = {
  frontal: { label: "Lobo Frontale", icon: "🧠", color: COLORS.rose },
  parietal: { label: "Lobo Parietale", icon: "✋", color: COLORS.sky },
  temporal: { label: "Lobo Temporale", icon: "👂", color: COLORS.gold },
  occipital: { label: "Lobo Occipitale", icon: "👁️", color: COLORS.mint },
  cerebellum: { label: "Cervelletto", icon: "⚖️", color: COLORS.lavender }
};

/* ─── APP PRINCIPALE ─────────────────────────────────────────────────────── */
export default function App() {
  const [zone, setZone] = useState("0-3");
  const [section, setSection] = useState("guide");
  const isMobile = useIsMobile();
  
  _globalSetSection = setSection;
  const dev = DEVELOPMENT_DATA[zone] || DEVELOPMENT_DATA["0-3"];

  return (
    <div style={{ backgroundColor: COLORS.cream, minHeight: "100vh", fontFamily: "'Nunito', sans-serif" }}>
      <header style={{ background: COLORS.rose, color: "white", padding: "15px 20px", display: "flex", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <strong onClick={() => setSection("guide")} style={{ cursor: "pointer" }}>La Bebi App</strong>
        <select value={zone} onChange={(e) => setZone(e.target.value)} style={{ background: "white", borderRadius: "10px", border: "none", padding: "2px 8px" }}>
          <option value="gravidanza">Gravidanza</option>
          <option value="0-3">0-3 Mesi</option>
          <option value="3-6">3-6 Mesi</option>
          <option value="6-12">6-12 Mesi</option>
          <option value="12-15">12-15 Mesi</option>
          <option value="15-18">15-18 Mesi</option>
        </select>
      </header>

      <main style={{ maxWidth: "800px", margin: "0 auto", padding: isMobile ? "20px" : "40px" }}>
        {section === "guide" && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            <h1 style={{ textAlign: "center", color: COLORS.rose, fontFamily: "'Playfair Display', serif" }}>Fascia {zone}</h1>
            
            <BrainInfographic zone={zone} />

            <div style={{ marginTop: "40px", display: "flex", flexDirection: "column", gap: "25px" }}>
              <section>
                <h3 style={{ color: COLORS.rose }}>🧠 Il Cervello</h3>
                <p style={{ lineHeight: "1.8" }}>{parseLinks(dev.brain)}</p>
              </section>

              <section>
                <h3 style={{ color: COLORS.sky }}>🤝 Il Legame (Attaccamento)</h3>
                <p style={{ lineHeight: "1.8" }}>{parseLinks(dev.attachment)}</p>
              </section>

              <section>
                <h3 style={{ color: COLORS.gold }}>✨ Emozioni e Comportamento</h3>
                <p style={{ lineHeight: "1.8" }}>{parseLinks(dev.emozioni)}</p>
              </section>

              <div style={{ background: "#fff", padding: "20px", borderRadius: "24px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
                <h3 style={{ color: COLORS.mint, marginTop: 0 }}>💡 Suggerimenti Pratici</h3>
                <ul style={{ paddingLeft: "20px" }}>
                  {dev.tips.map((tip, i) => <li key={i} style={{ marginBottom: "10px", lineHeight: "1.6" }}>{tip}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        body { margin: 0; }
      `}</style>
    </div>
  );
}
