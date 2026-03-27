import { useState, useEffect, useRef } from "react";

/* ─── HELPER PER MOBILE ─── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

/* ═══════════════════════════════════════════════════════════════
   🧠 BRAIN INFOGRAPHIC INTERATTIVA (VERSIONE PNG)
═══════════════════════════════════════════════════════════════ */

const BRAIN_CONTENT = {
  "gravidanza": {
    title: "La Formazione del Cervello",
    lobes: {
      frontal: "Iniziano a formarsi le primissime connessioni che un giorno governeranno il pensiero logico.",
      parietal: "Si sviluppano i recettori sensoriali: il tuo bimbo percepisce il tatto.",
      temporal: "L'udito si attiva: può già ascoltare il battito del tuo cuore.",
      occipital: "I nervi ottici si formano per catturare la prima luce.",
      cerebellum: "Cresce rapidamente per preparare i primi riflessi motori."
    }
  },
  "0-3": {
    title: "L'Esplosione Neurale",
    lobes: {
      frontal: "Si attivano le aree motorie e l'inizio dell'autocontrollo.",
      parietal: "Esplora il mondo attraverso il tatto e la bocca.",
      temporal: "Basi per l'esplosione del linguaggio e memoria.",
      occipital: "Messa a fuoco e riconoscimento dei volti.",
      cerebellum: "Equilibrio per gattonare e camminare."
    }
  },
  "3-6": {
    title: "L'Età della Fantasia",
    lobes: {
      frontal: "Sviluppo dell'empatia e controllo degli impulsi.",
      parietal: "Coordinazione occhio-mano e percezione dello spazio.",
      temporal: "Comprensione del linguaggio complesso e narrazione.",
      occipital: "Integrazione visiva per il disegno e i primi simboli.",
      cerebellum: "Affinamento dei movimenti complessi (saltare, correre)."
    }
  }
};

const LOBE_DETAILS = {
  frontal: { label: "Lobo Frontale", icon: "🧠", color: "#EBC1C1" },
  parietal: { label: "Lobo Parietale", icon: "✋", color: "#C1DBEB" },
  temporal: { label: "Lobo Temporale", icon: "👂", color: "#EBE4C1" },
  occipital: { label: "Lobo Occipitale", icon: "👁️", color: "#C1EBC1" },
  cerebellum: { label: "Cervelletto", icon: "⚖️", color: "#DEC1EB" }
};

export default function App() {
  const [zone, setZone] = useState("0-3"); // Valore predefinito per evitare pagina bianca
  const [activeLobe, setActiveLobe] = useState(null);
  const isMobile = useIsMobile();
  const data = BRAIN_CONTENT[zone] || BRAIN_CONTENT["0-3"];

  return (
    <div style={{
      fontFamily: "'Nunito', sans-serif",
      backgroundColor: "#FFF9F5",
      minHeight: "100vh",
      padding: isMobile ? "20px 10px" : "40px"
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "28px",
        padding: isMobile ? "20px" : "40px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
        maxWidth: "900px",
        margin: "0 auto"
      }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h2 style={{ fontSize: isMobile ? "22px" : "28px", color: "#2D242E", marginBottom: "10px" }}>
            {data.title}
          </h2>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
            {Object.keys(BRAIN_CONTENT).map(z => (
              <button 
                key={z} 
                onClick={() => {setZone(z); setActiveLobe(null);}}
                style={{
                  padding: "8px 16px", borderRadius: "20px", border: "1px solid #ddd",
                  backgroundColor: zone === z ? "#CC2268" : "#fff",
                  color: zone === z ? "#fff" : "#666", cursor: "pointer"
                }}
              >
                {z.charAt(0).toUpperCase() + z.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "30px", alignItems: "center" }}>
          
          {/* AREA IMMAGINE CON MAPPA INVISIBILE */}
          <div style={{ flex: 1, position: "relative", width: "100%" }}>
            <img 
              src="/brain_anatomy.png" 
              alt="Cervello" 
              style={{ width: "100%", height: "auto", display: "block", borderRadius: "12px" }} 
              onError={(e) => { e.target.src = "https://via.placeholder.com/400x300?text=Carica+brain_anatomy.png"; }}
            />
            
            {/* Zone Interattive (Coordinate standard) */}
            <div style={{ position: "absolute", inset: 0 }}>
              <div onClick={() => setActiveLobe('frontal')} style={{ position: "absolute", top: "15%", left: "10%", width: "35%", height: "50%", cursor: "pointer" }} />
              <div onClick={() => setActiveLobe('parietal')} style={{ position: "absolute", top: "10%", left: "45%", width: "30%", height: "40%", cursor: "pointer" }} />
              <div onClick={() => setActiveLobe('temporal')} style={{ position: "absolute", top: "50%", left: "30%", width: "30%", height: "30%", cursor: "pointer" }} />
              <div onClick={() => setActiveLobe('occipital')} style={{ position: "absolute", top: "45%", left: "70%", width: "25%", height: "35%", cursor: "pointer" }} />
              <div onClick={() => setActiveLobe('cerebellum')} style={{ position: "absolute", top: "75%", left: "55%", width: "25%", height: "20%", cursor: "pointer" }} />
            </div>
          </div>

          {/* BOX DI TESTO */}
          <div style={{ flex: 1, width: "100%" }}>
            {Object.keys(LOBE_DETAILS).map(key => {
              const lobe = LOBE_DETAILS[key];
              const isActive = activeLobe === key;
              if (activeLobe && !isActive) return null;

              return (
                <div 
                  key={key}
                  onClick={() => setActiveLobe(isActive ? null : key)}
                  style={{
                    padding: "18px",
                    borderRadius: "18px",
                    backgroundColor: isActive ? "#fff" : "#f9f9f9",
                    border: `2px solid ${isActive ? lobe.color : "transparent"}`,
                    cursor: "pointer",
                    marginBottom: "12px",
                    boxShadow: isActive ? "0 8px 20px rgba(0,0,0,0.05)" : "none",
                    transition: "all 0.3s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "24px" }}>{lobe.icon}</span>
                    <strong style={{ color: "#2D242E", fontSize: "17px" }}>{lobe.label}</strong>
                  </div>
                  {isActive && (
                    <p style={{ fontSize: "15px", marginTop: "12px", lineHeight: "1.6", color: "#5A4B5E", animation: "fadeIn 0.4s" }}>
                      {data.lobes[key]}
                    </p>
                  )}
                </div>
              );
            })}
            {activeLobe && (
              <button 
                onClick={() => setActiveLobe(null)} 
                style={{ width: "100%", padding: "12px", border: "none", borderRadius: "12px", backgroundColor: "#f0f0f0", color: "#666", fontWeight: "bold", cursor: "pointer" }}
              >
                ← Torna alla visione d'insieme
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
