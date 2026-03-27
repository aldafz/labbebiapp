import React, { useState, useEffect, useRef } from "react";

/* ─── LOGICA GLOBALE E NAVBAR ────────────────────────────────────────────── */
let _globalSetSection = null;
let _globalSetHighlight = null;
let _globalShowZonePicker = null;
let _glossaryReturnSection = null;
let _glossaryReturnScrollY = 0;
let _globalCurrentSection = null;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

/* ─── COSTANTI DI STILE ──────────────────────────────────────────────────── */
const COLORS = {
  cream: "#FFF9F5",
  rose: "#CC2268",
  roseLight: "#FBEAF2",
  slate: "#2D242E",
  slateLight: "#7A6B7C",
  gold: "#E8A824",
  mint: "#52A37A",
  sky: "#4090C8"
};

/* ─── MAPPING CONTENUTI CERVELLO PER FASCIA ─────────────────────────────── */
const BRAIN_ZONES_DATA = {
  "gravidanza": {
    title: "La Formazione del Cervello",
    subtitle: "Le fondamenta del sistema nervoso nel pancione.",
    lobes: {
      frontal: "Iniziano a formarsi le primissime connessioni per il pensiero futuro.",
      parietal: "Si sviluppano i recettori sensoriali: il feto percepisce il tatto.",
      temporal: "L'udito si attiva: ascolta il battito del tuo cuore.",
      occipital: "I nervi ottici si preparano a catturare la luce.",
      cerebellum: "Sviluppo rapido dei primi riflessi motori istintivi."
    }
  },
  "0-3": {
    title: "L'Esplosione Neurale",
    subtitle: "Milioni di connessioni al secondo: il cervello assorbe il mondo.",
    lobes: {
      frontal: "Prime aree motorie e inizio del controllo degli impulsi.",
      parietal: "Esplorazione del mondo tramite bocca e mani.",
      temporal: "Basi per il linguaggio e memoria a breve termine.",
      occipital: "Sviluppo della messa a fuoco e riconoscimento volti.",
      cerebellum: "Fondamentale per imparare a gattonare e camminare."
    }
  },
  "3-6": {
    title: "L'Età della Fantasia",
    subtitle: "Il gioco simbolico modella le nuove autostrade neurali.",
    lobes: {
      frontal: "Fiorisce l'empatia e la capacità di capire gli altri.",
      parietal: "Coordinazione occhio-mano e padronanza dello spazio.",
      temporal: "Esplosione del vocabolario e narrazione di storie.",
      occipital: "Riconoscimento di forme e simboli (pre-lettura).",
      cerebellum: "Affinamento dell'equilibrio: corsa e salti."
    }
  },
  "6-12": {
    title: "Il Grande Ordine",
    subtitle: "La scuola e la logica: il cervello diventa efficiente.",
    lobes: {
      frontal: "Migliora l'attenzione e la pianificazione dei compiti.",
      parietal: "Essenziale per la scrittura e il calcolo matematico.",
      temporal: "La memoria diventa una cassaforte per le regole sociali.",
      occipital: "Sincronia perfetta per la lettura fluida.",
      cerebellum: "Movimenti fini: bici, musica e sport."
    }
  },
  "12-18": {
    title: "Il Cantiere Aperto",
    subtitle: "Ristrutturazione massiccia e ricerca di identità.",
    lobes: {
      frontal: "Ancora in maturazione: fatica a valutare i rischi.",
      parietal: "Gestione della nuova sensibilità del corpo che cambia.",
      temporal: "Emozioni intense e ricerca di appartenenza sociale.",
      occipital: "Elaborazione rapida di stimoli visivi e social media.",
      cerebellum: "Ricalibrazione dell'equilibrio dopo la crescita fisica."
    }
  }
};

const LOBE_CONFIG = {
  frontal: { label: "Lobo Frontale", icon: "🧠", color: "#EBC1C1" },
  parietal: { label: "Lobo Parietale", icon: "✋", color: "#C1DBEB" },
  temporal: { label: "Lobo Temporale", icon: "👂", color: "#EBE4C1" },
  occipital: { label: "Lobo Occipitale", icon: "👁️", color: "#C1EBC1" },
  cerebellum: { label: "Cervelletto", icon: "⚖️", color: "#DEC1EB" }
};

/* ═══════════════════════════════════════════════════════════════
   🧠 COMPONENTE INFOGRAFICA CEREBRALE (PNG + HOTSPOTS)
═══════════════════════════════════════════════════════════════ */
function BrainInfographic({ zone }) {
  // Normalizzazione della zona per il mapping dei dati
  const zoneKey = zone === "12-15" || zone === "15-18" ? "12-18" : zone;
  const content = BRAIN_ZONES_DATA[zoneKey] || BRAIN_ZONES_DATA["0-3"];
  const [activeLobe, setActiveLobe] = useState(null);
