/* La Bebi App v4.68 — Separazione: 10 correzioni + conversione card cosa_aiuta/cosa_evitare */
import { useState, useEffect, useRef } from "react";


/* ─── GLOSSARY LINK RENDERER ───────────────────────────────────────────────
   Usage in text strings: [[termine]] or [[termine|testo visualizzato]]
   Clicking navigates to glossary and expands that term.
   setSection and setGlossHighlight are passed via context or prop.
──────────────────────────────────────────────────────────────────────────── */
let _globalSetSection = null;
let _globalSetHighlight = null;
let _globalChecklistOverride = null;
let _globalShowZonePicker = null;
let _glossaryReturnSection = null;
let _glossaryReturnScrollY = 0;
let _glossaryReturnLabel = null;
let _glossaryReturnTab = null;
let _glossaryReturnPhase = null;
let _globalCurrentSection = null;
let _globalCurrentTab = null;
let _globalCurrentPhase = null;

/* Mappatura sezioni → etichette pulsante "torna" */
const SECTION_LABELS = {
  guide: "Torna alla Guida",
  allattamento: "Torna all'Allattamento",
  checklist: "Torna al Percorso",
  screens: "Torna agli Schermi",
  curiosita: "Torna alle Curiosità",
  library: "Torna alla Biblioteca",
  genitori: "Torna alla Sezione Genitori",
  gravidanza: "Torna alla Gravidanza",
  preadolescenza: "Torna alla Preadolescenza",
  adolescenza: "Torna all'Adolescenza",
  ognibambino: "Torna a Ogni bambino è unico",
  separazione: "Torna alla Separazione",
  lutto: "Torna al Lutto",
};

function GlossLink({ term, display, children }) {
  const label = display || children || term;
  return (
    <button onClick={() => {
      const matched = findGlossaryTerm(term);
      _glossaryReturnSection = _globalCurrentSection;
      _glossaryReturnScrollY = window.scrollY;
      _glossaryReturnLabel = SECTION_LABELS[_globalCurrentSection] || "Torna indietro";
      _glossaryReturnTab = _globalCurrentTab;
      _glossaryReturnPhase = _globalCurrentPhase;
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

/* ─── RICH CONTENT RENDERER (React-based, replaces dangerouslySetInnerHTML) ──
   Handles **bold** and [[glossario]] in a single pass, returning JSX.
   opts.boldColor: color for <strong> text (default "inherit").
──────────────────────────────────────────────────────────────────────────── */
function renderRichContent(text, opts = {}) {
  if (!text || typeof text !== "string") return text;
  const boldColor = opts.boldColor || "inherit";
  const parts = text.split(/(\*\*.+?\*\*|\[\[.*?\]\])/g);
  return parts.map((part, i) => {
    const glossMatch = part.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
    if (glossMatch) return <GlossLink key={i} term={glossMatch[1]} display={glossMatch[2]} />;
    const boldMatch = part.match(/^\*\*(.+?)\*\*$/);
    if (boldMatch) return <strong key={i} style={{ color: boldColor }}>{boldMatch[1]}</strong>;
    return part;
  });
}

function findGlossaryTerm(term) {
  if (!term) return null;
  const lower = term.toLowerCase();
  return GLOSSARIO_TERMS.find(t => t.term.toLowerCase() === lower);
}

/* ─── MARKDOWN → JSX SICURO (per output AI) ─────────────────────────────
   Converte **bold**, ## heading, ### subheading, 1. liste numerate,
   - liste puntate, \n\n paragrafi. Nessun dangerouslySetInnerHTML.
   opts.headingColor  → colore h2/h3 (default "#2D3B3A")
   opts.badgeColor    → colore badge numeri (default "#7A9E8E")
──────────────────────────────────────────────────────────────────────── */
function parseBold(str) {
  if (!str || typeof str !== "string") return str;
  const parts = str.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*(.+?)\*\*$/);
    if (m) return <strong key={`b-${i}`}>{m[1]}</strong>;
    return part;
  });
}

function renderMarkdownJSX(text, opts = {}) {
  if (!text || typeof text !== "string") return null;
  const headingColor = opts.headingColor || "#2D3B3A";
  const badgeColor = opts.badgeColor || "#7A9E8E";

  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, pi) => {
    const lines = para.split("\n");
    return lines.map((line, li) => {
      const key = `md-${pi}-${li}`;

      const h2 = line.match(/^## (.+)$/);
      if (h2) return <h2 key={key} style={{ fontFamily: "'Playfair Display', serif", color: headingColor, fontSize: 20, margin: "24px 0 12px" }}>{parseBold(h2[1])}</h2>;

      const h3 = line.match(/^### (.+)$/);
      if (h3) return <h3 key={key} style={{ fontFamily: "'Playfair Display', serif", color: headingColor, fontSize: 17, margin: "20px 0 10px" }}>{parseBold(h3[1])}</h3>;

      const ol = line.match(/^(\d+)\. (.+)$/);
      if (ol) return (
        <div key={key} style={{ display: "flex", gap: 12, margin: "8px 0", alignItems: "flex-start" }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: badgeColor, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{ol[1]}</div>
          <span>{parseBold(ol[2])}</span>
        </div>
      );

      const ul = line.match(/^- (.+)$/);
      if (ul) return <div key={key} style={{ paddingLeft: 16, margin: "4px 0" }}>• {parseBold(ul[1])}</div>;

      if (line.trim() === "") return <br key={key} />;
      return <span key={key}>{parseBold(line)}</span>;
    });
  });
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

/* ─── SCROLL TO CARD — centra una card accordion sotto header+subnav ─── */
const scrollToCard = (id) => {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 120;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  }, 100);
};

const scrollToTabBar = () => {
  setTimeout(() => {
    const tabBar = document.getElementById("main-tab-bar");
    if (tabBar) {
      const top = tabBar.getBoundingClientRect().top + window.scrollY - 60 - 44 - 8;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, 150);
};

/* ─── SCROLL TO TOP BUTTON — sticky, locale per ogni sezione lunga ─── */
function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 360);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      aria-label="Vai ai tab di navigazione"
      onClick={() => {
        const activeCard = document.querySelector(".active-card-scroll");
        if (activeCard) {
          scrollToCard(activeCard.id);
        } else {
          scrollToTabBar();
        }
      }}
      style={{
        position: "fixed", bottom: 24, right: 20, zIndex: 999,
        width: 48, height: 48, borderRadius: "50%",
        background: "linear-gradient(135deg, #CC2268, #E8735A)",
        border: "none", cursor: "pointer",
        boxShadow: "0 4px 18px rgba(204,34,104,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, color: "white",
        transition: "opacity 0.25s, transform 0.2s",
        opacity: 0.92,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.opacity = "1"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.92"; }}
    >↑</button>
  );
}

/* ─── CHECKLIST NUDGE — invito inline contestuale alle checklist ─── */
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

/* ─── ZONE IMAGE MAP ────────────────────────────────────────────────────────
   File PNG nella cartella /public. Usato ovunque le zone card mostrano
   l'illustrazione della fascia d'età (Onboarding, ZonePicker, Hero homepage).
──────────────────────────────────────────────────────────────────────────── */
const ZONE_IMAGES = {
  "gravidanza": "/gravidanza.png",
  "0-3":        "/03anni.png",
  "3-6":        "/36anni.png",
  "6-12":       "/612anni.png",
  "12-15":      "/1215anni.png",
  "15-18":      "/1518anni.png",
  "papa":       "/futuro-genitore.png",
};

const COLORS = {
  // ── Backgrounds ────────────────────────────────────────────
  cream:        "#FFF9F5",      // bianco panna caldo
  warmWhite:    "#FFFCFA",
  blush:        "#FFF2F0",

  // ── PALETTA "Milano Mama" ──────────────────────────────────
  // Primario — fuchsia vibrante (Pinko, energia italiana)
  rose:         "#CC2268",      // fuchsia-magenta vivace
  roseLight:    "#FBEAF2",
  roseDark:     "#9A1A50",

  // Secondario — coral mediterraneo
  peach:        "#E8735A",      // coral caldo
  peachLight:   "#FDF0EC",
  peachDark:    "#C45540",

  // Accento — oro italiano
  gold:         "#E8A824",      // oro caldo saturo
  goldLight:    "#FDF5DF",
  goldDark:     "#C8902A",

  // Verde salvia
  mint:         "#52A37A",      // salvia intensa vivace
  mintLight:    "#E4F4EC",
  mintDark:     "#4A8C6A",

  // Lavanda chic
  lavender:     "#8B7AC0",      // lavanda intensa vivace
  lavenderLight: "#EEE9F8",
  lavenderDark:  "#7060A0",

  // Azzurro cielo
  sky:          "#4090C8",      // azzurro caldo vivace
  skyLight:     "#E3F2FD",

  // ── Alias legacy (compatibilità) ───────────────────────────
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

  // ── Testi — caldi, mai freddi ───────────────────────────────
  deepSlate:    "#2A1F2E",      // viola-nero caldo, profondo
  slateLight:   "#6B5570",      // violaceo caldo per testi secondari

  // ── Speciali ─────────────────────────────────────────────────
  goldAccent:   "#F0B84A",
  roseGold:     "#E8735A",
};



const AGE_PHASES = [
  { label: "Neonato", range: "0-3 mesi", min: 0, max: 3, key: "0-3", color: COLORS.roseLight, icon: "🌱" },
  { label: "Scoperta", range: "3-6 mesi", min: 3, max: 6, key: "3-6", color: COLORS.slateLight, icon: "🌸" },
  { label: "Esplorazione", range: "6-12 mesi", min: 6, max: 12, key: "6-12", color: COLORS.goldLight, icon: "🌿" },
  { label: "In moto", range: "12-18 mesi", min: 12, max: 18, key: "12-18", color: COLORS.roseLight, icon: "🦋" },
  { label: "Linguaggio", range: "18-24 mesi", min: 18, max: 24, key: "18-24", color: COLORS.slateLight, icon: "🗣️" },
  { label: "Identità", range: "24-36 mesi", min: 24, max: 36, key: "24-36", color: COLORS.goldLight, icon: "⭐" },
];

const DEVELOPMENT_DATA = {
  "0-3": {
    brain: "Il cervello del neonato ha solo un quarto del peso di quello di un adulto, ma contiene già cento miliardi di cellule nervose. Nei primi mesi di vita si formano milioni di nuove connessioni ogni secondo — un ritmo che non si ripeterà mai più. La parte del cervello legata alle emozioni (il [[sistema limbico]]) è già attiva dalla nascita. Quella legata al ragionamento e al controllo (la [[corteccia prefrontale]]) si sviluppa lentamente: ci vorranno vent\'anni perché sia completa. Il [[cortisolo]] — l\'ormone dello stress — se è presente in modo cronico nei primi anni può lasciare tracce durature nel modo in cui il bambino risponderà alle difficoltà.",
    attachment: "Secondo [[Bowlby]], il bambino nasce con un bisogno biologico di legarsi a qualcuno che si prenda cura di lui — non è una scelta, è un programma di sopravvivenza. Il contatto fisico attiva l\'[[ossitocina]] — spesso chiamata ormone del legame — e abbassa il [[cortisolo]], l\'ormone dello stress. Già a due mesi il bambino sente e risponde alle emozioni di chi si prende cura di lui: ogni risposta al pianto, ogni sorriso condiviso, ogni sguardo reciproco costruisce il senso che il mondo è un posto affidabile. [[Ainsworth]] ha poi mostrato come la qualità di questo primo legame influenzi il modo in cui il bambino esplorerà il mondo, gestirà le emozioni e si relazionerà con gli altri. Non devi essere perfetto: devi essere abbastanza presente.",
    emozioni: "Il neonato abita un universo emotivo senza confini: non distingue ancora tra sé e l\'ambiente, tra dentro e fuori. La fame, il freddo, il disagio si esprimono tutti allo stesso modo — il pianto, il corpo teso — perché non esistono ancora le parole per differenziarli. Eppure c\'è già qualcosa di sorprendente: il neonato risponde alle emozioni di chi si prende cura di lui con una sensibilità precoce. [[Tronick]] ha mostrato — con il celebre esperimento del volto immobile, \'still face\' — che già a due mesi il bambino si aspetta una risposta emotiva reciproca: quando il volto del genitore si spegne, il bambino prima protesta, poi si ritira. Le tue emozioni non sono separate dalle sue: la tua calma è il suo primo strumento di regolazione. A volte il pianto del neonato risveglia nel genitore emozioni che sembrano più grandi della situazione — un\'angoscia improvvisa, un impulso a chiudersi, una fatica che non si spiega solo con la stanchezza. È un\'esperienza comune e ha un nome: Fraiberg ha osservato che i momenti di bisogno intenso del bambino sono quelli in cui possono riaffiorare i [[Fantasmi nella nursery]] — tracce di esperienze precoci che si riattivano senza che ce ne accorgiamo. Non significa che qualcosa non va in te: significa che stai facendo un lavoro emotivo enorme. Parlarne — con il partner, con un professionista — è già un modo per rispondere meglio al tuo bambino.",
    winnicott: "[[Winnicott]] descrive questa fase con un\'immagine potente: non esiste un bambino senza qualcuno che se ne prenda cura — esiste sempre una coppia. Il \'tenere\' (holding) — sia fisicamente sia emotivamente — è per Winnicott il nutrimento più fondamentale che il bambino riceve. Non si tratta di perfezione: sbagliare non è il problema, è nell\'errore e nella riparazione che il bambino impara che i legami reggono anche quando qualcosa si crepa. Winnicott parlava di \'madre sufficientemente buona\' — non perfetta, ma abbastanza presente e affidabile. Questa sufficienza, non la perfezione, è ciò che costruisce la fiducia di base.",
    behavior: "Il pianto è l'unico linguaggio disponibile — ogni pianto comunica qualcosa: fame, sonno, bisogno di contatto, disagio fisico. Il bambino riconosce il volto e la voce di chi lo cura già dalla prima settimana, e preferisce i volti umani a qualsiasi altro oggetto — il cervello è programmato per cercare la relazione. La suzione non serve solo a nutrirsi: calma il sistema nervoso, riduce il cortisolo e attiva il sistema parasimpatico (quello del riposo). Dormire e svegliarsi di notte è normale e fisiologico — il ciclo sonno-veglia del neonato è diverso da quello adulto perché il suo cervello ha bisogno di nutrirsi frequentemente e di verificare la presenza del caregiver. Non è un problema da risolvere: è biologia.",
    tips: [
      "Rispondi al pianto prima possibile — non lo vizierai: insegnerai al suo corpo che può calmarsi.",
      "Il contatto pelle a pelle nei primi giorni è una delle cose più utili che puoi fare.",
      "Non devi essere un genitore perfetto: devi essere presente, caldo, riparativo.",
      "Parlagli anche se non capisce ancora le parole — la voce struttura il cervello.",
      "Prenditi cura di te: un genitore esausto non può calmare un bambino agitato."
    ]
  },
  "3-6": {
    brain: "Tra i tre e i sei mesi il cervello vive un momento di grande espansione. Le cellule nervose si ricoprono di una guaina protettiva — chiamata [[mielinizzazione|mielina]] — che rende i segnali nervosi più veloci e precisi. I [[neuroni specchio]] — le cellule che permettono di sentire quello che vive un altro — si attivano con forza: è la base biologica dell\'empatia. Crescono anche i legami tra i due emisferi cerebrali. Tutto questo si traduce in una vivacità esplorativa che può sembrare caotica ma è pura intelligenza in costruzione.",
    attachment: "[[Ainsworth]] ha mostrato che quando il bambino ha una [[base sicura]] — qualcuno da cui sa di poter tornare — esplora il mondo con più coraggio e curiosità. Non è la quantità di tempo che conta, ma la qualità della risposta: sapere che ci sei quando ne ha bisogno è abbastanza. Il gioco non è solo divertimento: è il laboratorio in cui elabora le esperienze, capisce le regole sociali, allena corpo e mente. A questa età il bambino sperimenta le prime \'prove di assenza\': ti cerca con lo sguardo, poi torna a giocare. Ogni volta che trova il tuo sguardo e ti sorride, si costruisce un mattone del senso di sicurezza interiore.",
    emozioni: "Tra i tre e i sei mesi emerge il sorriso sociale — non un riflesso, ma una risposta autentica al volto umano, il primo segnale di un dialogo emotivo reale. Gioia, sorpresa e disagio iniziano a differenziarsi. [[Stern]] chiamava questo scambio \'[[sintonizzazione affettiva]]\': il bambino usa il contatto visivo per regolarsi — cerca il tuo sguardo quando è sopraffatto, lo distoglie quando ha bisogno di pausa. Quando rispecchi la sua emozione con la voce o il viso, non stai solo riconoscendola: stai insegnando che le emozioni hanno un nome, che si possono sentire e sopportare. È una lezione che durerà una vita.",
    winnicott: "[[Winnicott]] ha introdotto il concetto di [[oggetto transizionale]]: il peluche, il ciuccio, l\'angolo di lenzuolo consumato. Non è una fisima o una debolezza — è un ponte emotivo sofisticato tra il genitore e il mondo esterno. Tenere quell\'oggetto significa portare con sé qualcosa del legame con te, anche quando non ci sei. Questo oggetto ha una caratteristica preziosa: è \'abbastanza reale\' da dare conforto, ma abbastanza simbolico da non richiedere la tua presenza fisica. Non toglierlo o sminuirlo: il bambino lo abbandonerà spontaneamente quando non ne avrà più bisogno.",
    behavior: "Sorride di risposta — un vero sorriso sociale, non un riflesso — e cerca attivamente il contatto visivo. Tiene la testa sollevata e inizia a controllare il busto. Allunga le mani verso gli oggetti che lo interessano, li afferra, li porta alla bocca per esplorarli. Inizia a distinguere chiaramente le persone familiari dagli estranei — può mostrare diffidenza verso chi non conosce, segno che ha costruito legami preferenziali. Fa versi, gorgheggi, prova la comunicazione con la voce prima ancora delle parole: è il 'protoconversare', il dialogo emotivo che precede il linguaggio. La sofferenza quando ti allontani è un segnale sano: sta sviluppando una preferenza chiara per chi si prende cura di lui. Non è ancora l'ansia da separazione vera e propria — quella arriverà intorno agli otto mesi — ma è la prova che il legame si sta costruendo.",
    tips: [
      "Gioca con lui a terra, al suo livello — è lì che avviene lo sviluppo.",
      "Nomina quello che sente: \'Sei triste perché la palla è rotolata via.\'",
      "Non aver fretta di insegnare — lascialo esplorare e sbagliare.",
      "I libri con immagini grandi e colori forti sviluppano già il linguaggio.",
      "Un bambino che piange quando lo lasci sta mostrando che ti vuole bene — non che ti sta manipolando."
    ]
  },
  "6-12": {
    brain: "Cresce la capacità di ricordare e collegare le esperienze. Il cervello inizia a costruire i primi schemi: questo oggetto esiste anche se non lo vedo — la cosiddetta permanenza dell\'oggetto. La [[corteccia prefrontale]] è ancora immatura: il bambino non riesce a controllare le sue reazioni perché la parte del cervello che frena non è ancora sviluppata. Le crisi non sono capricci strategici — sono la prova che il suo sistema di autocontrollo sta ancora imparando.",
    attachment: "L\'[[attaccamento sicuro]] che si costruisce in questo periodo diventa il modello operativo interno con cui il bambino interpreterà tutte le relazioni future — con i pari, con gli insegnanti, più avanti con i partner. Non è un destino irreversibile, ma è un\'impronta reale. I bambini con un legame sicuro sviluppano più [[resilienza]], hanno relazioni più stabili e gestiscono meglio lo stress da adulti (Sroufe et al., 2005). In questa fase il bambino testa attivamente il legame: si allontana, poi torna. La tua risposta coerente al ritorno — non quella esaltata, quella calma e affidabile — è quello che costruisce la fiducia.",
    emozioni: "Intorno agli otto mesi compare l\'ansia da separazione — e con essa un segnale importante: il bambino ha costruito un legame abbastanza solido da soffrire quando non ci sei. Non è un problema da risolvere: è [[attaccamento sicuro|attaccamento]] in azione. Emerge anche la referenza sociale: di fronte a qualcosa di incerto il bambino si volta verso di te e usa la tua espressione per decidere se farsela bastare. La tua calma, letteralmente, diventa la sua. La curiosità è l\'emozione dominante di questa fase — fiorisce quando il bambino sente di avere una [[base sicura]] alle spalle, si ritrae quando non ce l\'ha.",
    winnicott: "La \'madre sufficientemente buona\' di [[Winnicott]] non è quella che non sbaglia mai — è quella che si sintonizza, sbaglia e poi ripara. La riparazione dopo un momento difficile vale tanto quanto il momento stesso — a volte di più. Quando dici \'mi sono arrabbiata, ti voglio bene lo stesso\', insegni qualcosa di fondamentale: che i legami possono attraversare le rotture senza spezzarsi. [[Tronick]] ha chiamato questo processo ciclo rottura-riparazione: è nel ritmo di allontanamento e ritorno che si costruisce la solidità del legame, non nella sua perfezione continua.",
    behavior: "Gattona o si prepara a farlo — alcuni bambini saltano questa fase e vanno direttamente in piedi, ed è normale. Capisce il 'no' anche se non sempre lo rispetta — la comprensione precede sempre l'autocontrollo. Imita i gesti: batte le mani, fa ciao, indica. Dice 'mamma' e 'papà' con significato, non più come semplice lallazione. Fa cadere gli oggetti di proposito per vederli cadere — non è dispettosità, è un esperimento scientifico sulla permanenza dell'oggetto e sulla gravità. Mostra la 'referenza sociale': guarda il tuo volto per capire se una situazione è sicura o pericolosa. Inizia a protestare quando gli togli qualcosa — sta scoprendo il concetto di 'mio'.",
    tips: [
      "Sii prevedibile: le routine danno sicurezza, non noia.",
      "Quando ti allontani, spiega dove vai e quando torni.",
      "Non punire le esplorazioni fisiche — difendi solo dai pericoli reali.",
      "L\'imitazione è il suo modo di imparare: mostragli le cose, non solo dirglielo.",
      "Giochi semplici come il cucù allenano la memoria e il senso che le persone ci sono anche quando non si vedono."
    ]
  },
  "12-18": {
    brain: "Il bambino tra 12 e 18 mesi è nella fase delle prime parole significative. La comprensione cresce molto più velocemente della produzione: capisce decine di parole ma ne dice poche — e ogni nuova parola crea connessioni in più zone cerebrali contemporaneamente. La [[corteccia prefrontale]] cresce, ma è ancora lontana dalla maturità: il bambino vuole autonomia prima di averla biologicamente — da qui nascono le crisi di frustrazione.",
    attachment: "Il bambino ha bisogno di risposta emotiva, non di perfezione. Non devi essere sempre felice né nascondere le tue emozioni — devi essere presente e onesto. La tua voce calma quando è agitato è il meccanismo più potente che esiste per insegnargli ad autoregolarsi: si chiama [[co-regolazione]]. Il sistema nervoso del bambino si sincronizza letteralmente con il tuo — quando sei calmo, il suo [[cortisolo]] scende. Ogni momento di riparazione dopo un litigio vale quanto il litigio stesso.",
    emozioni: "È la fase della volontà che emerge, e con essa le prime grandi crisi emotive. Il bambino scopre di poter volere cose diverse da te e che il suo desiderio conta. Quando non ottiene quello che vuole, la frustrazione è intensa e corporea: non ha ancora le parole, e la [[corteccia prefrontale]] è troppo immatura per aspettare. Le crisi non sono manipolazione strategica — sono emozioni che superano la capacità di contenimento disponibile. La cosa più efficace che puoi fare è nominare l\'emozione prima di qualsiasi altra cosa: \'sei arrabbiato, capisco\' non è cedere — è insegnare che le emozioni hanno parole e si possono attraversare.",
    winnicott: "Il bambino inizia ad avere fantasie vive e paure intense. Le paure \'irrazionali\' — il buco dello scarico, i mostri sotto il letto, il buio improvviso — sono reali per lui, nel senso che le sente nel corpo con la stessa intensità di qualsiasi minaccia vera. Non liquidarle con \'non esiste\': farlo insegna che bisogna vergognarsi di ciò che si sente. [[Winnicott]] ci invitava ad accogliere la paura prima di smontarla: \'capisco che ti spaventa\' — poi, gradualmente, mostragli che si può stare nel mondo nonostante essa. È la differenza tra eliminare la paura e imparare a tollerarla.",
    behavior: "Crisi di rabbia frequenti e intense — sono normali a questa età, non patologiche né segno di cattivo carattere. La frustrazione esplode perché il bambino vuole fare più di quanto il suo corpo e il suo cervello gli permettano. Corre, sale, si arrampica, esplora con tutto il corpo — ha bisogno di movimento per svilupparsi. Dice 'no' come parola preferita perché sta scoprendo di essere una persona separata con una volontà propria. Ha bisogno di te vicino mentre esplora lontano da te — il paradosso della base sicura. Può mostrare le prime [[paure evolutive|paure specifiche]]: animali, rumori forti, il buio. Inizia a usare oggetti in modo simbolico: un cucchiaio diventa un telefono, una scatola diventa una macchina.",
    tips: [
      "Le crisi di rabbia non vanno punite — vanno contenute con calma.",
      "Dai parole alle sue emozioni: \'Sei arrabbiato perché volevi il biscotto.\'",
      "Offri scelte reali ma limitate: \'Vuoi la mela o la pera?\'",
      "Non cambiare le regole sotto stress — la coerenza è rassicurante.",
      "Prenditi del tempo per te: essere un buon genitore richiede energia che va ricaricata."
    ]
  },
  "18-24": {
    brain: "L\'esplosione del vocabolario è impressionante: da 10-20 parole a 200 in pochi mesi. Il cervello combina suoni in modi nuovi ogni giorno. La [[corteccia prefrontale]] inizia a collegare le emozioni alle parole — parlare di quello che si sente è un passo fondamentale nello sviluppo emotivo. Il [[gioco simbolico]] — far finta, immaginare — è la prova che il pensiero si è affrancato dal solo presente.",
    attachment: "Il bambino testa i limiti non per cattiveria ma perché sta costruendo il senso di sé come persona separata da te — è lo stesso processo che [[Mahler]] chiamava \'separazione-individuazione\'. Ogni risposta coerente — anche il \'no\' detto con amore — non blocca la sua autonomia: costruisce un contenitore sicuro dentro cui può crescere. Quando la risposta ai suoi tentativi di autonomia è prevedibile — non rigida, ma coerente — il bambino impara che il mondo ha struttura, che le relazioni reggono anche nei conflitti. La solidità del legame si misura anche nella capacità di stare nel \'no\' senza perdere la connessione affettiva.",
    emozioni: "Il linguaggio inizia a diventare uno strumento emotivo: il bambino può dire \'vuole\', \'no\', \'mio\'. È una piccola rivoluzione — l\'emozione trova per la prima volta un canale diverso dal pianto. Compaiono anche le prime emozioni sociali: vergogna, senso di colpa, orgoglio. Queste emozioni nascono dallo sguardo dell\'altro — il bambino inizia a sentire il giudizio esterno. Il modo in cui rispondi alla vergogna (accogliendola o amplificandola) imposta un programma emotivo che resterà attivo a lungo. \'Hai fatto una cosa sbagliata\' si elabora in modo molto diverso da \'sei sbagliato\' — anche a quest\'età, anche se non sembrerebbe.",
    winnicott: "[[Winnicott]] descriveva questo periodo come il momento in cui il bambino inizia a capire che sei una persona separata da lui — con i tuoi stati d\'animo, i tuoi limiti, i tuoi giorni buoni e cattivi. Scoprire che il genitore non è un\'estensione di sé, ma un altro essere umano, è una rivoluzione silenziosa. È la base dell\'empatia futura: non si può capire l\'altro senza aver prima capito che l\'altro esiste davvero. Winnicott non vedeva questa scoperta come una perdita — la vedeva come il fondamento su cui si costruisce la capacità di amare qualcuno che è davvero altro da te.",
    behavior: "Gioco affiancato: gioca accanto agli altri bambini ma non ancora con loro — è il cosiddetto gioco parallelo, e rappresenta il primo passo verso la socializzazione. Possiede i giocattoli con forza e dice 'mio' in modo ossessivo — non è egoismo, è la scoperta che esiste un confine tra sé e gli altri. Inizia a imitare azioni complesse della vita quotidiana: cucinare, telefonare, mettere a letto il pupazzo. Ha paure nuove, soprattutto di notte — il buio, i mostri, i rumori — perché l'immaginazione si è accesa ma il cervello non distingue ancora bene tra fantasia e realtà. Il linguaggio esplode e con esso cambia anche il conflitto: le crisi diventano meno fisiche e più verbali, i 'no' si moltiplicano, le negoziazioni iniziano.",
    tips: [
      "Il [[gioco simbolico]] va incoraggiato: lascialo \'cucinare\', \'guidare\', \'fare il dottore\'.",
      "Le regole devono essere poche, chiare e sempre rispettate.",
      "Leggi storie con personaggi che vivono emozioni — aiuta a dare nome a quello che sente.",
      "La routine serale è fondamentale: stesso orario, stessa sequenza.",
      "Non fare le sue battaglie: lascialo frustrarsi nelle piccole cose — è così che impara."
    ]
  },
  "24-36": {
    brain: "A questa età il cervello costruisce i primi ricordi narrativi: il bambino inizia a capire che c\'era un \'ieri\' e ci sarà un \'domani\'. La [[corteccia prefrontale]] fa progressi: a volte riesce a fermarsi prima di reagire. I [[neuroni specchio]] lo rendono molto sensibile alle emozioni altrui — piange se vede piangere, ride se vede ridere.",
    attachment: "Il cervello narrativo che si sviluppa ora permette al bambino di portare con sé il genitore anche quando non c\'è fisicamente — la sua immagine interna di te lo accompagna, lo tranquillizza, lo orienta. Questo è il frutto di anni di [[co-regolazione]] e presenza coerente. Il bambino inizia a \'conservarti dentro\' — un processo che i ricercatori chiamano costanza dell\'oggetto emotiva. È ciò che gli permette di separarsi senza sfaldarsi, di tollerare la frustrazione per qualche minuto: non è magia, è la conseguenza concreta del lavoro relazionale dei tre anni precedenti.",
    emozioni: "Il bambino di due-tre anni ha emozioni vaste in un contenitore ancora piccolo. Sa cosa sente, ma non sa ancora aspettare, differire, modulare. Le crisi di questa fase — intense, a volte spettacolari — sono crisi di regolazione, non di carattere. [[Eisenberg]] ha mostrato che i bambini che ricevono [[co-regolazione]] — un adulto calmo che li aiuta a uscire dalla crisi, non a sopprimerla — sviluppano nel tempo una migliore capacità di autoregolarsi. Il [[gioco simbolico]] è il laboratorio naturale dove il bambino elabora le emozioni difficili: la rabbia, la paura, la tristezza vengono \'messe in scena\' e rese più tollerabili.",
    winnicott: "Il bambino inizia a fare giochi di ruolo complessi — diventa il medico, il mostro, il papà. [[Winnicott]] vedeva in questo gioco qualcosa di profondamente serio: è lo spazio in cui elabora le esperienze difficili, mette in scena le paure, prova le identità. Non correggere le storie \'assurde\' — sono il suo modo di fare terapia con se stesso. Il gioco di finzione è anche il terreno in cui si sviluppano creatività, flessibilità mentale e capacità di prendere il punto di vista dell\'altro. Partecipare al gioco — anche per pochi minuti, lasciando che sia lui a dettare le regole — è una delle forme di presenza più preziose che puoi offrire.",
    behavior: "Sa aspettare un po' — non a lungo, ma i primi secondi di tolleranza alla frustrazione stanno emergendo. Contratta e negozia: 'ancora uno', 'dopo questo'. Ha amici preferiti e li cerca attivamente. Capisce le regole dei giochi semplici e protesta se vengono violate — il senso di giustizia emerge presto. Sa consolare un compagno che piange — l'empatia in azione. I capricci diminuiscono man mano che cresce il linguaggio: più parole ha a disposizione, meno ha bisogno di urlare per farsi capire. Inizia a raccontare piccole storie su quello che ha fatto — la memoria autobiografica sta nascendo. Può avere un amico immaginario: è normale e segno di creatività, non di solitudine patologica.",
    tips: [
      "Racconta la giornata insieme la sera: \'Oggi cosa ti è piaciuto di più?\'",
      "Dai responsabilità piccole e reali: sparecchiare, innaffiare una piantina.",
      "Il confronto con altri bambini è il veleno della genitorialità — ogni bambino ha i suoi tempi.",
      "Se litigate, ripara: \'Mi sono arrabbiato, me ne sono andato, ti voglio bene lo stesso.\'",
      "Il gioco libero all\'aperto vale più di qualsiasi corso strutturato."
    ]
  }
};


/* ═══ SOTTOFASE 0-6 MESI ═══ */
const DIFF_0_3_06 = [
  { id: "d06_s1", category: "Sonno", label: "Non si addormenta se non è in braccio o al seno", icon: "🤱" },
  { id: "d06_s2", category: "Sonno", label: "Si sveglia ogni 1-2 ore durante la notte", icon: "😴" },
  { id: "d06_s3", category: "Sonno", label: "Confonde giorno e notte — dorme di giorno, sveglio la notte", icon: "🌙" },
  { id: "d06_p1", category: "Pianto", label: "Pianto prolungato e inconsolabile — niente sembra funzionare", icon: "😢" },
  { id: "d06_p2", category: "Pianto", label: "Coliche intense — crisi serali ricorrenti", icon: "🍼" },
  { id: "d06_p3", category: "Pianto", label: "Rigurgito frequente che causa disagio visibile", icon: "🤢" },
  { id: "d06_a1", category: "Alimentazione", label: "Difficoltà con l'attacco al seno o il ritmo delle poppate", icon: "🤱" },
  { id: "d06_a2", category: "Alimentazione", label: "Rifiuta il biberon o il passaggio seno-biberon", icon: "🍼" },
  { id: "d06_a3", category: "Alimentazione", label: "Crescita ponderale lenta — il pediatra ha segnalato la curva", icon: "📉" },
  { id: "d06_sv1", category: "Sviluppo", label: "Ipersensibilità al contatto, ai suoni o alla luce", icon: "🔊" },
  { id: "d06_sv2", category: "Sviluppo", label: "Poco contatto visivo — non segue il volto con gli occhi", icon: "👀" },
  { id: "d06_g1", category: "Genitore", label: "Stanchezza travolgente — il corpo non recupera mai", icon: "🔋" },
  { id: "d06_g2", category: "Genitore", label: "Tristezza o distacco emotivo dal bambino (baby blues / oltre)", icon: "🌧️" },
  { id: "d06_g3", category: "Genitore", label: "Senso di solitudine — nessuno capisce davvero questa fatica", icon: "🚪" },
];
const STR_0_3_06 = [
  { id: "s06_1", category: "Relazione", label: "Sorriso sociale luminoso — risponde al volto con gioia", icon: "😄" },
  { id: "s06_2", category: "Relazione", label: "Si calma rapidamente al contatto o alla voce del genitore", icon: "🌊" },
  { id: "s06_3", category: "Relazione", label: "Cerca lo sguardo — mantiene il contatto visivo a lungo", icon: "👀" },
  { id: "s06_4", category: "Comunicazione", label: "Lallazione vivace — vocalizza, gorgheggia, sperimenta suoni", icon: "🗣️" },
  { id: "s06_5", category: "Comunicazione", label: "Reagisce alla voce familiare con movimenti o sorrisi", icon: "👂" },
  { id: "s06_6", category: "Esplorazione", label: "Curiosità visiva intensa — segue oggetti e persone con lo sguardo", icon: "🔍" },
  { id: "s06_7", category: "Esplorazione", label: "Porta tutto alla bocca — esplora attivamente il mondo", icon: "🤲" },
  { id: "s06_8", category: "Regolazione", label: "Si tranquillizza con il dondolio o il contatto pelle a pelle", icon: "💛" },
  { id: "s06_9", category: "Regolazione", label: "Inizia a distinguere giorno e notte — il ritmo si organizza", icon: "🌙" },
  { id: "s06_10", category: "Regolazione", label: "Risponde bene alle routine prevedibili — il ritmo lo calma", icon: "📅" },
  { id: "s06_11", category: "Esplorazione", label: "Tono muscolare buono — tiene la testa, spinge con le braccia", icon: "💪" },
  { id: "s06_12", category: "Relazione", label: "Si rilassa visibilmente quando il genitore è presente", icon: "🏡" },
];

/* ═══ SOTTOFASE 6-18 MESI ═══ */
const DIFF_0_3_618 = [
  { id: "d618_s1", category: "Sonno", label: "Regressione del sonno — dormiva bene, ora non più", icon: "🔁" },
  { id: "d618_s2", category: "Sonno", label: "Si sveglia più volte a notte piangendo intensamente", icon: "😴" },
  { id: "d618_s3", category: "Sonno", label: "Si addormenta solo con un rituale rigido (seno, canto, dondolio)", icon: "🌙" },
  { id: "d618_p1", category: "Pianto", label: "Angoscia dell'estraneo molto intensa — piange con chiunque", icon: "😨" },
  { id: "d618_p2", category: "Pianto", label: "Pianto acuto alla separazione dal genitore — anche per pochi minuti", icon: "💔" },
  { id: "d618_a1", category: "Alimentazione", label: "Rifiuta i cibi solidi — lo svezzamento è una battaglia", icon: "🥣" },
  { id: "d618_a2", category: "Alimentazione", label: "Accetta solo poche consistenze o sapori — molto selettivo", icon: "🚫" },
  { id: "d618_c1", category: "Comportamento", label: "Molto dipendente — non si stacca nemmeno un momento", icon: "🧲" },
  { id: "d618_c2", category: "Comportamento", label: "Resistenza totale alle routine (cambio, bagnetto, nanna)", icon: "🚿" },
  { id: "d618_sv1", category: "Sviluppo", label: "Preoccupazione per il ritardo motorio (non gattona, non cammina)", icon: "🦵" },
  { id: "d618_sv2", category: "Sviluppo", label: "Poche o nessuna parola rispetto ai coetanei", icon: "🗣️" },
  { id: "d618_sv3", category: "Sviluppo", label: "Ipersensibilità sensoriale — si spaventa facilmente", icon: "🔊" },
  { id: "d618_g1", category: "Genitore", label: "Senso di colpa costante — non so se sto facendo bene", icon: "💭" },
  { id: "d618_g2", category: "Genitore", label: "Conflitto con il partner sulla gestione del bambino", icon: "👫" },
];
const STR_0_3_618 = [
  { id: "s618_1", category: "Esplorazione", label: "Esplora tutto con entusiasmo — gattona, si arrampica, tocca", icon: "🏃" },
  { id: "s618_2", category: "Esplorazione", label: "Concentrazione intensa su ciò che lo appassiona", icon: "🎯" },
  { id: "s618_3", category: "Comunicazione", label: "Indica con il dito e usa gesti per farsi capire", icon: "👆" },
  { id: "s618_4", category: "Comunicazione", label: "Prime parole — il linguaggio si accende progressivamente", icon: "🗣️" },
  { id: "s618_5", category: "Comunicazione", label: "Imita gesti e suoni con precisione sorprendente", icon: "🪞" },
  { id: "s618_6", category: "Relazione", label: "Cerca il genitore per conforto, poi riparte ad esplorare", icon: "🔄" },
  { id: "s618_7", category: "Relazione", label: "Mostra gioia quando il genitore torna dopo un'assenza", icon: "🤗" },
  { id: "s618_8", category: "Relazione", label: "Primi segni di empatia — consola chi piange, offre cibo", icon: "💛" },
  { id: "s618_9", category: "Regolazione", label: "Mangia con varietà crescente — accoglie sapori nuovi", icon: "🍎" },
  { id: "s618_10", category: "Regolazione", label: "Si adatta ai cambiamenti con relativa facilità", icon: "🌱" },
  { id: "s618_11", category: "Esplorazione", label: "Motricità vivace e armoniosa — il corpo lo porta ovunque", icon: "🤸" },
  { id: "s618_12", category: "Regolazione", label: "Sonno in miglioramento — periodi sempre più lunghi", icon: "🌙" },
];

/* ═══ SOTTOFASE 18-36 MESI ═══ */
const DIFF_0_3_1836 = [
  { id: "d1836_c1", category: "Comportamento", label: "Crisi di rabbia esplosive — urla, si butta a terra, colpisce", icon: "🌪️" },
  { id: "d1836_c2", category: "Comportamento", label: "Morde, colpisce o graffia altri bambini", icon: "😤" },
  { id: "d1836_c3", category: "Comportamento", label: "'No!' a quasi tutto — oppositività intensa", icon: "🚫" },
  { id: "d1836_c4", category: "Comportamento", label: "Non tollera i cambi di programma — vuole tutto come sempre", icon: "🔁" },
  { id: "d1836_s1", category: "Sonno", label: "Rifiuta di andare a letto — la sera è un negoziato infinito", icon: "🌙" },
  { id: "d1836_s2", category: "Sonno", label: "Paure notturne o incubi che lo svegliano terrorizzato", icon: "👻" },
  { id: "d1836_a1", category: "Alimentazione", label: "Estremamente selettivo — mangia solo 4-5 cose", icon: "🥦" },
  { id: "d1836_sv1", category: "Sviluppo", label: "Linguaggio in ritardo — poche parole o frasi rispetto ai coetanei", icon: "🗣️" },
  { id: "d1836_sv2", category: "Sviluppo", label: "Non mostra interesse per il vasino — resistenza allo spannolinamento", icon: "🚽" },
  { id: "d1836_sv3", category: "Sviluppo", label: "Gelosia intensa verso il fratellino/sorellina", icon: "👶" },
  { id: "d1836_d1", category: "Digitale", label: "Non riesce a staccarsi da tablet/TV — crisi allo spegnimento", icon: "📱" },
  { id: "d1836_g1", category: "Genitore", label: "Mi spaventa la mia rabbia — a volte perdo il controllo", icon: "🔥" },
  { id: "d1836_g2", category: "Genitore", label: "Esausto/a — la richiesta costante di attenzione mi svuota", icon: "🔋" },
];
const STR_0_3_1836 = [
  { id: "s1836_1", category: "Comunicazione", label: "Esplosione del linguaggio — nuove parole e frasi ogni giorno", icon: "🗣️" },
  { id: "s1836_2", category: "Comunicazione", label: "Racconta mini-storie — ricorda episodi e li rielabora", icon: "📖" },
  { id: "s1836_3", category: "Esplorazione", label: "Gioco simbolico ricco — fa finta, inventa, drammatizza", icon: "🎭" },
  { id: "s1836_4", category: "Esplorazione", label: "Concentrazione sorprendente su giochi che lo appassionano", icon: "🎯" },
  { id: "s1836_5", category: "Autonomia", label: "Vuole fare da solo — si veste, mangia, prova", icon: "⭐" },
  { id: "s1836_6", category: "Autonomia", label: "Corre, salta, si arrampica con destrezza crescente", icon: "🏃" },
  { id: "s1836_7", category: "Relazione", label: "Prime amicizie — cerca i coetanei, gioca insieme", icon: "👫" },
  { id: "s1836_8", category: "Relazione", label: "Empatia visibile — consola, condivide, si preoccupa per gli altri", icon: "💛" },
  { id: "s1836_9", category: "Relazione", label: "Cerca il genitore per co-regolarsi, poi riparte sereno", icon: "🌊" },
  { id: "s1836_10", category: "Regolazione", label: "Risponde bene ai limiti quando sono posti con calore", icon: "🌿" },
  { id: "s1836_11", category: "Curiosità", label: "Domande continue — 'cos'è?', 'perché?' ovunque", icon: "🔍" },
  { id: "s1836_12", category: "Regolazione", label: "Sonno stabile — si addormenta con routine prevedibile", icon: "🌙" },
];

/* ═══ MERGE 0-3 (per lookup label AI) ═══ */
const DIFFICULTIES = [...DIFF_0_3_06, ...DIFF_0_3_618, ...DIFF_0_3_1836];


/* ─── PUNTI DI FORZA — ZONE 0-3 ─── */
const STRENGTHS_0_3 = [...STR_0_3_06, ...STR_0_3_618, ...STR_0_3_1836];

/* ─── PUNTI DI FORZA — ZONE 3-6 ─── */
/* ═══ SOTTOFASE 3-4 ANNI — Punti di forza ═══ */
const STR_3_6_34 = [
  { id: "s34_1", category: "Creatività", label: "Fantasia esplosiva — inventa mondi, personaggi, storie", icon: "🌈" },
  { id: "s34_2", category: "Creatività", label: "Gioco simbolico ricchissimo — ore di gioco immaginativo", icon: "🎭" },
  { id: "s34_3", category: "Comunicazione", label: "Linguaggio in espansione rapida — parla tantissimo", icon: "🗣️" },
  { id: "s34_4", category: "Comunicazione", label: "Fa le prime domande 'perché?' — la curiosità si accende", icon: "🔍" },
  { id: "s34_5", category: "Relazione", label: "Cerca attivamente i coetanei — vuole giocare insieme", icon: "👫" },
  { id: "s34_6", category: "Relazione", label: "Mostra empatia spontanea — consola chi piange, condivide", icon: "💛" },
  { id: "s34_7", category: "Emotivo", label: "Gioia contagiosa — ride forte, si entusiasma, festeggia", icon: "😄" },
  { id: "s34_8", category: "Emotivo", label: "Inizia a nominare le emozioni — 'sono arrabbiato', 'ho paura'", icon: "❤️" },
  { id: "s34_9", category: "Autonomia", label: "Vuole fare da solo — si veste, mangia, si lava le mani", icon: "⭐" },
  { id: "s34_10", category: "Autonomia", label: "Collabora nelle piccole faccende di casa con orgoglio", icon: "🏠" },
  { id: "s34_11", category: "Esplorazione", label: "Energia motoria inesauribile — corre, salta, balla", icon: "🏃" },
  { id: "s34_12", category: "Esplorazione", label: "Disegna con piacere — i primi scarabocchi diventano figure", icon: "🎨" },
];
/* ═══ SOTTOFASE 4-5 ANNI — Punti di forza ═══ */
const STR_3_6_45 = [
  { id: "s45_1", category: "Creatività", label: "Costruisce, modella, assembla — la manualità si raffina", icon: "🎨" },
  { id: "s45_2", category: "Creatività", label: "Umorismo emergente — inventa battute, giochi di parole", icon: "😄" },
  { id: "s45_3", category: "Linguaggio", label: "Racconta storie con inizio, svolgimento e fine", icon: "📚" },
  { id: "s45_4", category: "Linguaggio", label: "Memoria narrativa ricca — ricorda dettagli precisi di episodi", icon: "🧠" },
  { id: "s45_5", category: "Sociale", label: "Amicizie significative — sceglie i suoi amici del cuore", icon: "👫" },
  { id: "s45_6", category: "Sociale", label: "Comprende il senso di giustizia — 'non è giusto!'", icon: "⚖️" },
  { id: "s45_7", category: "Emotivo", label: "Chiede scusa e ripara spontaneamente dopo un conflitto", icon: "🤝" },
  { id: "s45_8", category: "Emotivo", label: "Sa aspettare meglio — la frustrazione è più gestibile", icon: "⏳" },
  { id: "s45_9", category: "Autonomia", label: "Segue la routine quotidiana con sempre meno promemoria", icon: "📅" },
  { id: "s45_10", category: "Autonomia", label: "Sonno stabile — si addormenta con serenità crescente", icon: "🌙" },
  { id: "s45_11", category: "Curiosità", label: "Domande continue e profonde sul mondo — 'come funziona?'", icon: "🔍" },
  { id: "s45_12", category: "Curiosità", label: "Interesse per lettere, numeri, scrittura — senza pressione", icon: "✏️" },
];
/* ═══ SOTTOFASE 5-6 ANNI — Punti di forza ═══ */
const STR_3_6_56 = [
  { id: "s56_1", category: "Intelletto", label: "Ragionamento logico emergente — sa spiegare il perché delle cose", icon: "🧠" },
  { id: "s56_2", category: "Intelletto", label: "Interesse spontaneo per lettura e scrittura", icon: "📖" },
  { id: "s56_3", category: "Sociale", label: "Si inserisce bene nel gruppo — collabora, negozia, condivide", icon: "🏫" },
  { id: "s56_4", category: "Sociale", label: "Comportamenti prosociali maturi — aiuta senza che glielo chiedano", icon: "💛" },
  { id: "s56_5", category: "Emotivo", label: "Riconosce e nomina le emozioni proprie e altrui con precisione", icon: "❤️" },
  { id: "s56_6", category: "Emotivo", label: "Affronta le paure con strategie proprie — sta maturando", icon: "💪" },
  { id: "s56_7", category: "Autonomia", label: "Autosufficiente nelle routine — si veste, si lava, mangia solo", icon: "⭐" },
  { id: "s56_8", category: "Autonomia", label: "Prepara lo zaino, ricorda le cose — responsabilità crescente", icon: "🎒" },
  { id: "s56_9", category: "Creatività", label: "Disegno dettagliato — figure umane con particolari e contesto", icon: "🎨" },
  { id: "s56_10", category: "Creatività", label: "Inventa giochi strutturati con regole sue — progetta", icon: "🎲" },
  { id: "s56_11", category: "Linguaggio", label: "Vocabolario ampio — usa parole nuove nel contesto giusto", icon: "🗣️" },
  { id: "s56_12", category: "Curiosità", label: "Entusiasmo per la scuola che verrà — vuole imparare", icon: "🔍" },
];
const STRENGTHS_3_6 = [...STR_3_6_34, ...STR_3_6_45, ...STR_3_6_56];

/* ─── PUNTI DI FORZA — ZONE 6-12 ─── */
/* ═══ SOTTOFASE 6-8 ANNI — Punti di forza ═══ */
const STR_6_12_68 = [
  { id: "s68_1", category: "Intelletto", label: "Pensiero logico concreto solido — ama risolvere problemi", icon: "🧠" },
  { id: "s68_2", category: "Intelletto", label: "Legge con piacere crescente — libri, fumetti, storie", icon: "📖" },
  { id: "s68_3", category: "Intelletto", label: "Apprendimento rapido quando è motivato", icon: "⚡" },
  { id: "s68_4", category: "Sociale", label: "Senso di giustizia forte — costruisce un codice morale interno", icon: "⚖️" },
  { id: "s68_5", category: "Sociale", label: "Amicizie in formazione — cerca il suo primo amico del cuore", icon: "👫" },
  { id: "s68_6", category: "Emotivo", label: "Sa nominare le emozioni — le riconosce e le esprime", icon: "❤️" },
  { id: "s68_7", category: "Emotivo", label: "Si calma più velocemente dopo un momento difficile", icon: "🌊" },
  { id: "s68_8", category: "Autonomia", label: "Gestisce zaino e materiale scolastico in autonomia", icon: "🎒" },
  { id: "s68_9", category: "Autonomia", label: "Responsabilità crescente — mantiene piccoli impegni", icon: "✅" },
  { id: "s68_10", category: "Creatività", label: "Passione per il disegno, la costruzione, il fare manuale", icon: "🎨" },
  { id: "s68_11", category: "Creatività", label: "Creatività narrativa — inventa storie e giochi strutturati", icon: "💡" },
  { id: "s68_12", category: "Esplorazione", label: "Il corpo è il suo strumento di apprendimento — impara muovendosi", icon: "🏃" },
];
/* ═══ SOTTOFASE 8-10 ANNI — Punti di forza ═══ */
const STR_6_12_810 = [
  { id: "s810_1", category: "Intelletto", label: "Passioni profonde e specifiche — sport, musica, scienze, arte", icon: "🔥" },
  { id: "s810_2", category: "Intelletto", label: "Metacognizione emergente — sa riflettere su come impara", icon: "🧠" },
  { id: "s810_3", category: "Intelletto", label: "Creatività e pensiero originale — trova soluzioni inaspettate", icon: "💡" },
  { id: "s810_4", category: "Sociale", label: "Empatia matura — sa mettersi nei panni degli altri davvero", icon: "💛" },
  { id: "s810_5", category: "Sociale", label: "Spirito di squadra — collabora bene in gruppo e nello sport", icon: "🏆" },
  { id: "s810_6", category: "Sociale", label: "Amicizie profonde e leali — relazioni di vera fiducia", icon: "👫" },
  { id: "s810_7", category: "Emotivo", label: "Mostra mindset di crescita — 'non ancora' invece di 'non so'", icon: "🌱" },
  { id: "s810_8", category: "Emotivo", label: "Sa chiedere aiuto — non chiude, si fida degli adulti", icon: "🙋" },
  { id: "s810_9", category: "Autonomia", label: "Sa organizzarsi nello studio — strategie proprie che funzionano", icon: "🎯" },
  { id: "s810_10", category: "Autonomia", label: "Senso di responsabilità — mantiene impegni senza solleciti", icon: "✅" },
  { id: "s810_11", category: "Emotivo", label: "Umorismo sviluppato — sa ridere di sé e alleggerire", icon: "😄" },
  { id: "s810_12", category: "Autonomia", label: "Gestisce l'agenda scolastica con indipendenza crescente", icon: "📅" },
];
/* ═══ SOTTOFASE 10-12 ANNI — Punti di forza ═══ */
const STR_6_12_1012 = [
  { id: "s1012_1", category: "Intelletto", label: "Ragionamento critico — non accetta tutto per scontato", icon: "🧠" },
  { id: "s1012_2", category: "Intelletto", label: "Approfondisce da solo — cerca informazioni, legge, esplora", icon: "🔍" },
  { id: "s1012_3", category: "Sociale", label: "Riflessione morale autonoma — ragiona su giusto e sbagliato", icon: "⚖️" },
  { id: "s1012_4", category: "Sociale", label: "Sa navigare le dinamiche di gruppo con crescente sicurezza", icon: "🧭" },
  { id: "s1012_5", category: "Emotivo", label: "Resilienza — cade, si rialza, tira fuori le risorse", icon: "💪" },
  { id: "s1012_6", category: "Emotivo", label: "Consapevolezza di sé — sa nominare punti forti e limiti", icon: "🪞" },
  { id: "s1012_7", category: "Emotivo", label: "Mi cerca ancora nei momenti di crisi — sa che ci sono", icon: "🤗" },
  { id: "s1012_8", category: "Autonomia", label: "Gestisce trasporti, orari, casa con indipendenza reale", icon: "🏠" },
  { id: "s1012_9", category: "Autonomia", label: "Sa fare le cose di casa — cucina, riordina, si organizza", icon: "📅" },
  { id: "s1012_10", category: "Intelletto", label: "Interessi profondi che lo/la accendono davvero", icon: "🔥" },
  { id: "s1012_11", category: "Sociale", label: "Parla ancora con me — anche se a modo suo, ci siamo", icon: "💬" },
  { id: "s1012_12", category: "Emotivo", label: "Riconosce quando sta male — non nega, chiede aiuto", icon: "🌊" },
];
const STRENGTHS_6_12 = [...STR_6_12_68, ...STR_6_12_810, ...STR_6_12_1012];


/* ─── DIFFICOLTÀ + PUNTI DI FORZA — GRAVIDANZA ─── */
const DIFFICULTIES_GRAVIDANZA = [
  // FISICO
  { id: "gr_f1", category: "Fisico", label: "Nausea intensa, vomito, stanchezza cronica", icon: "🤢" },
  { id: "gr_f2", category: "Fisico", label: "Dolori (schiena, pelvi, gambe) che limitano la vita", icon: "💊" },
  { id: "gr_f3", category: "Fisico", label: "Insonnia o sonno molto disturbato", icon: "🌙" },
  { id: "gr_f4", category: "Fisico", label: "Difficoltà ad accettare il corpo che cambia", icon: "🌊" },
  // EMOTIVO
  { id: "gr_em1", category: "Emotivo", label: "Ansia intensa — paura di non essere all'altezza", icon: "😰" },
  { id: "gr_em2", category: "Emotivo", label: "Ambivalenza: desidero il bambino ma temo i cambiamenti", icon: "💔" },
  { id: "gr_em3", category: "Emotivo", label: "Umore basso, tristezza, pianto frequente senza motivo chiaro", icon: "🌧️" },
  { id: "gr_em4", category: "Emotivo", label: "Mi sento sola — nessuno capisce davvero quello che vivo", icon: "🚪" },
  { id: "gr_em5", category: "Emotivo", label: "Mi sento già esausta ancora prima che arrivi", icon: "🔋" },
  // PARTO E SALUTE
  { id: "gr_p1", category: "Parto", label: "Paura intensa del parto e del dolore", icon: "😱" },
  { id: "gr_p2", category: "Parto", label: "Preoccupazione costante per la salute del bambino", icon: "💊" },
  { id: "gr_p3", category: "Parto", label: "Gravidanza a rischio o precedente perdita (lutto perinatale)", icon: "🌸" },
  // PRATICO
  { id: "gr_pr1", category: "Pratico", label: "Non so da dove iniziare — lista, cameretta, pediatra", icon: "📋" },
  { id: "gr_pr2", category: "Pratico", label: "Preoccupazione economica — come faremo con le spese?", icon: "💰" },
  { id: "gr_pr3", category: "Pratico", label: "Difficoltà a conciliare lavoro e gravidanza", icon: "💼" },
  // COPPIA E RELAZIONI
  { id: "gr_cop1", category: "Coppia", label: "Tensioni o distanza con il partner", icon: "👫" },
  { id: "gr_cop2", category: "Coppia", label: "Partner non sufficientemente coinvolto", icon: "🤷" },
  { id: "gr_cop3", category: "Coppia", label: "Cambiamento nella sessualità di coppia", icon: "❤️" },
  { id: "gr_rel1", category: "Relazioni", label: "Pressioni da familiari sulle scelte (nome, parto, allattamento...)", icon: "🔊" },
  { id: "gr_rel2", category: "Relazioni", label: "Rapporto difficile con la propria madre che riaffiora", icon: "👩" },
];

const STRENGTHS_GRAVIDANZA = [
  { id: "sgr_1", category: "Emotivo", label: "Sento gioia intensa e autentica al pensiero del bambino", icon: "💛" },
  { id: "sgr_2", category: "Emotivo", label: "Sento già un istinto materno forte e presente", icon: "🤱" },
  { id: "sgr_3", category: "Emotivo", label: "Riesco a trovare momenti di serenità nonostante l'incertezza", icon: "🌱" },
  { id: "sgr_4", category: "Emotivo", label: "Accetto l'ambivalenza — so che è normale sentirsi così", icon: "🌊" },
  { id: "sgr_5", category: "Cognitivo", label: "Mi informo attivamente — leggo, chiedo, capisco", icon: "🔍" },
  { id: "sgr_6", category: "Cognitivo", label: "Sto organizzando con cura: lista, cameretta, pediatra", icon: "📋" },
  { id: "sgr_7", category: "Cognitivo", label: "Ho scelto il mio team di cura (ginecologo, ostetrica, pediatra)", icon: "👩‍⚕️" },
  { id: "sgr_8", category: "Cognitivo", label: "Sono flessibile — so che il piano del parto può cambiare", icon: "🔄" },
  { id: "sgr_9", category: "Coppia", label: "Il mio partner e io siamo uniti — parliamo di tutto", icon: "👫" },
  { id: "sgr_10", category: "Coppia", label: "Stiamo già definendo i ruoli post-nascita insieme", icon: "🤝" },
  { id: "sgr_11", category: "Relazioni", label: "Ho una rete di supporto (famiglia, amiche, ostetriche)", icon: "🌐" },
  { id: "sgr_12", category: "Relazioni", label: "So chiedere aiuto — non mi sento in colpa a farlo", icon: "🙋" },
  { id: "sgr_13", category: "Fisico", label: "Ascolto il mio corpo e me ne prendo cura ogni giorno", icon: "💆" },
  { id: "sgr_14", category: "Fisico", label: "Faccio attività fisica adatta alla gravidanza", icon: "🚶" },
  { id: "sgr_15", category: "Connessione", label: "Parlo già al bambino — sento una connessione profonda", icon: "🫀" },
  { id: "sgr_16", category: "Connessione", label: "Sto partecipando al corso preparto — mi preparo attivamente", icon: "📚" },
];

/* ─── DIFFICOLTÀ + PUNTI DI FORZA — FUTURI PAPÀ ─── */
const DIFFICULTIES_PAPA = [
  // EMOTIVO
  { id: "dp_em1", category: "Emotivo", label: "Mi sento escluso/a dalla gravidanza — è tutto tra il mio partner e il bambino", icon: "🚪" },
  { id: "dp_em2", category: "Emotivo", label: "Ho paura di non essere all'altezza come genitore", icon: "😰" },
  { id: "dp_em3", category: "Emotivo", label: "Faccio fatica a sentirmi 'genitore' — il bambino non è ancora qui", icon: "🌫️" },
  { id: "dp_em4", category: "Emotivo", label: "Provo ansia per come cambierà la nostra vita", icon: "🌀" },
  { id: "dp_em5", category: "Emotivo", label: "Non riesco a parlare di quello che sento — nessuno me lo chiede", icon: "🔇" },
  // COPPIA
  { id: "dp_cop1", category: "Coppia", label: "Il mio partner è assorbito/a dalla gravidanza — mi sento invisibile", icon: "👫" },
  { id: "dp_cop2", category: "Coppia", label: "Non so come supportare il mio partner quando sta male fisicamente o emotivamente", icon: "🤷" },
  { id: "dp_cop3", category: "Coppia", label: "La sessualità è cambiata e non ne parliamo", icon: "❤️" },
  { id: "dp_cop4", category: "Coppia", label: "Litighiamo più di prima — su cose che prima non contavano", icon: "⚡" },
  // PRATICO
  { id: "dp_pr1", category: "Pratico", label: "Non so cosa servirà davvero — mi sento impreparato", icon: "📋" },
  { id: "dp_pr2", category: "Pratico", label: "La pressione economica mi toglie il sonno", icon: "💰" },
  { id: "dp_pr3", category: "Pratico", label: "Conciliare lavoro e preparazione sembra impossibile", icon: "💼" },
  { id: "dp_pr4", category: "Pratico", label: "Non so come funziona un neonato — pannolini, poppate, notti", icon: "🍼" },
  // IDENTITÀ
  { id: "dp_id1", category: "Identità", label: "Il modello genitoriale che ho ricevuto era assente o negativo — non voglio ripeterlo", icon: "👤" },
  { id: "dp_id2", category: "Identità", label: "Mi sento sotto pressione: devo essere forte, presente, guadagnare di più", icon: "🏋️" },
  { id: "dp_id3", category: "Identità", label: "I miei amici senza figli non capiscono — mi sento solo in questo", icon: "🚶" },
  { id: "dp_id4", category: "Identità", label: "Ho paura di perdere la mia identità — chi ero prima di tutto questo?", icon: "🪞" },
];

const STRENGTHS_PAPA = [
  // COINVOLGIMENTO
  { id: "sp_1", category: "Coinvolgimento", label: "Partecipo alle ecografie e ai controlli — ci sono", icon: "🏥" },
  { id: "sp_2", category: "Coinvolgimento", label: "Sto frequentando il corso preparto con il mio partner", icon: "📚" },
  { id: "sp_3", category: "Coinvolgimento", label: "Sto preparando la cameretta, il seggiolino, le cose pratiche", icon: "🔨" },
  { id: "sp_4", category: "Coinvolgimento", label: "Leggo, mi informo, cerco di capire cosa succederà", icon: "🔍" },
  // EMOTIVO
  { id: "sp_5", category: "Emotivo", label: "Riesco a parlare delle mie paure — con il mio partner o con qualcuno", icon: "💬" },
  { id: "sp_6", category: "Emotivo", label: "Sento già un legame con il bambino nel pancione", icon: "🫀" },
  { id: "sp_7", category: "Emotivo", label: "So che le mie emozioni contrastanti sono normali", icon: "🌊" },
  { id: "sp_8", category: "Emotivo", label: "Provo una gioia autentica al pensiero di diventare genitore", icon: "💛" },
  // COPPIA
  { id: "sp_9", category: "Coppia", label: "Comunichiamo bene — anche sulle cose difficili", icon: "🗣️" },
  { id: "sp_10", category: "Coppia", label: "Siamo una squadra — decidiamo insieme", icon: "🤝" },
  { id: "sp_11", category: "Coppia", label: "Sto imparando a supportare il mio partner in modi nuovi", icon: "🌱" },
  // PRATICO
  { id: "sp_12", category: "Pratico", label: "Ho una rete di supporto — amici, famiglia, colleghi che aiutano", icon: "🌐" },
  { id: "sp_13", category: "Pratico", label: "Sto organizzando il congedo parentale o flessibilità lavorativa", icon: "📅" },
  { id: "sp_14", category: "Pratico", label: "Ho già individuato il pediatra e le risorse del territorio", icon: "👩‍⚕️" },
];

/* ─── DIFFICOLTÀ + PUNTI DI FORZA — 12-15 ANNI ─── */
const DIFFICULTIES_1215 = [
  // SCUOLA
  { id: "d12_sc1", category: "Scuola", label: "Calo improvviso del rendimento scolastico", icon: "📉" },
  { id: "d12_sc2", category: "Scuola", label: "Ansia da prestazione — paura del voto, del giudizio", icon: "😰" },
  { id: "d12_sc3", category: "Scuola", label: "Rifiuto scolastico / non vuole andare a scuola", icon: "🏠" },
  { id: "d12_sc4", category: "Scuola", label: "Difficoltà di concentrazione — non riesce a studiare", icon: "🌀" },
  { id: "d12_sc5", category: "Scuola", label: "Conflitto con insegnanti — si sente incompreso dalla scuola", icon: "👩‍🏫" },
  // SOCIALE
  { id: "d12_soc1", category: "Sociale", label: "Esclusione dal gruppo / problemi con i compagni", icon: "💔" },
  { id: "d12_soc2", category: "Sociale", label: "Subisce o pratica bullismo (anche online)", icon: "⚡" },
  { id: "d12_soc3", category: "Sociale", label: "Si isola — non vuole vedere nessuno, solo nella sua stanza", icon: "🚪" },
  { id: "d12_soc4", category: "Sociale", label: "Forte pressione del gruppo — fa cose che non vuole per essere accettato", icon: "🔊" },
  // EMOTIVO E CORPO
  { id: "d12_em1", category: "Emotivo", label: "Sbalzi d'umore intensi e frequenti — da 0 a 100 in secondi", icon: "🌩️" },
  { id: "d12_em2", category: "Emotivo", label: "Scatti di rabbia improvvisi — poi si scusa ma non sa perché", icon: "🌪️" },
  { id: "d12_em3", category: "Emotivo", label: "Tristezza persistente / si vede spento/a, senza energia", icon: "🌧️" },
  { id: "d12_em6", category: "Emotivo", label: "Sembra 'in automatico' — niente lo/la accende, risponde 'boh' a tutto", icon: "🫥" },
  { id: "d12_em4", category: "Emotivo", label: "Problemi con l'immagine corporea — non si piace", icon: "🪞" },
  { id: "d12_em5", category: "Emotivo", label: "Ansia somatizzata: mal di testa, pancia prima degli eventi", icon: "🤢" },
  // DIGITALE
  { id: "d12_dg1", category: "Digitale", label: "Usa gli schermi in modo eccessivo o compulsivo", icon: "📱" },
  { id: "d12_dg2", category: "Digitale", label: "Dipendenza da gaming / gioca di notte di nascosto", icon: "🎮" },
  { id: "d12_dg3", category: "Digitale", label: "Già sui social — non so cosa vede e con chi parla", icon: "📲" },
  // FAMIGLIA
  { id: "d12_fam1", category: "Famiglia", label: "Non mi parla più — monosillabi e porte chiuse", icon: "🔒" },
  { id: "d12_fam2", category: "Famiglia", label: "Conflitti intensi con me quasi ogni giorno", icon: "🏡" },
  { id: "d12_fam3", category: "Famiglia", label: "Non so più cosa succede nella sua vita", icon: "❓" },
  // FISICO
  { id: "d12_fis1", category: "Fisico", label: "Dorme troppo o troppo poco — orari capovolti nel weekend", icon: "🌙" },
  { id: "d12_fis2", category: "Fisico", label: "Cambiamenti fisici della pubertà che lo/la turbano", icon: "🌱" },
];

const STRENGTHS_1215 = [
  { id: "s12_1", category: "Intelletto", label: "Curioso/a — fa domande profonde sul mondo e sulla vita", icon: "❓" },
  { id: "s12_2", category: "Intelletto", label: "Ha interessi profondi che lo/la accendono davvero", icon: "🔥" },
  { id: "s12_3", category: "Intelletto", label: "Legge, crea, suona, disegna — esprime se stesso in qualche forma", icon: "🎨" },
  { id: "s12_4", category: "Intelletto", label: "Ragiona già in modo critico — non accetta tutto per scontato", icon: "🧠" },
  { id: "s12_5", category: "Sociale", label: "Ha amicizie significative — veri amici del cuore", icon: "👫" },
  { id: "s12_6", category: "Sociale", label: "Mostra empatia — si preoccupa per gli altri, anche sconosciuti", icon: "💛" },
  { id: "s12_7", category: "Sociale", label: "Senso di giustizia forte — si indigna per l'ingiustizia", icon: "⚖️" },
  { id: "s12_8", category: "Sociale", label: "Sa stare in gruppo — collabora, non solo prende", icon: "🤝" },
  { id: "s12_9", category: "Famiglia", label: "Parla ancora con me — anche se a modo suo, ci siamo", icon: "💬" },
  { id: "s12_10", category: "Famiglia", label: "Mi cerca nei momenti di crisi reale — sa che ci sono", icon: "🤗" },
  { id: "s12_11", category: "Autonomia", label: "Fa sport o attività fisica con costanza e piacere", icon: "⚽" },
  { id: "s12_12", category: "Autonomia", label: "Gestisce zaino, orari e compiti con sempre più autonomia", icon: "⭐" },
  { id: "s12_13", category: "Autonomia", label: "Sa fare le cose di casa — si organizza, non aspetta tutto", icon: "🏠" },
  { id: "s12_14", category: "Emotivo", label: "Umorismo e leggerezza — sa ridere di sé", icon: "😄" },
  { id: "s12_15", category: "Emotivo", label: "Si rialza dopo le difficoltà — ha risorse interne", icon: "💪" },
  { id: "s12_16", category: "Emotivo", label: "Riconosce quando sta male — non nega tutto", icon: "🌊" },
];

/* ─── DIFFICOLTÀ + PUNTI DI FORZA — 15-18 ANNI ─── */
const DIFFICULTIES_1518 = [
  // IDENTITÀ
  { id: "d15_id1", category: "Identità", label: "Confusione su chi è, cosa vuole, cosa lo rende felice", icon: "🪞" },
  { id: "d15_id2", category: "Identità", label: "Bassa autostima — 'non sono abbastanza', si svaluta", icon: "💭" },
  { id: "d15_id3", category: "Identità", label: "Ansia per il futuro — università, lavoro, cosa sarò", icon: "🔮" },
  { id: "d15_id4", category: "Identità", label: "Pressione per la scelta del percorso universitario/lavorativo", icon: "🎓" },
  // RELAZIONI
  { id: "d15_rel1", category: "Relazioni", label: "Delusione amorosa intensa / fine di una storia", icon: "💔" },
  { id: "d15_rel2", category: "Relazioni", label: "Conflitti con gli amici / esclusione dal gruppo", icon: "👥" },
  { id: "d15_rel3", category: "Relazioni", label: "Ritiro sociale crescente — sempre più solo/a", icon: "🚪" },
  { id: "d15_rel4", category: "Relazioni", label: "Relazione romantica che mi preoccupa (dipendenza, tossicità)", icon: "⚠️" },
  // EMOTIVO
  { id: "d15_em1", category: "Emotivo", label: "Umore basso persistente / tristezza che non passa", icon: "🌧️" },
  { id: "d15_em2", category: "Emotivo", label: "Ansia intensa che limita le attività quotidiane", icon: "😰" },
  { id: "d15_em3", category: "Emotivo", label: "Attacchi di panico o crisi di ansia acute", icon: "💥" },
  { id: "d15_em4", category: "Emotivo", label: "Sembra vuoto/a — attraversa le giornate senza slancio, senza interessi", icon: "🫥" },
  // RISCHI
  { id: "d15_r1", category: "Rischi", label: "Sperimentazione con alcol in contesti sociali", icon: "🍺" },
  { id: "d15_r2", category: "Rischi", label: "Sperimentazione o uso di sostanze (cannabis, altro)", icon: "⚠️" },
  { id: "d15_r3", category: "Rischi", label: "Dipendenza da social / gaming / non riesce a staccarsi", icon: "📱" },
  { id: "d15_r4", category: "Rischi", label: "Rapporto difficile con il cibo / preoccupazione per il corpo", icon: "🍽️" },
  // SCUOLA
  { id: "d15_sc1", category: "Scuola", label: "Rendimento in calo / difficoltà scolastiche", icon: "📉" },
  { id: "d15_sc2", category: "Scuola", label: "Motivazione allo studio azzerata — 'non ha senso niente'", icon: "📚" },
  // FAMIGLIA
  { id: "d15_fam1", category: "Famiglia", label: "Distanza totale da me — non mi parla, non mi cerca", icon: "🏠" },
  { id: "d15_fam2", category: "Famiglia", label: "Conflitti intensi e frequenti con me", icon: "🌪️" },
  { id: "d15_fam3", category: "Famiglia", label: "Non so come stargli vicino senza che si chiuda", icon: "🤷" },
  // FISICO
  { id: "d15_fis1", category: "Fisico", label: "Orari capovolti / privazione cronica di sonno", icon: "🌙" },
  { id: "d15_fis2", category: "Fisico", label: "Segnali che mi preoccupano (tagli, automutilazioni)", icon: "🆘" },
];

const STRENGTHS_1518 = [
  { id: "s15_1", category: "Intelletto", label: "Ragiona in modo critico e autonomo — non segue la massa", icon: "🧠" },
  { id: "s15_2", category: "Intelletto", label: "Ha passioni profonde che guidano la sua energia", icon: "🔥" },
  { id: "s15_3", category: "Intelletto", label: "Esprime creatività in modo originale e personale", icon: "🎨" },
  { id: "s15_4", category: "Intelletto", label: "Curiosità intellettuale — cerca, approfondisce, non si accontenta", icon: "🔍" },
  { id: "s15_5", category: "Valori", label: "Ha valori propri — sa distinguere il giusto dallo sbagliato", icon: "⚖️" },
  { id: "s15_6", category: "Valori", label: "Si impegna per qualcosa che conta davvero per lui/lei", icon: "✅" },
  { id: "s15_7", category: "Valori", label: "Coerenza — dice quello che pensa, non si maschera", icon: "🎯" },
  { id: "s15_8", category: "Sociale", label: "Empatia matura — si mette davvero nei panni degli altri", icon: "💛" },
  { id: "s15_9", category: "Sociale", label: "Ha amicizie profonde, leali e durature", icon: "👫" },
  { id: "s15_10", category: "Sociale", label: "Sa stare in relazioni — sa dare e ricevere", icon: "🤝" },
  { id: "s15_11", category: "Autonomia", label: "Sa chiedere aiuto quando ne ha bisogno — senza vergogna", icon: "🙋" },
  { id: "s15_12", category: "Autonomia", label: "Gestisce la sua vita con autonomia crescente (soldi, tempi, spostamenti)", icon: "⭐" },
  { id: "s15_13", category: "Autonomia", label: "Si rialza dopo le cadute — ha risorse interne vere", icon: "💪" },
  { id: "s15_14", category: "Famiglia", label: "Riesce ancora a parlare con me — anche se raramente", icon: "💬" },
  { id: "s15_15", category: "Famiglia", label: "Mi rispetta — anche quando non è d'accordo", icon: "🌿" },
  { id: "s15_16", category: "Identità", label: "Ha un'idea di futuro che lo/la entusiasma davvero", icon: "🌟" },
  { id: "s15_17", category: "Identità", label: "Sa chi è — ha un'identità abbastanza chiara nonostante tutto", icon: "🪞" },
];

/* ─── DIFFICOLTÀ + PUNTI DI FORZA — GENITORI (sezione dedicata) ─── */
const DIFFICULTIES_GENITORI = [
  // BENESSERE
  { id: "gd_b1", category: "Benessere", label: "Sono cronicamente stanca/o — non mi riprendo mai", icon: "🔋" },
  { id: "gd_b2", category: "Benessere", label: "Senso di colpa frequente — 'non sono un buon genitore'", icon: "💭" },
  { id: "gd_b3", category: "Benessere", label: "Ansia costante per i figli — non riesco a staccare la testa", icon: "😰" },
  { id: "gd_b4", category: "Benessere", label: "Perdo la pazienza spesso e poi mi sento in colpa", icon: "🌪️" },
  { id: "gd_b5", category: "Benessere", label: "Mi sento solo/a in questo — nessuno capisce davvero", icon: "🚪" },
  { id: "gd_b6", category: "Benessere", label: "Sento di essere al limite — burnout genitoriale", icon: "💥" },
  { id: "gd_b7", category: "Benessere", label: "Non dormo abbastanza da mesi — sono esaurito/a", icon: "🌙" },
  // IDENTITÀ
  { id: "gd_id1", category: "Identità", label: "Ho perso me stessa/o — sono solo mamma/papà, mai persona", icon: "🪞" },
  { id: "gd_id2", category: "Identità", label: "Non ho più tempo per me — hobby, amici, interessi personali", icon: "⏰" },
  { id: "gd_id3", category: "Identità", label: "Difficoltà a conciliare lavoro e genitorialità", icon: "💼" },
  // COPPIA
  { id: "gd_cop1", category: "Coppia", label: "La coppia è in difficoltà da quando sono arrivati i figli", icon: "👫" },
  { id: "gd_cop2", category: "Coppia", label: "Stili genitoriali diversi — non riusciamo a coordinarci", icon: "🗣️" },
  { id: "gd_cop3", category: "Coppia", label: "Mi sento sola/o nel carico — tutto su di me", icon: "⚖️" },
  // RELAZIONE CON I FIGLI
  { id: "gd_rel1", category: "Relazione", label: "Non riesco a connettermi con mio figlio/a — mi rifiuta", icon: "💔" },
  { id: "gd_rel2", category: "Relazione", label: "Difficoltà a mettere limiti senza sentirmi in colpa", icon: "🚧" },
  { id: "gd_rel3", category: "Relazione", label: "Perdo il controllo più spesso di quanto vorrei", icon: "🌪️" },
  { id: "gd_rel4", category: "Relazione", label: "Mi confronto continuamente con altri genitori — mi sento inadeguata/o", icon: "⚖️" },
  // PAURE
  { id: "gd_p1", category: "Paure", label: "Ho paura di sbagliare qualcosa di irreparabile", icon: "😱" },
  { id: "gd_p2", category: "Paure", label: "Mi preoccupo moltissimo per il futuro di mio figlio/a", icon: "🔮" },
  { id: "gd_p3", category: "Paure", label: "Temo di star trasmettendo le mie ansie ai miei figli", icon: "🔄" },
];

const STRENGTHS_GENITORI = [
  { id: "gs_1", category: "Presenza", label: "Sono presente — ci sono, anche nei momenti difficili", icon: "🤗" },
  { id: "gs_2", category: "Presenza", label: "So ascoltare davvero — senza giudicare e senza interrompere", icon: "👂" },
  { id: "gs_3", category: "Presenza", label: "Dopo i conflitti, so come riparare — ci provo sempre", icon: "🔄" },
  { id: "gs_4", category: "Presenza", label: "Mio figlio/a sa che lo/la amo — glielo dico e lo dimostro", icon: "❤️" },
  { id: "gs_5", category: "Connessione", label: "Mi interesso ai suoi interessi — anche quando non li capisco", icon: "🔍" },
  { id: "gs_6", category: "Connessione", label: "Riesco a giocare, ridere, stare leggero/a con lui/lei", icon: "😄" },
  { id: "gs_7", category: "Connessione", label: "Conosco i suoi amici, le sue passioni, il suo mondo", icon: "🌐" },
  { id: "gs_8", category: "Struttura", label: "Riesco a mettere limiti con calore — no senza urla", icon: "🌿" },
  { id: "gs_9", category: "Struttura", label: "Offro routine e prevedibilità — la vita è organizzata", icon: "📅" },
  { id: "gs_10", category: "Struttura", label: "Sono coerente — dico quello che faccio e faccio quello che dico", icon: "✅" },
  { id: "gs_11", category: "Struttura", label: "Nego cose sbagliate senza cedere alla pressione", icon: "🎯" },
  { id: "gs_12", category: "Autocura", label: "Mi prendo cura di me — ho spazi miei, non sono solo genitore", icon: "🌸" },
  { id: "gs_13", category: "Autocura", label: "So chiedere aiuto — al partner, alla famiglia, ai professionisti", icon: "🙋" },
  { id: "gs_14", category: "Autocura", label: "Rifletto su come mi comporto — cerco di migliorare", icon: "🪞" },
  { id: "gs_14b", category: "Autocura", label: "Riconosco quando le mie reazioni verso mio figlio/a vengono dalla mia storia, non dalla situazione presente", icon: "👣" },
  { id: "gs_15", category: "Risorse", label: "Ho una rete di supporto — non affronto tutto da solo/a", icon: "🤝" },
  { id: "gs_16", category: "Risorse", label: "Il mio partner e io siamo una squadra coesa", icon: "👫" },
  { id: "gs_17", category: "Risorse", label: "Ho già cercato supporto professionale — lo considero un atto di forza", icon: "⭐" },
];

/* ─── QUOTES DATABASE ─── */

/* ═══════════════════════════════════════════════════
   ZONA 3-6 ANNI — Dati sviluppo
═══════════════════════════════════════════════════ */
const AGE_PHASES_3_6 = [
  { label: "Il Piccolo Re", range: "3-4 anni", key: "3-4", color: COLORS.violetLight, icon: "👑" },
  { label: "Il Perché", range: "4-5 anni", key: "4-5", color: COLORS.amberLight, icon: "🔍" },
  { label: "Pronto per la Scuola", range: "5-6 anni", key: "5-6", color: COLORS.mintLight, icon: "🎒" },
];

const DEVELOPMENT_DATA_3_6 = {
  "3-4": {
    brain: "La [[corteccia prefrontale]] cresce a ritmo sostenuto: il bambino inizia a frenare i comportamenti impulsivi — non ancora bene, ma ci prova. I [[neuroni specchio]] permettono di capire le intenzioni altrui prima ancora che vengano espresse. È l\'età in cui emerge la capacità di capire che gli altri hanno pensieri diversi dai propri — i ricercatori la chiamano [[teoria della mente|teoria della mente]].",
    attachment: "Il bambino di 3-4 anni ha bisogno di una [[base sicura]] da cui partire e di un porto sicuro in cui tornare. La scuola materna è la prima grande separazione: la sofferenza all\'ingresso non è un problema da risolvere, è un segnale sano di legame. Il bambino che piange al distacco spesso si calma in pochi minuti e gioca serenamente — perché porta con sé l\'immagine interna del genitore come punto di sicurezza. Un congedo breve, caldo e deciso funziona meglio di uno prolungato: l\'incertezza del genitore si trasmette al bambino.",
    emozioni: "A tre anni il bambino ha un vocabolario emotivo nascente: sa dire \'felice\', \'triste\', \'arrabbiato\', \'spaventato\'. Ma riconoscere un\'emozione e gestirla sono capacità distinte — la seconda arriverà molto più tardi. È l\'età delle grandi paure: del buio, dei mostri, degli estranei. Non sono irrazionali: sono il modo in cui il sistema nervoso elabora la consapevolezza del pericolo. Liquidarle (\'non c\'è niente\') non aiuta; accoglierle (\'capisco che hai paura, sono qui\') insegna che le emozioni difficili si attraversano insieme. Può emergere anche la gelosia — spesso intensa all\'arrivo di un fratellino — che è una forma di attaccamento, non di cattiveria.",
    winnicott: "Freud chiamava questa fase edipica — il momento in cui il bambino si avvicina emotivamente al genitore del sesso opposto e inizia a fantasticare sulla struttura dei legami familiari. [[Winnicott]] la rileggeva in modo più morbido: spogliata dei toni drammatici, è semplicemente la storia che il bambino si racconta per capire come funzionano i legami — chi ama chi, chi appartiene a chi. Non è una patologia — è curiosità emotiva in forma narrativa. Non drammatizzarla né reprimerla: accoglierla con serenità. Il bambino che può esplorare queste fantasie in un ambiente sicuro impara che i sentimenti complessi si possono pensare, non solo subire.",
    behavior: "Fa mille domande: \'Perché?\' è la sua parola preferita. Racconta storie mescolando realtà e fantasia senza distinzione. Le bugie a questa età sono fantasia creativa, non disonestà morale. I capricci nei posti pubblici sono normali: è sopraffatto dagli stimoli.",
    tips: [
      "Rispondi alle domande \'perché\' con onestà e semplicità — non devi sapere tutto.",
      "Le bugie creative a questa età non vanno punite — vanno capite.",
      "Prima di uscire, prepara il bambino a quello che succederà.",
      "Quando fa i capricci, stai calmo: la tua calma è il suo termostato emotivo.",
      "Il gioco con gli altri bambini è la palestra delle competenze sociali più importante che esiste."
    ]
  },
  "4-5": {
    brain: "I [[neuroni specchio]] permettono al bambino di immaginare cosa sente un altro. La [[corteccia prefrontale]] matura: crescono la capacità di aspettare, di seguire regole semplici, di ricordare sequenze. Il linguaggio diventa sempre più ricco — e con esso la capacità di elaborare le emozioni attraverso le parole.",
    attachment: "La qualità del legame con i genitori influenza — non determina in modo assoluto, ma influenza in modo misurabile — la facilità con cui il bambino entrerà nelle relazioni con i pari. Un bambino con un [[attaccamento sicuro]] non teme di perdere il genitore amando anche gli amici: sa che l\'amore non è una risorsa finita. In questa fase il bambino costruisce le prime amicizie vere, basate sulla scelta reciproca e sulla confidenza. Queste amicizie sono un laboratorio emotivo prezioso — e la qualità del legame familiare è spesso il fondamento su cui si costruiscono.",
    emozioni: "Il bambino di quattro anni è capace di empatia rudimentale: si commuove se un compagno piange, cerca di consolarlo. I [[neuroni specchio]] fanno il loro lavoro. Ha ancora però difficoltà a distinguere la propria prospettiva emotiva da quella altrui — presuppone che gli altri sentano quello che sente lui. Le \'bugie\' di questa età sono spesso distorsioni emotive, non inganni: il bambino racconta come vorrebbe che fosse andata, non come è andata. Crescono le emozioni morali: vergogna e orgoglio si intensificano. È importante distinguere il senso di colpa sano — \'ho fatto una cosa sbagliata\' — da quello che si attacca all\'identità: \'sono sbagliato io\'. Il modo in cui il genitore risponde agli errori del bambino plasma attivamente questa distinzione.",
    winnicott: "A 4-5 anni il bambino inizia a scoprire che il genitore è una persona con i propri limiti — che può sbagliare, che non sa tutto, che a volte è stanco. [[Winnicott]] chiamava questo processo \'disillusione ottimale\': la caduta dell\'immagine del genitore onnipotente non è una perdita traumatica, è un passo necessario verso l\'autonomia. Un genitore che riconosce i propri limiti con naturalezza (\'non lo so, scopriamolo insieme\'; \'oggi sono stanca, dammi un po\' di spazio\') non indebolisce il legame: insegna al bambino che le persone imperfette si possono amare lo stesso. È una lezione che durerà tutta la vita.",
    behavior: "Gioca con gli altri in modo più cooperativo. Ha un migliore amico. Capisce la differenza tra fare una cosa apposta e per sbaglio. Inizia a provare vergogna e senso di colpa — sono segnali di sviluppo morale, non di insicurezza.",
    tips: [
      "Insegna con l\'esempio, non solo con le parole.",
      "La vergogna è sana se proporzionata; diventa dannosa se usata come strumento di controllo.",
      "Giochi di regole semplici (tombola, memory) allenano la [[corteccia prefrontale|capacità di autocontrollo]].",
      "Riconosci quando sbaglia senza umiliarlo: \'Hai sbagliato, si sistema così.\'",
      "Leggi storie con protagonisti che affrontano paure — è il suo modo di elaborarle."
    ]
  },
  "5-6": {
    brain: "Le connessioni tra i due emisferi cerebrali si rafforzano: il bambino integra meglio logica ed emozione. La memoria di lavoro cresce: può seguire istruzioni in più passaggi. La [[mielinizzazione]] delle fibre nervose continua: i movimenti diventano più precisi. Il cervello è pronto per l\'apprendimento formale — ma ha ancora bisogno di muoversi per imparare.",
    attachment: "Con l\'ingresso alla scuola primaria il bambino costruisce una rete di legami più ampia: insegnanti, compagni, figure adulte di riferimento al di fuori della famiglia. Il genitore resta il punto di riferimento principale ma non è più l\'unico — e questo non è un indebolimento del legame, è la sua evoluzione naturale e sana. La teoria dell\'attaccamento ci dice che il bambino può costruire legami sicuri secondari senza che questi diluiscano il legame primario. Un genitore che sa \'lasciarsi lasciare\' — senza che la propria tristezza o ansia pesino sul bambino — gli consente di investire pienamente nei nuovi legami.",
    emozioni: "A cinque-sei anni il bambino inizia a modulare le emozioni in contesti sociali: sa contenere la gioia in un momento formale, sa non mostrare la delusione. Questa è competenza emotiva reale — va riconosciuta. Emerge anche la capacità di sentire emozioni ambivalenti: il bambino capisce che si può voler bene a qualcuno e arrabbiarsi con lui allo stesso tempo — una scoperta che può destabilizzare. La gamma delle paure si modifica: diminuiscono quelle immaginarie, crescono quelle reali (la morte, la malattia). Non liquidarle: sono il segnale di un pensiero che si sta espandendo, e meritano una risposta vera.",
    winnicott: "Il bambino sta imparando a stare nel mondo senza di te — a scuola, nel gioco con i pari, in situazioni nuove. [[Winnicott]] descriveva questa come la capacità di \'stare soli in presenza di qualcuno\': il bambino può giocare autonomamente, assorto, sapendo che sei lì anche se non parla con te. Questo momento richiede che tu sappia lasciarti lasciare — senza che la tua tristezza o ansia per il distacco diventino un peso per lui. Un genitore che saluta con leggerezza e mostra piacere nel ritrovarsi trasmette il messaggio che la separazione è sicura e il ritorno è certo. Il bambino non ha bisogno che tu nasconda la nostalgia — ha bisogno di sentire che la sopporti.",
    behavior: "Sa leggere le emozioni degli altri e modulare le proprie, almeno in parte. Ha un senso di giustizia molto sviluppato. Sa perdere, con fatica. Sa aspettare il suo turno, quasi sempre.",
    tips: [
      "Parla delle emozioni come fatti normali: \'Anche i grandi si arrabbiano, anche i grandi hanno paura.\'",
      "Non fare i compiti al posto suo — stai vicino mentre li fa.",
      "Celebra l\'impegno, non solo il risultato: \'Hai provato tanto, sono fiero di te.\'",
      "Se litiga con un amico, aiutalo a trovare le parole per riparare — non risolvere tu.",
      "Senza dormire abbastanza, la [[corteccia prefrontale|capacità di concentrarsi]] crolla — il sonno è priorità."
    ]
  }
};


/* ═══ SOTTOFASE 3-4 ANNI — Difficoltà ═══ */
const DIFF_3_6_34 = [
  { id: "d34_c1", category: "Comportamento", label: "Crisi di rabbia esplosive e frequenti — il corpo domina la mente", icon: "🌪️" },
  { id: "d34_c2", category: "Comportamento", label: "'No!' a tutto — oppositività come affermazione di sé", icon: "🚫" },
  { id: "d34_c3", category: "Comportamento", label: "Aggressività fisica con i coetanei — morde, spinge, colpisce", icon: "⚡" },
  { id: "d34_sep1", category: "Separazione", label: "Pianto intenso all'ingresso della scuola materna", icon: "💔" },
  { id: "d34_sep2", category: "Separazione", label: "Somatizza l'ansia prima della separazione — mal di pancia, nausea", icon: "🤢" },
  { id: "d34_s1", category: "Sonno", label: "Paure notturne improvvise — mostri, buio, ombre", icon: "👻" },
  { id: "d34_s2", category: "Sonno", label: "Entra nel letto dei genitori ogni notte", icon: "🛏️" },
  { id: "d34_sv1", category: "Sviluppo", label: "Difficoltà nel linguaggio — pronuncia poco chiara, frasi brevi", icon: "🗣️" },
  { id: "d34_sv2", category: "Sviluppo", label: "Gelosia intensa del fratellino/sorellina — regressioni visibili", icon: "👶" },
  { id: "d34_a1", category: "Alimentazione", label: "Rifiuta tutto ciò che è nuovo — neofobia alimentare marcata", icon: "🥦" },
  { id: "d34_d1", category: "Digitale", label: "Crisi violente allo spegnimento dello schermo", icon: "📱" },
  { id: "d34_g1", category: "Genitore", label: "Mi spaventa la mia rabbia — a volte alzo la voce e mi vergogno", icon: "🔥" },
];
/* ═══ SOTTOFASE 4-5 ANNI — Difficoltà ═══ */
const DIFF_3_6_45 = [
  { id: "d45_c1", category: "Comportamento", label: "Bugie frequenti — nega l'evidenza con convinzione", icon: "🤥" },
  { id: "d45_c2", category: "Comportamento", label: "Rituali rigidi — deve essere tutto sempre uguale, altrimenti crisi", icon: "🔁" },
  { id: "d45_c3", category: "Comportamento", label: "Capricci in pubblico — supermercato, ristorante, feste", icon: "😤" },
  { id: "d45_soc1", category: "Sociale", label: "Preferisce gli adulti ai coetanei — fatica nel gioco di gruppo", icon: "👥" },
  { id: "d45_soc2", category: "Sociale", label: "Conflitti frequenti con i compagni — non sa ancora negoziare", icon: "⚡" },
  { id: "d45_s1", category: "Sonno", label: "Incubi ricorrenti che disturbano il sonno di tutta la famiglia", icon: "👻" },
  { id: "d45_s2", category: "Sonno", label: "Si addormenta solo con un genitore sdraiato accanto", icon: "🌙" },
  { id: "d45_sv1", category: "Sviluppo", label: "Enuresi notturna persistente — pipì a letto oltre i 5 anni", icon: "🚽" },
  { id: "d45_sv2", category: "Sviluppo", label: "Iperattività marcata — non sta fermo, non si concentra", icon: "🌀" },
  { id: "d45_sv3", category: "Sviluppo", label: "Paure specifiche intense — animali, temporali, rumori forti", icon: "😱" },
  { id: "d45_a1", category: "Alimentazione", label: "Rituali rigidi a tavola — stesse posate, stesso piatto, stesse cose", icon: "🍽️" },
  { id: "d45_g1", category: "Genitore", label: "Non so più come gestirlo/a — ogni strategia sembra fallire", icon: "🔋" },
];
/* ═══ SOTTOFASE 5-6 ANNI — Difficoltà ═══ */
const DIFF_3_6_56 = [
  { id: "d56_sep1", category: "Separazione", label: "Ansia per il passaggio alla scuola primaria — paura del nuovo", icon: "🏫" },
  { id: "d56_sep2", category: "Separazione", label: "Non vuole staccarsi dal genitore nemmeno per le feste di amici", icon: "💔" },
  { id: "d56_c1", category: "Comportamento", label: "Sfida l'autorità — testa i limiti in modo provocatorio", icon: "🚫" },
  { id: "d56_c2", category: "Comportamento", label: "Capricci intensi quando perde un gioco — non tollera la sconfitta", icon: "🌪️" },
  { id: "d56_sv1", category: "Sviluppo", label: "Difficoltà di concentrazione — non riesce a stare seduto e attento", icon: "🌀" },
  { id: "d56_sv2", category: "Sviluppo", label: "Non sembra pronto per la scuola — motricità fine o linguaggio in ritardo", icon: "✏️" },
  { id: "d56_sv3", category: "Sviluppo", label: "Gelosia persistente verso fratelli/sorelle — regressioni frequenti", icon: "👶" },
  { id: "d56_em1", category: "Emotivo", label: "Ansia da prestazione precoce — vuole essere perfetto", icon: "😰" },
  { id: "d56_em2", category: "Emotivo", label: "Paure che non passano — buio, morte, separazione", icon: "😱" },
  { id: "d56_a1", category: "Alimentazione", label: "Selettività alimentare rigida — il pasto è uno scontro quotidiano", icon: "🥦" },
  { id: "d56_d1", category: "Digitale", label: "Dipendenza da tablet — diventa il rifugio unico", icon: "📱" },
  { id: "d56_g1", category: "Genitore", label: "Mi sento inadeguato/a — non so se lo sto preparando abbastanza", icon: "💭" },
];
const DIFFICULTIES_3_6 = [...DIFF_3_6_34, ...DIFF_3_6_45, ...DIFF_3_6_56];

/* ═══════════════════════════════════════════════════
   ZONA 6-12 ANNI — Dati sviluppo
═══════════════════════════════════════════════════ */
const AGE_PHASES_6_12 = [
  { label: "Il Piccolo Scolaro", range: "6-8 anni", key: "6-8", color: COLORS.skyLight, icon: "📚" },
  { label: "L'Esploratore Sociale", range: "8-10 anni", key: "8-10", color: COLORS.limeLight, icon: "🧭" },
  { label: "La Soglia", range: "10-12 anni", key: "10-12", color: COLORS.roseLight, icon: "🌅" },
];

const DEVELOPMENT_DATA_6_12 = {
  "6-8": {
    brain: "Tra i 6 e gli 8 anni il cervello entra in una fase di grande ordine: i circuiti si stabilizzano, la [[mielinizzazione]] avanza, la [[corteccia prefrontale]] matura abbastanza da permettere pianificazione e autocontrollo reali. È l\'età in cui il bambino inizia a costruire un sistema morale interno — non solo per paura della punizione, ma per un senso reale di giustizia.",
    attachment: "Le amicizie diventano centrali nella vita del bambino. Il bisogno di appartenenza al gruppo cresce e diventa un motore potente della vita quotidiana. Il genitore resta fondamentale, ma il suo ruolo cambia: non è più colui che risolve i conflitti, ma colui che aiuta il bambino a trovare le parole per navigarli. Non servono soluzioni — serve uno spazio in cui il bambino possa raccontare cosa è successo senza sentirsi giudicato.",
    emozioni: "Tra i sei e gli otto anni il bambino acquisisce una competenza emotiva importante: riesce a riconoscere un\'emozione, darle un nome e — almeno in parte — scegliere come rispondervi. Le emozioni sociali diventano centrali: vergogna e orgoglio dipendono sempre più dal confronto con il gruppo. Il bisogno di essere accettato dai pari non è superficiale — è biologico: Eisenberger (2003) ha mostrato che l\'esclusione sociale attiva le stesse aree cerebrali del dolore fisico. Un bambino escluso non \'esagera\'. Emerge anche una vita interiore: il bambino tace alcune cose non per ingannare, ma perché sta imparando che le emozioni non si condividono sempre con tutti. Rispettare questa riservatezza costruisce fiducia a lungo termine.",
    winnicott: "Il bambino inizia a tenere una vita interiore separata da quella familiare: ha segreti, pensieri che non condivide, parti di sé che custodisce. Secondo [[Winnicott]], questa capacità di avere un \'sé privato\' è un segnale di salute psicologica — non di allontanamento. Rispettare questa privacy non è rinunciare a conoscere il figlio: è riconoscere che ha il diritto di avere un dentro. Il bambino che sa che la sua interiorità verrà rispettata è più propenso a condividere le cose importanti quando ne avrà davvero bisogno.",
    behavior: "Apprende velocemente quando è motivato. Ha interessi precisi. Sa fare ragionamenti logici su cose concrete. Fa fatica con l\'astrazione pura. Il corpo è ancora il suo strumento di apprendimento principale.",
    tips: [
      "Interessati ai suoi interessi — anche se ti sembrano futili.",
      "Non paragonarlo ai compagni: ogni bambino ha i suoi ritmi e i suoi punti di forza.",
      "Stabilisci regole chiare sugli schermi — e rispettale anche tu.",
      "Se va male a scuola, cerca prima la causa: difficoltà di apprendimento? Problemi relazionali? Stanchezza?",
      "Il movimento fisico non è tempo perso: il cervello impara meglio dopo aver mosso il corpo."
    ]
  },
  "8-10": {
    brain: "Le [[funzioni esecutive]] — pianificazione, memoria di lavoro, flessibilità mentale — crescono in modo significativo. In questa fase si consolida il circuito tra il centro delle emozioni intense ([[amigdala]]) e quello del controllo ([[corteccia prefrontale]]): il bambino impara a riconoscere le proprie emozioni prima di agire. Cresce anche la capacità di capire come impara meglio — i ricercatori la chiamano metacognizione.",
    attachment: "Il genitore resta fondamentale, ma in modo diverso: non come protezione fisica, ma come riferimento emotivo e punto di ritorno. Il bambino ha bisogno di sapere che ci sei — non di averti sempre presente. È la distinzione tra presenza continua e disponibilità affidabile: la seconda costruisce autonomia, la prima la ostacola. Il bambino inizia a scegliere quando avvicinarsi — spesso alla sera, durante un\'attività condivisa, in modo imprevedibile. Essere disponibile in quei momenti senza programmarli è la forma più efficace di vicinanza.",
    emozioni: "Il bambino riesce più spesso a fermarsi un istante prima di reagire — e questo cambia tutto: per la prima volta può scegliere come rispondere a quello che sente, non solo subirlo. Cresce la metacognizione emotiva — la capacità di osservare i propri stati d\'animo dall\'esterno, di chiedersi \'perché mi sento così?\'. Il bambino impara anche a mascherare: sa fingere di stare bene quando non sta bene. I segnali da osservare non sono quindi le dichiarazioni, ma i cambiamenti nel comportamento. L\'autostima inizia a dipendere in modo significativo dal rendimento scolastico e dal giudizio dei pari — e con essa le prime domande identitarie: \'sono bravo?\', \'piaccio?\', \'dove mi colloco?\'.",
    winnicott: "Il bambino a questa età ha bisogno di un genitore che sappia stare \'a distanza ravvicinata\' — abbastanza lontano da non soffocare, abbastanza vicino da intervenire se cade. [[Winnicott]] avrebbe riconosciuto in questa postura la continuazione del \'tenere\' originario: non più fisico, ma emotivo. Il genitore che resiste all\'impulso di intervenire a ogni difficoltà permette al figlio di sviluppare la tolleranza alla frustrazione — una delle competenze più preziose per la vita adulta. Essere disponibile senza essere intrusivo è una delle forme di presenza più difficili e più utili.",
    behavior: "Ragiona su problemi complessi e ama le sfide intellettuali quando è motivato. Ha un senso dell\'umorismo sviluppato — l\'ironia e il sarcasmo compaiono come strumenti relazionali. I segnali di disagio diventano più sottili: cambiamenti nel sonno, nell\'appetito, nel rendimento scolastico o nel ritiro sociale dicono più delle parole. Le prime domande sull\'identità iniziano qui: \'chi sono?\', \'dove mi colloco?\', \'sono abbastanza?\'.",
    tips: [
      "Valorizza l\'impegno e il processo, non solo il risultato: è la base del [[mindset di crescita]].",
      "Se mostra interesse per qualcosa, alimentalo — anche se non diventerà un campione.",
      "Parla di errori e fallimenti come parte normale della vita, non come vergogna.",
      "Insegnagli a chiedere aiuto: è una competenza, non una debolezza.",
      "Le conversazioni più importanti avvengono in macchina o mentre fate qualcosa insieme — non faccia a faccia."
    ]
  },
  "10-12": {
    brain: "Inizia la pubertà: un'ondata di [[ormoni]] rimodella il cervello da cima a fondo. Il centro delle emozioni intense ([[amigdala]]) si attiva con forza. La [[corteccia prefrontale]] non riesce ancora a stare al passo. Il risultato è che il ragazzo sente le emozioni con intensità massima ma non ha ancora gli strumenti per regolarle. Non è instabilità caratteriale — è biologia.",
    attachment: "Il distacco dai genitori che inizia in questa fase è biologicamente programmato: fa parte dello stesso processo evolutivo che porta il cucciolo umano verso l\'autonomia. Può fare male a entrambi — ed è normale che faccia male. Ma un ragazzo che si allontana sapendo che ci sei è un ragazzo sano, non uno che ti vuole meno bene. [[Bowlby]] chiamava questo processo \'esplorazione dalla base sicura\': il distacco è possibile perché il legame regge. La tua presenza discreta, non invadente, è ciò che rende il distacco tollerabile — per lui e per te.",
    emozioni: "Con l\'inizio della pubertà il paesaggio emotivo si trasforma: le emozioni si sentono a volume massimo, e il corpo stesso diventa fonte di disorientamento. Le reazioni possono sembrare sproporzionate dall\'esterno — dall\'interno, sono assolutamente reali. Gli sbalzi d\'umore improvvisi sono fisiologicamente normali — non segnali di instabilità caratteriale. Cresce la sensibilità al giudizio del gruppo: un commento critico di un pari può avere un impatto sproporzionato rispetto a quanto appare. Non minimizzare. È anche la fase in cui possono comparire le prime forme di ansia e umore basso — segnali da tenere d\'occhio con attenzione, non da aspettare che passino da soli.",
    winnicott: "Il corpo che cambia con la pubertà genera un disorientamento reale: il ragazzo non riconosce più se stesso, né fisicamente né emotivamente. [[Winnicott]] avrebbe descritto questo come una crisi dell\'immagine di sé — un momento in cui l\'identità deve essere in qualche modo ricostruita. Accogliere questo disorientamento senza minimizzarlo — \'capisco che è strano sentirti così diverso\' — è più utile di qualsiasi rassicurazione affrettata. Le rassicurazioni premature chiudono il dialogo; il riconoscimento aperto lo mantiene vivo. Il ragazzo che sa che il suo disorientamento è normale, che ha parole per dargli un nome, lo attraversa con meno angoscia.",
    behavior: "Sbalzi di umore improvvisi e intensi — normali. Bisogno di privacy crescente. Interesse per i pari che supera quello per la famiglia. Prime domande sull\'identità, sul futuro, sul senso delle cose.",
    tips: [
      "Non prendere il distacco come un rifiuto personale — è sviluppo.",
      "Mantieni le cene insieme: sono il momento di connessione più semplice e potente che hai.",
      "Non spiare — ma fai sapere che sai ascoltare.",
      "Parla di corpo e identità in modo normale, non come \'la grande conversazione\'.",
      "Se senti che qualcosa non va, di\' quello che vedi senza accusare: \'Ti vedo stanco ultimamente — tutto bene?\'"
    ]
  }
};


/* ═══ SOTTOFASE 6-8 ANNI — Difficoltà ═══ */
const DIFF_6_12_68 = [
  { id: "d68_sc1", category: "Scuola", label: "Difficoltà persistenti nella lettura o nella scrittura", icon: "📖" },
  { id: "d68_sc2", category: "Scuola", label: "Fatica con i numeri e il ragionamento matematico", icon: "🔢" },
  { id: "d68_sc3", category: "Scuola", label: "Difficoltà con i compiti a casa — conflitti quotidiani", icon: "📚" },
  { id: "d68_sc4", category: "Scuola", label: "Non vuole andare a scuola — resistenza mattutina", icon: "🏠" },
  { id: "d68_sc5", category: "Scuola", label: "Rapporto difficile con un insegnante specifico", icon: "👩‍🏫" },
  { id: "d68_soc1", category: "Sociale", label: "Fatica a farsi accettare dal gruppo — viene escluso/a", icon: "💔" },
  { id: "d68_soc2", category: "Sociale", label: "Aggressività fisica o verbale con i compagni", icon: "⚡" },
  { id: "d68_em1", category: "Emotivo", label: "Scatti di rabbia che sembrano sproporzionati alla situazione", icon: "🌪️" },
  { id: "d68_em2", category: "Emotivo", label: "Ansie e preoccupazioni che non lo lasciano in pace", icon: "😰" },
  { id: "d68_em3", category: "Emotivo", label: "Mal di pancia o mal di testa ricorrenti senza causa medica", icon: "🤢" },
  { id: "d68_dg1", category: "Digitale", label: "Non riesce a staccarsi dagli schermi senza una crisi", icon: "📱" },
  { id: "d68_fam1", category: "Famiglia", label: "Conflitti intensi con me alle regole e ai limiti", icon: "🏠" },
];
/* ═══ SOTTOFASE 8-10 ANNI — Difficoltà ═══ */
const DIFF_6_12_810 = [
  { id: "d810_sc1", category: "Scuola", label: "Difficoltà a mantenere l'attenzione e organizzare il lavoro", icon: "🌀" },
  { id: "d810_sc2", category: "Scuola", label: "Ansia da prestazione — paura di sbagliare, blocco al compito", icon: "😰" },
  { id: "d810_sc3", category: "Scuola", label: "Rendimento altalenante — va bene un giorno, male il giorno dopo", icon: "📉" },
  { id: "d810_sc4", category: "Scuola", label: "Rifiuto scolastico — mal di pancia ogni mattina", icon: "🏠" },
  { id: "d810_soc1", category: "Sociale", label: "Difficoltà a mantenere amicizie stabili nel tempo", icon: "👥" },
  { id: "d810_soc2", category: "Sociale", label: "Subisce dinamiche di esclusione o prevaricazione", icon: "💔" },
  { id: "d810_soc3", category: "Sociale", label: "Forte pressione dai pari — fa cose che non vuole per stare nel gruppo", icon: "🔊" },
  { id: "d810_em1", category: "Emotivo", label: "Bassa autostima — 'sono stupido/a', 'non valgo niente'", icon: "💭" },
  { id: "d810_em2", category: "Emotivo", label: "Umore basso, tristezza persistente, perdita di interesse", icon: "🌧️" },
  { id: "d810_em3", category: "Emotivo", label: "Inizia a mascherare le emozioni — dice 'sto bene' ma non è vero", icon: "🎭" },
  { id: "d810_dg1", category: "Digitale", label: "Dipendenza da gaming — non riesce a smettere di giocare", icon: "🎮" },
  { id: "d810_fam1", category: "Famiglia", label: "Non so come motivarlo/a senza pressione e senza conflitto", icon: "🤷" },
];
/* ═══ SOTTOFASE 10-12 ANNI — Difficoltà ═══ */
const DIFF_6_12_1012 = [
  { id: "d1012_sc1", category: "Scuola", label: "Calo di motivazione — 'a che serve?' davanti allo studio", icon: "📉" },
  { id: "d1012_sc2", category: "Scuola", label: "Difficoltà organizzative che emergono col carico scolastico crescente", icon: "🌀" },
  { id: "d1012_sc3", category: "Scuola", label: "Ansia intensa per i compiti in classe e le interrogazioni", icon: "😰" },
  { id: "d1012_soc1", category: "Sociale", label: "Bullismo subito o praticato — anche in forma verbale e digitale", icon: "⚡" },
  { id: "d1012_soc2", category: "Sociale", label: "Si isola — preferisce stare solo/a rispetto al gruppo", icon: "🚪" },
  { id: "d1012_em1", category: "Emotivo", label: "Sbalzi di umore intensi legati ai primi cambiamenti puberali", icon: "🌩️" },
  { id: "d1012_em2", category: "Emotivo", label: "Preoccupazione per l'aspetto fisico — si confronta con i pari", icon: "🪞" },
  { id: "d1012_em3", category: "Emotivo", label: "Difficoltà ad accettare i cambiamenti del corpo (pubertà precoce)", icon: "🌱" },
  { id: "d1012_em4", category: "Emotivo", label: "Ansie e preoccupazioni eccessive — catastrofizza", icon: "😰" },
  { id: "d1012_dg1", category: "Digitale", label: "Gaming compulsivo — gioca fino a tardi, mente sulle ore", icon: "🎮" },
  { id: "d1012_dg2", category: "Digitale", label: "Già sui social nonostante l'età — non so cosa vede", icon: "📱" },
  { id: "d1012_fam1", category: "Famiglia", label: "Inizia a chiudersi — non mi parla più come prima", icon: "🔒" },
  { id: "d1012_fam2", category: "Famiglia", label: "Non so come stargli vicino senza invaderlo", icon: "🤷" },
];
const DIFFICULTIES_6_12 = [...DIFF_6_12_68, ...DIFF_6_12_810, ...DIFF_6_12_1012];


const SCREENS_DATA = {
  "0-3": {
    title: "📵 Schermi & Bambini 0–3 anni",
    bigStats: [
      { num: "0", unit: "min", label: "schermo consigliati sotto i 18 mesi", sub: "AAP 2016 · WHO 2019 (eccetto videochiamate)", color: "#FF6B6B", emoji: "🚫",
        note: "L'AAP (2016) e l'OMS (2019) raccomandano zero schermo sotto i 18 mesi, ad eccezione delle videochiamate con familiari." },
      { num: "6×", unit: "volte", label: "più probabile il ritardo linguistico con 2+ ore/giorno prima dei 12 mesi", sub: "Chonchaiya & Pruksananonda, Acta Paediatrica 2008", color: "#FF9A3C", emoji: "🗣️",
        note: "Studio osservazionale su 1008 bambini (Chonchaiya & Pruksananonda, 2008): chi guardava TV 2+ ore/giorno prima dei 12 mesi mostrava 6 volte più probabilità di ritardo linguistico rispetto ai non esposti." },
      { num: "770", unit: "parole/ora", label: "in meno nelle interazioni adulto-bambino con TV di sottofondo", sub: "Christakis et al., Pediatrics 2009", color: "#7C5CBF", emoji: "💬",
        note: "Ogni ora di TV di sottofondo riduce di 770 le parole rivolte al bambino. Il linguaggio si sviluppa solo nell'interazione umana diretta." },
      { num: "1h", unit: "limite", label: "massimo consigliato tra 18 e 24 mesi, solo con adulto presente", sub: "AAP 2016", color: "#00C2A8", emoji: "⏱️",
        note: "Tra 18 e 24 mesi: massimo 1 ora di contenuti di qualità, co-visti con un genitore che commenta e interagisce." },
    ],
    ageRisks: [
      { range: "0–18 mesi", verdict: "Nessuno schermo", bg: "#FFF0F0", color: "#FF6B6B",
        risks: ["Il video deficit effect (Kuhl, 2003): i bambini non imparano il linguaggio dagli schermi, solo dall'interazione umana live", "La TV di sottofondo interferisce con il gioco e le interazioni verbali (Christakis, 2009)", "Lo schermo durante i pasti è associato indipendentemente a ritardi linguistici (Radesky, 2014)"],
        whatToDo: "Eccetto videochiamate con familiari: nessuno schermo. Preferire libri, canzoni, gioco libero, tummy time e interazione faccia a faccia." },
      { range: "18–24 mesi", verdict: "Max 1 ora, con adulto", bg: "#FFF5E0", color: "#FF9A3C",
        risks: ["L'uso solitario è più dannoso del co-viewing (AAP, 2016)", "Contenuti ad alta velocità (cartoni veloci, YouTube) sono associati a difficoltà di attenzione (Lillard & Peterson, 2011)", "Più di 1 ora/giorno è associata a punteggi più bassi in sviluppo cognitivo (Madigan et al., JAMA 2019, N=50.000)"],
        whatToDo: "Scegli contenuti lenti e narrativi. Guarda insieme, commenta, fai domande. Mai lo schermo prima di dormire." },
      { range: "24–36 mesi", verdict: "Max 1 ora, contenuti scelti", bg: "#E8F9EA", color: "#44CF6C",
        risks: ["Il rischio principale non è lo schermo in sé ma il tempo che sottrae al gioco simbolico e all'interazione umana", "L'uso intenso è correlato a ridotta capacità di attenzione sostenuta a 5 anni (Madigan et al., 2019)"],
        whatToDo: "Preferire app interattive a contenuti passivi. Programmi come Peppa Pig o Bluey (ritmo lento, vocabolario ricco) sono molto diversi da YouTube Kids." },
    ],
    brain_facts: [
      { icon: "🔗", title: "Il cervello impara dall'interazione, non dallo schermo", text: "Lo sviluppo linguistico richiede 'contingenza sociale': il bambino dice qualcosa e riceve una risposta immediata. La TV non può farlo. Damasio (1994) ha mostrato che apprendimento ed emozione sono inseparabili: senza risposta emotiva dell'altro, il cervello non registra l'esperienza come significativa. Questa è la ragione profonda del video deficit effect (Kuhl, 2003)." },
      { icon: "📵", title: "La TV di sottofondo è invisibilmente dannosa", text: "Christakis et al. (2009): ogni ora di TV di sottofondo riduce le interazioni verbali adulto-bambino di 770 parole/ora. Nei bambini 0-24 mesi, ciò è associato a vocabolario ridotto. Sapolsky ('Behave', 2017) ricorda che il cervello in sviluppo impara solo in contesti di bassa attivazione dello stress — il rumore di fondo continuo mantiene il sistema nervoso in uno stato di allerta subliminale che ostacola l'apprendimento." },
      { icon: "😴", title: "Lo schermo disturba il sonno", text: "La luce blu sopprime la melatonina. Anche 1 ora di schermo prima del sonno riduce il sonno REM — quando il cervello consolida gli apprendimenti (Carter et al., JAMA 2016). Sacks in 'Musicophilia' (2007) ha documentato come il sonno sia il momento in cui i circuiti neurali dell'esperienza diurna vengono letteralmente riorganizzati e consolidati: privarlo equivale a cancellare l'apprendimento del giorno." },
      { icon: "🎮", title: "Non tutti gli schermi sono uguali", text: "Le videochiamate con familiari NON hanno effetti negativi. Contenuti lenti e co-visti con un adulto hanno impatto molto minore dei video YouTube e dei giochi con notifiche. Sacks in \"Musicophilia\" (2007) ha documentato che la musica e il canto condivisi attivano il cervello in modo che nessuno schermo passivo può replicare." },
    ],
    reassuring: "La scienza non dice che un video visto una volta danneggia il bambino. Dice che l'esposizione cronica sostituisce il tempo di interazione umana — il vero nutrimento neurologico. Un genitore presente e responsivo è di gran lunga più importante di qualsiasi regola sullo schermo. Se hai già usato molti schermi, non catastrofizzare. Il cervello infantile è plastico.",
  },

  "3-6": {
    title: "📵 Schermi & Bambini 3–6 anni",
    bigStats: [
      { num: "1h", unit: "limite", label: "massimo giornaliero raccomandato tra 3 e 5 anni", sub: "AAP 2016 · WHO 2019", color: "#FF6B6B", emoji: "⏱️",
        note: "OMS e AAP concordano: tra 3 e 5 anni massimo 1 ora al giorno di schermo di qualità. Tra 6 e 12 anni: limite flessibile ma coerente, con priorità a sonno, movimento e interazione." },
      { num: "73%", unit: "%", label: "dei bambini 3-5 anni usa tablet o smartphone regolarmente in Italia", sub: "Indagine ISTAT 2022", color: "#FF9A3C", emoji: "📱",
        note: "In Italia, la stragrande maggioranza dei bambini in età prescolare è già esposta a schermi quotidiani, spesso ben oltre i limiti raccomandati." },
      { num: "2×", unit: "volte", label: "più difficoltà di autoregolazione con uso >2 ore/giorno a 3-4 anni", sub: "Tamana et al., PLOS ONE 2019, N=2441", color: "#7C5CBF", emoji: "🧠",
        note: "Tamana et al. (2019): bambini con uso schermo >2 ore/giorno a 3-4 anni mostravano il doppio delle difficoltà di attenzione e autoregolazione a 5 anni, indipendentemente da altri fattori." },
      { num: "40%", unit: "%", label: "in meno di gioco creativo autonomo nei bambini con TV accesa di fondo", sub: "Kirkorian et al., Child Development 2009", color: "#00C2A8", emoji: "🎨",
        note: "La TV di sottofondo riduce significativamente la durata e la complessità del gioco spontaneo nei bambini 1-3 anni." },
    ],
    ageRisks: [
      { range: "3–4 anni", verdict: "Max 1 ora, contenuti scelti", bg: "#FFF5E0", color: "#FF9A3C",
        risks: ["Il gioco simbolico (cruciale per lo sviluppo cognitivo) viene interrotto e spiazzato dallo schermo", "I contenuti ad alta velocità (YouTube, TikTok) stimolano l'amigdala senza sviluppare attenzione sostenuta", "L'uso prima di dormire ritarda significativamente l'addormentamento e riduce il sonno profondo"],
        whatToDo: "Preferire contenuti narrativi lenti (Bluey, Masha e Orso) al posto di YouTube Kids. Stabilire orari fissi — lo schermo ha un inizio e una fine prevedibili. Mai schermo nei 30 minuti prima di dormire." },
      { range: "4–5 anni", verdict: "Max 1 ora, con regole chiare", bg: "#E8F9EA", color: "#44CF6C",
        risks: ["Il bambino non riesce ancora ad autoregolare il tempo schermo — la responsabilità è del genitore, non sua", "Le app 'educative' non sono tutte uguali: molte usano meccanismi di sistema di premi imprevedibili (come le slot machine)", "Il confronto tra personaggi dei cartoni e la realtà può creare aspettative irrealistiche"],
        whatToDo: "Usa un timer visivo (clessidra) — aiuta il bambino a gestire la fine dello schermo senza crisi. Scegli app che richiedono risposta attiva, non solo visione passiva." },
      { range: "5–6 anni", verdict: "Max 1-2 ore, priorità a gioco fisico", bg: "#F0EAFF", color: "#7C5CBF",
        risks: ["L'uso intenso nelle ore pomeridiane compete con il gioco fisico, fondamentale per la maturazione cerebellare", "Il gaming senza supervisione introduce già a meccaniche di rinforzo progettate per creare dipendenza", "L'esposizione passiva riduce la creatività narrativa — i bambini 'copiano' trame viste invece di inventarne"],
        whatToDo: "Privilegia sempre gioco fisico, lettura e attività creative. Lo schermo come 'dessert', non come pasto principale. Co-guarda, commenta, spegni insieme." },
    ],
    brain_facts: [
      { icon: "🎮", title: "App 'educative': distinguere le buone dalle cattive", text: "Un'app educativa di qualità richiede risposta attiva, ha ritmo lento, non ha pubblicità né acquisti in-app e non usa notifiche o ricompense casuali. La maggior parte delle app 'educational' del mercato non soddisfa questi criteri (Hirsh-Pasek et al., Psychological Science 2015)." },
      { icon: "🧩", title: "Il gioco libero è insostituibile", text: "Il gioco simbolico spontaneo (far finta, costruire, inventare storie) sviluppa la corteccia prefrontale in modo che nessuno schermo può replicare. Perry (2006) ha documentato come il gioco sia il meccanismo evolutivo primario attraverso cui il cervello infantile integra le esperienze emotive e sviluppa la capacità di regolazione. Ogni ora di schermo che sostituisce gioco libero ha un costo neurologico reale (Lillard, 2017)." },
      { icon: "😴", title: "Schermo e sonno: un conflitto serio", text: "L'American Academy of Sleep Medicine raccomanda di rimuovere gli schermi dalla camera dei bambini. Anche a 3-6 anni, lo schermo nelle 2 ore prima del sonno riduce la produzione di melatonina e la qualità del sonno REM, con effetti sull'apprendimento del giorno successivo." },
      { icon: "🔁", title: "Il ritmo veloce allena male l'attenzione", text: "I contenuti ad alta velocità (cambi di scena ogni 2-3 secondi) abituano il cervello a stimolazione intensa e rapida. Attività più lente — leggere, disegnare, giocare — diventano meno attraenti, non perché siano noiose, ma perché il cervello è stato 'risintonizzato' (Lillard & Peterson, 2011)." },
    ],
    reassuring: "Nessun genitore usa perfettamente lo schermo. L'obiettivo non è zero, ma consapevolezza: scegliere cosa, quando e per quanto, ed essere presenti quando possibile. Un genitore che guarda insieme e commenta trasforma uno schermo passivo in un'esperienza condivisa.",
  },

  "6-12": {
    title: "📵 Schermi & Ragazzi 6–12 anni",
    bigStats: [
      { num: "2h", unit: "ricreative", label: "di schermo al giorno: la soglia di riferimento raccomandata per i 6-12 anni", sub: "CDC · AACAP · Canadian Paediatric Society (uso ricreativo, escluso compiti)", color: "#00A896", emoji: "⏱️",
        note: "CDC, AACAP e la Canadian Paediatric Society convergono su un limite di 2 ore/giorno di schermo ricreativo (escluso uso scolastico) per i 6-12 anni. Questo numero è una soglia operativa utile, non una soglia magica: ciò che conta è che lo schermo non tolga spazio a sonno, movimento e relazioni reali. L'AAP (2016) non fissa più un numero rigido, ma indica chiaramente queste priorità." },
      { num: "4.5h", unit: "al giorno", label: "media reale di schermo nei bambini 8-12 anni in Europa (escluso uso scolastico)", sub: "Common Sense Media Report 2021", color: "#FF6B6B", emoji: "📱",
        note: "Il dato esclude l'uso scolastico e include TV, gaming, social, video. In Italia la media è simile, con picchi nel weekend. Il confronto con la soglia raccomandata di 2 ore mostra quanto sia ampio il divario tra indicazione scientifica e realtà quotidiana." },
      { num: "1h", unit: "prima", label: "di sleep onset ritardato con schermo serale nei ragazzi 6-12", sub: "Carter et al., JAMA Pediatrics 2016", color: "#FF9A3C", emoji: "😴",
        note: "I ragazzi che usano schermi nelle 2 ore prima di dormire si addormentano in media 1 ora dopo e dormono meno. La privazione di sonno a questa età ha effetti documentati su umore, apprendimento e comportamento." },
      { num: "40%", unit: "%", label: "dei ragazzi 8-12 anni ha già un profilo social (nonostante il divieto under 13)", sub: "Indagine Telefono Azzurro 2023", color: "#7C5CBF", emoji: "👤",
        note: "In Italia, il 40% dei bambini sotto i 13 anni è già presente su piattaforme social. I genitori spesso non lo sanno o lo hanno permesso consapevolmente." },
      { num: "2.5×", unit: "volte", label: "più probabile il bullismo online per chi usa social senza supervisione a 10-12 anni", sub: "Kowalski et al., Psychological Bulletin 2014", color: "#00C2A8", emoji: "⚠️",
        note: "La presenza non supervisionata sui social a 10-12 anni aumenta significativamente l'esposizione al cyberbullismo — sia come vittime che come autori inconsapevoli." },
    ],
    ageRisks: [
      { range: "6–8 anni", verdict: "Limiti chiari, no social", bg: "#FFF0F0", color: "#FF6B6B",
        risks: ["I videogiochi online introducono interazioni con estranei difficili da controllare", "Lo schermo in camera (soprattutto di notte) è il fattore di rischio più documentato per problemi di sonno", "YouTube Algorithm: il sistema di raccomandazione porta rapidamente a contenuti sempre più estremi"],
        whatToDo: "Nessuno schermo in camera. Nessun accesso a YouTube senza supervisione. Videogiochi: solo con rating adeguato all'età. Regola del sonno: schermo off 1 ora prima di dormire." },
      { range: "8–10 anni", verdict: "Co-navigazione, regole esplicite", bg: "#FFF5E0", color: "#FF9A3C",
        risks: ["Il gaming online competitivo può diventare la principale fonte di autostima — con tutti i rischi che ne derivano", "Il confronto con gli influencer inizia a influenzare l'immagine corporea anche a 9-10 anni", "Le notifiche continue (giochi, app) interferiscono con la concentrazione e i compiti"],
        whatToDo: "Co-naviga: guarda insieme cosa fanno online, senza giudicare. Stabilisci regole condivise (non imposte). Disattiva le notifiche durante i compiti e il pasto. Parla di quello che vedi — non predichi, esplora insieme." },
      { range: "10–12 anni", verdict: "Dialogo aperto, privacy rispettata", bg: "#E8F9EA", color: "#44CF6C",
        risks: ["I social media (anche se tecnicamente vietati) sono già presenti nella maggior parte dei gruppi-classe", "La FOMO (Fear Of Missing Out) a questa età è neurologicamente reale e non va liquidata come capriccio", "Il gaming eccessivo a questa età predice dipendenza digitale in adolescenza (Gentile et al., 2011)"],
        whatToDo: "Non vietare in modo assoluto — negozia regole. Parla di algoritmi, like, dipendenza: i ragazzi di 11-12 anni capiscono e apprezzano essere trattati da persone intelligenti. Sii il porto sicuro quando qualcosa va storto online." },
    ],
    brain_facts: [
      { icon: "🎮", title: "Gaming: non tutto il male vien per nuocere", text: "I videogiochi d'azione migliorano attenzione visiva, velocità di elaborazione e problem solving (Green & Bavelier, 2012). Il problema non è il gaming in sé, ma l'uso eccessivo, solitario e non supervisionato. I giochi cooperativi e narrativi hanno profilo di rischio molto più basso di quelli competitivi online." },
      { icon: "📲", title: "Social media e cervello pre-adolescente", text: "Il cervello a 10-12 anni è in una fase di altissima sensibilità ai giudizi sociali. I like e i commenti attivano il circuito del piacere nel cervello con un meccanismo di sistema di premi imprevedibili — lo stesso principio psicologico che rende le slot machine difficili da abbandonare (Sherman et al., 2016). LeDoux ('Anxious', 2015) ha mostrato come l'amigdala pre-adolescente risponda ai segnali di esclusione sociale con la stessa intensità del pericolo fisico. I social sono progettati per massimizzare l'engagement di cervelli già neurologicamente vulnerabili al giudizio dei pari." },
      { icon: "😴", title: "Il sonno è la variabile critica", text: "Ogni ora di sonno persa per lo schermo equivale, per il rendimento cognitivo del giorno successivo, a non aver dormito tutta la notte (Harvard Sleep Lab). Kandel (2006) ha dimostrato che la consolidazione della memoria a lungo termine avviene quasi interamente durante il sonno: ogni notte accorciata da uno schermo è un apprendimento parzialmente perso. I ragazzi 6-12 anni hanno bisogno di 9-11 ore. La camera senza schermo è la misura singola più efficace." },
      { icon: "🧠", title: "Multitasking: un mito pericoloso", text: "I ragazzi credono di poter studiare con musica, WhatsApp e YouTube aperti. La neuroscienza è inequivocabile: il multitasking non esiste. Il cervello alterna rapidamente tra compiti con un costo ogni volta. Lo studio con distrazioni digitali richiede il 40% di tempo in più e produce apprendimento più superficiale (Meyer & Kieras, 1997; Ophir et al., 2009)." },
    ],
    reassuring: "I ragazzi che crescono con regole chiare ma non rigide sugli schermi, e con genitori che parlano di tecnologia invece di vietarla, sviluppano un rapporto più sano con il digitale. Non si tratta di proteggere i figli dagli schermi, ma di insegnare loro a usarli — come si insegna qualsiasi altra competenza.",
  },
  "12-15": {
    title: "📵 Schermi & Preadolescenti 12–15 anni",
    bigStats: [
      { num: "2h", unit: "ricreative", label: "di schermo ricreativo al giorno: la soglia raccomandata per i 12-15 anni (escluso uso scolastico)", sub: "AAP · AACAP · Australian Dept. of Health", color: "#00A896", emoji: "⏱️",
        note: "La raccomandazione di 2 ore/giorno di schermo ricreativo (escluso compiti, didattica, videochiamate) è condivisa da AAP, AACAP e dal Dipartimento della Salute australiano. È una soglia operativa, non una legge: serve a preservare il tempo per sonno, sport, relazioni e studio non digitale. Il dato reale in Italia (6h) mostra quanto distante sia la norma dalla raccomandazione." },
      { num: "6h", unit: "al giorno", label: "media reale di schermo nei preadolescenti italiani 12-15 anni (inclusi social, gaming, video)", sub: "Indagine Eurispes-Telefono Azzurro 2023", color: "#FF6B6B", emoji: "📱",
        note: "In Italia i preadolescenti 12-15 anni trascorrono in media 6 ore al giorno davanti a schermi — escluso l'uso scolastico. Il dato è in costante crescita dal 2020." },
      { num: "57%", unit: "%", label: "dei ragazzi 12-14 anni dichiara di usare i social anche di notte, dopo essersi coricato", sub: "Common Sense Media Report 2023", color: "#FF9A3C", emoji: "🌙",
        note: "Più della metà dei preadolescenti usa lo smartphone nel letto. La luce blu e la stimolazione cognitiva ritardano il rilascio di melatonina e riducono la qualità del sonno REM — essenziale per la consolidazione degli apprendimenti." },
      { num: "3×", unit: "volte", label: "più alta la probabilità di sintomi depressivi nei preadolescenti con uso social >3h/giorno", sub: "Twenge & Campbell, Clinical Psychological Science 2019", color: "#7C5CBF", emoji: "🧠",
        note: "Twenge & Campbell (2019): l'associazione è particolarmente forte nelle ragazze e nei ragazzi con bassa autostima di base. L'effetto è dose-dipendente: più ore, più sintomi. L'uso passivo (scrolling) è più dannoso di quello attivo (messaggi, creazione di contenuti)." },
      { num: "87%", unit: "%", label: "dei ragazzi 12-15 anni ha già uno smartphone personale con accesso libero a internet", sub: "ISTAT 2023", color: "#00C2A8", emoji: "📲",
        note: "In Italia, quasi 9 preadolescenti su 10 hanno uno smartphone personale entro i 13 anni. La supervisione parentale è presente in meno del 40% dei casi." },
    ],
    ageRisks: [
      { range: "12–13 anni", verdict: "Regole condivise, niente social solitario", bg: "#FFF0F0", color: "#FF6B6B",
        risks: ["L'ingresso alle medie introduce dinamiche di gruppo intense: i social diventano il prolungamento digitale del cortile, con tutte le gerarchie e le esclusioni", "Il cervello a 12-13 anni è nel picco di sensibilità ai giudizi dei pari: un like o un commento negativo attiva l'amigdala come un pericolo fisico (Blakemore, 2018)", "TikTok e Reels espongono a standard estetici irraggiungibili che a questa età si inscrivono come norme — non come ideali"],
        whatToDo: "Rimandare l'accesso ai social il più possibile (ogni anno guadagnato è importante). Se già li usa, co-naviga: guarda insieme i profili che segue, commenta senza giudicare. Regola del sonno: smartphone fuori dalla camera alle 22." },
      { range: "13–14 anni", verdict: "Media literacy attiva, dialogo aperto", bg: "#FFF5E0", color: "#FF9A3C",
        risks: ["Il gaming online competitivo a questa età può diventare la principale fonte di autostima e identità — con dipendenza da validazione esterna", "Il cyberbullismo raggiunge il picco statistico tra i 13 e i 14 anni: spesso i ragazzi non lo riconoscono come tale né lo segnalano agli adulti", "Il confronto con influencer e body image ideali sui social è associato a insoddisfazione corporea crescente — in ragazze e ragazzi"],
        whatToDo: "Parla di algoritmi: come funzionano, perché mostrano quello che mostrano, cosa vogliono le piattaforme. I ragazzi di 13-14 anni capiscono e apprezzano essere trattati da persone intelligenti. Stabilisci una regola su nessun dispositivo in camera la notte — negoziata, non imposta." },
      { range: "14–15 anni", verdict: "Autonomia crescente con confini negoziati", bg: "#E8F9EA", color: "#44CF6C",
        risks: ["La FOMO (Fear Of Missing Out) a questa età è neurologicamente reale: non partecipare alle conversazioni di gruppo online crea esclusione sociale concreta", "L'esposizione a contenuti di violenza, estremismo o manipolazione affettiva avviene per lo più senza che i genitori lo sappiano", "Lo studio con schermo aperto in parallelo riduce la qualità dell'apprendimento del 40%: il multitasking non esiste neurologicamente"],
        whatToDo: "A 14-15 anni l'obiettivo non è controllare ma costruire competenza digitale: parlare di privacy, di manipolazione affettiva online, di come riconoscere contenuti progettati per creare dipendenza. Sii il porto sicuro quando qualcosa va storto online — senza 'te l'avevo detto'." },
    ],
    brain_facts: [
      { icon: "🧠", title: "Il cervello adolescente e i social: una combinazione ad alto rischio", text: "La corteccia prefrontale — responsabile di giudizio, controllo degli impulsi e prospettiva futura — non matura fino ai 25 anni. I social sono progettati da adulti con corteccia prefrontale matura per massimizzare il tempo sullo schermo di utenti che non ce l'hanno ancora. Blakemore ('Inventing Ourselves', 2018) ha dimostrato che il cervello del preadolescente risponde ai like con la stessa intensità con cui risponde al cibo o al denaro — grazie a picchi di dopamina nel circuito del piacere. Non è debolezza: è biologia." },
      { icon: "💤", title: "Sonno e cervello adolescente: priorità assoluta", text: "Il cervello preadolescente ha bisogno di 9-10 ore di sonno. La privazione cronica — causata spesso dall'uso notturno del telefono — riduce la densità della sostanza grigia nelle aree prefrontali (Cheng et al., 2020). Siegel ('The Developing Mind', 2012) ha documentato come il sonno REM sia il momento in cui il cervello integra le esperienze emotive della giornata: ogni notte accorciata è elaborazione emotiva mancata. Lo smartphone in camera è il fattore singolo più modificabile per migliorare sonno, umore e rendimento scolastico." },
      { icon: "🎮", title: "Gaming: risorsa o rischio?", text: "I videogiochi non sono intrinsecamente dannosi. I giochi narrativi e cooperativi sviluppano empatia, problem solving e creatività (Green & Bavelier, 2012). Il problema è l'uso eccessivo, solitario, competitivo e notturno. I segnali di dipendenza reale non sono 'quanto' gioca, ma 'cosa perde' per giocare: amici, sport, sonno, scuola. A 12-15 anni il gaming può diventare un rifugio dall'ansia sociale — il segnale per un adulto di avvicinarsi, non di vietare." },
      { icon: "📱", title: "Notifiche: l'architettura dell'interruzione", text: "Ogni notifica interrompe il flusso cognitivo con un costo di recupero di 23 minuti in media (Mark et al., 2008). I preadolescenti ricevono in media 190 notifiche al giorno. Studiare con il telefono vicino — anche se non lo si usa — riduce le performance cognitive come se si stesse svolgendo un secondo compito in parallelo (Ward et al., 2017). La misura più efficace è fisicamente semplice: telefono in un'altra stanza durante lo studio." },
    ],
    reassuring: "I preadolescenti che crescono con genitori che parlano di tecnologia — invece di vietarla o ignorarla — sviluppano una media literacy più robusta e un rapporto più sano con il digitale. Non si tratta di proteggere i figli dagli schermi, ma di costruire insieme la competenza per usarli. Un genitore che chiede 'cosa stai giocando? come funziona?' vale più di qualsiasi filtro parental control.",
  },

  "15-18": {
    title: "📵 Schermi & Adolescenti 15–18 anni",
    bigStats: [
      { num: "2h", unit: "ricreative", label: "di schermo al giorno: soglia di riferimento per i 15-17 anni — dai 17-18 anni il focus cambia", sub: "AAP · AACAP — per i 17-18 anni conta più la qualità dell'uso che le ore", color: "#00A896", emoji: "⏱️",
        note: "La letteratura scientifica indica 2 ore/giorno di schermo ricreativo (escluso scuola) come soglia operativa per gli adolescenti fino a 17 anni. Per i 17-18enni — che si avvicinano all'età adulta — l'AAP (2016) ha esplicitamente abbandonato il limite orario fisso: il focus si sposta sulla qualità dell'uso e su quanto lo schermo impatta sonno, attività fisica, relazioni reali e studio. La domanda giusta non è 'quante ore?' ma 'cosa stai perdendo per starci?'" },
      { num: "7h", unit: "al giorno", label: "media reale di schermo negli adolescenti italiani 15-18 anni (escluso uso scolastico)", sub: "Eurispes 2024 — Rapporto Italia", color: "#FF6B6B", emoji: "📱",
        note: "Gli adolescenti 15-18 anni sono la fascia con il maggiore consumo di schermo. Il dato include social, video, gaming, messaggistica — e non considera l'uso scolastico." },
      { num: "45%", unit: "%", label: "degli adolescenti 15-18 anni mostra almeno un segnale di uso problematico dei social media", sub: "Indagine Telefono Azzurro 2023", color: "#FF9A3C", emoji: "⚠️",
        note: "I criteri includono: pensare ossessivamente ai social quando offline, sentirsi ansiosi se non si può accedere, sacrificare sonno o attività sociali per stare online. Non è dipendenza clinica, ma è un segnale di utilizzo disfunzionale." },
      { num: "2×", unit: "volte", label: "più frequente l'ideazione suicidaria nelle adolescenti con uso social >5h/giorno", sub: "Twenge et al., Clinical Psychological Science 2018", color: "#7C5CBF", emoji: "💔",
        note: "L'associazione è particolarmente robusta nelle ragazze. Il meccanismo ipotizzato: confronto sociale negativo, cyberbullismo, contenuti pro-autolesionismo amplificati dagli algoritmi. L'effetto è più forte sull'uso passivo (scrolling) che attivo (produzione di contenuti)." },
      { num: "23min", unit: "di recupero", label: "richiesti dal cervello dopo ogni interruzione digitale per tornare alla concentrazione piena", sub: "Mark et al., UCI CHI 2008", color: "#00C2A8", emoji: "🧠",
        note: "Ogni notifica, ogni apertura automatica dei social durante lo studio, ha un costo cognitivo che va oltre la durata dell'interruzione. Gli adolescenti che studiano con il telefono in un'altra stanza ottengono risultati misurabilmente migliori." },
    ],
    ageRisks: [
      { range: "15–16 anni", verdict: "Identità digitale in costruzione", bg: "#FFF0F0", color: "#FF6B6B",
        risks: ["L'identità online e quella offline si sovrappongono e talvolta si contraddicono: il ragazzo può costruire un sé digitale molto distante da quello reale, con costi psicologici crescenti", "Il sexting inizia statisticamente in questa fascia: 1 adolescente su 4 ha ricevuto richieste esplicite online (Save the Children, 2023)", "L'esposizione a contenuti di manosphere, incel o radicalizzazione politica avviene spesso tramite algoritmi di raccomandazione, senza una ricerca consapevole"],
        whatToDo: "Il dialogo su identità, sessualità e sicurezza online non può aspettare 'il momento giusto'. Parlare di consenso digitale, di cosa succede alle immagini inviate, di come riconoscere la manipolazione affettiva online è educazione alla cittadinanza digitale — non intrusione." },
      { range: "16–17 anni", verdict: "Autonomia reale, rischi reali", bg: "#FFF5E0", color: "#FF9A3C",
        risks: ["Le piattaforme di scommesse e gambling online sono legali dai 18 anni ma accessibili da prima: il cervello adolescente è neurologicamente vulnerabile al gioco d'azzardo (Steinberg, 2008)", "La dipendenza da social media a 16-17 anni predice difficoltà di attenzione e di tolleranza alla noia in età adulta (Andreassen, 2015)", "L'uso di app di dating da parte di minorenni espone a rischi di grooming difficili da individuare"],
        whatToDo: "A 16-17 anni la supervisione diretta è spesso controproducente. L'obiettivo è costruire pensiero critico: come funziona un algoritmo di raccomandazione? Perché le piattaforme vogliono che tu ci stia il più possibile? Cosa ti fanno sentire dopo un'ora di scroll?" },
      { range: "17–18 anni", verdict: "Digital wellbeing come competenza adulta", bg: "#E8F9EA", color: "#44CF6C",
        risks: ["L'ansia da disconnessione — sentirsi a disagio senza telefono — è ormai comune anche fuori dalla clinica", "Il confronto con i coetanei online può interferire con scelte importanti: percorsi scolastici, immagine corporea, valori", "Il confine tra uso consapevole e uso compulsivo è spesso opaco: molti adolescenti non si riconoscono in difficoltà"],
        whatToDo: "A 17-18 anni il ragazzo ha gli strumenti per riflettere sul proprio uso digitale: app di monitoraggio del tempo schermo, digital detox periodici, conversazioni tra pari. Il genitore può condividere le proprie difficoltà con il digitale — il modello adulto è più potente di qualsiasi regola." },
    ],
    brain_facts: [
      { icon: "🧠", title: "Corteccia prefrontale e impulsi: il cantiere aperto", text: "La corteccia prefrontale — responsabile di giudizio, pianificazione, controllo degli impulsi e valutazione del rischio — non è completamente sviluppata fino ai 25 anni. Steinberg ('Age of Opportunity', 2014) ha dimostrato che in adolescenza il sistema limbico (emozioni, piacere immediato) e il sistema di controllo prefrontale sono in squilibrio temporaneo. I social e il gaming sfruttano esattamente questo squilibrio: promesse di ricompensa immediata, impossibilità di resistere senza supporto esterno." },
      { icon: "🔄", title: "Dopamina e dipendenza digitale", text: "I social media usano tecniche di rinforzo variabile — la stessa struttura delle slot machine — per massimizzare il tempo online. Ogni scroll può portare qualcosa di piacevole o niente: questa imprevedibilità è neurologicamente più addicente della certezza. Volkow ('Addiction: Beyond Dopamine Reward Circuitry', 2011) ha mostrato come l'esposizione cronica a ricompense digitali variabili alteri la sensibilità del sistema dopaminergico — rendendo le attività 'lente' (studio, lettura, conversazione) meno piacevoli per contrasto." },
      { icon: "💬", title: "Identità online e offline: due sé che si confrontano", text: "In adolescenza l'identità è in costruzione (Erikson: stadio Identità vs Diffusione). I social offrono uno spazio di sperimentazione identitaria — in teoria utile, in pratica spesso basato sul confronto e sulla performance. Twenge ('iGen', 2017) ha documentato come le generazioni cresciute con smartphone abbiano più difficoltà nella solitudine creativa, nella tolleranza alla noia e nel contatto diretto con le emozioni. La connessione costante può paradossalmente aumentare la solitudine." },
      { icon: "🛡️", title: "Media literacy: la competenza del XXI secolo", text: "La capacità di riconoscere la manipolazione algoritmica, distinguere informazione da disinformazione e gestire consapevolmente la propria identità digitale è una competenza che non si sviluppa spontaneamente. Livingstone & Blum-Ross ('Parenting for a Digital Future', 2020) hanno mostrato che i ragazzi con genitori che discutono attivamente di media e tecnologia sviluppano pensiero critico digitale significativamente più robusto di quelli con genitori che vietano o ignorano il problema." },
    ],
    reassuring: "La maggioranza degli adolescenti naviga il mondo digitale senza sviluppare dipendenze cliniche. Il rischio reale non è lo schermo in sé, ma l'uso solitario, notturno, non consapevole e mai discusso con adulti di riferimento. Un genitore che resta curioso — che chiede, condivide, non giudica — è la risorsa più potente per un adolescente che cresce in un mondo digitale.",
  },

  "gravidanza": {
    title: "📵 Schermi & Gravidanza",
    bigStats: [
      { num: "4h", unit: "al giorno", label: "tempo medio su schermo delle donne in gravidanza in Italia (smartphone, TV, tablet)", sub: "Indagine ISS — Progetto BORN IN ITALY 2022", color: "#FF6B6B", emoji: "📱",
        note: "La gravidanza è spesso un periodo di maggiore sedentarietà e di conseguenza di maggiore esposizione agli schermi. Non è patologico, ma alcune abitudini digitali hanno impatti documentati sul sonno e sul benessere psicologico." },
      { num: "68%", unit: "%", label: "delle gestanti cerca informazioni mediche online ogni settimana, spesso trovando contenuti allarmistici", sub: "Lagan et al., Midwifery 2011 — replicato da Gomes et al. 2020", color: "#FF9A3C", emoji: "🔍",
        note: "Il 68% delle donne in gravidanza consulta internet almeno settimanalmente per informazioni sulla salute. Il problema: gli algoritmi tendono ad amplificare i contenuti emotivamente intensi — spesso allarmistici — perché generano più engagement." },
      { num: "0", unit: "evidenze", label: "di danno al feto da uso normale di smartphone o Wi-Fi durante la gravidanza", sub: "WHO Report on EMF — 2014, aggiornato 2022", color: "#44CF6C", emoji: "✅",
        note: "L'OMS ha esaminato tutte le evidenze disponibili sulle radiofrequenze e la gravidanza: nessuna ricerca controllata ha dimostrato effetti negativi sul feto dall'uso normale di smartphone, Wi-Fi o tablet. Il mito delle 'onde elettromagnetiche pericolose' non ha basi scientifiche." },
      { num: "45min", unit: "prima", label: "di andare a dormire: lo schermo off per proteggere il sonno in gravidanza", sub: "Chang et al., PNAS 2014 · National Sleep Foundation", color: "#7C5CBF", emoji: "💤",
        note: "La luce blu degli schermi sopprime la melatonina e ritarda il ritmo circadiano. In gravidanza il sonno è già più frammentato per ragioni fisiologiche: ridurre l'esposizione agli schermi nelle ore serali è una misura semplice e documentata per migliorarne la qualità." },
    ],
    ageRisks: [
      { range: "Primo trimestre", verdict: "Moderazione e qualità delle fonti", bg: "#FFF0F0", color: "#D4447A",
        risks: ["L'ansia da gravidanza si alimenta facilmente di ricerche online: i forum e i social tendono a sovrarappresentare le complicanze rare", "L'esposizione notturna agli schermi riduce il sonno già nelle prime settimane, quando la stanchezza è fisiologicamente intensa", "Le app di tracciamento della gravidanza possono aumentare l'ansia se consultate ossessivamente con ogni variazione"],
        whatToDo: "Scegli fonti affidabili (ISS, OMS, siti ospedalieri) e limitati a quelle. Per ogni domanda medica, l'interlocutore principale è il ginecologo o la ostetrica — non Google. Schermo off almeno 30-45 minuti prima di dormire." },
      { range: "Secondo trimestre", verdict: "Risorse digitali utili se scelte bene", bg: "#FFF5E0", color: "#FF9A3C",
        risks: ["I social in gravidanza mostrano corpi e percorsi idealizzati che possono aumentare il confronto negativo e l'insoddisfazione corporea", "I film e le serie con rappresentazioni drammatiche del parto possono creare aspettative irrealistiche e aumentare la fear of childbirth", "L'uso intenso di schermo riduce il tempo per attività che nutrono il benessere: movimento, socializzazione, lettura"],
        whatToDo: "Usa le risorse digitali con intenzione: corsi preparto online, podcast affidabili, gruppi di supporto moderati da professionisti. Evita i thread di forum non moderati sulle complicanze. Il corpo che vedi sui social non è il parametro di riferimento." },
      { range: "Terzo trimestre", verdict: "Sonno prima di tutto", bg: "#E8F9EA", color: "#44CF6C",
        risks: ["Le ore notturne di schermo competono con un sonno già compromesso dal discomfort fisico, dall'aumentata diuresi e dall'ansia pre-parto", "La sovraesposizione a contenuti sul parto (video, racconti) può amplificare la tocofobia (paura del parto) nelle settimane finali", "Il 'doom scrolling' in gravidanza è associato a livelli più elevati di cortisolo, che ha effetti documentati sul benessere fetale (Diego et al., 2006)"],
        whatToDo: "Nelle ultime settimane il rituale serale senza schermo è la misura più preziosa. Sostituiscilo con respirazione, lettura, musica, o semplicemente silenzio. Parla con chi ti supporta di quello che senti — non con i forum." },
    ],
    brain_facts: [
      { icon: "📡", title: "Radiofrequenze e gravidanza: cosa dice davvero la scienza", text: "Il mito che smartphone e Wi-Fi siano pericolosi per il feto è diffusissimo in Italia — e privo di fondamento scientifico. L'OMS ha revisionato sistematicamente la letteratura sulle radiofrequenze non ionizzanti: non esiste alcuna prova che l'uso normale di dispositivi wireless causi danni allo sviluppo fetale. La distinzione cruciale è tra radiazioni ionizzanti (raggi X, gamma — pericolose) e non ionizzanti (radiofrequenze degli smartphone — non pericolose alle dosi di uso quotidiano)." },
      { icon: "😴", title: "Sonno in gravidanza: più prezioso che mai", text: "Il sonno in gravidanza ha un impatto documentato su pressione, glicemia, parto pretermine e benessere psicologico post-partum. La luce blu degli schermi è uno dei fattori più modificabili che interferisce con la qualità del sonno. Chang et al. (2014) hanno dimostrato che la lettura su e-reader nelle ore serali ritarda di 1.5 ore il picco di melatonina rispetto alla lettura su carta. In gravidanza, dove il sonno è già strutturalmente più fragile, questa interferenza ha un peso maggiore." },
      { icon: "🔍", title: "Informazione online in gravidanza: rischio e risorsa", text: "Internet può essere una risorsa preziosa per la gravidanza (accesso a linee guida, supporto tra pari, corsi preparto). Può anche essere una fonte di ansia amplificata: gli algoritmi privilegiano i contenuti emotivamente intensi, i forum raccolgono le esperienze negative più di quelle neutre, il bias di disponibilità porta a sovrastimare le complicanze rare. La regola pratica: per le domande cliniche, usa solo fonti istituzionali. Per il supporto emotivo, scegli comunità moderate da professionisti." },
      { icon: "💆", title: "Digitale e benessere emotivo in gravidanza", text: "La gravidanza è un periodo di alta vulnerabilità emotiva e di grande apertura al cambiamento. L'uso intenso di social media in gravidanza è associato a maggiori livelli di ansia perinatale (Radesky & Stafford, 2016). Il meccanismo: confronto continuo con gravidanze 'perfette' sui social, sovraesposizione a notizie negative, riduzione del tempo per attività che nutrono davvero il benessere (movimento, natura, relazioni). Il digitale può connettere o isolare — dipende da come lo si usa." },
    ],
    reassuring: "Usare lo smartphone in gravidanza non danneggia il bambino. Non esiste la gravidanza perfetta, digitalmente pulita e senza ansia. Quello che conta è la qualità complessiva del benessere: sonno sufficiente, fonti affidabili, tempo per sé, relazioni che nutrono. Un genitore in attesa che si prende cura di sé sta già prendendosi cura del bambino.",
  },
};


const CURIOSITA_DATA = {
  "0-3": {
    myths: [
      { emoji: "🌬️", label: "MITO SOLO ITALIANO", labelColor: "#FF6B6B", labelBg: "#FFF0F0",
        title: "Il colpo d'aria / colpo di freddo",
        short: "L'aria corrente e i capelli bagnati causano malattie. Il termine non esiste in nessun'altra lingua.",
        science: "Il raffreddore è causato esclusivamente da virus. Nessuno studio peer-reviewed ha dimostrato correlazione tra esposizione al freddo e infezioni respiratorie in assenza di contatto virale. Il termine 'colpo d'aria' non ha traduzione in inglese, tedesco o francese. Sapolsky ('Behave', 2017) osserva che le credenze popolari sulla malattia riflettono spesso il bisogno psicologico di causalità e controllo — non biologia.",
        truth: "Il freddo riduce marginalmente la clearance mucociliare delle vie aeree, ma senza un virus non ci si ammala. Ci si ammala di più in inverno perché si sta in ambienti chiusi e affollati.",
        fun: "In Danimarca i neonati dormono in carrozzina all'aperto anche a temperature sotto zero. In Norvegia gli asili nido hanno sessioni outdoor obbligatorie anche a -15°C." },
      { emoji: "🛁", label: "MITO ITALIANO", labelColor: "#FF9A3C", labelBg: "#FFF5E0",
        title: "Il bagno fa venire la febbre",
        short: "Un mito italiano radicato — ma la realtà scientifica è più sfumata di quanto si pensi in entrambe le direzioni.",
        science: "Il bagno FREDDO è controindicato: causa vasocostrizione periferica che riduce la dispersione del calore e può provocare brividi, aumentando paradossalmente la temperatura interna. Su questo le linee guida sono unanimi. Il bagno TIEPIDO (36-37°C, non sotto) è fisiologicamente neutro o lievemente utile per la dispersione del calore per convezione. Tuttavia, una revisione Cochrane (Meremikwu & Oyo-Ita, 2003) ha concluso che il beneficio sulla febbre è modesto e temporaneo rispetto ai farmaci antipiretici. L'OMS e la maggior parte delle società pediatriche lo considerano una misura di conforto accettabile, non un trattamento primario.",
        truth: "Il bagnetto NON provoca febbre — nessun meccanismo fisiologico lo supporta. Il bagno freddo è sconsigliato. Il bagno tiepido è sicuro ma il suo effetto antifebbre è limitato e temporaneo: non sostituisce il paracetamolo se la febbre è alta o il bambino è sofferente. L'informazione contrastante che circolava in passato riguardava proprio questa distinzione freddo/tiepido, spesso mal comunicata.",
        fun: "La SIP (Società Italiana di Pediatria) lo considera accettabile come misura di conforto. L'AAP americana lo cita come opzione secondaria. Nessuna linea guida moderna lo considera né obbligatorio né pericoloso se l'acqua è tiepida." },
      { emoji: "🍼", label: "MITO DIFFUSO", labelColor: "#7C5CBF", labelBg: "#F0EAFF",
        title: "Il latte artificiale è 'inferiore' — o viceversa, uguale al materno",
        short: "Due miti opposti che si escludono ma sono entrambi semplificazioni pericolose.",
        science: "Il latte materno contiene anticorpi (IgA secretorie), fattori di crescita, batteri benefici e componenti non replicabili industrialmente. Al tempo stesso, i latti artificiali moderni sono sicuri, adeguati nutrizionalmente e permettono ai bambini di crescere in salute.",
        truth: "La realtà è sfumata: il latte materno è ottimale, ma una madre serena vale più del latte. La colpevolizzazione delle madri che non allattano ha costi psicologici reali e documentati (Oates et al., 2004).",
        fun: "In Svezia — tra i paesi con i migliori indicatori di salute infantile — l'allattamento è sostenuto culturalmente e strutturalmente (congedo parentale lungo, stanze allattamento ovunque), non moralisticamente." },
      { emoji: "😴", label: "MITO EDUCATIVO", labelColor: "#44CF6C", labelBg: "#E8F9EA",
        title: "Lasciarlo piangere lo rende autonomo",
        short: "Ignorare il pianto insegna al bambino a essere indipendente. La scienza dice il contrario.",
        science: "Il pianto del neonato attiva il sistema dello stress (rilascio di cortisolo). La risposta del genitore o persona di riferimento lo regola verso il basso. Ripetute esperienze di non-risposta costruiscono un sistema dello stress iperattivo (van IJzendoorn & Hubbard, 2000). Van der Kolk ('The Body Keeps the Score', 2014) e Perry ('The Boy Who Was Raised as a Dog', 2006) hanno documentato in modo convergente come la non-responsività ripetuta nei primi mesi lasci tracce misurabili nell'architettura del sistema nervoso autonomo.",
        truth: "L'autonomia vera si costruisce attraverso la sicurezza, non l'abbandono. I bambini con attaccamento sicuro (genitori responsivi) esplorano di più e piangono di meno nel tempo.",
        fun: "Il 'metodo Ferber' stesso — spesso citato a supporto del lasciar piangere — prevede risposte del genitore a intervalli crescenti, non l'ignoramento totale del pianto." },
      { emoji: "🦷", label: "MITO GENERAZIONALE", labelColor: "#FF6B6B", labelBg: "#FFF0F0",
        title: "I denti da latte non importano — tanto cadono",
        short: "Curare i denti da latte è inutile perché sono provvisori. Una delle convinzioni più costose per la salute dentale italiana.",
        science: "I denti da latte mantengono lo spazio per i permanenti. Le carie precoci (Early Childhood Caries) sono associate a dolore cronico, difficoltà alimentari, disturbi del sonno e ritardi nello sviluppo del linguaggio (Sheiham, 2005).",
        truth: "La carie è un'infezione batterica trasmissibile. Si trasmette dal genitore o persona di riferimento al bambino attraverso saliva (assaggiare il cucchiaio, pulire il ciuccio con la bocca). La prevenzione inizia dal genitore.",
        fun: "In Finlandia la fluoroprofilassi e le visite dentistiche sono gratuite e obbligatorie per i bambini fino a 18 anni. Il risultato: quasi zero carie nella popolazione adulta." },
    ],
    forumTopics: [
      { emoji: "😴", color: "#C77DFF", bg: "#F5EEFF", category: "SONNO", title: "Il sonno: l'ossessione nazionale", rank: "#1 topic per volume di post",
        desc: "Le regressioni del sonno a 4, 8-9, 12 e 18 mesi corrispondono esattamente a scatti di sviluppo cerebrale documentati. Il dibattito condivisione del letto vs culla separata è il più acceso di tutti i forum italiani.",
        idea: "🧠 Le regressioni del sonno non sono capricci — sono neurologia. A 4 mesi il cervello riorganizza i cicli del sonno da infantili ad adulti. A 8-9 mesi l'ansia da separazione attiva il sistema di attaccamento anche di notte. A 18 mesi l'esplosione del linguaggio 'eccita' il cervello fino a tarda sera.\n\n✅ Cosa funziona: routine prevedibile, oscurità totale, temperatura 18-20°C, risposta coerente ai risvegli. Il condivisione del letto sicuro (senza alcol, fumo, materasso morbido) non è pericoloso e in molte culture è la norma." },
      { emoji: "🥣", color: "#6BCB77", bg: "#E8F9EA", category: "SVEZZAMENTO", title: "Pappa vs svezzamento con i pezzi (metodo BLW): la guerra santa", rank: "#2 topic per volume di post",
        desc: "Il confronto tra svezzamento tradizionale e Baby Led Weaning è divisivo quanto una questione politica.",
        idea: "🧠 La ricerca non dice che un metodo è superiore all'altro. Il svezzamento con i pezzi (metodo BLW) è associato a migliore autoregolazione calorica e minore rifiuto dei cibi nuovi a lungo termine (Brown & Lee, 2011). Lo svezzamento tradizionale è più controllabile nelle quantità.\n\n✅ Il bambino è pronto quando sta seduto da solo, ha perso il riflesso di estrusione e mostra interesse per il cibo — generalmente intorno ai 6 mesi. La cosa più importante non è il metodo ma che il pasto sia sereno e condiviso." },
      { emoji: "🤱", color: "#FF6B6B", bg: "#FFF0F0", category: "ALLATTAMENTO", title: "Il senso di colpa da allattamento", rank: "Topic emotivamente più intenso",
        desc: "Smettere di allattare prima del previsto è vissuto da molte madri italiane come fallimento personale.",
        idea: "💛 I dati: l'OMS raccomanda allattamento esclusivo fino a 6 mesi — ma questa è una raccomandazione di salute pubblica, non una sentenza sul tuo valore come madre. In Italia il 34% delle mamme smette entro il primo mese.\n\n✅ Una madre serena vale più di qualsiasi latte. Il senso di colpa cronico da allattamento è un fattore di rischio documentato per la depressione post-partum (Oates et al., 2004). La decisione è tua." },
      { emoji: "💆", color: "#FF9A3C", bg: "#FFF3E8", category: "BURNOUT", title: "Sono sola, sono stanca, non ce la faccio", rank: "Argomento emotivamente più urgente",
        desc: "Nei forum le madri chiedono aiuto non per il bambino ma per sé stesse.",
        idea: "💛 Il [[burnout genitoriale]] è reale e clinicamente documentato. I sintomi: esaurimento totale, distanza emotiva dal figlio, perdita di piacere nelle interazioni. Colpisce il 5-8% dei genitori (Mikolajczak et al., 2018).\n\n✅ Chiedere aiuto non è arrendersi. In Italia i consultori familiari offrono supporto psicologico gratuito. La depressione post-partum colpisce il 10-15% delle madri e il 10% dei padri — è una condizione medica, non un fallimento." },
      { emoji: "🚽", color: "#9B59B6", bg: "#F0E6FF", category: "SPANNOLINAMENTO", title: "Il pannolino: quando levarlo?", rank: "#3 topic per volume di post",
        desc: "Il controllo sfinterico matura neurologicamente tra 18 e 36 mesi — non è questione di volontà.",
        idea: "🧠 Il controllo sfinterico richiede maturazione neurologica, consapevolezza corporea e capacità di attesa — tutte tra 18 e 36 mesi.\n\n✅ Segnali di prontezza: rimane asciutto per 2 ore, avvisa prima, capisce le istruzioni semplici, mostra interesse per il vasino. Forzarlo prima produce solo stress. Un bambino di 3 anni col pannolino è assolutamente nella norma neurologica." },
      { emoji: "👶", color: "#4D96FF", bg: "#E8F2FF", category: "CONFRONTO", title: "Il figlio della mia amica già...", rank: "Fonte #1 di ansia genitoriale",
        desc: "Il confronto tra bambini è la principale fonte di ansia nei forum.",
        idea: "🧠 I range normali sono molto più ampi di quanto si pensi. Camminare: 9-17 mesi. Prime parole: 10-18 mesi. Frasi di due parole: 18-30 mesi. La variabilità dipende principalmente da genetica e tempi neurologici.\n\n✅ Quando preoccuparsi davvero: assenza di sorriso sociale a 3 mesi, nessuna lallazione a 12 mesi, nessuna parola a 16 mesi, perdita di competenze già acquisite. Il confronto sui social mostra sempre i bambini più precoci, creando un'immagine distorta della normalità." },
    ],
  },

  "3-6": {
    myths: [
      { emoji: "🎓", label: "MITO EDUCATIVO", labelColor: "#FF6B6B", labelBg: "#FFF0F0",
        title: "Prima impara a leggere, meglio è",
        short: "Spingere i bambini a leggere e scrivere prima dei 5-6 anni è un vantaggio. La neuroscienza non è d'accordo.",
        science: "La lettura richiede maturazione delle aree del cervello che gestiscono la lettura, che nella maggior parte dei bambini non sono pronte prima dei 5-6 anni. Forzare l'apprendimento precoce può creare associazioni negative con il libro e ridurre la motivazione intrinseca (Suggate, 2012).",
        truth: "I bambini finlandesi imparano a leggere a 7 anni — e a 15 anni sono i migliori lettori d'Europa (PISA). La ricerca longitudinale mostra che i vantaggi dell'apprendimento precoce della lettura svaniscono entro il terzo anno di scuola.",
        fun: "In Finlandia e Svezia la scuola primaria inizia a 7 anni. Gli anni 3-6 sono dedicati al gioco, alla socializzazione e allo sviluppo emotivo — con risultati scolastici superiori a lungo termine." },
      { emoji: "📺", label: "MITO DIFFUSO", labelColor: "#FF9A3C", labelBg: "#FFF5E0",
        title: "I cartoni educativi rendono i bambini più intelligenti",
        short: "Programmi come Peppa Pig o Baby Einstein sviluppano l'intelligenza. I dati dicono qualcosa di più sfumato.",
        science: "Il '[[Video deficit effect]]' — il fatto che i bambini imparino meno dagli schermi che dall'interazione diretta — persiste fino a 3-4 anni (Zimmermann et al., 2007). L'apprendimento reale richiede contingenza sociale: risposta personalizzata in tempo reale, impossibile per uno schermo.",
        truth: "I programmi lenti e narrativi (Bluey, Peppa Pig) non causano danni se usati con moderazione. I programmi ad alta velocità sì. Il gioco simbolico libero sviluppa più corteccia prefrontale di qualsiasi cartone, educativo o no.",
        fun: "Bluey — il cartone australiano con il ritmo più lento e i temi emotivi più ricchi — è diventato un caso di studio in psicologia dello sviluppo per come modella la genitorialità responsiva." },
      { emoji: "🤥", label: "MITO MORALE", labelColor: "#7C5CBF", labelBg: "#F0EAFF",
        title: "Il bambino che mente è un bugiardo — carattere da correggere subito",
        short: "Le bugie a 3-5 anni indicano un problema di carattere. In realtà sono uno straordinario indicatore di sviluppo.",
        science: "La capacità di mentire richiede [[Teoria della mente]] (capire che l'altro non sa quello che sai tu), linguaggio elaborato e memoria di lavoro — tre funzioni cognitive avanzate. I bambini iniziano a mentire tra i 3 e i 4 anni esattamente quando queste capacità maturano (Lee & Talwar, 2014).",
        truth: "Un bambino che mente bene a 4 anni ha probabilmente un migliore sviluppo cognitivo rispetto a uno che non riesce ancora a farlo. La risposta giusta non è punire, ma insegnare perché la verità è preferibile — senza cancellare la conquista cognitiva.",
        fun: "In uno studio di Lee & Talwar (2014), i bambini che mentivano meglio a 4 anni mostravano punteggi più alti nei test di Teoria della Mente e funzioni esecutive a 6 anni." },
      { emoji: "😡", label: "MITO EDUCATIVO", labelColor: "#44CF6C", labelBg: "#E8F9EA",
        title: "I capricci vanno ignorati — dargli attenzione li peggiora",
        short: "Rispondere alle crisi di rabbia premia il comportamento. La neuroscienza ha una storia diversa da raccontare.",
        science: "Le crisi di rabbia (tantrum) a 3-5 anni sono disregolazioni del sistema nervoso autonomo, non strategie manipolative. La corteccia prefrontale non è matura. LeDoux ('The Emotional Brain', 1996) ha dimostrato che l'amigdala risponde ai segnali di minaccia in circa 12 millisecondi — molto prima che la corteccia possa elaborare. Il bambino letteralmente non può autoregolarsi: ha bisogno di co-regolazione (Porges, 2011).",
        truth: "Ignorare un bambino in crisi aumenta il cortisolo e la durata della crisi. Rispondere con calma (co-regolazione) insegna al cervello come regolare le emozioni — costruendo la capacità di autoregolazione futura.",
        fun: "La ricercatrice Wendy Middlemiss (2012) ha misurato il cortisolo di madri e bambini durante il metodo 'ignora il pianto': i bambini smettevano di piangere, ma il loro cortisolo restava alto. La regolazione esterna mancava — il segnale di distress era solo diventato silenzioso." },
      { emoji: "👑", label: "MITO RELAZIONALE", labelColor: "#FF6B6B", labelBg: "#FFF0F0",
        title: "L'amore del figlio per il genitore del sesso opposto è 'malsano'",
        short: "Il bambino che 'ama' la mamma in modo esclusivo o 'vuole sposare il papà' ha qualcosa che non va.",
        science: "Freud descrisse il complesso edipico come fase normale dello sviluppo tra 3 e 6 anni. Il bambino sviluppa dinamiche affettive intense verso i genitori, con identificazioni e rivalità. Freud le lesse come 'complesso edipico'. È una fase transitoria, molto comune, e parte del processo di identificazione di genere.",
        truth: "Queste dinamiche, vissute in famiglia in modo ludico e non drammatizzato, si risolvono spontaneamente entro i 6-7 anni. Sopprimerle o ridicolizzarle può complicare il processo di identificazione.",
        fun: "Erikson incluse questa fase nel suo modello come 'iniziativa vs senso di colpa': il bambino esplora relazioni e ruoli — se sostenuto, cresce con iniziativa; se criticato, con senso di colpa paralizzante." },
    ],
    forumTopics: [
      { emoji: "🌙", color: "#C77DFF", bg: "#F5EEFF", category: "SONNO", title: "I mostri sotto al letto: quando inizia e come finisce", rank: "#1 topic fascia 3-6",
        desc: "Le paure notturne esplodono tra i 3 e i 6 anni e mettono a dura prova il sonno di tutta la famiglia.",
        idea: "🧠 Le paure notturne sono neurologicamente reali: l'amigdala (sede della paura) non distingue tra pericolo reale e immaginato. A questa età la corteccia prefrontale non è ancora abbastanza matura da 'correggere' la paura razionalmente — quindi dirgli 'non ci sono i mostri' non aiuta.\n\n✅ Cosa funziona: validare la paura ('capisco che hai paura'), creare rituali di sicurezza (la luce notturna, il pupazzo protettore), leggere fiabe con paure superate dai protagonisti. Evitare: ridicolizzare, minimizzare, far dormire sempre nel lettone senza piano di uscita." },
      { emoji: "🎒", color: "#6BCB77", bg: "#E8F9EA", category: "SCUOLA", title: "Scuola dell'infanzia: separazione e pianto al cancello", rank: "#2 topic fascia 3-6",
        desc: "Il pianto alla separazione scolastica divide i genitori: lasciarlo piangere o restare?",
        idea: "🧠 La separazione scolastica attiva il sistema di attaccamento — è una risposta biologicamente programmata, non un capriccio. I bambini con attaccamento sicuro, paradossalmente, piangono di più alla separazione ma si consolano più rapidamente (Ainsworth, 1978).\n\n✅ Cosa aiuta: routine di saluto prevedibile e BREVE (3-5 minuti, mai dilungata), rassicurazione ferma ('tornerò dopo pranzo'), oggetto transizionale portato a scuola, dialogo con le maestre. Il genitore che resta a lungo perché 'non ce la fa' spesso prolunga il disagio del bambino." },
      { emoji: "🤥", color: "#FF6B6B", bg: "#FFF0F0", category: "COMPORTAMENTO", title: "Mio figlio mente — e lo fa pure bene", rank: "Topic che preoccupa di più",
        desc: "Le bugie compaiono tra i 3 e i 5 anni e spaventano i genitori.",
        idea: "🧠 Le bugie sono un indicatore di sviluppo cognitivo, non di carattere difettoso. Richiedono Teoria della Mente, linguaggio elaborato e memoria di lavoro — capacità che maturano esattamente in questa fascia d'età.\n\n✅ La risposta giusta: non punire la bugia in modo sproporzionato (il bambino impara a mentire meglio, non a essere onesto), ma insegnare con calma perché la verità è preferibile. Creare un clima in cui ammettere gli errori non porta a punizioni eccessive è il modo più efficace per costruire onestà a lungo termine." },
      { emoji: "👶", color: "#FF9A3C", bg: "#FFF3E8", category: "FAMIGLIA", title: "Arriva il fratellino: la gelosia che nessuno ti aveva detto", rank: "Cambiamento familiare più discusso",
        desc: "La nascita di un fratello scatena regressioni, aggressività e tristezza nel primo figlio.",
        idea: "🧠 La gelosia fraterna non è egoismo — è una risposta adattiva alla percezione di perdita di risorse (amore, attenzione, tempo del genitore o persona di riferimento). Dal punto di vista evolutivo, è perfettamente sensata. Dal punto di vista neurologico, attiva gli stessi circuiti del dolore fisico.\n\n✅ Cosa aiuta: non minimizzare ('sei grande, devi capire'), ma validare ('capisco che è difficile condividere la mamma'). Ritagliare tempo esclusivo col primo figlio. Coinvolgerlo nella cura del neonato senza rendere la cura un obbligo. Le regressioni (pipì a letto, linguaggio infantile) sono temporanee e vanno accolte senza ansia." },
      { emoji: "🎮", color: "#9B59B6", bg: "#F0E6FF", category: "SCHERMI", title: "Non riesce a staccarsi dal tablet: cosa faccio?", rank: "#3 topic fascia 3-6",
        desc: "Il tablet è diventato il principale strumento di gestione dei momenti difficili — e ora il bambino non riesce a farne a meno.",
        idea: "🧠 A 3-6 anni il bambino non ha ancora la capacità di autoregolare il tempo schermo — il sistema di controllo degli impulsi (corteccia prefrontale) non è maturo. Chiedere al bambino di smettere spontaneamente quando è immerso in uno schermo è come chiedere a un adulto di smettere di mangiare cioccolata da solo con la confezione davanti.\n\n✅ La responsabilità è del genitore, non del bambino. Tools pratici: timer visivo (clessidra), routine predefinita ('dopo cartoni si va al parco'), transizione con preavviso ('ancora 5 minuti poi spegniamo'), mai schermo come unica consolazione nelle crisi." },
      { emoji: "💆", color: "#4D96FF", bg: "#E8F2FF", category: "GENITORE", title: "Mi spaventa la mia rabbia verso mio figlio", rank: "Argomento più segreto",
        desc: "Nei forum le mamme e i papà ammettono di aver perso il controllo — e si vergognano profondamente.",
        idea: "💛 La rabbia verso i figli è umana, normale e non ti rende un genitore cattivo. I bambini 3-6 anni testano i limiti con un'intensità neurologicamente massima — e lo fanno proprio con le persone di cui si fidano di più (i genitori), perché sanno che il legame reggerà.\n\n✅ Cosa fare dopo aver perso il controllo: riparazione. 'Mi dispiace, ho sbagliato, ti voglio bene' insegna al bambino una delle lezioni più importanti della vita: i legami si rompono e si riparano. I genitori che non perdono mai il controllo e non riparano mai non sono migliori — sono solo meno onesti." },
    ],
  },

  "6-12": {
    myths: [
      { emoji: "📚", label: "MITO SCOLASTICO", labelColor: "#FF6B6B", labelBg: "#FFF0F0",
        title: "Se va male a scuola, non si impegna abbastanza",
        short: "Le difficoltà scolastiche sono quasi sempre questione di volontà e impegno. La neuroscienza mostra che è molto più complicato.",
        science: "Disturbi Specifici dell'Apprendimento (DSA) come dislessia, discalculia e disturbo da deficit di attenzione (ADHD) hanno basi neurobiologiche documentate e colpiscono il 5-15% dei bambini in età scolare (ISS, 2022). La dislessia è associata a differenze nel processamento fonologico. Sacks ('An Anthropologist on Mars', 1995) ha dedicato un intero capitolo a Temple Grandin e ad altri individui neurodiversi, mostrando come il cervello 'diverso' non sia un cervello difettoso — è un cervello organizzato in modo differente.",
        truth: "Un bambino che 'non si impegna' spesso sta facendo un enorme sforzo che gli adulti non vedono. La diagnosi precoce di DSA e disturbo da deficit di attenzione (ADHD) permette interventi efficaci. Il ritardo diagnostico è in Italia mediamente di 3 anni — con costi enormi per autostima e rendimento.",
        fun: "Temple Grandin, autrice e scienziata, fu diagnosticata con autismo a 4 anni e imparò a parlare tardi. Oggi è una delle voci scientifiche più influenti sul benessere animale. La diversità neurologica non è un limite da correggere — è spesso una risorsa da capire." },
      { emoji: "🤝", label: "MITO SOCIALE", labelColor: "#FF9A3C", labelBg: "#FFF5E0",
        title: "I bambini devono imparare a risolvere i conflitti da soli — i genitori non devono interferire",
        short: "Intervenire nei conflitti tra pari rende i bambini più deboli. Ma lasciare soli i bambini esposti a dinamiche di esclusione ha costi reali.",
        science: "L'esclusione sociale attiva le stesse reti neurali del dolore fisico (Eisenberger, 2003). Il bullismo cronico è associato a livelli elevati di cortisolo, riduzione del volume dell'ippocampo e aumentato rischio di depressione (Viding et al., 2012). Sapolsky ('Why Zebras Don't Get Ulcers', 2004) ha mostrato come lo stress da gerarchia sociale sia biologicamente tra i più potenti e dannosi — nei mammiferi sociali, essere esclusi dal gruppo è una minaccia alla sopravvivenza registrata dall'ippocampo come tale.",
        truth: "C'è una differenza cruciale tra i normali conflitti tra pari (da gestire con mediazione adulta, non invasione) e il bullismo cronico (che richiede intervento deciso degli adulti). Minimizzare il bullismo come 'cose da bambini' è tra gli errori più costosi.",
        fun: "In Finlandia il programma antibullismo KiVa — basato sulla ricerca neuropsicologica — ha ridotto il bullismo nelle scuole del 40% in 5 anni ed è ora adottato in 15 paesi." },
      { emoji: "📱", label: "MITO DIGITALE", labelColor: "#7C5CBF", labelBg: "#F0EAFF",
        title: "Vietare i social protegge i figli",
        short: "Proibire i social ai bambini 10-12 anni li protegge dai rischi. Ma la realtà è più sfumata.",
        science: "I divieti assoluti non funzionano: il 40% dei bambini sotto i 13 anni è già sui social (Telefono Azzurro, 2023). Vietare senza spiegare porta al consumo nascosto e solitario — il profilo di rischio peggiore (Blum-Ross & Livingstone, 2018).",
        truth: "L'approccio più efficace è la 'media literacy': insegnare ai ragazzi come funzionano gli algoritmi, cosa sono i like, come riconoscere la manipolazione. I ragazzi con genitori che parlano di tecnologia (invece di vietarla) sviluppano un rapporto più sano con il digitale.",
        fun: "In Estonia — paese più digitalmente avanzato d'Europa — l'educazione digitale critica inizia alle elementari. Il risultato: una delle popolazioni giovanili più consapevoli online al mondo." },
      { emoji: "🏆", label: "MITO EDUCATIVO", labelColor: "#44CF6C", labelBg: "#E8F9EA",
        title: "Lodare i figli per i risultati li motiva",
        short: "Dire 'sei bravissimo!' dopo un bel voto rinforza la motivazione. La ricerca di Carol Dweck dice altro.",
        science: "Dweck (2006) ha dimostrato che lodare il risultato ('sei intelligente') costruisce una mindset fissa: i bambini evitano le sfide per non rischiare di sembrare meno intelligenti. Lodare il processo costruisce una mindset di crescita. Damasio ('Descartes' Error', 1994) fornisce la base neurologica: le emozioni associate al successo e al fallimento si inscrivono nel corpo come [[marcatori somatici]] — e sono questi marcatori a guidare le decisioni future, non la razionalità astratta.",
        truth: "La differenza pratica è enorme: i bambini con mindset fissa, dopo un fallimento, peggiorano. Quelli con [[mindset di crescita]], dopo un fallimento, migliorano. Il tipo di lode fa tutta la differenza.",
        fun: "Il programma scolastico di Dweck, implementato in diverse scuole americane, ha ridotto il gap di rendimento tra studenti ricchi e poveri del 30% in un anno — solo cambiando il tipo di feedback degli insegnanti." },
      { emoji: "💪", label: "MITO SPORTIVO", labelColor: "#FF6B6B", labelBg: "#FFF0F0",
        title: "Lo sport agonistico presto costruisce carattere",
        short: "Avviare i figli all'agonismo sportivo precocemente li forma nel carattere e nella resilienza.",
        science: "L'American Academy of Pediatrics raccomanda la specializzazione sportiva non prima dei 14-15 anni. La specializzazione precoce (prima dei 12) è associata a burnout sportivo, overuse injuries e abbandono dello sport in adolescenza (Brenner, 2016).",
        truth: "Lo sport multidisciplinare fino ai 12 anni sviluppa meglio coordinazione, schema corporeo e motivazione intrinseca rispetto alla specializzazione precoce. I campioni olimpici hanno in media praticato 2-3 sport diversi fino all'adolescenza.",
        fun: "Federer ha giocato a calcio, basket, tennis da tavolo e squash fino ai 12 anni. Solo in adolescenza si è specializzato nel tennis." },
    ],
    forumTopics: [
      { emoji: "📝", color: "#C77DFF", bg: "#F5EEFF", category: "SCUOLA", title: "Mio figlio odia la scuola — ogni mattina è una battaglia", rank: "#1 topic fascia 6-12",
        desc: "Il [[rifiuto scolastico]] — da lieve resistenza a vera e propria fobia — è il problema più discusso nei forum genitoriali per questa fascia d'età.",
        idea: "🧠 Il 'rifiuto scolastico' è un sintomo, non una diagnosi. Può nascondere ansia da prestazione, problemi con i pari, difficoltà di apprendimento non diagnosticate (DSA/disturbo da deficit di attenzione (ADHD)), o dinamiche familiari. La risposta 'ci vai e basta' può essere controproducente se la causa è reale e non affrontata.\n\n✅ Prima passo: capire cosa c'è sotto. Parlare senza interrogare ('com'eri oggi?' non 'com'è andata?'). Coinvolgere gli insegnanti in modo non adversariale. Se il rifiuto è intenso e persistente (più di 2 settimane), valutare una consulenza psicologica — non come ultima spiaggia, ma come strumento efficace." },
      { emoji: "💔", color: "#FF6B6B", bg: "#FFF0F0", category: "RELAZIONI", title: "Lo escludono — non è invitato alle feste", rank: "Topic emotivamente più intenso",
        desc: "L'esclusione dal gruppo dei pari è una delle esperienze più dolorose per i bambini 6-12 anni — e per i genitori che la osservano.",
        idea: "🧠 L'esclusione sociale attiva le stesse reti neurali del dolore fisico (Eisenberger, 2003). Non è metafora — è neurobiologia. Liquidarla come 'sono cose da bambini' equivale a dire a qualcuno con un braccio rotto di 'stringere i denti'.\n\n✅ Come genitore: validare il dolore senza catastrofizzare ('è normale sentirsi così'), aiutare a costruire almeno un'amicizia solida (una basta), parlare delle dinamiche sociali senza dare ricette ('come pensi che si sentiva X?'). Segnali che richiedono aiuto professionale: ritiro totale, rifiuto scolastico, cambiamenti del sonno o dell'alimentazione." },
      { emoji: "🎮", color: "#9B59B6", bg: "#F0E6FF", category: "DIGITALE", title: "Non riesce a smettere con i videogiochi", rank: "#2 topic fascia 6-12",
        desc: "Il gaming è diventato il principale terreno di conflitto tra genitori e figli nella fascia 8-12 anni.",
        idea: "🧠 I videogiochi usano sistemi di ricompensa variabile (come le slot machine) progettati per massimizzare il tempo di gioco. Non è debolezza di carattere — è ingegneria comportamentale. La corteccia prefrontale dei ragazzi non è ancora matura per resistere a questi sistemi senza aiuto esterno.\n\n✅ Approccio che funziona: regole concordate (non imposte), con logica spiegata. Trovare giochi cooperativi invece di solo competitivi. Interesse genuino per quello che gioca — chiedere di insegnarti. Punto di stop non quando 'ha perso' (frustrazione alta) ma tra una partita e l'altra. Segnali di dipendenza reale: rinuncia ad amici, sport, sonno per giocare." },
      { emoji: "😰", color: "#FF9A3C", bg: "#FFF3E8", category: "EMOTIVO", title: "Mio figlio si preoccupa per tutto — dice che ha mal di pancia la mattina", rank: "Sintomo più sottovalutato",
        desc: "L'ansia nei bambini 6-12 anni si manifesta spesso attraverso sintomi fisici, non verbali.",
        idea: "🧠 Il mal di pancia mattutino, le cefalee frequenti, la stanchezza cronica senza causa medica sono spesso manifestazioni somatiche dell'ansia. Il corpo del bambino 'parla' quando le parole mancano. L'ansia in età scolare colpisce circa l'8-10% dei bambini (Copeland et al., 2014).\n\n✅ Non minimizzare ('non c'è niente') né catastrofizzare ('andiamo al pronto soccorso'). Prima escludere cause mediche col pediatra, poi esplorare la dimensione emotiva. Tecniche che funzionano a questa età: respirazione, esternalizzare l'ansia con un nome ('il Pensiero Preoccupato'), scrivere i pensieri. Se persiste più di 4 settimane: supporto psicologico." },
      { emoji: "🌱", color: "#4D96FF", bg: "#E8F2FF", category: "PUBERTÀ", title: "Mia figlia di 9 anni ha già il seno — sono pronta?", rank: "Topic che mette più ansia ai genitori",
        desc: "La pubertà precoce arriva prima di quanto i genitori si aspettino — e prima di quanto i ragazzi stessi siano emotivamente pronti.",
        idea: "🧠 L'età media del menarca in Italia è scesa dagli anni '70 ad oggi da 13.5 a 12.2 anni. I segni puberali possono iniziare anche a 8-9 anni nelle femmine, 9-10 nei maschi — nella normalità clinica. Il cervello emotivo (amigdala) accelera, ma la corteccia prefrontale (controllo, giudizio) no: questo spiega l'intensità emotiva della preadolescenza.\n\n✅ Parlare di pubertà prima che arrivi — non dopo. Normalizzare i cambiamenti senza renderli un evento drammatico. I genitori che parlano di corpo, emozioni e sessualità in modo aperto hanno figli che fanno scelte più sicure in adolescenza (Secor-Turner et al., 2011)." },
      { emoji: "💆", color: "#6BCB77", bg: "#E8F9EA", category: "GENITORE", title: "Non so come stargli vicino senza invaderlo", rank: "Dilemma più comune dei genitori",
        desc: "Il bambino che fino a ieri voleva stare sempre con te ora chiude la porta e vuole privacy. Come navigare questa transizione?",
        idea: "💛 'Tenersi vicini tenendosi a distanza' è il principio guida di questa fase. Il bambino ha bisogno di sapere che il genitore è disponibile, non invadente. Il paradosso dell'adolescenza nascente: più il genitore insiste, più il ragazzo si allontana; più il genitore lascia spazio, più il ragazzo torna.\n\n✅ Strategie concrete: bussare sempre prima di entrare (rispetto, non distanza). Trovare attività condivise non frontali (cucinare insieme, guardare una serie, camminare) — i ragazzi parlano più facilmente quando non sono 'sotto esame'. Restare curiosi senza interrogare. Essere disponibili quando torneranno — e tornano." },
    ],
  },
  "12-15": {
    myths: [
      { emoji: "🌪️", label: "MITO NEUROLOGICO", labelColor: "#7C5CBF", labelBg: "#F0EAFF",
        title: "Gli ormoni spiegano tutto: è solo una fase",
        short: "Le turbolenze emotive della preadolescenza dipendono dagli ormoni. La neuroscienza mostra un quadro molto più complesso.",
        science: "Gli ormoni sessuali contribuiscono ai cambiamenti dell'umore, ma il fattore principale è la ristrutturazione del cervello: in preadolescenza si verifica una [[Pruning sinaptico|potatura sinaptica]] massiva (pruning) che ridefinisce le connessioni neurali. Blakemore ('Inventing Ourselves', 2018) ha dimostrato che la corteccia prefrontale — responsabile del controllo emotivo — è proprio in questa fase meno connessa all'amigdala. Non è capriccio: è architettura neurale.",
        truth: "Ridurre tutto agli 'ormoni' sminuisce l'esperienza del preadolescente e chiude il dialogo. La turbolenza emotiva è reale, neurobiologicamente fondata, e richiede più ascolto — non meno. 'È solo una fase' è tecnicamente vero ma umanamente sbagliato come risposta.",
        fun: "In Giappone la preadolescenza è culturalmente descritta come 'il risveglio del sé'. Le scuole medie giapponesi dedicano ore curricolari all'alfabetizzazione emotiva proprio in questa fascia — con risultati documentati su benessere e rendimento." },
      { emoji: "📱", label: "MITO DIGITALE", labelColor: "#FF6B6B", labelBg: "#FFF0F0",
        title: "Vietare i social li protegge",
        short: "Proibire i social ai preadolescenti è la mossa più efficace. I dati dicono altro.",
        science: "La maggior parte dei preadolescenti che subisce un divieto assoluto sui social accede comunque a queste piattaforme tramite dispositivi di amici o profili falsi (Ofcom UK, 2023). Il consumo solitario e non supervisionato — conseguenza del divieto — è il profilo di rischio più elevato per cyberbullismo e contenuti dannosi (Livingstone & Blum-Ross, 2020).",
        truth: "L'approccio più efficace non è vietare ma costruire competenza critica: come funziona un algoritmo, cosa vogliono le piattaforme, come riconoscere la manipolazione. I ragazzi con genitori che parlano di tecnologia — invece di vietarla — sviluppano un rapporto più sano con il digitale.",
        fun: "In Svezia le linee guida per le scuole medie includono lezioni obbligatorie su 'come funzionano i social media' e 'cosa sono gli algoritmi di raccomandazione'. Risultato: gli studenti svedesi mostrano livelli significativamente più alti di media literacy rispetto alla media europea." },
      { emoji: "🏆", label: "MITO SCOLASTICO", labelColor: "#FF9A3C", labelBg: "#FFF5E0",
        title: "Se va male alle medie è pigrizia",
        short: "Il calo del rendimento alle medie è quasi sempre questione di impegno. La neuroscienza mostra che la ristrutturazione cerebrale ha un costo cognitivo reale.",
        science: "La potatura sinaptica massiva che avviene tra i 12 e i 14 anni richiede enormi risorse metaboliche cerebrali. Alcuni ragazzi mostrano un calo temporaneo delle funzioni esecutive — memoria di lavoro, attenzione sostenuta — proprio mentre il cervello si ristruttura. È documentato e transitorio (Casey et al., 2008).",
        truth: "Un calo di rendimento alle medie può avere origini multiple: ristrutturazione neurale, ansia sociale, problemi non diagnosticati (DSA, ADHD), cambiamento del contesto. 'Non si impegna' è raramente la spiegazione completa. La risposta utile è capire cosa c'è sotto, non aumentare la pressione.",
        fun: "In Finlandia alle medie non ci sono voti numerici fino ai 14 anni. L'obiettivo è preservare la motivazione intrinseca durante la ristrutturazione cerebrale — con risultati PISA tra i migliori d'Europa." },
      { emoji: "🤝", label: "MITO RELAZIONALE", labelColor: "#44CF6C", labelBg: "#E8F9EA",
        title: "I preadolescenti non vogliono stare con i genitori",
        short: "A 12-15 anni i ragazzi preferiscono i coetanei ai genitori. Vero — ma la connessione con i genitori rimane fondamentale.",
        science: "La maggiore orientazione verso i pari in preadolescenza è biologicamente programmata e adattiva: prepara all'autonomia adulta. Ma Steinberg (2001) ha dimostrato che i preadolescenti con legami genitoriali sicuri mostrano minore conformismo al gruppo dei pari e maggiore resistenza alla pressione negativa. Il gruppo dei pari e i genitori non sono in competizione: i pari guidano l'identità sociale, i genitori restano la base sicura.",
        truth: "Il preadolescente che 'non vuole stare con i genitori' spesso vuole che il genitore sia disponibile — non che lo invada. La differenza è sottile ma cruciale: presenza non oppressiva, ascolto senza interrogatorio, porta aperta senza essere sulla soglia.",
        fun: "Una ricerca di Laurence Steinberg (Temple University) su 3.500 adolescenti ha mostrato che i ragazzi con genitori 'autoritative' (caldi ma con regole) prendono decisioni più sicure in situazioni di rischio rispetto a quelli con genitori permissivi o autoritari." },
      { emoji: "😴", label: "MITO QUOTIDIANO", labelColor: "#FF6B6B", labelBg: "#FFF0F0",
        title: "Il preadolescente che dorme fino a tardi è pigro",
        short: "Svegliarsi tardi a 12-15 anni è un segno di pigrizia o di cattive abitudini. La biologia ha un'altra versione.",
        science: "In preadolescenza si verifica uno slittamento biologico del ritmo circadiano: il cervello inizia a produrre [[melatonina]] circa 2 ore più tardi rispetto all'infanzia. Non è una scelta — è un cambiamento ormonale documentato (Carskadon, 2011). Gli orari scolastici italiani (inizio alle 8) sono in conflitto diretto con questo ritmo biologico.",
        truth: "Il preadolescente che fatica ad addormentarsi prima delle 23 e si sveglia stentando alle 7 non sta sabotando il sonno: il suo orologio biologico è sincronizzato diversamente. La privazione cronica di sonno che ne deriva ha effetti documentati su umore, apprendimento e salute metabolica.",
        fun: "Alcune scuole americane che hanno spostato l'inizio alle 8:30 o alle 9:00 hanno registrato miglioramenti significativi in rendimento, umore e riduzione degli incidenti stradali nei teen-driver." },
    ],
    forumTopics: [
      { emoji: "📲", color: "#C77DFF", bg: "#F5EEFF", category: "DIGITALE", title: "Passa 5 ore al telefono — come faccio a limitarlo senza guerra?", rank: "#1 topic fascia 12-15",
        desc: "Il conflitto sull'uso del telefono è il tema più discusso nei forum di genitori di preadolescenti.",
        idea: "🧠 Il cervello preadolescente non ha ancora la corteccia prefrontale matura per autoregolare l'uso del telefono: non è mancanza di volontà, è neurobiologia. Imporre un limite senza spiegazione crea resistenza; imporre un limite con una conversazione onesta crea negoziazione.\n\n✅ Approccio che funziona: regole concordate (non calate dall'alto), con logica condivisa ('non perché lo dico io, ma perché il sonno ti serve davvero'). Orario di 'telefono off' la sera — applicato anche dai genitori, altrimenti non è credibile. Se il conflitto è cronico e intenso, può essere il segnale di qualcosa di più profondo da esplorare." },
      { emoji: "💔", color: "#FF6B6B", bg: "#FFF0F0", category: "RELAZIONI", title: "Si è chiuso/a in se stesso/a — non so più cosa pensa", rank: "Cambiamento che spaventa di più",
        desc: "Il preadolescente che comunicava apertamente diventa improvvisamente ermetico. I genitori si sentono esclusi.",
        idea: "🧠 La riduzione della comunicazione con i genitori in preadolescenza è un processo normale di individuazione: il ragazzo sta costruendo un'identità separata, e il segreto è uno degli strumenti che usa. Non è rifiuto — è sviluppo.\n\n✅ Le conversazioni frontali ('parlami di te') raramente funzionano a quest'età. Funziona meglio il dialogo 'di fianco': durante un'attività condivisa, in auto, cucinando insieme. Restare curiosi senza interrogare. Rispettare il silenzio senza punirlo. I ragazzi tornano — se il porto è sicuro e non giudicante." },
      { emoji: "📚", color: "#6BCB77", bg: "#E8F9EA", category: "SCUOLA", title: "Le medie sono un disastro — non vuole studiare", rank: "#2 topic fascia 12-15",
        desc: "Il passaggio alle medie porta spesso un calo improvviso della motivazione scolastica.",
        idea: "🧠 Il calo motivazionale alle medie ha radici multiple: ristrutturazione cerebrale, maggiore sensibilità al giudizio dei pari (il 'sembrare sfigato' davanti ai compagni ha un peso neurobiologico reale), e talvolta difficoltà non diagnosticate che emergono solo quando aumenta il carico.\n\n✅ Prima passo: distinguere tra svogliatezza genuina e difficoltà mascherata. Parla con gli insegnanti senza posizione predefinita. Se il calo è brusco e persistente, una valutazione psicologica o neuropsicologica non è l'ultima spiaggia: è uno strumento efficace per capire." },
      { emoji: "👥", color: "#FF9A3C", bg: "#FFF3E8", category: "GRUPPO", title: "Si mette nei guai per stare con il gruppo", rank: "Comportamento più incompreso",
        desc: "Il preadolescente che 'sa benissimo' cosa è giusto fa scelte rischiose per compiacere i coetanei.",
        idea: "🧠 La pressione del gruppo a 12-15 anni non è semplice 'essere pecora': è la risposta di un cervello neurologicamente programmato per prioritizzare l'accettazione sociale. Steinberg ha dimostrato che la presenza dei coetanei aumenta del 50% la propensione al rischio negli adolescenti — indipendentemente dalla personalità.\n\n✅ Non serve predicare — il ragazzo conosce già le regole. Serve costruire un'identità abbastanza solida da sopportare la disapprovazione del gruppo. Si fa con la relazione: valorizzare le sue qualità, aiutarlo a trovare gruppi dove non debba sacrificare se stesso per essere accettato." },
      { emoji: "😔", color: "#4D96FF", bg: "#E8F2FF", category: "EMOTIVO", title: "È sempre giù di umore — è depressione?", rank: "Domanda che mette più paura",
        desc: "L'umore basso persistente in preadolescenza: quando è normale fluttuazione e quando è segnale da non sottovalutare?",
        idea: "🧠 La fluttuazione del tono dell'umore è normale in preadolescenza. I segnali che suggeriscono di chiedere aiuto professionale sono diversi dalla tristezza generica: ritiro dalle attività piacevoli per più di due settimane, cambiamenti nel sonno o nell'appetito, calo del rendimento, pensieri di inutilità o autolesionismo.\n\n✅ Non minimizzare ('è solo la crescita') né catastrofizzare. Chiedere direttamente e con calma: 'Come stai davvero?' — senza interrogatorio. Se i segnali persistono, uno psicologo dell'età evolutiva non è una soluzione di ultima spiaggia: è lo specialista giusto per questa fase." },
      { emoji: "💛", color: "#F0B429", bg: "#FFFAE0", category: "GENITORE", title: "Non so come esserci senza sbagliare", rank: "Confessione più comune dei genitori",
        desc: "La preadolescenza mette in crisi anche i genitori più preparati: troppo vicini o troppo lontani?",
        idea: "💛 Non esiste il genitore perfetto di un preadolescente. Esistono genitori che ci provano — e questo conta più di qualsiasi tecnica. L'errore più comune non è sbagliare: è smettere di tentare il contatto per paura di sbagliare.\n\n✅ La regola pratica più utile: bussare sempre (rispetto per la sua privacy), restare disponibili senza invadere, interessarsi a quello che lo appassiona anche se non ti appassiona. Un genitore che chiede 'spiegami come funziona quel videogioco' vale più di dieci regole sul tempo schermo." },
    ],
  },

  "15-18": {
    myths: [
      { emoji: "🌀", label: "MITO CULTURALE", labelColor: "#7C5CBF", labelBg: "#F0EAFF",
        title: "L'adolescenza è naturalmente un periodo di crisi",
        short: "Il tumulto adolescenziale è universale e inevitabile. La ricerca cross-culturale mostra un quadro più sfumato.",
        science: "L'idea di adolescenza come periodo universalmente turbolento deriva in parte dalla psicologia del primo Novecento (Hall, 1904) e dalla cultura popolare occidentale. Ricerche cross-culturali (Arnett, 2007) mostrano che l'intensità della 'crisi adolescenziale' varia enormemente in base al contesto culturale, familiare e socioeconomico. In molte culture la transizione all'età adulta è graduale e non necessariamente conflittuale.",
        truth: "La turbolenza adolescenziale non è inevitabile — è spesso una risposta a contesti specifici: conflitti familiari, pressione scolastica, assenza di spazi di espressione autonoma. Gli adolescenti con relazioni familiari calde e comunicazione aperta attraversano questa fase con meno conflitti, non meno crescita.",
        fun: "In Danimarca, dove la scuola superiore include obbligatoriamente anni di esplorazione personale ('gymnasiet' con meno ore curricolari e più autonomia), i ragazzi mostrano livelli di benessere psicologico tra i più alti d'Europa nella fascia 15-18 anni." },
      { emoji: "🧠", label: "MITO NEUROLOGICO", labelColor: "#FF6B6B", labelBg: "#FFF0F0",
        title: "A 16 anni il cervello è ormai formato",
        short: "A 16 anni i ragazzi sono 'praticamente adulti' neurologicamente. La scienza è categorica: no.",
        science: "La [[corteccia prefrontale]] — responsabile di giudizio, pianificazione, controllo degli impulsi, valutazione delle conseguenze a lungo termine — non raggiunge la maturità strutturale fino ai 25 anni. Steinberg ('Age of Opportunity', 2014) ha dimostrato che la capacità di resistere alla pressione dei pari in situazioni di rischio continua a svilupparsi fino ai 25 anni — indipendentemente dall'intelligenza o dalla conoscenza delle regole.",
        truth: "Un adolescente di 16 anni può sapere perfettamente che qualcosa è rischioso e farlo comunque: non è stupidità né ribellione, è un cervello che non ha ancora completato lo sviluppo dei sistemi di controllo. Questo non giustifica tutto, ma spiega molto — e richiede supporto strutturale, non solo responsabilizzazione.",
        fun: "Negli USA, la neuroscienza dello sviluppo ha influenzato le sentenze della Corte Suprema: dal 2005 la pena di morte è vietata per reati commessi sotto i 18 anni, esattamente per riconoscere l'incompletezza del cervello adolescente." },
      { emoji: "💑", label: "MITO RELAZIONALE", labelColor: "#FF9A3C", labelBg: "#FFF5E0",
        title: "Le prime storie d'amore non contano — è solo un gioco",
        short: "Le relazioni romantiche in adolescenza sono esperienze superficiali che non lasciano traccia. La psicologia dello sviluppo non è d'accordo.",
        science: "Le prime relazioni romantiche sono esperienze di attaccamento secondario (dopo quella genitoriale) che contribuiscono allo sviluppo dell'identità, dell'autostima e delle competenze relazionali. Furman & Shaffer (2003) hanno documentato come le prime relazioni in adolescenza siano predittive degli stili relazionali adulti — non perché 'programmino' il futuro, ma perché offrono i primi schemi di riferimento.",
        truth: "Un primo amore finito male può essere un dolore reale che merita ascolto, non minimizzazione. 'È solo un ragazzino/a' è spesso la risposta sbagliata. Il genitore che accoglie il dolore della fine di una relazione adolescenziale costruisce la fiducia per conversazioni più difficili in futuro.",
        fun: "Una ricerca di Roisman et al. (2004) su adulti seguiti dall'adolescenza ha mostrato che la qualità delle prime relazioni romantiche a 16-18 anni era un predittore significativo della qualità delle relazioni adulte." },
      { emoji: "🏃", label: "MITO EDUCATIVO", labelColor: "#44CF6C", labelBg: "#E8F9EA",
        title: "Bisogna avere le idee chiare sul futuro a 18 anni",
        short: "Chi non sa cosa fare dopo il diploma è in ritardo. La psicologia dello sviluppo descrive l'indecisione come una fase normale — e spesso sana.",
        science: "Arnett ('Emerging Adulthood', 2000) ha identificato un periodo di 'adultità emergente' (18-25 anni) come fase distinta dello sviluppo: caratterizzata da esplorazione dell'identità, instabilità e apertura alle possibilità. L'idea di dover scegliere una direzione definitiva a 18 anni è culturalmente costruita — e può generare ansia invece di stimolare esplorazione.",
        truth: "Molti adolescenti che sembrano 'non avere le idee chiare' stanno usando il tempo in modo sano: esplorando interessi, testando identità, resistendo alla chiusura prematura. L'ansia da prestazione proiettata dai genitori può trasformare l'esplorazione sana in paralisi.",
        fun: "In Germania il sistema duale (alternanza scuola-lavoro) e la possibilità di un 'Freiwilliges Soziales Jahr' (anno di servizio volontario) prima dell'università sono strutturalmente progettati per permettere l'esplorazione identitaria dopo i 18 anni — con risultati positivi sul benessere e sulla soddisfazione occupazionale." },
      { emoji: "🔇", label: "MITO COMUNICATIVO", labelColor: "#FF6B6B", labelBg: "#FFF0F0",
        title: "Con gli adolescenti non si può parlare di niente",
        short: "Il dialogo con i figli adolescenti è strutturalmente impossibile. I dati sulla comunicazione genitore-adolescente raccontano qualcosa di diverso.",
        science: "Steinberg & Silk (2002) hanno mostrato che gli adolescenti con genitori 'autorevoli' (caldi, coinvolti, con aspettative chiare) hanno relazioni significativamente più positive con i genitori rispetto a quelli con genitori autoritari o permissivi. La comunicazione non si perde in adolescenza: si trasforma. Richiede adattamento dello stile adulto — non resa.",
        truth: "Gli adolescenti parlano con i genitori di cui si fidano. La fiducia si costruisce con piccoli gesti quotidiani: rispettare la privacy, non giudicare prima di ascoltare, ammettere i propri errori. I grandi dialoghi non si programma — arrivano dopo aver costruito sicurezza nei piccoli scambi.",
        fun: "Ricerche condotte in Italia su campioni di adolescenti hanno mostrato che circa due terzi di loro identifica la madre o il padre come la persona di cui si fida di più per i problemi seri — nonostante l'apparente chiusura comunicativa quotidiana." },
    ],
    forumTopics: [
      { emoji: "📚", color: "#C77DFF", bg: "#F5EEFF", category: "FUTURO", title: "Non sa cosa fare dopo il diploma — sono in panico", rank: "#1 preoccupazione genitori 15-18",
        desc: "L'avvicinarsi del diploma e le scelte post-diploma generano ansia crescente in genitori e ragazzi.",
        idea: "🧠 L'indecisione a 17-18 anni non è un ritardo — è spesso un segnale di esplorazione sana. Il panico del genitore può trasferirsi al ragazzo e trasformare l'incertezza normale in paralisi. La pressione a 'scegliere presto' riduce le opzioni invece di aumentarle.\n\n✅ Approccio utile: sostituire 'cosa vuoi fare nella vita?' con 'cosa ti appassiona adesso?'. Informarsi insieme sulle opzioni — università, ITS, lavoro, anno di pausa — senza gerarchizzarle. Il ragazzo che esplora più percorsi prima di scegliere sceglie meglio di quello che sceglie subito per compiacere." },
      { emoji: "💔", color: "#FF6B6B", bg: "#FFF0F0", category: "RELAZIONI", title: "Si è lasciato/a e non esce più di casa", rank: "Dolore più sottovalutato",
        desc: "La fine di una relazione in adolescenza può portare a ritiro, calo del rendimento e sintomi depressivi.",
        idea: "🧠 Il dolore da separazione attiva le stesse reti neurali del dolore fisico — in adolescenza, con una corteccia prefrontale non ancora matura per regolarlo. Non è 'esagerazione': è una risposta neurobiologicamente intensa a una perdita reale.\n\n✅ Il genitore che minimizza ('ce ne saranno altri') perde un'occasione di connessione. Il genitore che ascolta senza risolvere — 'mi dispiace, racconta' — costruisce un porto sicuro che varrà per conversazioni ben più difficili. Segnali che suggeriscono di chiedere aiuto professionale: ritiro dalle attività piacevoli o pensieri di inutilità per più di due settimane. Se emergono comportamenti autolesionistici, cercare supporto specialistico senza aspettare." },
      { emoji: "🌀", color: "#9B59B6", bg: "#F0E6FF", category: "IDENTITÀ", title: "Non riconosco più mio figlio/a — è diventato/a un'altra persona", rank: "Cambiamento che spaventa di più",
        desc: "Cambiamenti repentini nell'identità, nei valori, nelle amicizie o nello stile possono disorientare i genitori.",
        idea: "🧠 L'esplorazione dell'identità in adolescenza (Erikson: Identità vs Diffusione) è un processo biologicamente necessario. Il ragazzo sperimenta identità diverse — nell'abbigliamento, nei valori, nel gruppo di riferimento — per costruire una identità adulta stabile. Non ogni cambiamento è una crisi.\n\n✅ Distinguere tra esplorazione normale (nuovi interessi, stile diverso, nuovi amici) e segnali di allarme (ritiro totale, cambiamenti bruschi associati a calo del rendimento, umore persistentemente basso, segreti intensi). Nel dubbio, un professionista dell'età evolutiva può aiutare a orientarsi senza drammatizzare." },
      { emoji: "📱", color: "#FF9A3C", bg: "#FFF3E8", category: "DIGITALE", title: "Ho visto cose brutte nel suo telefono — come mi comporto?", rank: "Situazione più delicata",
        desc: "La scoperta accidentale (o non) di contenuti preoccupanti nel telefono dell'adolescente apre dilemmi complessi.",
        idea: "🧠 Il controllo del telefono senza consenso, anche con buone intenzioni, rompe la fiducia — e la fiducia in adolescenza è la risorsa più preziosa per la relazione con il genitore. Allo stesso tempo, alcuni rischi (sexting, dipendenze, grooming) richiedono intervento.\n\n✅ La risposta dipende dalla gravità: per contenuti generici ma preoccupanti (contenuti violenti, discussioni su droghe), valuta come affrontarlo apertamente senza trasformarlo in un interrogatorio. Ammettere di aver visto — con onestà e senza aggressività — è spesso meno dannoso per la fiducia di quanto si tema. Per situazioni di rischio reale (autolesionismo, adescamento), il supporto di un professionista è indicato prima di qualsiasi confronto." },
      { emoji: "😔", color: "#4D96FF", bg: "#E8F2FF", category: "BENESSERE", title: "Dice che va tutto bene — ma si vede che non è così", rank: "Situazione più frustrante",
        desc: "L'adolescente che nega le difficoltà e risponde 'sto bene' a ogni domanda.",
        idea: "🧠 'Sto bene' in adolescenza spesso significa 'non so come dirlo' o 'non voglio preoccuparti' o 'non mi fido ancora abbastanza da aprirmi'. Non è menzogna: è il limite del linguaggio emotivo in costruzione.\n\n✅ Non insistere con domande dirette — aumenta le difese. Funziona meglio: restare presenti senza invadere, creare contesti di dialogo obliquo (attività condivise), nominare quello che si osserva senza accusare ('ti vedo meno energico ultimamente, non devi dirmi niente se non vuoi, ma sono qui'). I ragazzi parlano quando sentono che non li deluderanno." },
      { emoji: "💛", color: "#F0B429", bg: "#FFFAE0", category: "GENITORE", title: "Ho la sensazione di aver perso la connessione con mio figlio/a", rank: "Dolore silenzioso dei genitori",
        desc: "Molti genitori vivono con dolore silenzioso la distanza con il proprio figlio adolescente.",
        idea: "💛 La distanza in adolescenza è biologicamente programmata — e non è irreversibile. Non significa che il legame si sia rotto: significa che si sta trasformando. I genitori che mantengono la connessione non lo fanno insistendo, ma restando disponibili.\n\n✅ Cose pratiche che funzionano: un'attività condivisa a settimana senza agenda (non 'parliamo', ma 'usciamo'), interesse genuino per quello che gli piace anche se non ti piace, ammettere i propri errori passati se appropriato. I ragazzi tornano — di solito intorno ai 17-18 anni, quando il bisogno di individuazione si stempera. Il genitore che è rimasto disponibile senza essere invadente trova la porta aperta." },
    ],
  },

  "gravidanza": {
    myths: [
      { emoji: "☕", label: "MITO ALIMENTARE", labelColor: "#FF6B6B", labelBg: "#FFF0F0",
        title: "Il caffè in gravidanza è vietato",
        short: "Zero caffeina in gravidanza. Le linee guida internazionali disegnano una soglia più sfumata.",
        science: "L'OMS e il RCOG (Royal College of Obstetricians) raccomandano di limitare la caffeina a meno di 200 mg/giorno in gravidanza — non di eliminarla. 200 mg corrispondono a circa 2 caffè espresso. L'associazione tra caffeina elevata (>300 mg/giorno) e basso peso alla nascita è documentata; quella tra caffeina moderata e danni fetali non ha evidenze robuste.",
        truth: "Un caffè al giorno è considerato sicuro da tutte le principali linee guida internazionali. Il divieto assoluto spesso produce senso di colpa e ansia in chi ha bevuto caffè prima di sapere della gravidanza — senza basi scientifiche proporzionate. Come sempre, parlarne con il ginecologo è la strada giusta.",
        fun: "In Svezia e Norvegia le linee guida nazionali sulla gravidanza sono pubblicamente disponibili online in versione semplificata, con spiegazione del livello di evidenza di ogni raccomandazione. Risultato: meno ansia da informazione incompleta e migliore aderenza alle indicazioni davvero importanti." },
      { emoji: "🏊", label: "MITO FISICO", labelColor: "#7C5CBF", labelBg: "#F0EAFF",
        title: "In gravidanza bisogna riposare e non fare sforzi",
        short: "Il riposo assoluto protegge la gravidanza. Le linee guida internazionali indicano il contrario per la maggior parte delle donne.",
        science: "L'OMS e l'ACOG (American College of Obstetricians) raccomandano alle donne in gravidanza sana almeno 150 minuti di attività fisica moderata a settimana. L'esercizio regolare in gravidanza riduce il rischio di diabete gestazionale, ipertensione gravidica, depressione perinatale e facilita il parto (Mottola et al., 2018).",
        truth: "Il riposo assoluto è indicato solo in specifiche condizioni cliniche (placenta previa, minaccia di parto pretermine, ecc.) — non nella gravidanza fisiologica. Camminare, nuotare, yoga prenatale sono spesso raccomandati. La sedentarietà in gravidanza ha rischi propri.",
        fun: "In Norvegia e Svezia i programmi pubblici di attività fisica prenatale (camminate di gruppo, yoga, nuoto) sono integrati nell'assistenza ostetrica di base e offerti gratuitamente. L'obiettivo non è la performance ma il benessere: muoversi quanto il proprio corpo consente, senza confronti." },
      { emoji: "🐱", label: "MITO IGIENICO", labelColor: "#FF9A3C", labelBg: "#FFF5E0",
        title: "Il gatto va via di casa durante la gravidanza",
        short: "Il gatto domestico è un rischio diretto per la gravidanza. La realtà è più specifica.",
        science: "La toxoplasmosi — causata da Toxoplasma gondii — può essere trasmessa attraverso feci di gatto infetto. Il rischio è reale ma limitato: un gatto domestico che non esce e non mangia carne cruda ha probabilità molto basse di essere infetto. Il rischio maggiore di toxoplasmosi in gravidanza viene dalla carne cruda o poco cotta e dal giardinaggio senza guanti (terra).",
        truth: "Non è necessario allontanare il gatto — è sufficiente che qualcun altro cambi la lettiera (o farlo con guanti monouso e lavarsi bene le mani), ed evitare il contatto con feci di gatti randagi. La donna immune per infezione precedente non è a rischio. Il test TORCH in gravidanza verifica la sierologia.",
        fun: "In Francia la sierologia per toxoplasmosi è esame obbligatorio nel pannello prenatale fin dagli anni '70 — con un programma di educazione che ha ridotto significativamente i casi di toxoplasmosi congenita, senza che milioni di gatti venissero allontanati." },
      { emoji: "📡", label: "MITO TECNOLOGICO", labelColor: "#44CF6C", labelBg: "#E8F9EA",
        title: "Lo smartphone fa male al feto",
        short: "Le onde elettromagnetiche degli smartphone danneggiano lo sviluppo fetale. L'OMS ha una posizione chiara.",
        science: "L'OMS ha revisionato sistematicamente la letteratura sulle radiofrequenze non ionizzanti e la gravidanza: nessuno studio controllato ha dimostrato effetti negativi sul feto dall'uso normale di smartphone, Wi-Fi o tablet. Le radiofrequenze degli smartphone sono classificate come 'possibilmente cancerogene' (Gruppo 2B) — per dare un'idea del livello di rischio stimato, è la stessa categoria del caffè e dei crauti fermentati — non come cancerogene accertate.",
        truth: "Non esiste base scientifica per raccomandare di non usare lo smartphone in gravidanza. Il mito si alimenta del principio di precauzione applicato in assenza di evidenza — e genera ansia senza beneficio. L'unico accorgimento documentato è ridurre l'uso serale per il sonno.",
        fun: "La BioInitiative Working Group — un gruppo di ricercatori critici sulle radiofrequenze — ha prodotto report molto citati dai siti allarmistici. La comunità scientifica mainstream (OMS, ICNIRP) ha sistematicamente revisionato queste analisi e non ha modificato le linee guida di sicurezza." },
      { emoji: "🥗", label: "MITO NUTRIZIONALE", labelColor: "#FF6B6B", labelBg: "#FFF0F0",
        title: "In gravidanza si mangia per due",
        short: "La gravidanza richiede il doppio del cibo. Le linee guida parlano di un incremento molto più modesto.",
        science: "Il fabbisogno calorico aggiuntivo in gravidanza è di circa 300 kcal/giorno nel secondo trimestre e 450 kcal nel terzo — corrispondenti a uno yogurt e una banana, non a un pasto completo extra. Il guadagno di peso raccomandato varia tra 11 e 16 kg per donne normopeso (IOM, 2009). Il guadagno eccessivo aumenta il rischio di diabete gestazionale, ipertensione e parto cesareo.",
        truth: "La qualità della dieta in gravidanza conta più della quantità. L'integrazione raccomandata (acido folico, vitamina D, ferro se carente, iodio) non sostituisce una dieta varia ed equilibrata. 'Mangiare per due' come licenza alimentare non ha basi nelle linee guida nutrizionali.",
        fun: "La dieta mediterranea in gravidanza è associata a riduzione del rischio di pre-eclampsia e parto pretermine in diversi studi europei. L'Italia — culla della dieta mediterranea — ha paradossalmente tassi crescenti di eccesso ponderale in gravidanza, spesso giustificato con il mito del 'mangiare per due'." },
    ],
    forumTopics: [
      { emoji: "😰", color: "#C77DFF", bg: "#F5EEFF", category: "ANSIA", title: "Ho paura di tutto — ogni sintomo mi spaventa", rank: "#1 topic nelle community di gravidanza",
        desc: "L'ansia in gravidanza è la condizione più discussa e spesso meno riconosciuta.",
        idea: "🧠 L'ansia in gravidanza è molto comune (colpisce il 15-20% delle donne) ed è spesso sottovalutata rispetto alla depressione post-partum — eppure ha effetti documentati su sonno, benessere e talvolta esiti ostetrici. Non è 'normale preoccuparsi un po': quando l'ansia è pervasiva, interferisce con il quotidiano e alimentata dalla ricerca ossessiva online, merita attenzione clinica.\n\n✅ Distinguere tra preoccupazioni normali (che si placano con informazione affidabile) e ansia pervasiva (che torna nonostante le rassicurazioni). Parlarne con il ginecologo o l'ostetrica è il primo passo — spesso aprono la strada a supporto psicologico perinatale, ancora poco conosciuto ma molto efficace." },
      { emoji: "🤢", color: "#FF6B6B", bg: "#FFF0F0", category: "FISICO", title: "La nausea mi sta distruggendo — nessuno me lo aveva detto così", rank: "Sintomo più sottovalutato",
        desc: "La nausea gravidica va da lieve a debilitante — e il divario tra le aspettative e la realtà è spesso enorme.",
        idea: "🧠 La nausea in gravidanza colpisce fino al 70-80% delle donne nel primo trimestre. Nella forma grave (iperemesi gravidica, circa 1-2% dei casi) può richiedere ospedalizzazione. Molto spesso si normalizza 'mangia qualcosa' come se fosse un capriccio — invalidando un'esperienza fisicamente reale.\n\n✅ Strategie che hanno evidenza: pasti piccoli e frequenti, zenzero (dimostrato utile in diversi RCT), vitamina B6, evitare odori trigger. Nei casi gravi: farmaci antiemetici sicuri in gravidanza (ondansetron, metoclopramide) — da valutare con il ginecologo. La nausea severa non va gestita in silenzio." },
      { emoji: "👶", color: "#6BCB77", bg: "#E8F9EA", category: "SVILUPPO", title: "Tutto quello che faccio influenzerà mio figlio per sempre?", rank: "Pensiero più paralizzante",
        desc: "Il carico di responsabilità sulle scelte in gravidanza può diventare paralizzante.",
        idea: "🧠 La ricerca sull'epigenetica e sullo sviluppo fetale ha enormemente ampliato la comprensione di quanto l'ambiente prenatale conti. Ma ha anche generato, nella divulgazione popolare, un'idea di responsabilità totale e infallibile che non corrisponde alla scienza: il feto è biologicamente resiliente, e le sue traiettorie di sviluppo dipendono da moltissimi fattori.\n\n✅ Le cose davvero documentate su cui vale la pena concentrarsi: acido folico, non fumare, non assumere alcol, gestire lo stress cronico, dormire. Tutto il resto — ogni caffè, ogni pasto sbagliato, ogni momento di ansia — non 'programma' un destino. Un genitore che si prende cura del proprio benessere complessivo sta già facendo la cosa più importante." },
      { emoji: "💑", color: "#FF9A3C", bg: "#FFF3E8", category: "COPPIA", title: "La gravidanza sta cambiando la nostra relazione", rank: "Argomento meno discusso apertamente",
        desc: "I cambiamenti nella coppia durante la gravidanza — intimità, comunicazione, aspettative — sono spesso vissuti in silenzio.",
        idea: "🧠 La gravidanza è una delle transizioni più intense per la coppia: cambia il corpo, cambiano i ruoli, cambiano le aspettative reciproche. Uno studio di Gottman (2000) ha mostrato che il 67% delle coppie riporta un calo nella soddisfazione relazionale nel primo anno dopo la nascita — e il processo inizia già in gravidanza.\n\n✅ Non aspettare che i problemi si accumulino. Parlare apertamente di come ci si sente — dei ruoli che si stanno costruendo, delle aspettative, delle paure. I corsi preparto di coppia hanno un'evidenza crescente sull'impatto positivo sulla qualità della relazione post-partum. Chiedere supporto a uno psicologo perinatale non è riservato alle crisi: è prevenzione." },
      { emoji: "🌙", color: "#9B59B6", bg: "#F0E6FF", category: "SONNO", title: "Non riesco più a dormire — e sono solo al secondo trimestre", rank: "Sintomo più sottovalutato nel secondo trimestre",
        desc: "I disturbi del sonno in gravidanza iniziano prima di quanto molte donne si aspettino.",
        idea: "🧠 I disturbi del sonno in gravidanza colpiscono oltre il 75% delle donne e iniziano spesso già nel primo trimestre per ragioni ormonali. Nel terzo trimestre si intensificano per ragioni fisiche (posizione, movimenti fetali, diuresi). La privazione cronica di sonno in gravidanza è associata a maggiore rischio di parto pretermine e depressione post-partum (Chang et al., 2010).\n\n✅ Misure pratiche: dormire sul fianco sinistro (migliore ritorno venoso), cuscino di gravidanza, schermo off 45 minuti prima di dormire, routine serale rilassante. Se i disturbi sono intensi e persistenti, parlarne con il ginecologo — alcune soluzioni sicure in gravidanza sono disponibili." },
      { emoji: "💛", color: "#F0B429", bg: "#FFFAE0", category: "EMOTIVO", title: "Non mi sento come 'dovrei' sentirmi — dov'è la gioia?", rank: "Pensiero più segreto",
        desc: "La gravidanza non è sempre felice — e la pressione culturale a 'godersi ogni momento' può isolare profondamente.",
        idea: "💛 Il mito della gravidanza come periodo di pura gioia esclude milioni di donne che vivono ambivalenza, ansia, dolore fisico, difficoltà relazionali o semplicemente stanchezza. Sentirsi 'sbagliate' per non essere felici aggiunge al peso già esistente.\n\n✅ L'ambivalenza in gravidanza è normale. La tristezza, l'ansia e le difficoltà emotive sono molto comuni. Quando questi stati diventano pervasivi e persistenti (più di due settimane), si parla di depressione prenatale — trattabile e sottovalutata. Parlarne con il ginecologo o con uno psicologo perinatale è un atto di cura verso sé e verso il bambino che si sta aspettando." },
    ],
  },
};

const QUOTES = {
  winnicott_coppia: {
    text: "Non esiste un bambino: c'è una coppia. Un bambino e qualcuno.",
    author: "D.W. Winnicott",
    role: "Psicoanalista e pediatra",
    color: COLORS.dustyRose,
    bg: "#FCEAE5",
    emoji: "👶",
  },
  winnicott_buoni_genitori: {
    text: "I bambini non hanno bisogno di genitori perfetti. Hanno bisogno di genitori che siano abbastanza buoni.",
    author: "D.W. Winnicott",
    role: "Psicoanalista e pediatra",
    color: COLORS.terracotta,
    bg: "#FAE8E2",
    emoji: "💛",
  },
  brazelton_cura: {
    text: "Ogni bambino porta con sé un messaggio: il mondo deve essere curato.",
    author: "T. Berry Brazelton",
    role: "Pediatra e sviluppista",
    color: COLORS.sage,
    bg: COLORS.sageLight,
    emoji: "🌱",
  },
  brazelton_pianto: {
    text: "Il pianto di un bambino non è un capriccio. È il suo unico linguaggio disponibile.",
    author: "T. Berry Brazelton",
    role: "Pediatra, Harvard Medical School",
    color: "#5A8FA0",
    bg: "#E0F0F5",
    emoji: "🗣️",
  },
  stern_coregolazione: {
    text: "Il bambino piccolo non è ancora in grado di contenere le proprie emozioni. È il genitore il suo sistema nervoso esterno.",
    author: "Daniel Stern",
    role: "Psichiatra e ricercatore dello sviluppo",
    color: COLORS.gold,
    bg: COLORS.goldLight,
    emoji: "🌊",
  },
  stern_connessione: {
    text: "La connessione emotiva profonda non è imitazione: è il genitore che traduce il comportamento del bambino in un'altra modalità sensoriale.",
    author: "Daniel Stern",
    role: "Il mondo interpersonale del bambino, 1985",
    color: "#7A6BAA",
    bg: "#F0ECFF",
    emoji: "🎵",
  },
  bowlby_autonomia: {
    text: "L'attaccamento non è una debolezza. È la piattaforma da cui si lancia ogni esplorazione coraggiosa.",
    author: "John Bowlby",
    role: "Psichiatra, fondatore della teoria dell'attaccamento",
    color: "#4A8A6A",
    bg: "#E0F5EC",
    emoji: "🚀",
  },
  bowlby_comunicazione: {
    text: "Ciò che non può essere comunicato alla madre non può essere comunicato al bambino a se stesso.",
    author: "John Bowlby",
    role: "Attaccamento e perdita, Vol. II",
    color: COLORS.deepSlate,
    bg: "#E8EEEE",
    emoji: "💬",
  },
  siegel_capire: {
    text: "I bambini hanno bisogno non di essere capiti, ma di sentirsi capiti.",
    author: "Daniel Siegel",
    role: "Neuropsichiatra, UCLA",
    color: "#3A6A9A",
    bg: "#E0EEFF",
    emoji: "🧠",
  },
  siegel_nominare: {
    text: "Nominare un'emozione significa domarla. La parola trasforma l'esperienza travolgente in qualcosa di gestibile.",
    author: "Daniel Siegel",
    role: "Il cervello del bambino, 2011",
    color: "#4A7A9A",
    bg: "#DFF0F8",
    emoji: "🏷️",
  },
  mahler_separazione: {
    text: "La processo di crescita e conquista dell'autonomia è il processo della nascita psicologica. Il bambino nasce due volte: dal corpo e dalla simbiosi.",
    author: "Margaret Mahler",
    role: "Psicoanalista, teoria della processo di crescita e conquista dell'autonomia",
    color: "#9A5A7A",
    bg: "#F8E8F0",
    emoji: "🌸",
  },
  tronick_riparazione: {
    text: "Anche i buoni genitori sono sintonizzati con il bambino solo il 30% del tempo. L'altro 70% è momenti di incomprensione e riparazione.",
    author: "Ed Tronick",
    role: "Still Face Experiment, Università di Boston",
    color: "#8A6A3A",
    bg: "#FFF3E0",
    emoji: "🔁",
  },
  brazelton_amore: {
    text: "Un bambino amato conosce il proprio valore. E questa conoscenza lo accompagnerà per tutta la vita.",
    author: "T. Berry Brazelton",
    role: "Touchpoints, 1992",
    color: COLORS.dustyRose,
    bg: "#FCEAE5",
    emoji: "⭐",
  },
  winnicott_gioco: {
    text: "Il gioco è il lavoro del bambino. È la modalità con cui elabora il mondo, non un'attività accessoria.",
    author: "D.W. Winnicott",
    role: "Gioco e realtà, 1971",
    color: "#6A8A4A",
    bg: "#EEF5E0",
    emoji: "🎮",
  },
  brazelton_temperamento: {
    text: "I neonati non sono tavole bianche. Arrivano con una personalità, temperamento, preferenze. Il genitore deve imparare a leggere questo bambino specifico.",
    author: "T. Berry Brazelton",
    role: "Neonatal Behavioral Assessment Scale",
    color: "#5A7A8A",
    bg: "#E5EEF5",
    emoji: "📖",
  },
  fraiberg_fantasmi: {
    text: "In ogni nursery ci sono dei fantasmi. Sono i visitatori del passato non ricordato dei genitori.",
    author: "Selma Fraiberg",
    role: "Ghosts in the Nursery, 1975",
    color: "#6A5A8A",
    bg: "#F0ECF5",
    emoji: "🪞",
  },
};

/* ─── QUOTE CARD COMPONENT ─── */
function QuoteCard({ quote, style = {} }) {
  return (
    <div style={{
      background: quote.bg,
      borderLeft: `5px solid ${quote.color}`,
      borderRadius: "0 20px 20px 0",
      padding: "24px 28px",
      position: "relative",
      ...style,
    }}>
      <div style={{
        fontSize: 52,
        color: quote.color,
        fontFamily: "'Playfair Display', serif",
        lineHeight: 0.6,
        marginBottom: 12,
        opacity: 0.4,
      }}>"</div>
      <p style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        color: COLORS.deepSlate,
        fontSize: "clamp(14px, 2vw, 17px)",
        lineHeight: 1.7,
        fontStyle: "italic",
        margin: "0 0 16px",
      }}>
        {quote.text}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: quote.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>{quote.emoji}</div>
        <div>
          <div style={{
            fontFamily: "'Nunito', sans-serif", fontWeight: 700,
            color: quote.color, fontSize: 15,
          }}>— {quote.author}</div>
          <div style={{
            fontFamily: "'Nunito', sans-serif", fontStyle: "italic",
            color: COLORS.slateLight, fontSize: 13,
          }}>{quote.role}</div>
        </div>
      </div>
    </div>
  );
}


const CATEGORY_COLORS = {
  // ── Fascio 0-3 ──
  Sonno:        { bg: "#EEE9F8", text: "#7060A0" },
  Pianto:       { bg: "#FBEAF2", text: "#A83260" },
  Alimentazione:{ bg: "#E4F4EC", text: "#4A8C6A" },
  Comportamento:{ bg: "#FDF5DF", text: "#C8902A" },
  Esplorazione: { bg: "#EAF3FD", text: "#3A7AB0" },
  Comunicazione:{ bg: "#FBEAF2", text: "#D4447A" },
  Regolazione:  { bg: "#EEE9F8", text: "#7060A0" },
  Sviluppo:     { bg: "#E4F4EC", text: "#4A8C6A" },
  // ── Fascio 3-6 ──
  Separazione:  { bg: "#FBEAF2", text: "#A83260" },
  Creatività:   { bg: "#FDF5DF", text: "#C8902A" },
  Linguaggio:   { bg: "#EEE9F8", text: "#7060A0" },
  Curiosità:    { bg: "#EAF3FD", text: "#3A7AB0" },
  Autonomia:    { bg: "#E4F4EC", text: "#4A8C6A" },
  // ── Fascio 6-12 ──
  Scuola:       { bg: "#FDF5DF", text: "#C8902A" },
  Sociale:      { bg: "#E4F4EC", text: "#4A8C6A" },
  Emotivo:      { bg: "#FBEAF2", text: "#A83260" },
  Intelletto:   { bg: "#EAF3FD", text: "#3A7AB0" },
  Digitale:     { bg: "#F0F0FF", text: "#5050C0" },
  Famiglia:     { bg: "#FDF5DF", text: "#C8902A" },
  // ── Gravidanza ──
  Fisico:       { bg: "#E4F4EC", text: "#4A8C6A" },
  Parto:        { bg: "#FBEAF2", text: "#A83260" },
  Pratico:      { bg: "#FDF5DF", text: "#C8902A" },
  Coppia:       { bg: "#EEE9F8", text: "#7060A0" },
  Cognitivo:    { bg: "#EAF3FD", text: "#3A7AB0" },
  Connessione:  { bg: "#FBEAF2", text: "#D4447A" },
  Relazioni:    { bg: "#FBEAF2", text: "#A83260" },
  // ── 12-15 / 15-18 ──
  Relazione:    { bg: "#FBEAF2", text: "#D4447A" },
  Identità:     { bg: "#EEE9F8", text: "#7060A0" },
  Rischi:       { bg: "#FFF0E0", text: "#C05020" },
  // ── Genitori ──
  Benessere:    { bg: "#FBEAF2", text: "#A83260" },
  Presenza:     { bg: "#E4F4EC", text: "#4A8C6A" },
  Struttura:    { bg: "#FDF5DF", text: "#C8902A" },
  Autocura:     { bg: "#EEE9F8", text: "#7060A0" },
  Risorse:      { bg: "#EAF3FD", text: "#3A7AB0" },
  Paure:        { bg: "#FFF0E0", text: "#C05020" },
  // ── Curiosità forum (uppercase) ──
  SONNO:        { bg: "#EEE9F8", text: "#7060A0" },
  ALLATTAMENTO: { bg: "#FBEAF2", text: "#A83260" },
  BURNOUT:      { bg: "#FBEAF2", text: "#D4447A" },
  SCHERMI:      { bg: "#F0F0FF", text: "#5050C0" },
  SPANNOLINAMENTO:{ bg: "#E4F4EC", text: "#4A8C6A" },
  CONFRONTO:    { bg: "#FDF5DF", text: "#C8902A" },
  SVEZZAMENTO:  { bg: "#E4F4EC", text: "#4A8C6A" },
  COMPORTAMENTO:{ bg: "#FDF5DF", text: "#C8902A" },
  SCUOLA:       { bg: "#FDF5DF", text: "#C8902A" },
  DIGITALE:     { bg: "#F0F0FF", text: "#5050C0" },
  EMOTIVO:      { bg: "#FBEAF2", text: "#A83260" },
  FAMIGLIA:     { bg: "#FDF5DF", text: "#C8902A" },
  RELAZIONI:    { bg: "#FBEAF2", text: "#D4447A" },
  GENITORE:     { bg: "#FBEAF2", text: "#A83260" },
  PUBERTÀ:      { bg: "#EEE9F8", text: "#7060A0" },
  // ── altri residui ──
  Emozioni:     { bg: "#FBEAF2", text: "#A83260" },
  Corpo:        { bg: "#E4F4EC", text: "#4A8C6A" },
  Gioco:        { bg: "#FDF5DF", text: "#C8902A" },
  Pensiero:     { bg: "#EEE9F8", text: "#7060A0" },
  Interessi:    { bg: "#FDF5DF", text: "#C8902A" },
  Quotidiano:   { bg: "#E4F4EC", text: "#4A8C6A" },
};

function Header({ activeSection, setActiveSection, zone, setZone, onCambiaFascia }) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  const ZONE_LABELS_HEADER = {
    "gravidanza": "🤰 Gravidanza",
    "0-3":        "🌱 0–3 anni",
    "3-6":        "🌸 3–6 anni",
    "6-12":       "🌟 6–12 anni",
    "12-15":      "🌊 12–15 anni",
    "15-18":      "✨ 15–18 anni",
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
    { id: "ognibambino",    icon: "🌿", label: "Ogni bambino è unico",   },
    { id: "separazione",    icon: "🏠", label: "Separazione",            },
    { id: "lutto",          icon: "🕊️", label: "Lutto",                  },
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
        position: "sticky", top: 0, zIndex: 200,
        height: 60,
        boxShadow: "0 4px 32px rgba(212,68,122,0.40), 0 1px 0 rgba(255,255,255,0.15) inset",
      }}>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          padding: "0 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: "100%",
        }}>
          {/* Logo — sempre visibile */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "4px 6px",
            flexShrink: 0,
          }}>
            <img
              src="/logo-labebiapp.png"
              alt="La Bebi App"
              style={{
                width: 36, height: 36, borderRadius: "50%",
                objectFit: "cover", flexShrink: 0,
                boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
              }}
            />
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", color: "white", fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>
                La Bebi App
              </div>
              <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 11, fontFamily: "'Nunito', sans-serif", fontStyle: "italic" }}>
                a cura del Dr. Daniele Lami
              </div>
            </div>
          </div>

          {/* Hamburger button con etichetta "Menu" */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
            aria-expanded={menuOpen}
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "1.5px solid rgba(255,255,255,0.40)",
              borderRadius: 12,
              height: 44,
              paddingLeft: 12, paddingRight: 14,
              display: "flex", flexDirection: "row",
              alignItems: "center", justifyContent: "center", gap: 8,
              cursor: "pointer",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              flexShrink: 0,
            }}
          >
            {menuOpen ? (
              <>
                <span style={{ color: "white", fontSize: 18, lineHeight: 1, fontFamily: "monospace" }}>✕</span>
                <span style={{ color: "rgba(255,255,255,0.90)", fontSize: 13, fontFamily: "'Nunito', sans-serif", fontWeight: 700, letterSpacing: "0.3px" }}>Menu</span>
              </>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
                  <span style={{ width: 20, height: 2, background: "white", borderRadius: 2, display: "block" }} />
                  <span style={{ width: 20, height: 2, background: "white", borderRadius: 2, display: "block" }} />
                  <span style={{ width: 14, height: 2, background: "white", borderRadius: 2, display: "block" }} />
                </div>
                <span style={{ color: "rgba(255,255,255,0.90)", fontSize: 13, fontFamily: "'Nunito', sans-serif", fontWeight: 700, letterSpacing: "0.3px" }}>Menu</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Menu overlay */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 190,
            background: "rgba(30,20,40,0.55)",
            backdropFilter: "blur(3px)",
          }}
        />
      )}

      {/* Slide-in menu panel */}
      <div style={{
        position: "fixed",
        top: 60, right: 0,
        width: Math.min(300, window.innerWidth - 40),
        maxHeight: `calc(100vh - 60px)`,
        overflowY: "auto",
        background: "linear-gradient(160deg, #2A1A30 0%, #3A1E3E 100%)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.35)",
        zIndex: 195,
        transform: menuOpen ? "translateX(0)" : "translateX(110%)",
        transition: "transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        borderRadius: "16px 0 0 16px",
        paddingBottom: 24,
      }}>
        {/* Menu header */}
        <div style={{
          padding: "20px 20px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          marginBottom: 8,
        }}>
          <div style={{ fontFamily: "'Playfair Display', serif", color: "white", fontSize: 18, marginBottom: 2 }}>Menu</div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, fontFamily: "'Nunito', sans-serif" }}>La Bebi App · Dr. Daniele Lami</div>
        </div>

        {/* Current zone indicator */}
        {zone && (
          <div style={{
            margin: "4px 16px 12px",
            padding: "10px 16px",
            background: "rgba(212,68,122,0.15)",
            borderRadius: 14,
            border: "1px solid rgba(212,68,122,0.25)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 2 }}>Fascia attiva</div>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: 800, color: "white" }}>{ZONE_LABELS_HEADER[zone] || zone}</div>
            </div>
            <button onClick={() => { setMenuOpen(false); if (onCambiaFascia) onCambiaFascia(); }} style={{
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 8, padding: "5px 10px", color: "rgba(255,255,255,0.8)",
              fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700,
              cursor: "pointer", touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
            }}>Cambia</button>
          </div>
        )}

        {/* Nav items */}
        {nav.map((item) => {
          const active = item.targetSection
            ? activeSection === item.targetSection && zone === item.zone
            : activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              style={{
                display: "flex", alignItems: "center",
                width: "100%", textAlign: "left",
                background: active
                  ? "linear-gradient(90deg, rgba(212,68,122,0.25), rgba(232,115,90,0.15))"
                  : "transparent",
                border: "none",
                borderLeft: active ? "3px solid #D4447A" : "3px solid transparent",
                padding: "12px 20px",
                cursor: "pointer",
                fontFamily: "'Nunito', sans-serif",
                fontSize: 15,
                fontWeight: active ? 800 : 500,
                color: active ? "white" : "rgba(255,255,255,0.72)",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                transition: "background 0.15s, color 0.15s",
                gap: 12,
              }}
            >
              {ZONE_IMAGES[item.zone] ? (
                <img
                  src={ZONE_IMAGES[item.zone]}
                  alt=""
                  style={{
                    width: 28, height: 28,
                    objectFit: "contain",
                    flexShrink: 0,
                    opacity: active ? 1 : 0.85,
                  }}
                />
              ) : (
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, width: 28, textAlign: "center" }}>
                  {item.icon}
                </span>
              )}
              {item.label}</button>
          );
        })}

        {/* Footer in menu */}
        <div style={{
          margin: "16px 20px 0",
          paddingTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: 12,
          color: "rgba(255,255,255,0.60)",
          fontFamily: "'Nunito', sans-serif",
          lineHeight: 1.7,
        }}>
          La Bebi App v3.2 · Dalla gravidanza ai 18 anni
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   🧭 SUBNAV — Barra di navigazione rapida zona-specifica
   Sticky sotto l'header (top: 60px). Sfondo caldo crema,
   active state con l'accent della zona corrente.
   Sinistra: 4 link principali · Destra: 2 link secondari (più piccoli)
═══════════════════════════════════════════════════════════════ */
function SubNav({ activeSection, setActiveSection, zone, onCambiaFascia, headerHeight }) {
  const isMobile = useIsMobile();

  /* Accent color per zona — rispecchia ZONE_COLORS dell'App */
  const ZONE_ACCENT = {
    "gravidanza": "#D4447A",
    "0-3":        "#52A37A",
    "3-6":        "#E8A824",
    "6-12":       "#E8735A",
    "12-15":      "#4090C8",
    "15-18":      "#8B7AC0",
    "papa":       "#4090C8",
  };
  const accent = ZONE_ACCENT[zone] || COLORS.rose;

  /* Label brevi zona-dipendenti per pillola e bottone Scopri */
  const ZONE_SHORT = {
    "gravidanza": "🤰 Gravidanza",
    "0-3":        "🌱 0–3",
    "3-6":        "🌸 3–6",
    "6-12":       "🌟 6–12",
    "12-15":      "🌊 12–15",
    "15-18":      "✨ 15–18",
    "papa":       "🤰 Gravidanza",
  };
  const zoneShort = ZONE_SHORT[zone] || "🌱";

  /* Tutte le sezioni che contano come "Guida attiva" */
  const guideIds = ["guide", "gravidanza", "preadolescenza", "adolescenza", "allattamento"];

  /* Visibilità lato destro:
     - pillola zona: tutte le sezioni tranne library e glossario
     - bottone Scopri: solo nelle sezioni guida (massimo valore contestuale) */
  const hiddenSections = ["library", "glossario", "ognibambino", "separazione", "lutto"];
  const showZonaPillola = zone && !hiddenSections.includes(activeSection) && zone !== "gravidanza" && zone !== "papa";
  const showScopri      = zone && guideIds.includes(activeSection);

  const isActive = (id) => {
    if (id === "guide") return guideIds.includes(activeSection);
    return activeSection === id;
  };

  const isInGuide = guideIds.includes(activeSection);
  const isInChecklist = activeSection === "checklist" || activeSection === "genitori";
  const showExtraNav = !isInGuide && !isMobile;
  const mainItems = [
    { id: "guide",     label: "Guida"     },
    ...(showExtraNav ? [
      { id: "curiosita", label: "Curiosità" },
      { id: "screens",   label: "TV & Cell" },
    ] : []),
  ];

  const makeStyle = (id, small) => {
    const active = isActive(id);
    return {
      background:   active ? accent : "transparent",
      border:       active ? "none" : `1.5px solid transparent`,
      borderRadius: 20,
      padding:      small
        ? (isMobile ? "4px 9px"  : "4px 11px")
        : (isMobile ? "5px 11px" : "5px 14px"),
      color:        active ? "#FFFFFF" : COLORS.deepSlate,
      fontFamily:   "'Nunito', sans-serif",
      fontSize:     small
        ? (isMobile ? 11 : 12)
        : (isMobile ? 12 : 13),
      fontWeight:   active ? 800 : 600,
      cursor:       "pointer",
      whiteSpace:   "nowrap",
      touchAction:  "manipulation",
      WebkitTapHighlightColor: "transparent",
      transition:   "background 0.17s, color 0.17s, box-shadow 0.17s",
      flexShrink:   0,
      boxShadow:    active ? `0 2px 10px ${accent}50` : "none",
      letterSpacing: "-0.1px",
      lineHeight:   1,
    };
  };

  /* Stile condiviso pillola e bottone Scopri — lato destro */
  const rightBtnStyle = {
    background:    `${accent}18`,
    border:        `1.5px solid ${accent}40`,
    borderRadius:  20,
    padding:       isMobile ? "4px 9px" : "4px 12px",
    color:         accent,
    fontFamily:    "'Nunito', sans-serif",
    fontSize:      isMobile ? 11 : 12,
    fontWeight:    700,
    cursor:        "pointer",
    whiteSpace:    "nowrap",
    touchAction:   "manipulation",
    WebkitTapHighlightColor: "transparent",
    transition:    "background 0.17s, box-shadow 0.17s",
    flexShrink:    0,
    lineHeight:    1,
  };

  return (
    <div style={{
      position:       "sticky",
      top:            headerHeight,
      zIndex:         190,
      background:     "rgba(255,249,245,0.97)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom:   `1.5px solid ${accent}28`,
      boxShadow:      `0 2px 14px rgba(42,31,46,0.07)`,
      transition:     "top 0.22s ease",
    }}>
      <div style={{
        maxWidth:      900,
        margin:        "0 auto",
        padding:       "0 12px",
        display:       "flex",
        alignItems:    "center",
        height:        44,
        gap:           8,
        overflowX:     "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}>
        {/* Gruppo principale — sinistra */}
        <div style={{ display: "flex", gap: 2, alignItems: "center", flex: 1, minWidth: 0 }}>
          {/* Badge zona — cerchio con identità fascia */}
          {zone && (() => {
            const ZONE_BADGE = {
              "gravidanza": "G",
              "0-3":        "0-3",
              "3-6":        "3-6",
              "6-12":       "6-12",
              "12-15":      "12-15",
              "15-18":      "15-18",
              "papa":       "FG",
            };
            const label = ZONE_BADGE[zone];
            if (!label) return null;
            const size = isMobile ? 28 : 30;
            const fs = label.length <= 2
              ? (isMobile ? 11 : 12)
              : label.length <= 3
                ? (isMobile ? 10 : 11)
                : (isMobile ? 8.5 : 9.5);
            return (
              <span style={{
                fontFamily:      "'Playfair Display', Georgia, serif",
                fontSize:        fs,
                fontWeight:      700,
                color:           accent,
                background:      `${accent}15`,
                border:          `1.5px solid ${accent}35`,
                borderRadius:    "50%",
                width:           size,
                height:          size,
                minWidth:        size,
                display:         "inline-flex",
                alignItems:      "center",
                justifyContent:  "center",
                letterSpacing:   label.length > 3 ? "-0.3px" : "0.3px",
                lineHeight:      1,
                flexShrink:      0,
                userSelect:      "none",
                marginRight:     4,
              }}>
                {label}
              </span>
            );
          })()}
          {mainItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              style={makeStyle(item.id, false)}
              onMouseEnter={e => {
                if (!isActive(item.id)) e.currentTarget.style.background = `${accent}1A`;
              }}
              onMouseLeave={e => {
                if (!isActive(item.id)) e.currentTarget.style.background = "transparent";
              }}
            >
              {item.label}
            </button>
          ))}
          {/* Bottone toggle checklist — visibile solo in checklist/genitori */}
          {isInChecklist && zone && (() => {
            const isGrav = zone === "gravidanza" || zone === "papa";
            const goTo = activeSection === "checklist" ? "genitori" : "checklist";
            const label = activeSection === "checklist"
              ? (isMobile
                  ? (isGrav ? "Siete pronti?" : "Tu")
                  : (isGrav ? "Siete pronti?" : "Come stai tu?"))
              : (isMobile
                  ? (isGrav ? "Come va?" : "Tuo figlio")
                  : (isGrav ? "Come va?" : "Scopri tuo figlio"));
            return (
              <button
                onClick={() => setActiveSection(goTo)}
                style={{
                  background:    `${accent}18`,
                  border:        `1.5px solid ${accent}40`,
                  borderRadius:  20,
                  padding:       isMobile ? "4px 9px" : "4px 12px",
                  color:         accent,
                  fontFamily:    "'Nunito', sans-serif",
                  fontSize:      isMobile ? 11 : 12,
                  fontWeight:    700,
                  cursor:        "pointer",
                  whiteSpace:    "nowrap",
                  touchAction:   "manipulation",
                  WebkitTapHighlightColor: "transparent",
                  transition:    "background 0.17s",
                  flexShrink:    0,
                  lineHeight:    1,
                  marginLeft:    2,
                }}
                aria-label={goTo === "genitori" ? "Vai alla checklist genitore" : "Vai alla checklist figlio"}
              >
                {label}
              </button>
            );
          })()}
        </div>

        {/* Gruppo contestuale — destra */}
        {(showZonaPillola || showScopri) && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {/* Separatore visivo */}
            <div style={{ width: 1, height: 20, background: `${accent}30`, flexShrink: 0 }} />

            {/* Pillola zona → apre zone picker */}
            {showZonaPillola && (
              <button
                onClick={onCambiaFascia}
                style={rightBtnStyle}
                aria-label="Cambia fascia di età"
              >
                {isMobile ? "Altre fasce" : "Cambia fascia"}
              </button>
            )}

            {/* Bottone Scopri tuo figlio → sezione checklist */}
            {showScopri && (
              <button
                onClick={() => setActiveSection("checklist")}
                style={activeSection === "checklist"
                  ? { ...rightBtnStyle, background: accent, color: "white", border: "none", boxShadow: `0 2px 8px ${accent}40` }
                  : rightBtnStyle}
                aria-label="Scopri il profilo di tuo figlio"
              >
                {isMobile
                  ? ((zone === "gravidanza" || zone === "papa") ? "Come va?" : "Tuo figlio")
                  : "Scopri tuo figlio"}
              </button>
            )}

            {/* Bottone Che genitore sono? → sezione genitori */}
            {showScopri && activeSection !== "genitori" && (
              <button
                onClick={() => setActiveSection("genitori")}
                style={{ ...rightBtnStyle, background: "rgba(155,138,196,0.15)", color: "#7060A0", border: "1.5px solid rgba(155,138,196,0.35)", boxShadow: "none" }}
                aria-label="Vai alla sezione per i genitori"
              >
                {isMobile
                  ? ((zone === "gravidanza" || zone === "papa") ? "Siete pronti?" : "Tu")
                  : "Che genitore sono?"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nasconde la scrollbar in WebKit */}
      <style>{`.subnav-scroll::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

/* ─── CONFIGURAZIONE E DATI INFOGRAFICA ─── */

const BRAIN_ZONES_DATA = {
  "gravidanza": {
    title: "La Formazione del Cervello",
    lobes: {
      frontal: "Iniziano a formarsi le primissime connessioni che un giorno governeranno il pensiero logico e le emozioni.",
      parietal: "Si sviluppano i recettori sensoriali: il tuo bimbo inizia a percepire il tatto e il tepore del grembo.",
      temporal: "L'udito si attiva: verso la fine del secondo trimestre, può già ascoltare il battito del tuo cuore.",
      occipital: "I nervi ottici si stanno formando, preparandosi a catturare la prima luce una volta nato.",
      cerebellum: "Cresce rapidamente per preparare il bambino ai primi riflessi motori istintivi."
    }
  },
  "0-3": {
    title: "L'Esplosione Neurale",
    lobes: {
      frontal: "Si attivano le prime aree motorie e nascono le primissime sfide con l'autocontrollo.",
      parietal: "Esplora il mondo attraverso la bocca e il tatto, costruendo una mappa sensoriale complessa.",
      temporal: "L'udito e la memoria creano le basi per l'esplosione del linguaggio.",
      occipital: "La vista impara a mettere a fuoco e a riconoscere i volti familiari.",
      cerebellum: "Un lavoro incessante per sostenere la testa, imparare a gattonare e infine camminare."
    }
  },
  "0-3m": {
    title: "I Primi Cento Giorni",
    lobes: {
      frontal: "Le aree motorie primarie si accendono per i riflessi neonatali. La corteccia prefrontale è ancora silente: il neonato vive nel presente assoluto, senza filtro tra stimolo e risposta.",
      parietal: "La pelle è il primo organo di conoscenza. Il contatto pelle-a-pelle attiva circuiti somatosensoriali che regolano il cortisolo e costruiscono le prime mappe corporee.",
      temporal: "Riconosce la voce materna già dai primi giorni — l'ha ascoltata per mesi nel grembo. L'udito guida l'orientamento sociale prima ancora della vista.",
      occipital: "Vede a circa 20-30 cm — esattamente la distanza del viso durante l'allattamento. Preferisce i volti a qualsiasi altro stimolo visivo.",
      cerebellum: "Coordina i riflessi di suzione, prensione e il riflesso di Moro. È il pilota automatico di un corpo che impara ad abitare il mondo."
    }
  },
  "3-6m": {
    title: "Il Sorriso Sociale",
    lobes: {
      frontal: "Compaiono i primi movimenti volontari — la mano che cerca un oggetto non è più riflesso, è intenzione. Le prime connessioni prefrontali iniziano a distinguere il familiare dall'estraneo.",
      parietal: "Le mani diventano strumenti di esplorazione: afferra, porta alla bocca, confronta superfici e consistenze. La mappa sensoriale si arricchisce ogni giorno.",
      temporal: "Il sorriso sociale segna una rivoluzione: il bambino risponde al volto umano con intenzionalità. Inizia a distinguere i pattern della lingua materna da quelli di altre lingue.",
      occipital: "La vista migliora rapidamente — segue oggetti in movimento, riconosce i volti familiari con sicurezza. Il colore e la profondità iniziano a definirsi.",
      cerebellum: "Il controllo della testa è stabile, il tronco si rafforza. Prepara il terreno per la posizione seduta e i primi tentativi di rotolamento."
    }
  },
  "6-12m": {
    title: "L'Esploratore",
    lobes: {
      frontal: "Nasce la permanenza dell'oggetto — sa che ciò che non vede esiste ancora. I primi circuiti di inibizione si accendono, ma il controllo è minimo: tutto va in bocca, tutto si tocca.",
      parietal: "Gattonare e poi sollevarsi in piedi rivoluziona la percezione dello spazio. Le coordinate cambiano: il mondo si vede dall'alto, non più dal pavimento.",
      temporal: "Il babbling diventa ritmico e melodico, la lallazione imita l'intonazione della lingua madre. Comprende molte più parole di quante ne produca — l'ascolto precede sempre la parola.",
      occipital: "La percezione della profondità si consolida — il 'visual cliff' di Gibson lo dimostra. Inizia a leggere le espressioni facciali del genitore per decidere se un ambiente è sicuro.",
      cerebellum: "Gattonamento, verticalizzazione, primi passi assistiti. Ogni caduta è un aggiornamento del software motorio — non un fallimento, ma un apprendimento."
    }
  },
  "12-18m": {
    title: "Le Prime Parole",
    lobes: {
      frontal: "L'intenzionalità si affina: indica con il dito, cerca la condivisione dell'attenzione. I capricci compaiono perché il desiderio è chiaro ma il linguaggio per esprimerlo ancora no.",
      parietal: "La motricità fine esplode — impila, infila, svuota e riempie. Ogni oggetto è un laboratorio. La propriocezione si calibra attraverso migliaia di gesti quotidiani.",
      temporal: "Arrivano le prime parole vere. Il vocabolario ricettivo è molto più ampio di quello espressivo — capisce 'dammi la palla' prima di dire 'palla'. L'ippocampo inizia a consolidare ricordi episodici.",
      occipital: "Riconosce immagini nei libri e le collega agli oggetti reali. Questa capacità di rappresentazione simbolica è una conquista cognitiva profonda.",
      cerebellum: "La deambulazione autonoma cambia tutto — mani libere, campo visivo allargato, autonomia esplorativa. Il cervelletto lavora senza sosta per affinare equilibrio e coordinazione."
    }
  },
  "18-24m": {
    title: "L'Esplosione del Linguaggio",
    lobes: {
      frontal: "Compare il gioco simbolico — un cucchiaio diventa un aeroplano, una scatola una casa. La corteccia prefrontale comincia a sostenere il 'fare finta', ma la frustrazione è ancora travolgente quando la realtà non segue l'intenzione.",
      parietal: "Integra informazioni da più sensi contemporaneamente: guarda, tocca, ascolta e decide. Le abilità prassiche si affinano — mangia con il cucchiaio, inizia a scarabocchiare con intenzione.",
      temporal: "Esplosione del vocabolario — impara anche 5-10 parole nuove al giorno. Le prime frasi a due parole segnano l'ingresso nella combinazione linguistica. La memoria autobiografica muove i primi passi.",
      occipital: "Riconosce sé stesso allo specchio (test del rouge, ~18 mesi) — una pietra miliare dell'autoconsapevolezza visiva che pochi altri mammiferi raggiungono.",
      cerebellum: "Corre, si arrampica, balla. La coordinazione grosso-motoria è in pieno sviluppo. Inizia a coordinare sequenze motorie complesse — salire le scale un gradino alla volta."
    }
  },
  "24-36m": {
    title: "L'Età del Perché",
    lobes: {
      frontal: "Il pensiero causale si accende — ogni 'perché?' è un tentativo di costruire una mappa del mondo. L'autocontrollo resta fragile, ma i primi segni di attesa e turno compaiono nel gioco con i pari.",
      parietal: "La dominanza manuale si stabilisce. La motricità fine permette di disegnare cerchi, linee intenzionali, prime forme riconoscibili. Inizia a vestirsi e svestirsi — con lentezza e grande orgoglio.",
      temporal: "Racconta micro-storie con sequenza temporale. Il linguaggio diventa strumento di regolazione emotiva — 'no voglio!' è faticoso ma è un progresso enorme rispetto al pianto indifferenziato.",
      occipital: "Distingue e nomina i colori, riconosce forme geometriche semplici. La percezione visiva è ora abbastanza matura da supportare i primi giochi di categorizzazione.",
      cerebellum: "Pedala sul triciclo, salta con due piedi, lancia una palla con direzione. L'integrazione visuo-motoria è sufficientemente fluida per i primi giochi sportivi cooperativi."
    }
  },
  "3-6": {
    title: "L'Età della Fantasia",
    lobes: {
      frontal: "Inizia a frenare gli impulsi e fiorisce la capacità di capire le emozioni degli altri.",
      parietal: "Padronanza dello spazio e incredibile sviluppo della coordinazione occhio-mano.",
      temporal: "Esplosione del vocabolario: racconta storie e costruisce ricordi strutturati.",
      occipital: "Elaborazione visiva complessa per riconoscere forme, colori e dettagli nei libri.",
      cerebellum: "L'equilibrio si affina: dalla corsa ai salti, tutto diventa più fluido."
    }
  },
  "6-12": {
    title: "Il Grande Ordine",
    lobes: {
      frontal: "Migliora nettamente l'attenzione prolungata, la pianificazione e il pensiero logico.",
      parietal: "Sensibilità spaziale essenziale per scrivere, disegnare e per i concetti matematici.",
      temporal: "Lettura e regole sociali si solidificano. La memoria diventa una cassaforte.",
      occipital: "Perfetta sintonia con le altre aree per l'apprendimento formale e la lettura.",
      cerebellum: "Coordina i movimenti fini complessi: andare in bici, suonare uno strumento, danzare."
    }
  },
  "12-15": {
    title: "Il Cantiere Aperto",
    lobes: {
      frontal: "Ancora acerbo rispetto alle emozioni: fatica a valutare i rischi e a frenare le reazioni.",
      parietal: "Integra le informazioni sul proprio corpo in rapido cambiamento.",
      temporal: "L'amigdala è iperattiva: le reazioni emotive arrivano prima del pensiero, e con un'intensità che il ragazzo stesso non sa spiegarsi.",
      occipital: "Elabora costantemente gli stimoli sociali e i segnali visivi complessi.",
      cerebellum: "Ricalibra l'equilibrio di un corpo che è cresciuto molto in fretta."
    }
  },
  "15-18": {
    title: "Verso la Maturità",
    lobes: {
      frontal: "Si avvicina alla maturità: migliora la capacità di pensare al futuro e prendere decisioni.",
      parietal: "Gestisce il pensiero astratto avanzato e la comprensione di concetti complessi.",
      temporal: "Si consolidano i circuiti legati alla gratificazione sociale e ai ricordi emotivi.",
      occipital: "Totalmente specializzato, supporta il riconoscimento istantaneo di pattern visivi.",
      cerebellum: "Perfeziona la grazia e la potenza muscolare, solidificando abilità avanzate."
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

/* ─── COMPONENTE INFOGRAFICA ─── */

function BrainInfographic({ zone }) {
  const [activeLobe, setActiveLobe] = useState(null);
  const isMobile = useIsMobile(); // Assicurati che questo hook sia definito nel file
  const infoRef = useRef(null);
  
  const content = BRAIN_ZONES_DATA[zone] || BRAIN_ZONES_DATA["0-3"];

  /*ScrollIntoView rimosso: la descrizione è già visibile
     all'altezza dell'illustrazione, lo scroll forzato peggiorava la UX */

  return (
    <div style={{
      backgroundColor: "#ffffff",
      borderRadius: "32px",
      padding: isMobile ? "24px 16px" : "40px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.05)",
      border: "1px solid #F0F0F0",
      width: "100%", maxWidth: "950px", margin: "20px auto"
    }}>
      <div style={{ textAlign: "center", marginBottom: isMobile ? "24px" : "30px" }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#2D242E", fontSize: isMobile ? "24px" : "30px", marginBottom: "8px" }}>
          {content.title}
        </h3>
        <p style={{ color: "#7A6B7C", fontSize: "15px", fontStyle: "italic" }}>
          Tocca le aree dell'illustrazione per scoprire i dettagli dello sviluppo
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "20px" : "40px", alignItems: "center" }}>
        
        {/* IMMAGINE PNG CON HOTSPOTS INVISIBILI */}
        <div style={{ flex: 1, position: "relative", width: "100%" }}>
          <img 
            src="/brain_anatomy.png" 
            alt="Anatomia del cervello" 
            style={{ width: "100%", height: "auto", display: "block", borderRadius: "12px" }}
            onError={(e) => { e.target.src = "https://via.placeholder.com/500x400?text=Immagine+Cervello+Mancante"; }}
          />
          
          {/* Overlay cliccabile — hotspot accessibili */}
          <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
            {[
              { key: "frontal", label: "Esplora il lobo frontale", top: "15%", left: "5%", width: "40%", height: "55%" },
              { key: "parietal", label: "Esplora il lobo parietale", top: "10%", left: "45%", width: "35%", height: "40%" },
              { key: "temporal", label: "Esplora il lobo temporale", top: "50%", left: "25%", width: "35%", height: "35%" },
              { key: "occipital", label: "Esplora il lobo occipitale", top: "45%", left: "70%", width: "25%", height: "35%" },
              { key: "cerebellum", label: "Esplora il cervelletto", top: "75%", left: "55%", width: "25%", height: "20%" },
            ].map(h => (
              <button
                key={h.key}
                onClick={() => setActiveLobe(h.key)}
                aria-label={h.label}
                style={{ position: "absolute", top: h.top, left: h.left, width: h.width, height: h.height, cursor: "pointer", background: "transparent", border: "none", padding: 0, outline: "none" }}
              />
            ))}
          </div>
        </div>

        {/* PANNELLO TESTI INTERATTIVI */}
        <div ref={infoRef} style={{ flex: 1.2, width: "100%", display: "flex", flexDirection: "column", gap: "12px" }} role="group" aria-label="Aree del cervello" aria-live="polite">
          {Object.keys(LOBE_CONFIG).map((key) => {
            const lobe = LOBE_CONFIG[key];
            const isActive = activeLobe === key;
            if (activeLobe && !isActive) return null;

            return (
              <button 
                key={key}
                onClick={() => setActiveLobe(isActive ? null : key)}
                aria-expanded={isActive}
                aria-label={isActive ? `Chiudi ${lobe.label}` : `Apri ${lobe.label}`}
                style={{
                  padding: "18px", borderRadius: "20px",
                  backgroundColor: isActive ? "#FFF" : "#F8F8F8",
                  border: `2px solid ${isActive ? lobe.color : "transparent"}`,
                  boxShadow: isActive ? `0 10px 25px ${lobe.color}30` : "none",
                  cursor: "pointer", transition: "all 0.3s ease",
                  textAlign: "left", width: "100%",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: isActive ? "10px" : "0" }}>
                  <span style={{ fontSize: "24px" }}>{lobe.icon}</span>
                  <span style={{ fontWeight: 800, color: "#2D242E", fontSize: "17px" }}>{lobe.label}</span>
                </div>
                {isActive && (
                  <p style={{ margin: 0, color: "#5A4B5E", fontSize: "15px", lineHeight: "1.6", animation: "fadeIn 0.4s ease", fontFamily: "inherit" }}>
                    {content.lobes[key]}
                  </p>
                )}
              </button>
            );
          })}
          {activeLobe && (
            <button 
              onClick={() => setActiveLobe(null)}
              style={{
                alignSelf: "center", background: "#F0F0F0", border: "none", color: "#6B5570", 
                fontSize: "13px", fontWeight: 700, cursor: "pointer", marginTop: "10px",
                padding: "8px 20px", borderRadius: "20px"
              }}
            >
              ← Torna alla visione d'insieme
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const HERO_DATA = {
  "gravidanza": {
    title: "In attesa",
    accent: "ogni emozione conta",
    desc: "Nove mesi in cui il tuo corpo e la tua psiche si trasformano insieme. Qui trovi neuroscienze, emozioni e strumenti concreti per vivere questa attesa con più consapevolezza."
  },
  "0-3": {
    title: "I primi mille giorni",
    accent: "quando ogni carezza costruisce il cervello",
    desc: "Il periodo di massima plasticità cerebrale. Ogni interazione — uno sguardo, un abbraccio, una voce calma — costruisce circuiti che dureranno tutta la vita."
  },
  "3-6": {
    title: "L'età della fantasia",
    accent: "tra neuroni specchio e gioco simbolico",
    desc: "Il bambino scopre l'empatia, inventa mondi, chiede perché. La corteccia prefrontale cresce ma è ancora acerba — da qui i 'capricci', che non sono capricci."
  },
  "6-12": {
    title: "Il grande ordine",
    accent: "logica, amicizia e senso di giustizia",
    desc: "Il cervello integra emozione e ragionamento. Nasce un senso morale interno, le amicizie diventano profonde, l'apprendimento formale decolla."
  },
  "12-15": {
    title: "Il cervello in cantiere",
    accent: "capire la tempesta per restargli vicino",
    desc: "La pubertà rimodella il cervello da cima a fondo. Emozioni a volume massimo, senza ancora il telecomando per abbassarle. Non è instabilità — è biologia."
  },
  "15-18": {
    title: "Verso la maturità",
    accent: "identità, rischio e pensiero astratto",
    desc: "La corteccia prefrontale fa un balzo in avanti. Il ragazzo costruisce chi è, sperimenta, si allontana per tornare. Il genitore resta la base sicura — silenziosa."
  },
};



const ALLATT_RISORSE = {
  servizi: [
    { icon: "🤱", title: "SIP — Sezione Allattamento", text: "Sotto-sito dedicato della Società Italiana di Pediatria: raccomandazioni, FAQ, supporto per le famiglie.", url: "https://www.sip.it/allattamento/" },
    { icon: "🌍", title: "OMS — Breastfeeding", text: "Raccomandazioni internazionali OMS sull'allattamento esclusivo fino a 6 mesi e complementare fino a 2 anni e oltre.", url: "https://www.who.int/health-topics/breastfeeding" },
  ],
  footer: [
    { label: "OMS — Infant and young child feeding (fact sheet)", url: "https://www.who.int/news-room/fact-sheets/detail/infant-and-young-child-feeding" },
    { label: "SIP — Allattamento e salute mentale materna (Position Statement TAS 2023)", url: "https://sip.it/2024/05/07/allattamento-e-salute-mentale-materna/" },
    { label: "Ministero della Salute — Tavolo Tecnico Allattamento (TAS 2023)", url: "https://www.salute.gov.it/portale/temi/p2_6.jsp?id=3894&area=nutrizione&menu=allattamento" },
  ],
};

function GuidaAllattamento({ embedded = false }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const isMobile = useIsMobile();

  const sections = [
    {
      icon: "🤱", label: "Perché vale la pena provare",
      content: [
        {
          title: "Un'esperienza che sorprende",
          text: "Molte mamme che non sapevano se avrebbero allattato racccontano la stessa cosa: non immaginavano quanto sarebbe stato bello. Non solo nutrire — ma quella vicinanza fisica unica, il respiro che si sincronizza, la sensazione di essere esattamente ciò di cui il tuo bambino ha bisogno. Non è romanticismo: è ossitocina, il cosiddetto ormone del legame, che si rilascia in entrambi durante ogni poppata (Feldman, 2007). Vale la pena provarci — con calma, senza pressioni, vedendo come va."
        },
        {
          title: "Cosa contiene il latte materno",
          text: "Il latte materno è vivo, nel senso letterale: contiene cellule, anticorpi, batteri benefici e oltre 200 componenti che cambiano ogni giorno adattandosi al bambino. Le immunoglobuline IgA proteggono l'intestino ancora immaturo, gli oligosaccaridi HMO nutrono il microbioma, i fattori di crescita aiutano lo sviluppo neurologico. La ricerca è chiara: ogni settimana di allattamento aggiunge qualcosa. Ma anche una settimana, o un mese, vale (Victora et al., Lancet 2016). Non è tutto-o-niente."
        },
        {
          title: "Bene per te, non solo per lui",
          text: "Spesso si parla solo dei benefici per il bambino. Ma allattare fa bene anche a te: riduce il rischio di cancro al seno del 4-6% per ogni anno di allattamento (Lancet 2002), abbassa i livelli di cortisolo (l'ormone dello stress), e quella dose di ossitocina post-poppata è — letteralmente — un calmante naturale. Molte mamme descrivono le poppate notturne come l'unico momento di vera quiete. Non tutte, certo. Ma vale sapere che c'è anche questo lato."
        }
      ]
    },
    {
      icon: "📋", label: "Come iniziare bene",
      content: [
        {
          title: "I primissimi giorni — il colostro",
          text: "Il primo latte si chiama colostro ed è giallo, denso, pochissimo — pochissime gocce per poppata. È perfettamente calibrato sullo stomaco del neonato, che alla nascita è grande come una ciliegia (5-7 ml). Quelle gocce sembrano poche e non lo sono: sono concentratissime di anticorpi e fattori di crescita. Se hai la sensazione che non ti arrivi abbastanza latte, nei primi giorni è normale — il latte maturo arriva tra il 3° e il 5° giorno. Attacca spesso, fidati del processo."
        },
        {
          title: "L'attacco — la cosa più importante",
          text: "Il segreto di un allattamento sereno sta quasi tutto nell'attacco. Un attacco buono non fa quasi mai male e dà al bambino il latte che gli serve. Segnali che funziona: la sua bocca è aperta larga (come uno sbadiglio), le labbra sono eversa verso l'esterno, il mento tocca il seno, le guance sono tonde non infossate. Senti deglutire ritmicamente. Se fa male o senti risucchio — fai scivolare un dito all'angolo della bocca e riprova. Chiedere aiuto a un'ostetrica o a una consulente IBCLC per l'attacco non è un fallimento: è la mossa più intelligente."
        },
        {
          title: "Quante volte e per quanto",
          text: "Allattamento a domanda: quando il bambino lo chiede, non secondo un orologio. Nei primi mesi questo significa spesso — 8-12 volte al giorno, anche di notte. Le poppate notturne non sono una punizione: la prolattina, l'ormone che produce il latte, ha i picchi di notte. Più attacchi, più latte produci — è un sistema perfettamente circolare. La durata varia: ci sono poppate da 5 minuti e da 40. Lascia che sia lui a decidere quando ha finito — il latte più ricco di grassi arriva nella seconda parte della poppata (Woolridge, 1986)."
        },
        {
          title: "Come capire che va bene",
          text: "Non puoi vedere quanto beve. Questo può essere fonte di ansia — è comprensibile. I segnali di buona nutrizione sono altri: dopo i primi 4-5 giorni almeno 6 pannolini bagnati al giorno, il bambino che lascia spontaneamente il seno soddisfatto, la crescita di almeno 20 grammi al giorno. Il peso alla nascita si riacquista entro 10-14 giorni. Se qualcosa ti preoccupa: parla col pediatra. Ma la maggior parte delle mamme che credevano di non avere abbastanza latte, in realtà ne avevano."
        }
      ]
    },
    {
      icon: "🧩", label: "Quando è difficile",
      content: [
        {
          title: "Fa male? Capita, ma non è normale",
          text: "Un po' di sensibilità nei primi giorni è comune. Il dolore vero — ragadi, sanguinamento, ferite — non è la norma e non va accettato come parte del pacchetto. Quasi sempre è un attacco da correggere: cambiare l'angolazione, far aprire di più la bocca. Un po' di latte materno sulle ragadi dopo la poppata aiuta davvero (ha proprietà antibatteriche e cicatrizzanti). Non devi soffrire in silenzio: una consulente IBCLC può risolvere in una seduta quello che settimane di tentativi non hanno risolto."
        },
        {
          title: "Non ho abbastanza latte — il dubbio più comune",
          text: "È il pensiero che attraversa quasi tutte le mamme almeno una volta. Nella grande maggioranza dei casi, il latte c'è — basta stimolare di più. La vera ipogalattia primaria riguarda meno del 5% delle donne. La produzione funziona per domanda: più il bambino attacca, più il corpo produce. Aggiungere del latte artificiale senza indicazione medica può rompere questo ciclo e ridurre davvero la produzione (Kramer & Kakuma, Cochrane 2012). Se hai dubbi sulla crescita, il pediatra è il punto di riferimento — non le opinioni di chi ti confronta con un altro bambino."
        },
        {
          title: "La mastite — non smettere",
          text: "La mastite è un'infiammazione del seno — febbre, zona rossa e dolente, malessere — e colpisce circa il 10% delle mamme che allattano. La reazione istintiva è smettere di allattare da quel seno. Fai l'opposto: continuare a svuotarlo accelera la guarigione (ABM Clinical Protocol, 2014; Spencer, 2008). Se dopo 24 ore non migliora, servono antibiotici — ma l'allattamento continua senza problemi. L'ingorgo dei primi giorni (seno teso e caldo) invece passa in 24-48 ore con poppate frequenti e qualche impacco."
        },
        {
          title: "Farmaci e allattamento",
          text: "Uno dei motivi più comuni per cui le mamme smettono è la convinzione di non poter prendere medicine mentre allattano. Nella realtà, la maggior parte dei farmaci comuni è compatibile. Paracetamolo, ibuprofene, amoxicillina, la maggior parte degli antidepressivi SSRI — tutti sicuri (Hotham & Hotham, 2015). Prima di smettere, consulta LactMed (NIH) o e-Lactancia: sono banche dati gratuite e aggiornate. Il medico che prescrive il farmaco non sempre sa dell'allattamento — informalo tu."
        }
      ]
    },
    {
      icon: "❤️", label: "Il tuo benessere conta",
      content: [
        {
          title: "La stanchezza è reale",
          text: "Non c'è modo di abbellirlo: le prime settimane sono faticose. La deprivazione del sonno è documentata come uno dei principali fattori di rischio per la depressione post-partum (Dorheim et al., 2009). Questo non significa che devi smettere di allattare — ma significa che hai il diritto di ricevere aiuto, di dormire quando il bambino dorme, di chiedere a qualcuno di occuparsi di lui per qualche ora. La tua energia non è infinita e non devi fingere che lo sia."
        },
        {
          title: "L'ambivalenza è normale",
          text: "Puoi amare profondamente il tuo bambino e allo stesso tempo sentire che vorresti il tuo corpo per te. Puoi voler allattare e avere momenti in cui non ne puoi più. Nessuna di queste sensazioni ti rende una cattiva madre — ti rende una persona. L'allattamento è bello e impegnativo allo stesso tempo, spesso nella stessa poppata. Non devi sentirti in colpa per la stanchezza, né per il piacere. Entrambi sono reali."
        },
        {
          title: "Smettere non è fallire",
          text: "L'OMS raccomanda l'allattamento fino a 2 anni — come obiettivo di salute pubblica globale, non come metro di giudizio per ogni singola madre. Ogni giorno di allattamento ha valore. Smettere a 2 settimane, a 3 mesi o a 6 mesi non è un fallimento: è una scelta che hai tutto il diritto di fare, per qualsiasi motivo. Stuebe (2014) ha documentato come il senso di colpa legato all'allattamento sia uno dei fattori di rischio per la depressione post-partum. Una mamma serena — che allatti o no — è sempre la cosa migliore per il bambino."
        }
      ]
    }
  ];

  if (embedded) {
    return (
      <div>
        {/* Tab bar embedded */}
        <div style={{ display: "flex", overflowX: "auto", marginBottom: 20, gap: 4, flexWrap: "wrap" }}>
          {sections.map((s, i) => (
            <button key={i} onClick={() => setActiveTab(i)} style={{ flex: "0 0 auto", padding: isMobile ? "9px 13px" : "10px 18px", background: activeTab === i ? "#FFF0E8" : "transparent", border: activeTab === i ? "1.5px solid #E8A080" : "1.5px solid #F0D8C8", borderRadius: 28, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontSize: 13, color: activeTab === i ? "#8B4513" : "#B08060", fontWeight: activeTab === i ? 700 : 400, whiteSpace: "nowrap", transition: "all 0.15s" }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {sections[activeTab].content.map((card, i) => (
            <div key={i} style={{ background: "#FFF8F5", borderRadius: 18, padding: "16px 20px", borderLeft: "3px solid #E8A080" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", color: "#8B4513", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{card.title}</div>
              <p style={{ fontFamily: "'Nunito', sans-serif", color: "#5A3A2A", fontSize: 14, lineHeight: 1.85, margin: 0 }}>{card.text}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: "#A07060", margin: 0, lineHeight: 1.6 }}>⚕️ Per difficoltà specifiche: ostetrica, pediatra o consulente IBCLC certificata · Ogni percorso è valido.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 36 }}>
      {/* Header card collassabile */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ cursor: "pointer", background: "linear-gradient(135deg, #FFF0E8 0%, #FFE4D4 100%)", borderRadius: open ? "16px 16px 0 0" : 16, padding: isMobile ? "18px 16px" : "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1.5px solid #FFD0B8", boxShadow: open ? "none" : "0 2px 12px rgba(176,100,60,0.08)", transition: "border-radius 0.2s" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 28 }}>🤱</span>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", color: "#8B4513", fontSize: isMobile ? 17 : 19, fontWeight: 700 }}>
              Guida all'Allattamento
            </div>
            <div style={{ fontFamily: "'Nunito', sans-serif", color: "#A0624A", fontSize: 13, marginTop: 2 }}>
              Un accompagnamento — non un obbligo
            </div>
          </div>
        </div>
        <span style={{ fontSize: 20, color: "#A0624A", fontWeight: 300, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </div>

      {open && (
        <div style={{ background: COLORS.warmWhite, borderRadius: "0 0 16px 16px", border: "1.5px solid #FFD0B8", borderTop: "none", overflow: "hidden" }}>
          {/* Tab bar */}
          <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid #FFE4D4", background: "#FFF8F5" }}>
            {sections.map((s, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setActiveTab(i); }} style={{ flex: "0 0 auto", padding: isMobile ? "12px 14px" : "13px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontSize: 13, color: activeTab === i ? "#8B4513" : "#B08060", borderBottom: activeTab === i ? "2.5px solid #8B4513" : "2.5px solid transparent", fontWeight: activeTab === i ? 700 : 400, whiteSpace: "nowrap", transition: "all 0.15s" }}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
            {sections[activeTab].content.map((card, i) => (
              <div key={i} style={{ background: "#FFF8F5", borderRadius: 18, padding: "16px 20px", borderLeft: "3px solid #E8A080" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", color: "#8B4513", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                  {card.title}
                </div>
                <p style={{ fontFamily: "'Nunito', sans-serif", color: "#5A3A2A", fontSize: 14, lineHeight: 1.85, margin: 0 }}>
                  {card.text}
                </p>
              </div>
            ))}
          </div>

          <div style={{ padding: "12px 20px 16px", background: "#FFF0E8", textAlign: "center" }}>
            <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: "#A07060", margin: 0, lineHeight: 1.6 }}>
              ⚕️ Per difficoltà specifiche: ostetrica, pediatra o consulente IBCLC certificata · Ogni percorso è valido.
            </p>
          </div>

          {/* Risorse per famiglie */}
          <div style={{ padding: "20px 20px 24px" }}>
            <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: "#A07060", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Risorse istituzionali</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ALLATT_RISORSE.servizi.map((srv, i) => (
                <a key={i} href={srv.url} target="_blank" rel="noopener noreferrer" style={{
                  background: "#FFF8F5", borderRadius: 14, border: "1.5px solid #FFD0B8",
                  padding: "13px 16px", display: "flex", gap: 12, alignItems: "flex-start",
                  textDecoration: "none", color: "inherit", cursor: "pointer",
                  transition: "border-color 0.18s, box-shadow 0.18s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#8B4513"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(139,69,19,0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#FFD0B8"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{srv.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: "#8B4513", fontSize: 13, marginBottom: 3 }}>{srv.title}</div>
                    <div style={{ fontFamily: "'Nunito', sans-serif", color: "#A07060", fontSize: 12, lineHeight: 1.65 }}>{srv.text}</div>
                  </div>
                  <span style={{ fontSize: 13, color: "#8B4513", flexShrink: 0, marginTop: 2 }}>↗</span>
                </a>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #FFD0B8" }}>
              <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: "#A07060", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Riferimenti scientifici</p>
              {ALLATT_RISORSE.footer.map((ref, i) => (
                <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer" style={{
                  display: "block", fontFamily: "'Nunito', sans-serif", fontSize: 11,
                  color: "#A07060", textDecoration: "underline", textUnderlineOffset: 2,
                  marginBottom: 4, lineHeight: 1.5,
                }}>{ref.label}</a>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}


function GuidePage({ zone, setZone }) {
  const isMobile = useIsMobile();
  const [selectedPhase, setSelectedPhase] = useState(() => { const p = _glossaryReturnPhase; _glossaryReturnPhase = null; return p ?? 0; });
  const [activeTab, setActiveTab] = useState(() => { const t = _glossaryReturnTab; _glossaryReturnTab = null; return t || "attachment"; });
  useEffect(() => { _globalCurrentPhase = selectedPhase; }, [selectedPhase]);
  useEffect(() => { _globalCurrentTab = activeTab; }, [activeTab]);

  const zones = [
    { id: "0-3", label: "0–3 anni", icon: "🌱", color: "#6BAE8A", phases: AGE_PHASES, data: DEVELOPMENT_DATA },
    { id: "3-6", label: "3–6 anni", icon: "🌸", color: COLORS.amber, phases: AGE_PHASES_3_6, data: DEVELOPMENT_DATA_3_6 },
    { id: "6-12", label: "6–12 anni", icon: "🌟", color: COLORS.coral, phases: AGE_PHASES_6_12, data: DEVELOPMENT_DATA_6_12 },
  ];
  const currentZone = zones.find(z => z.id === zone) || zones[0];
  const phases = currentZone.phases;
  const safePhase = Math.min(selectedPhase, phases.length - 1);
  const phase = phases[safePhase];
  const dataKey = phase.key || `${phase.min}-${phase.max}`;
  const data = currentZone.data[dataKey] || Object.values(currentZone.data)[0];

  const tabs = [
    { id: "attachment", label: "💛 Attaccamento" },
    ...(zone === "0-3" ? [{ id: "allattamento", label: "🤱 Allattamento" }] : []),
    { id: "emozioni", label: "🌊 Emozioni" },
    { id: "winnicott", label: "🔬 Psiche" },
    { id: "behavior", label: "👁️ Comportamento" },
    { id: "tips", label: "✨ Consigli" },
    { id: "brain", label: "🧠 Cervello" },
  ];

  const gh = HERO_DATA[zone] || HERO_DATA["0-3"];

  return (
    <div style={{ background: "#FFFCFA", minHeight: "100vh" }}>

      {/* ── Hero centrato zona-specifico ── */}
      <div style={{
        background: "linear-gradient(160deg, #FBEAF2 0%, #FCDFD8 30%, #F9E8F8 65%, #E8E2F8 100%)",
        padding: isMobile ? "28px 16px 36px" : "36px 20px 48px",
        position: "relative", overflow: "hidden",
      }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: [220, 140, 100][i], height: [220, 140, 100][i],
            borderRadius: "50%",
            border: `1px solid rgba(255,255,255,${[0.05, 0.06, 0.07][i]})`,
            top: ["15%", "55%", "30%"][i],
            left: ["-3%", "82%", "60%"][i],
          }} />
        ))}
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <img
            src={ZONE_IMAGES[zone] || ZONE_IMAGES["0-3"]}
            alt={gh.title}
            style={{ width: 80, height: 80, objectFit: "contain", display: "block", margin: "0 auto 10px" }}
          />
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: COLORS.deepSlate, fontSize: isMobile ? 24 : 32,
            fontWeight: 700, lineHeight: 1.2, margin: "0 0 6px",
          }}>{gh.title}</h1>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: isMobile ? 16 : 20, fontWeight: 400, fontStyle: "italic",
            background: `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.peach})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            margin: "0 0 14px",
          }}>{gh.accent}</p>
          <p style={{
            color: COLORS.slateLight, fontSize: isMobile ? 14 : 15, lineHeight: 1.65,
            fontFamily: "'Nunito', sans-serif", maxWidth: 520, margin: "0 auto",
          }}>{gh.desc}</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "44px 20px" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 32, marginBottom: 8 }}>
          Guida allo sviluppo
        </h2>
        <p style={{ color: COLORS.deepSlate, fontFamily: "'Nunito', sans-serif", fontStyle: "italic", marginBottom: 8 }}>
          Seleziona la fase del tuo bambino per esplorare cervello, emozioni, relazioni e consigli pratici. In fondo trovi strumenti interattivi per accompagnare questa fase con più consapevolezza.
        </p>
        <p style={{ color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
          Prima di uscire, visita <strong>🖥️ Schermi</strong> (tempi e qualità per ogni età) e <strong>🔍 Curiosità</strong> (per sfatare i miti comuni).
        </p>

        {/* Phase selector */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10, marginBottom: 36 }}>
          {phases.map((p, i) => (
            <button key={i} onClick={() => { setSelectedPhase(i); setActiveTab("attachment"); scrollToTabBar(); }} style={{
              background: safePhase === i ? `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.peach})` : "white",
              border: safePhase === i ? `2px solid ${COLORS.rose}` : `2px solid ${COLORS.roseLight}`,
              borderRadius: 22, padding: "16px 12px", cursor: "pointer",
              transition: "all 0.2s", textAlign: "center",
            }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{p.icon}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", color: safePhase === i ? "white" : COLORS.deepSlate, fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{p.label}</div>
              <div style={{ fontFamily: "'Nunito', sans-serif", color: safePhase === i ? "rgba(255,255,255,0.85)" : "#5C3F3F", fontSize: 14 }}>{p.range}</div>
            </button>
          ))}
        </div>

        {/* Content tabs */}
        <div style={{ background: COLORS.warmWhite, borderRadius: 32, overflow: "visible", boxShadow: "0 4px 20px rgba(200,120,140,0.10)", border: `1px solid ${COLORS.sageLight}` }}>
          <p style={{
            fontFamily:  "'Nunito', sans-serif",
            fontSize:    isMobile ? 13 : 14,
            fontWeight:  700,
            color:       COLORS.slateLight,
            fontStyle:   "italic",
            textAlign:   "center",
            margin:      "0",
            padding:     "14px 12px 0",
            letterSpacing: "0.1px",
          }}>Cosa vuoi approfondire?</p>
          <div id="main-tab-bar" role="tablist" aria-label="Argomenti della guida" style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", padding: "10px 12px 12px" }}>
            {tabs.map(tab => (
              <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); scrollToTabBar(); }} style={{
                background: activeTab === tab.id ? `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.peach})` : COLORS.roseLight,
                border: "none", borderRadius: 22, cursor: "pointer",
                padding: isMobile ? "9px 14px" : "9px 18px", whiteSpace: "nowrap",
                fontFamily: "'Nunito', sans-serif", fontSize: 14,
                color: activeTab === tab.id ? "white" : COLORS.deepSlate,
                fontWeight: activeTab === tab.id ? 700 : 500,
                transition: "all 0.2s", WebkitTapHighlightColor: "transparent",
              }}>{tab.label}</button>
            ))}
          </div>

          <div style={{ padding: isMobile ? "20px 16px" : "32px 28px" }}>
            {activeTab === "allattamento" ? (
              <GuidaAllattamento embedded />
            ) : activeTab === "brain" ? (
              <div>
                <div style={{ marginBottom: 28 }}>
                  <BrainInfographic zone={zone === "0-3" ? dataKey + "m" : zone} />
                </div>
                <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, lineHeight: 1.85, margin: 0 }}>
                  {parseLinks(data[activeTab])}
                </p>
              </div>
            ) : activeTab !== "tips" ? (
              <div>
                <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, lineHeight: 1.85, margin: 0 }}>
                  {parseLinks(data[activeTab])}
                </p>
                {/* ── QUOTES: zona 0-3 anni ── */}
                {activeTab === "emozioni" && zone === "0-3" && dataKey === "0-3" && (
                  <>
                    <QuoteCard quote={QUOTES["brazelton_pianto"]} style={{ marginTop: 28 }} />
                    <QuoteCard quote={QUOTES["fraiberg_fantasmi"]} style={{ marginTop: 16 }} />
                  </>
                )}
                {activeTab === "attachment" && zone === "0-3" && dataKey === "3-6" && (
                  <QuoteCard quote={QUOTES["stern_coregolazione"]} style={{ marginTop: 28 }} />
                )}
                {activeTab === "behavior" && zone === "0-3" && dataKey === "3-6" && (
                  <QuoteCard quote={QUOTES["brazelton_temperamento"]} style={{ marginTop: 28 }} />
                )}
                {activeTab === "attachment" && zone === "0-3" && dataKey === "6-12" && (
                  <QuoteCard quote={QUOTES["tronick_riparazione"]} style={{ marginTop: 28 }} />
                )}
                {activeTab === "attachment" && zone === "0-3" && dataKey === "12-18" && (
                  <QuoteCard quote={QUOTES["stern_connessione"]} style={{ marginTop: 28 }} />
                )}
                {activeTab === "emozioni" && zone === "0-3" && dataKey === "18-24" && (
                  <QuoteCard quote={QUOTES["bowlby_comunicazione"]} style={{ marginTop: 28 }} />
                )}
                {activeTab === "attachment" && zone === "0-3" && dataKey === "24-36" && (
                  <QuoteCard quote={QUOTES["mahler_separazione"]} style={{ marginTop: 28 }} />
                )}
                {/* ── QUOTES: zona 3-6 anni ── */}
                {activeTab === "emozioni" && zone === "3-6" && dataKey === "3-4" && (
                  <QuoteCard quote={QUOTES["siegel_nominare"]} style={{ marginTop: 28 }} />
                )}
                {/* ── QUOTES: zona 6-12 anni ── */}
                {activeTab === "emozioni" && zone === "6-12" && dataKey === "6-8" && (
                  <QuoteCard quote={QUOTES["siegel_capire"]} style={{ marginTop: 28 }} />
                )}
                {activeTab === "emozioni" && zone === "6-12" && dataKey === "8-10" && (
                  <QuoteCard quote={QUOTES["brazelton_amore"]} style={{ marginTop: 28 }} />
                )}
                {activeTab === "emozioni" && zone === "6-12" && dataKey === "10-12" && (
                  <QuoteCard quote={QUOTES["brazelton_cura"]} style={{ marginTop: 28 }} />
                )}
              </div>
            ) : (
              <div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 18, marginBottom: 20 }}>
                  Consigli pratici per questa fase
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {data.tips.map((tip, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, background: COLORS.sageLight, borderRadius: 28, padding: "16px 20px" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: COLORS.sage, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                      <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{tip}</p>
                    </div>
                  ))}
                </div>
                <ChecklistNudge zone={zone} />
              </div>
            )}
          </div>
        </div>

        <CrossLinks cards={[
          { emoji: "🖥️", label: "Schermi e tecnologia", desc: "Tempi schermo per questa età", section: "screens", bg: COLORS.skyLight },
          { emoji: "🔍", label: "Curiosità e miti", desc: "Sfatiamo le credenze comuni", section: "curiosita", bg: COLORS.peachLight },
          { emoji: "🌿", label: "Capire questa fase", desc: "Strumenti per aiutare il tuo bambino con più consapevolezza", section: "checklist", bg: COLORS.mintLight },
          { emoji: "🌿", label: "Ogni bambino è unico", desc: "Se ti stai chiedendo qualcosa in più sul modo in cui il tuo bambino vive il mondo", section: "ognibambino", bg: "#F0F7F4" },
        ]} />

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 32 }}>
          <button onClick={() => { if (_globalSetSection) _globalSetSection("checklist"); }} style={{
            background: `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.roseDark})`,
            color: "white", border: "2px solid rgba(255,150,180,0.4)", borderRadius: 50,
            padding: "13px 28px", fontSize: 15,
            fontFamily: "'Nunito', sans-serif", cursor: "pointer",
            fontWeight: 800, minHeight: 50,
            animation: "rose-pulse 2s ease-in-out infinite",
            letterSpacing: "0.2px",
          }}>{zone === "0-3" ? "🌱 Aiutami a capire il mio bambino" : zone === "3-6" ? "🌸 Aiutami a capire il mio bambino" : "🌟 Aiutami a capire mio figlio"}</button>
          <button onClick={() => { if (_globalSetSection) _globalSetSection("genitori"); }} style={{
            background: `linear-gradient(135deg, ${COLORS.lavender}, #7060A0)`,
            color: "white", border: "2px solid rgba(180,160,230,0.4)", borderRadius: 50,
            padding: "13px 28px", fontSize: 15,
            fontFamily: "'Nunito', sans-serif", cursor: "pointer",
            fontWeight: 800, minHeight: 50,
            animation: "lavender-pulse 2s ease-in-out infinite",
            letterSpacing: "0.2px",
          }}>💛 Come sto tenendo il filo?</button>
        </div>

        {/* ── Footer bibliografico ── */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: COLORS.slateLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Riferimenti scientifici</p>
          {GUIDE_FOOTER.map((ref, i) => (
            <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer" style={{
              display: "block", fontFamily: "'Nunito', sans-serif", fontSize: 12,
              color: COLORS.slateLight, textDecoration: "underline", textUnderlineOffset: 2,
              marginBottom: 4, lineHeight: 1.5,
            }}>{ref.label}</a>
          ))}
        </div>

      </div>
    </div>
  );
}


/* ─── CROSS-LINKS contestuali — "Potrebbe interessarti anche" ─── */
function CrossLinks({ cards }) {
  return (
    <div style={{ marginTop: 44, paddingTop: 32, borderTop: `1px solid ${COLORS.sageLight}` }}>
      <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: COLORS.slateLight, marginBottom: 14, letterSpacing: "0.6px", textTransform: "uppercase", fontWeight: 700 }}>
        Potrebbe interessarti anche
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {cards.map(c => (
          <button key={c.section} onClick={() => { if (_globalSetSection) _globalSetSection(c.section); }} style={{
            flex: "1 1 160px", background: c.bg, border: `1px solid rgba(0,0,0,0.06)`,
            borderRadius: 18, padding: "14px 16px", cursor: "pointer",
            textAlign: "left", display: "flex", flexDirection: "column", gap: 4,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}>
            <span style={{ fontSize: 22 }}>{c.emoji}</span>
            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700, color: COLORS.deepSlate }}>{c.label}</span>
            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: COLORS.slateLight, lineHeight: 1.4 }}>{c.desc}</span>
            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: COLORS.rose, fontWeight: 700, marginTop: 4 }}>Leggi →</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── AI DISCLAIMER — usato in ChecklistPage e GenitoriPage ─── */
function AIDisclaimer({ variant = "bambino" }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #FFF9F2, #FFF0EC)",
      border: "2px dashed #E8A824",
      borderRadius: 20,
      padding: "16px 20px",
      marginBottom: 28,
      display: "flex",
      gap: 14,
      alignItems: "flex-start",
    }}>
      <span style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>🎲</span>
      <div>
        <p style={{
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 800,
          color: "#C8902A",
          fontSize: 14,
          marginBottom: 4,
        }}>Prendila come un gioco 😊</p>
        <p style={{
          fontFamily: "'Nunito', sans-serif",
          color: "#5C3F3F",
          fontSize: 13.5,
          lineHeight: 1.65,
          margin: 0,
        }}>
          Generata dall'AI — è
          {variant === "bambino"
            ? " uno spunto per riflettere, non una diagnosi."
            : " un invito a pensarci, non una valutazione clinica."}
        </p>
      </div>
    </div>
  );
}


/* ─── SUGGERIMENTO BUTTON — sparso nelle pagine ─── */
function SuggerimentoButton({ compact = false }) {
  const subject = encodeURIComponent("Suggerimento per La Bebi App");
  const body = encodeURIComponent(
    "Ciao,\n\nho un suggerimento per migliorare La Bebi App:\n\n[scrivi qui]\n\nGrazie!"
  );
  const href = `mailto:danielelami@libero.it?subject=${subject}&body=${body}`;
  if (compact) return (
    <a href={href} style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      background: COLORS.warmWhite, border: `1.5px solid ${COLORS.roseLight}`,
      borderRadius: 50, padding: "8px 18px",
      fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700,
      color: COLORS.rose, textDecoration: "none",
      transition: "all 0.18s", touchAction: "manipulation",
      WebkitTapHighlightColor: "transparent",
    }}
    onMouseEnter={e => { e.currentTarget.style.background = COLORS.roseLight; }}
    onMouseLeave={e => { e.currentTarget.style.background = "white"; }}
    >
      ✉️ Invia un suggerimento
    </a>
  );
  return (
    <div style={{
      background: "linear-gradient(135deg, #FFF9F2, #FBEAF2)",
      border: `1.5px solid ${COLORS.roseLight}`,
      borderRadius: 20, padding: "18px 22px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 14, marginTop: 32,
    }}>
      <div>
        <p style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Aiutaci a migliorare 🌱
        </p>
        <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Questi contenuti nascono dal confronto con genitori veri, da marzo 2026.{" "}
          Hai un'idea, una cosa che manca, qualcosa che non funziona?
        </p>
      </div>
      <a href={href} style={{
        display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0,
        background: `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.peach})`, color: "white",
        borderRadius: 50, padding: "11px 22px",
        fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: 800,
        textDecoration: "none", boxShadow: "0 4px 16px rgba(212,68,122,0.28)",
        touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
        transition: "all 0.18s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${COLORS.roseDark}, #C04030)`; }}
      onMouseLeave={e => { e.currentTarget.style.background = COLORS.rose; }}
      >
        ✉️ Scrivi un suggerimento
      </a>
    </div>
  );
}


/* ─── SUBPHASE FILTER — filtra checklist per sottofase in base all'età ─── */
function getSubPhaseLists(zone, age) {
  const a = Number(age);
  if (!age || isNaN(a)) return null; // nessun filtro → mostra tutto
  if (zone === "0-3") {
    if (a < 6)  return { diff: DIFF_0_3_06,   str: STR_0_3_06 };
    if (a < 18) return { diff: DIFF_0_3_618,  str: STR_0_3_618 };
    return            { diff: DIFF_0_3_1836, str: STR_0_3_1836 };
  }
  if (zone === "3-6") {
    if (a < 4)  return { diff: DIFF_3_6_34,  str: STR_3_6_34 };
    if (a < 5)  return { diff: DIFF_3_6_45,  str: STR_3_6_45 };
    return            { diff: DIFF_3_6_56,  str: STR_3_6_56 };
  }
  if (zone === "6-12") {
    if (a < 8)  return { diff: DIFF_6_12_68,   str: STR_6_12_68 };
    if (a < 10) return { diff: DIFF_6_12_810,  str: STR_6_12_810 };
    return            { diff: DIFF_6_12_1012, str: STR_6_12_1012 };
  }
  return null;
}

function ChecklistPage({ zone, setZone, setActiveSection }) {
  const isMobile = useIsMobile();
  const initialZone = _globalChecklistOverride || (zone && zone !== null ? zone : "0-3");
  const [activeZone, setActiveZone] = useState(initialZone);
  const mountedRef = useRef(false);
  // Clear the override after reading it — delay mountedRef so zone sync doesn't fire on mount
  useEffect(() => { _globalChecklistOverride = null; const raf = requestAnimationFrame(() => { mountedRef.current = true; }); return () => cancelAnimationFrame(raf); }, []);
  // sync with parent zone when it changes (e.g. user goes back to onboarding) — skip on mount
  useEffect(() => {
    if (mountedRef.current && zone && zone !== null) setActiveZone(zone);
  }, [zone]);
  const [step, setStep] = useState(1); // 1=difficoltà, 2=punti di forza, 3=risultato
  const [selectedDiff, setSelectedDiff] = useState([]);
  const [selectedStr, setSelectedStr] = useState([]);
  const [babyAge, setBabyAge] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef(null);

  const zoneOptions = [
    { id: "gravidanza", label: "🤰 Gravidanza",       icon: "🤰", color: COLORS.rose,   difficulties: DIFFICULTIES_GRAVIDANZA, strengths: STRENGTHS_GRAVIDANZA, ageLabel: "Settimana di gravidanza (1–40)" },
    { id: "papa",       label: "🤝 Futuro genitore",     icon: "🤝", color: "#5B8FB9",   difficulties: DIFFICULTIES_PAPA,       strengths: STRENGTHS_PAPA,       ageLabel: "Settimana di gravidanza (1–40)" },
    { id: "0-3",        label: "🌱 0–3 anni",        icon: "🌱", color: "#74C4A8",      difficulties: DIFFICULTIES,           strengths: STRENGTHS_0_3,        ageLabel: "Età in mesi (0–36)" },
    { id: "3-6",        label: "🌸 3–6 anni",        icon: "🌸", color: COLORS.amber,   difficulties: DIFFICULTIES_3_6,       strengths: STRENGTHS_3_6,        ageLabel: "Età in anni (3–6)" },
    { id: "6-12",       label: "🌟 6–12 anni",       icon: "🌟", color: COLORS.coral,   difficulties: DIFFICULTIES_6_12,      strengths: STRENGTHS_6_12,       ageLabel: "Età in anni (6–12)" },
    { id: "12-15",      label: "🌊 12–15 anni",      icon: "🌊", color: "#5BA4D4",      difficulties: DIFFICULTIES_1215,      strengths: STRENGTHS_1215,       ageLabel: "Età in anni (12–15)" },
    { id: "15-18",      label: "🌟 15–18 anni",      icon: "✨", color: COLORS.gold,    difficulties: DIFFICULTIES_1518,      strengths: STRENGTHS_1518,       ageLabel: "Età in anni (15–18)" },
  ];
  const currentZone = zoneOptions.find(z => z.id === activeZone) || zoneOptions[0];
  const subPhase = getSubPhaseLists(activeZone, babyAge);
  const activeItems = step === 1
    ? (subPhase ? subPhase.diff : currentZone.difficulties)
    : (subPhase ? subPhase.str  : currentZone.strengths);
  const activeSelected = step === 1 ? selectedDiff : selectedStr;
  const categories = [...new Set(activeItems.map(d => d.category))];

  const toggle = id => {
    if (step === 1) setSelectedDiff(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    else setSelectedStr(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const resetAll = () => {
    setStep(1); setSelectedDiff([]); setSelectedStr([]);
    setDiagnosis(""); setError("");
  };

  const analyze = async () => {
    setLoading(true); setDiagnosis(""); setError("");
    const diffLabels = selectedDiff.map(id => currentZone.difficulties.find(d => d.id === id)?.label).filter(Boolean);
    const strLabels = selectedStr.map(id => currentZone.strengths.find(d => d.id === id)?.label).filter(Boolean);
    const ageStr = babyAge ? babyAge + (activeZone === "0-3" ? " mesi" : activeZone === "gravidanza" || activeZone === "papa" ? "ª settimana di gravidanza" : " anni") : "età non specificata";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          max_tokens: 1200,
          system: `Sei un clinico esperto in psicologia dello sviluppo${activeZone === "gravidanza" ? ", psicologia perinatale e gravidanza (Bydlowski, Stern)" : activeZone === "papa" ? ", psicologia perinatale e transizione alla genitorialità del partner non gestante (Stern, Lamb, Palkovitz, Condon)" : activeZone === "12-15" ? ", preadolescenza e pubertà (Blakemore, Steinberg, Blos)" : activeZone === "15-18" ? ", adolescenza e identità (Erikson, Siegel, Steinberg)" : " e neuroscienze affettive (Schore, Siegel, Bowlby)"}. Hai competenze in neuroscienze dello sviluppo, teoria dell'attaccamento e psicologia positiva. Parli con calore scientifico, concretezza e rispetto per il genitore.

${activeZone === "gravidanza" ? "Il genitore ti descrive la sua esperienza di gravidanza. Il 'figlio' è ancora nel pancione. Adatta linguaggio e consigli alla fase prenatale." : activeZone === "papa" ? "Il partner non gestante ti descrive la sua esperienza durante la gravidanza. La transizione alla genitorialità del partner non gestante è un processo psicologico profondo, spesso invisibile (Stern). Normalizza le sue emozioni, riconosci la complessità di questa fase. Usa un linguaggio neutro rispetto al genere." : activeZone === "12-15" ? "Il genitore ti descrive il suo figlio di 12-15 anni (preadolescente). Tieni conto del rimodellamento cerebrale puberale, del ruolo dei pari, dell'intensità emotiva di questa fase." : activeZone === "15-18" ? "Il genitore ti descrive il suo figlio di 15-18 anni (adolescente). Tieni conto della costruzione dell'identità, del pensiero formale emergente, del processo di crescita e conquista dell'autonomia." : "Il genitore ti descrive il suo figlio piccolo. Tieni conto della plasticità neurale e dell'importanza dell'attaccamento sicuro in questa fase."}

Il tuo compito è costruire una risposta integrata che:
- Spieghi il substrato neurologico/psicologico delle difficoltà senza allarmismi
- Mostri come i punti di forza siano risorse concrete
- Guidi con azioni pratiche che partono dai punti di forza

REGOLA DI TONO NELL'APERTURA (applica sempre):
Non parlare mai in prima persona emotiva (es. "Sento che stai vivendo", "Capisco la tua fatica"). Sei un sistema AI: non simuli empatia soggettiva. Apri sempre ancorandoti ai dati selezionati (es. "Dalle risposte che hai indicato emerge un quadro in cui…", "Le aree che hai segnalato delineano…"). Nel corpo della risposta usa la seconda persona diretta con calore ("Stai attraversando…", "La fase che state vivendo…") o il noi inclusivo ("Possiamo osservare che…"). Mai toni da referto né finzioni emotive.

REGOLA ANTI-RIDONDANZA (applica sempre prima di scrivere):
Analizza le selezioni e raggruppa quelle che condividono lo stesso substrato psicologico in massimo 2-3 nuclei tematici per le difficoltà e 2-3 per i punti di forza. Ad esempio: rabbia esplosiva + aggressività + oppositività sono tutte espressioni di disregolazione emotiva — trattale come un unico nucleo. Ansia da prestazione + rifiuto scolastico + somatizzazioni sono tutte espressioni di ansia — un unico nucleo. Non spiegare lo stesso meccanismo più di una volta. Ogni nucleo merita una spiegazione distinta e specifica, non generica. Se le selezioni sono poche (1-3), trattale individualmente senza raggruppare.

Struttura la risposta così:

## 🧠 Cosa sta succedendo
Spiega il meccanismo psicologico o neurologico. Normalizza, non minimizzare.

## 💛 Il profilo ${activeZone === "gravidanza" ? "di questa gravidanza" : activeZone === "papa" ? "di questo partner non gestante" : activeZone === "12-15" ? "di questo preadolescente" : activeZone === "15-18" ? "di questo adolescente" : "di questo bambino"}
Una lettura integrata: le difficoltà come sfide di sviluppo, i punti di forza come risorse reali.

## 🪴 3 strategie concrete
Numerate. Ogni strategia parte da un punto di forza e lo usa come leva per lavorare sulla difficoltà.

## ⚠️ Quando consultare un professionista
Solo se necessario. Breve.

Rispondi in italiano, tono caldo. Massimo 600 parole.`,
          messages: [{ role: "user", content: activeZone === "papa"
            ? `La gravidanza è alla ${ageStr}.\n\nDIFFICOLTÀ segnalate dal partner non gestante: ${diffLabels.length > 0 ? diffLabels.join(", ") : "nessuna selezionata"}.\n\nPUNTI DI FORZA riconosciuti dal partner non gestante: ${strLabels.length > 0 ? strLabels.join(", ") : "nessuno selezionato"}.`
            : `Il bambino ha ${ageStr}.\n\nDIFFICOLTÀ segnalate dal genitore: ${diffLabels.length > 0 ? diffLabels.join(", ") : "nessuna selezionata"}.\n\nPUNTI DI FORZA riconosciuti dal genitore: ${strLabels.length > 0 ? strLabels.join(", ") : "nessuno selezionato"}.` }]
        })
      });
      const data = await res.json();
      if (data.content?.[0]?.text) {
        setDiagnosis(data.content[0].text);
        setStep(3);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      } else {
        const detail = data.error?.message || data.error || data.type || JSON.stringify(data).slice(0, 300);
        const isKey = detail.toLowerCase().includes("key") || detail.toLowerCase().includes("auth") || detail.toLowerCase().includes("401");
        setError(isKey
          ? "❌ API Key non valida o non configurata. Su Vercel: Settings → Environment variables → verifica la chiave API Groq."
          : "Errore API: " + detail);
      }
    } catch (e) {
      if (e.name === "AbortError") setError("⏳ La risposta sta impiegando troppo — riprova tra qualche istante.");
      else setError("Errore di connessione: " + e.message);
    } finally { clearTimeout(timeoutId); }
    setLoading(false);
  };

  // ── Step indicator ──────────────────────────────────────────────────────────
  const StepBar = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
      {[
        { n: 1, label: "Difficoltà", icon: "🚧" },
        { n: 2, label: "Punti di forza", icon: "✨" },
        { n: 3, label: "Risposta AI", icon: "🌿" },
      ].map((s, i) => (
        <div key={s.n} style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: step >= s.n ? `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.lavender})` : COLORS.roseLight,
              color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, transition: "all 0.3s",
            }}>{step > s.n ? "✓" : s.icon}</div>
            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: step >= s.n ? COLORS.deepSlate : COLORS.slateLight, fontWeight: step === s.n ? 700 : 400, textAlign: "center" }}>{s.label}</span>
          </div>
          {i < 2 && <div style={{ height: 2, flex: 2, background: step > s.n ? COLORS.rose : COLORS.roseLight, marginBottom: 22, transition: "all 0.3s" }} />}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ background: "#FFFCFA", minHeight: "100vh" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "44px 20px" }}>

        {/* AI Disclaimer */}
        <AIDisclaimer variant="bambino" />
        <div style={{ marginBottom: 8 }}><SuggerimentoButton compact /></div>

        {/* Zone selector */}
        <div style={{ display: "flex", overflowX: "auto", gap: 6, marginBottom: 24, paddingBottom: 4 }}>
          {zoneOptions.map(z => (
            <button key={z.id} onClick={() => { setActiveZone(z.id); setStep(1); setSelectedDiff([]); setSelectedStr([]); setDiagnosis(""); setBabyAge(""); }}
              style={{
                background: activeZone === z.id ? z.color : "white",
                color: activeZone === z.id ? "white" : COLORS.deepSlate,
                border: activeZone === z.id ? `2px solid ${z.color}` : `2px solid ${COLORS.roseLight}`,
                borderRadius: 50, padding: "8px 16px", cursor: "pointer",
                fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700,
                whiteSpace: "nowrap", transition: "all 0.2s",
                boxShadow: activeZone === z.id ? `0 4px 14px ${z.color}55` : "none",
                WebkitTapHighlightColor: "transparent", userSelect: "none",
              }}>{z.label}</button>
          ))}
        </div>

        <h2 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 32, marginBottom: 8 }}>
          {step === 1
            ? (activeZone === "gravidanza" ? "🤰 Come va la gravidanza?" : activeZone === "papa" ? "🤝 Che genitore sto diventando?" : activeZone === "12-15" ? "🌊 Cosa succede al mio preadolescente?" : activeZone === "15-18" ? "✨ Cosa succede al mio adolescente?" : activeZone === "6-12" ? "🌟 Cosa sta attraversando?" : activeZone === "3-6" ? "🌸 Come sta crescendo?" : "🌱 Cosa sta imparando?")
            : step === 2
            ? "✨ I suoi punti di forza"
            : "🌿 Il profilo"}
        </h2>
        <p style={{ color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontStyle: "italic", marginBottom: 28 }}>
          {step === 1 ? "Seleziona le difficoltà che stai riscontrando — poi passeremo ai punti di forza." :
           step === 2 ? (activeZone === "gravidanza" ? "Ora seleziona le risorse che riconosci in questa gravidanza. L'AI le userà come punto di forza." : activeZone === "papa" ? "Ora seleziona i tuoi punti di forza come futuro genitore. L'AI li userà come leva." : "Ora seleziona i punti di forza che riconosci in tuo figlio. L'AI li userà come leva.") :
           (activeZone === "gravidanza" ? "Risposta integrata basata su ciò che hai condiviso sulla tua gravidanza." : activeZone === "papa" ? "Risposta integrata basata sul tuo percorso verso la genitorialità." : activeZone === "12-15" ? "Risposta integrata basata su difficoltà e risorse del tuo ragazzo/a." : activeZone === "15-18" ? "Risposta integrata basata su difficoltà e risorse del tuo adolescente." : "Risposta integrata basata su difficoltà e risorse del tuo bambino.")}
        </p>

        <StepBar />

        {/* ── Card introduttive — Futuro genitore (solo zona papa, solo step 1-2) ── */}
        {activeZone === "papa" && step < 3 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
              {[
                { icon: "🌱", title: "Una transizione che nessuno racconta",
                  text: "La gravidanza cambia anche chi non la porta nel corpo. Stern descriveva la nascita psicologica del genitore come un processo parallelo a quello biologico — e questo vale per entrambi. Ma per il partner non gestante, questa trasformazione avviene spesso in silenzio: non c'è un'ecografia che mostri le tue emozioni, non c'è un corso preparto che parli di te. Quello che stai vivendo — qualunque cosa sia — è reale, ed è documentato." },
                { icon: "🧩", title: "Sentirsi fuori posto è normale",
                  text: "Molti partner non gestanti descrivono un senso di esclusione durante la gravidanza: dal corpo dell'altro, dalla relazione medica, a volte dalla coppia stessa. Non è egoismo — è la fatica di trovare un ruolo in un processo che biologicamente non ti coinvolge allo stesso modo. La ricerca (Palkovitz) mostra che il coinvolgimento attivo durante la gravidanza è il miglior predittore di presenza dopo la nascita. Cercare il tuo posto in questa storia non è un lusso: è il primo atto di genitorialità." },
                { icon: "💛", title: "Il tuo benessere conta, adesso",
                  text: "Il rischio di vissuti depressivi nel partner non gestante durante il periodo perinatale è documentato (Paulson & Bazemore, 2010) ma raramente riconosciuto. Se senti qualcosa che non riesci a nominare — stanchezza che non passa, distanza emotiva, ansia senza oggetto — non metterlo da parte. Non sei solo l'accompagnatore di questa gravidanza: sei parte della storia. Prenderti cura di te adesso è prenderti cura della famiglia che sta nascendo." },
              ].map((c, i) => (
                <div key={i} style={{
                  background: COLORS.warmWhite, borderRadius: 22, padding: "18px 20px",
                  border: "1.5px solid #C8DDEF", borderLeft: "4px solid #5B8FB9",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{c.icon}</div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 15, marginBottom: 8, lineHeight: 1.3 }}>{c.title}</h3>
                  <p style={{ fontFamily: "'Nunito', sans-serif", color: "#4A3A4A", fontSize: 13, lineHeight: 1.72, margin: 0 }}>{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Age selector — only steps 1 and 2 */}
        {step < 3 && (
          <div style={{ background: COLORS.warmWhite, borderRadius: 28, padding: 24, marginBottom: 28, border: `1px solid ${COLORS.sageLight}` }}>
            <label style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, fontWeight: 700, display: "block", marginBottom: 10 }}>{currentZone.ageLabel}</label>
            <input type="number" inputMode="numeric" min="0" max={activeZone === "0-3" ? 36 : activeZone === "gravidanza" ? 40 : activeZone === "3-6" ? 6 : 18} value={babyAge} onChange={e => setBabyAge(e.target.value)}
              style={{ border: `2px solid ${COLORS.sageLight}`, borderRadius: 18, padding: "10px 16px", fontSize: 16, fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, width: 120, outline: "none" }} />
            <span style={{ color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontSize: 14, marginLeft: 10 }}>{activeZone === "0-3" ? "mesi (0–36)" : activeZone === "gravidanza" ? "settimane (1–40)" : `anni (${activeZone})`}</span>
            {subPhase && babyAge && (
              <div style={{ marginTop: 10, display: "inline-block", background: `${currentZone.color}18`, border: `1.5px solid ${currentZone.color}40`, borderRadius: 20, padding: "4px 14px", fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700, color: currentZone.color }}>
                {activeZone === "0-3" ? (Number(babyAge) < 6 ? "📍 0–6 mesi" : Number(babyAge) < 18 ? "📍 6–18 mesi" : "📍 18–36 mesi")
                 : activeZone === "3-6" ? (Number(babyAge) < 4 ? "📍 3–4 anni" : Number(babyAge) < 5 ? "📍 4–5 anni" : "📍 5–6 anni")
                 : activeZone === "6-12" ? (Number(babyAge) < 8 ? "📍 6–8 anni" : Number(babyAge) < 10 ? "📍 8–10 anni" : "📍 10–12 anni")
                 : ""} — checklist personalizzata
              </div>
            )}
          </div>
        )}

        {/* Checklist items — steps 1 and 2 */}
        {step < 3 && categories.map(cat => {
          const catItems = activeItems.filter(d => d.category === cat);
          const catStyle = CATEGORY_COLORS[cat] || { bg: "#F0F0F0", text: "#555" };
          return (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ display: "inline-block", background: catStyle.bg, color: catStyle.text, borderRadius: 28, padding: "4px 14px", fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{cat}</div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {catItems.map(d => (
                  <button key={d.id} aria-pressed={activeSelected.includes(d.id)} onClick={() => toggle(d.id)} style={{
                    background: activeSelected.includes(d.id) ? (step === 1 ? `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.peach})` : `linear-gradient(135deg, ${COLORS.mint}, ${COLORS.mintDark})`) : "white",
                    border: activeSelected.includes(d.id) ? `2px solid ${step === 1 ? COLORS.rose : COLORS.mint}` : `2px solid ${COLORS.roseLight}`,
                    borderRadius: 28, padding: "16px 18px", display: "flex", alignItems: "center", gap: 10,
                    cursor: "pointer", transition: "all 0.2s", textAlign: "left",
                  }}>
                    <span style={{ fontSize: 18 }}>{d.icon}</span>
                    <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, lineHeight: 1.4, color: activeSelected.includes(d.id) ? "white" : COLORS.deepSlate }}>{d.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* CTA buttons */}
        {step === 1 && (
          <div style={{ textAlign: "center", margin: "40px 0" }}>
            <div style={{ marginBottom: 16, color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontSize: 14 }}>
              {selectedDiff.length} difficoltà selezionate
            </div>
            <button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={selectedDiff.length === 0}
              style={{
                background: selectedDiff.length === 0 ? "#CCC" : `linear-gradient(135deg, ${COLORS.coral}, ${COLORS.violet})`,
                color: "white", border: "none", borderRadius: 50,
                padding: isMobile ? "18px 36px" : "20px 56px",
                fontSize: isMobile ? 16 : 18, fontFamily: "'Nunito', sans-serif", fontWeight: 700,
                cursor: selectedDiff.length === 0 ? "not-allowed" : "pointer",
                boxShadow: selectedDiff.length > 0 ? "0 8px 30px rgba(255,107,107,0.35)" : "none",
                minHeight: 56, transition: "all 0.2s",
              }}>Continua → Punti di forza ✨</button>
            <p style={{ marginTop: 12, color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontSize: 13, fontStyle: "italic" }}>
              Puoi anche saltare e passare direttamente ai punti di forza
            </p>
            <button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{ background: "none", border: "none", color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
              Salta le difficoltà →
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: "center", margin: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontSize: 14 }}>
              {selectedStr.length} punti di forza selezionati
            </div>
            <button onClick={analyze} disabled={loading}
              style={{
                background: `linear-gradient(135deg, #F4A261, #4A7C59)`,
                color: "white", border: "none", borderRadius: 50,
                padding: isMobile ? "18px 36px" : "20px 56px",
                fontSize: isMobile ? 16 : 18, fontFamily: "'Nunito', sans-serif", fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 8px 30px rgba(74,124,89,0.35)",
                minHeight: 56, transition: "all 0.2s",
              }}>{loading ? "⏳ Analisi in corso..." : activeZone === "gravidanza" ? "🤰 Analizza il profilo della mia gravidanza" : activeZone === "papa" ? "🤝 Analizza il mio profilo da genitore" : activeZone === "12-15" ? "🌊 Analizza il profilo del mio preadolescente" : activeZone === "15-18" ? "✨ Analizza il profilo del mio adolescente" : "🌿 Analizza il profilo del mio bambino"}</button>
            <button onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{ background: "none", border: "none", color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
              ← Torna alle difficoltà
            </button>
          </div>
        )}

        {error && <div style={{ background: "#FFE5E5", borderRadius: 22, padding: 24, marginBottom: 24, color: "#C0392B", fontFamily: "'Nunito', sans-serif", fontSize: 15, lineHeight: 1.7 }}>{error}</div>}

        {/* Result — step 3 */}
        {step === 3 && (
          <div ref={resultRef}>
            {/* Summary chips */}
            {(selectedDiff.length > 0 || selectedStr.length > 0) && (
              <div style={{ background: COLORS.warmWhite, borderRadius: 22, padding: 20, marginBottom: 24, border: `1px solid ${COLORS.sageLight}` }}>
                {selectedDiff.length > 0 && (
                  <div style={{ marginBottom: selectedStr.length > 0 ? 12 : 0 }}>
                    <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700, color: COLORS.slateLight }}>🚧 Difficoltà selezionate</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {selectedDiff.map(id => {
                        const d = currentZone.difficulties.find(x => x.id === id);
                        return d ? <span key={id} style={{ background: COLORS.coralLight, color: COLORS.coral, borderRadius: 28, padding: "4px 12px", fontFamily: "'Nunito', sans-serif", fontSize: 13 }}>{d.icon} {d.label}</span> : null;
                      })}
                    </div>
                  </div>
                )}
                {selectedStr.length > 0 && (
                  <div>
                    <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700, color: COLORS.slateLight }}>✨ Punti di forza</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {selectedStr.map(id => {
                        const s = currentZone.strengths.find(x => x.id === id);
                        return s ? <span key={id} style={{ background: "#E8F5E9", color: "#2E7D32", borderRadius: 28, padding: "4px 12px", fontFamily: "'Nunito', sans-serif", fontSize: 13 }}>{s.icon} {s.label}</span> : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ background: COLORS.warmWhite, borderRadius: 32, padding: isMobile ? "20px 16px" : 36, border: `1px solid ${COLORS.sageLight}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${COLORS.sageLight}` }}>
                <div style={{ fontSize: 32 }}>🌿</div>
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 20, margin: 0, marginBottom: 4 }}>{activeZone === "gravidanza" ? "Il profilo della tua gravidanza" : activeZone === "papa" ? "Il tuo profilo da genitore" : activeZone === "12-15" ? "Il profilo del tuo preadolescente" : activeZone === "15-18" ? "Il profilo del tuo adolescente" : "Il profilo del tuo bambino"}</h3>
                  <p style={{ color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontSize: 15, margin: 0, fontStyle: "italic" }}>Analisi integrata difficoltà + punti di forza</p>
                </div>
              </div>
              <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, lineHeight: 1.85 }}>{renderMarkdownJSX(diagnosis, { headingColor: "#2D3B3A", badgeColor: "#7A9E8E" })}</div>
              <div style={{ marginTop: 24, padding: "16px 20px", background: "#FFF8E7", border: "1px solid #F0C040", borderRadius: 18, fontFamily: "'Nunito', sans-serif", fontSize: 13, color: "#7A5800" }}>
                <strong>⚕️ Avviso importante:</strong> questa risposta ha scopo esclusivamente informativo. Non costituisce diagnosi né consulenza clinica.
              </div>
            </div>

            <div style={{ textAlign: "center", margin: "36px 0 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              {/* Azione primaria: torna all'hub della fascia */}
              {setActiveSection && (
                <button onClick={() => { setActiveSection("guide"); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{
                  background: `linear-gradient(135deg, ${currentZone.color}, ${COLORS.deepSlate})`,
                  color: "white", border: "none", borderRadius: 50,
                  padding: "16px 44px", fontFamily: "'Nunito', sans-serif", fontSize: 16, fontWeight: 700,
                  cursor: "pointer", boxShadow: `0 6px 24px rgba(45,59,58,0.28)`,
                  minHeight: 52, letterSpacing: "0.2px",
                }}>🏠 {currentZone.icon} Torna all'hub {currentZone.label.replace(currentZone.icon, "").trim()}</button>
              )}
              {/* Azione secondaria: ricomincia */}
              <button onClick={resetAll} style={{
                background: "none", border: "none",
                color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif",
                fontSize: 14, cursor: "pointer", textDecoration: "underline",
                textUnderlineOffset: 3, padding: "4px 8px",
              }}>🔄 Oppure ricomincia dall'inizio</button>
            </div>
          </div>
        )}

        {/* ── Footer bibliografico condizionale per zona ── */}
        {CHECKLIST_FOOTER[zone] && (
          <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: COLORS.slateLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Riferimenti scientifici</p>
            {CHECKLIST_FOOTER[zone].map((ref, i) => ref.url ? (
              <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer" style={{
                display: "block", fontFamily: "'Nunito', sans-serif", fontSize: 12,
                color: COLORS.slateLight, textDecoration: "underline", textUnderlineOffset: 2,
                marginBottom: 4, lineHeight: 1.5,
              }}>{ref.label}</a>
            ) : (
              <span key={i} style={{
                display: "block", fontFamily: "'Nunito', sans-serif", fontSize: 12,
                color: COLORS.slateLight, marginBottom: 4, lineHeight: 1.5,
              }}>{ref.label}</span>
            ))}
          </div>
        )}

        <div style={{ background: "#FFF8E7", border: "2px solid #F0C040", borderRadius: 28, padding: "14px 18px", marginTop: 40, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚕️</span>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: "#7A5800", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            <strong>Avviso clinico:</strong> questa sezione ha scopo esclusivamente informativo e divulgativo.
            Le risposte sono generate da un sistema di intelligenza artificiale e <strong>non costituiscono in alcun modo una consulenza psicologica, medica o clinica individuale</strong>.
            Non sostituiscono la visita o il parere del pediatra, dello psicologo o di qualsiasi professionista della salute.
            In caso di dubbi, rivolgiti sempre al tuo specialista di riferimento.
          </p>
        </div>
        <div style={{ background: "#F0F7FF", border: "1px solid #B8D8F8", borderRadius: 18, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: "#1A4A7A", fontSize: 13, lineHeight: 1.65, margin: 0 }}>
            <strong>Privacy:</strong> il testo che inserisci viene inviato al servizio Groq (llama-3.3-70b-versatile) per generare la risposta e non viene memorizzato. Non inserire dati anagrafici o sanitari identificativi del tuo bambino.
          </p>
        </div>
      </div>
    </div>
  );
}

const SCREENS_RISORSE = {
  servizi: [
    { icon: "📋", title: "AAP — Guida pratica per genitori: le 5 C's", text: "La guida ufficiale dell'American Academy of Pediatrics per un uso consapevole degli schermi: Content, Child, Calm, Crowd, Context. Concreta, per fascia d'età.", url: "https://www.healthychildren.org/English/family-life/Media/Pages/How-to-Make-a-Family-Media-Use-Plan.aspx" },
    { icon: "🇮🇹", title: "SIP — Connessioni Delicate", text: "Indagine italiana della Società Italiana di Pediatria sull'uso degli schermi nei bambini 0–6 anni. Dati nazionali e raccomandazioni pratiche in italiano.", url: "https://sip.it/2025/01/28/connessioni-delicate/" },
  ],
  footer: [
    { label: "OMS — Comunicato 2019: Physical activity, sedentary behaviour and sleep for children under 5", url: "https://www.who.int/news/item/24-04-2019-to-grow-up-healthy-children-need-to-sit-less-and-play-more" },
    { label: "OMS — PDF completo: Guidelines on physical activity, sedentary behaviour and sleep (2019)", url: "https://iris.who.int/bitstream/handle/10665/311664/9789241550536-eng.pdf" },
    { label: "AAP — Linee Guida 2026: Beyond Screen Time — 5 C's approach", url: "https://publications.aap.org/pediatrics/article/157/1/e2025071137/199977/" },
    { label: "SIP — Connessioni Delicate: indagine nazionale schermi 0–6 anni (2025)", url: "https://sip.it/2025/01/28/connessioni-delicate/" },
  ],
};

function ScreensPage({ zone }) {
  const isMobile = useIsMobile();
  const [openCard, setOpenCard] = useState(null);

  const effectiveZone = zone === "papa" ? "gravidanza" : zone;
  const d = SCREENS_DATA[effectiveZone] || SCREENS_DATA["0-3"];
  const { title, bigStats, ageRisks, brain_facts, reassuring } = d;

  return (
    <div style={{ background: "#FFFCFA", minHeight: "100vh", paddingBottom: 48 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "44px 20px 0" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 32, marginBottom: 8 }}>{title}</h2>
        <p style={{ color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontStyle: "italic", marginBottom: 12 }}>
          Dati verificati dalla letteratura peer-reviewed. Solo ciò che la scienza ha effettivamente dimostrato.
        </p>
        <div style={{ background: "#FFF0F0", borderRadius: 18, padding: "10px 16px", marginBottom: 36, display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'Nunito', sans-serif", fontSize: 15, color: "#C0392B" }}>
          <span>⚠️</span> <span>Tutti i dati riportati provengono da studi peer-reviewed o linee guida di organismi sanitari internazionali (AAP, OMS, JAMA Pediatrics).</span>
        </div>

        {/* Big stats */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
          {bigStats.map((s, i) => (
            <div key={i} role="button" tabIndex={0} onClick={() => setOpenCard(openCard === i ? null : i)} style={{ background: COLORS.warmWhite, borderRadius: 28, padding: "22px 18px", border: `2px solid ${openCard === i ? s.color : "rgba(45,59,58,0.08)"}`, cursor: "pointer", transition: "all 0.2s", boxShadow: openCard === i ? `0 6px 24px ${s.color}33` : "none" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.emoji}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", color: s.color, fontSize: 38, fontWeight: 700, lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontFamily: "'Nunito', sans-serif", color: s.color, fontSize: 14, fontWeight: 700 }}>{s.unit}</div>
              <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, lineHeight: 1.5, margin: "8px 0 6px" }}>{s.label}</div>
              <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 13, fontStyle: "italic" }}>{s.sub}</div>
              {openCard === i && <div style={{ marginTop: 14, padding: "12px 14px", background: "#F8F9FF", borderRadius: 10, fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.65 }}>{s.note}</div>}
            </div>
          ))}
        </div>

        {/* Age-by-age guide */}
        <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 20 }}>Guida per fascia d'età</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
          {ageRisks.map((a, i) => (
            <div key={i} style={{ background: COLORS.warmWhite, borderRadius: 28, overflow: "hidden", border: "2px solid rgba(45,59,58,0.07)" }}>
              <div style={{ background: a.bg, padding: "16px 22px", display: "flex", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 8 : 14 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", color: a.color, fontSize: 18, fontWeight: 700 }}>{a.range}</div>
                <div style={{ background: a.color, color: "white", borderRadius: 999, padding: "6px 16px", fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: 700 }}>{a.verdict}</div>
              </div>
              <div style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {a.risks.map((r, j) => (
                    <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ color: a.color, fontSize: 14, flexShrink: 0, marginTop: 1 }}>•</span>
                      <span style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, lineHeight: 1.65 }}>{parseLinks(r)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: COLORS.sageLight, borderRadius: 18, padding: "12px 16px", fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, lineHeight: 1.65 }}>
                  <span style={{ fontWeight: 700, color: COLORS.sage }}>✅ Cosa fare: </span>{parseLinks(a.whatToDo)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Brain facts */}
        <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 20 }}>Perché neurologicamente 🧠</h3>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 40 }}>
          {brain_facts.map((f, i) => (
            <div key={i} style={{ background: COLORS.warmWhite, borderRadius: 18, padding: 24, border: "1px solid rgba(45,59,58,0.07)" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <h4 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 15, margin: "0 0 10px" }}>{f.title}</h4>
              <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 15, lineHeight: 1.7, margin: 0 }}>{parseLinks(f.text)}</p>
            </div>
          ))}
        </div>

        {/* Reassuring note */}
        <div style={{ background: COLORS.deepSlate, borderRadius: 28, padding: "28px 32px" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.goldLight, fontSize: 18, marginBottom: 12 }}>Una nota rassicurante 💛</div>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: "rgba(255,255,255,0.78)", fontSize: 15, lineHeight: 1.8, margin: 0 }}>{parseLinks(reassuring)}</p>
        </div>

        {/* Risorse per famiglie */}
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 8 }}>
            📋 Risorse per famiglie
          </h3>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 15, fontStyle: "italic", marginBottom: 20 }}>
            Guide pratiche e indagini aggiornate
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SCREENS_RISORSE.servizi.map((srv, i) => (
              <a key={i} href={srv.url} target="_blank" rel="noopener noreferrer" style={{
                background: "white", borderRadius: 18, border: "1.5px solid rgba(0,0,0,0.06)",
                padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start",
                textDecoration: "none", color: "inherit", cursor: "pointer",
                transition: "border-color 0.18s, box-shadow 0.18s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.sage; e.currentTarget.style.boxShadow = "0 2px 12px rgba(100,160,130,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>{srv.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: COLORS.deepSlate, fontSize: 14, marginBottom: 4 }}>{srv.title}</div>
                  <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 13, lineHeight: 1.7 }}>{srv.text}</div>
                </div>
                <span style={{ fontSize: 14, color: COLORS.sage, flexShrink: 0, marginTop: 2 }}>↗</span>
              </a>
            ))}
          </div>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: COLORS.slateLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Riferimenti scientifici</p>
            {SCREENS_RISORSE.footer.map((ref, i) => (
              <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer" style={{
                display: "block", fontFamily: "'Nunito', sans-serif", fontSize: 12,
                color: COLORS.slateLight, textDecoration: "underline", textUnderlineOffset: 2,
                marginBottom: 4, lineHeight: 1.5,
              }}>{ref.label}</a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
function LibraryPage() {
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState(null);

  const concepts = [
    {
      icon: "🧠", title: "Plasticità neurale",
      subtitle: "Perché i primi anni sono irripetibili",
      color: COLORS.sageLight,
      content: `La plasticità sinaptica è massima nei primi 3 anni di vita: il cervello produce il doppio delle [[Sinapsi]] necessarie ([[Pruning sinaptico|pruning]]), poi potatura selettiva basata sull'esperienza. Ciò che viene usato, si rafforza; ciò che non viene usato, si perde.\n\n**Implicazione pratica**: Le esperienze emotive ripetute — essere consolati, giocati, letti — letteralmente costruiscono circuiti cerebrali permanenti. Non c'è "troppo amore" dal punto di vista neurologico.\n\n**Sacks e la plasticità**: Oliver Sacks in "An Anthropologist on Mars" (1995) documentò casi straordinari di riorganizzazione cerebrale in età adulta — a dimostrazione che il cervello non smette mai di modificarsi. Eric Kandel, Premio Nobel per la Medicina (2000), ha dimostrato a livello molecolare come ogni esperienza ripetuta modifichi fisicamente le connessioni sinaptiche: l'apprendimento è letteralmente struttura biologica.\\n\\n**Riferimenti**: Huttenlocher (1979), Gopnik "The Philosophical Baby" (2009), Siegel "The Developing Mind" (2020), Sacks "An Anthropologist on Mars" (1995), Kandel "In Search of Memory" (2006).`
    },
    {
      icon: "💛", title: "Base Sicura",
      subtitle: "Il paradosso dell'autonomia",
      color: "#FFF0E8",
      content: `Bowlby scoprì un paradosso controintuitivo: i bambini con [[Attaccamento sicuro]] sono quelli che esplorano di più. La "base sicura" non rende il bambino dipendente — lo rende libero.\n\n**Meccanismo neurale**: L'attaccamento sicuro regola il sistema dello stress ([[Asse HPA / Cortisolo|asse HPA]]), abbassando i livelli di cortisolo e permettendo al cervello di operare in modalità "apprendimento" anziché "sopravvivenza".\n\n**Sapolsky e lo stress precoce**: Robert Sapolsky in "Why Zebras Don't Get Ulcers" (2004) spiega come lo stress cronico da imprevedibilità nei primi anni danneggi strutturalmente l'ippocampo. Bruce Perry in "The Boy Who Was Raised as a Dog" (2006) ha documentato come persino i traumi precoci profondi possano essere parzialmente rielaborati grazie a relazioni sicure successive: la relazione stessa è la terapia.\\n\\n**Riferimenti**: Bowlby (1969), Ainsworth Strange Situation (1978), studi longitudinali dell'Università del Minnesota (2005), Sapolsky "Why Zebras Don't Get Ulcers" (2004), Perry "The Boy Who Was Raised as a Dog" (2006).`
    },
    {
      icon: "🌊", title: "Regolazione Co-regolazione",
      subtitle: "Come si impara a gestire le emozioni",
      color: "#F0EFF8",
      content: `I bambini nascono senza la capacità di regolare le proprie emozioni. La [[Corteccia prefrontale]] (sede del controllo emotivo) continua a maturare fino ai 20-25 anni circa — è l'ultima area del cervello a completare il suo sviluppo (PMC, 2013; Giedd, NIH). Come si sviluppa la regolazione emotiva allora?\n\n**Attraverso la [[Co-regolazione]]**: Quando un genitore o persona di riferimento calmo aiuta un bambino in difficoltà, i sistemi neurali del bambino imparano a regolarsi "scaricando" sull'altro. Migliaia di ripetizioni costruiscono progressivamente la capacità auto-regolatoria.\n\n**Implicazione**: Non "lasciar piangere" per insegnare l'autonomia. La via è opposta: più co-regolazione → più autoregolazione futura.\n\n**Damasio e LeDoux**: Antonio Damasio in "Descartes' Error" (1994) ha dimostrato che le emozioni non disturbano la ragione — la rendono possibile. Joseph LeDoux in "The Emotional Brain" (1996) ha mappato il ruolo dell'[[Amigdala]]: si attiva prima che la corteccia elabori — calmare prima e spiegare dopo è neuroscienza, non cedimento. Bessel van der Kolk in "The Body Keeps the Score" (2014) ha mostrato come le emozioni non regolate nell'infanzia si inscrivano letteralmente nel corpo e nei circuiti dello stress.\\n\\n**Riferimenti**: Porges [[Teoria polivagale]] (2011), Schore "The Science of the Art of Psychotherapy" (2012), Damasio "Descartes' Error" (1994), LeDoux "The Emotional Brain" (1996), van der Kolk "The Body Keeps the Score" (2014).`
    },
    {
      icon: "🪞", title: "Neuroni Specchio",
      subtitle: "L'imitazione come apprendimento profondo",
      color: COLORS.goldLight,
      content: `I neuroni specchio — scoperti da Rizzolatti a Parma — si attivano sia quando si esegue un'azione sia quando si osserva l'altro che la compie. Sono la base neurologica dell'imitazione, dell'empatia e dell'apprendimento sociale.\n\n**Nei bambini**: Il sistema dei [[Neuroni specchio]] è funzionale dalla nascita. Il neonato imita le espressioni facciali — non perché "voglia" farlo, ma perché il suo cervello è così configurato.\n\n**Implicazione pratica**: Mostrare ai bambini come si gestiscono le emozioni (anche verbalmente: "Sono arrabbiato ma mi calmo respirando") è più efficace di qualsiasi spiegazione.\n\n**Ramachandran**: V.S. Ramachandran in "The Tell-Tale Brain" (2011) definì i neuroni specchio "le cellule nervose che hanno plasmato la civiltà" — responsabili non solo dell'imitazione, ma del linguaggio, della cultura e della trasmissione intergenerazionale di competenze. In "Phantoms in the Brain" (1998) mostrò come la loro alterazione sia associata a difficoltà empatiche. Il genitore che gestisce le proprie emozioni davanti al figlio non dà solo l'esempio: sta letteralmente programmando i circuiti dell'empatia.\\n\\n**Riferimenti**: Rizzolatti & Craighero (2004), Meltzoff & Moore (1977), Ramachandran "The Tell-Tale Brain" (2011), Ramachandran "Phantoms in the Brain" (1998).`
    },
    {
      icon: "💭", title: "Mentalizzazione",
      subtitle: "Capire la mente del bambino",
      color: "#F5EEF8",
      content: `La mentalizzazione (Fonagy) è la capacità di vedere il bambino come un essere con stati mentali propri — desideri, intenzioni, emozioni. È il fattore predittivo più forte dell'attaccamento sicuro.\n\n**In pratica**: Un genitore "mentalizzante" non dice "è un capriccio" ma "sta cercando di dirmi qualcosa". Non interpreta il comportamento come disobbedienza ma come comunicazione.\n\n**L'effetto**: I bambini di genitori mentalizzanti sviluppano prima la [[Teoria della mente]] (capire che gli altri hanno pensieri diversi) e mostrano migliore regolazione emotiva.\n\n**Damasio e Sacks**: Antonio Damasio in "The Feeling of What Happens" (1999) ha mostrato che la coscienza di sé emerge dalla capacità di percepire i propri stati emotivi — esattamente ciò che la mentalizzazione insegna al bambino a riconoscere nell'altro. Oliver Sacks in "The Man Who Mistook His Wife for a Hat" (1985) documentò pazienti incapaci di leggere le espressioni altrui: vivere senza mentalizzazione è una forma di cecità relazionale reale.\\n\\n**Riferimenti**: Fonagy et al. "Affect Regulation, Mentalization" (2002), Damasio "The Feeling of What Happens" (1999), Sacks "The Man Who Mistook His Wife for a Hat" (1985).`
    },
    {
      icon: "🔁", title: "Riparazione",
      subtitle: "Sbagliare è parte del processo",
      color: "#E8F8F5",
      content: `Tronick ha dimostrato che anche nelle coppie genitore-bambino ben funzionanti, solo circa il 30% delle interazioni è in sintonizzazione positiva. Il restante 70% è momenti di incomprensione seguita (quando il genitore risponde) da riparazione. Il dato è riportato da Fosha (2000) analizzando il corpus di ricerche di Tronick, e confermato nel libro "The Power of Discord" (Tronick & Gold, 2020).\n\n**La scoperta chiave**: Non è la perfezione a costruire l'attaccamento sicuro, ma il [[Ciclo rottura-riparazione]]. Il bambino impara che i legami si possono riparare — una delle lezioni più importanti della vita.\n\n**Implicazione**: Non serve essere genitori perfetti. Serve essere genitori "abbastanza buoni" (Winnicott) che riparano quando sbagliano.\n\n**Riferimenti**: Fosha (2000); Tronick & Gold "The Power of Discord" (2020); Sapolsky "Behave" (2017); meta-analisi Still Face Paradigm, Mesman et al. (2009).\\n\\n**Sapolsky e la resilienza**: Robert Sapolsky in "Behave" (2017) ha mostrato che il cervello tollera lo stress molto meglio quando è prevedibile e ha un senso. Un genitore che sbaglia e ripara non è caotico: insegna che lo stress relazionale è sopportabile e reversibile. È questa prevedibilità della riparazione — non l'assenza di conflitto — a costruire la [[Resilienza]] neurologica del bambino.\n\n**Un video che vale più di mille parole**: Cerca 'Still Face Experiment' su YouTube. Due minuti che mostrano cosa succede quando un genitore smette di rispondere — e quanto rapidamente il bambino si disorganizza. È il motivo per cui la riparazione conta più della perfezione.`
    },
  ];

  return (
    <div style={{ background: "#FFFCFA", minHeight: "100vh" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "44px 20px" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 32, marginBottom: 8 }}>
          Biblioteca scientifica
        </h2>
        <p style={{ color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontStyle: "italic", marginBottom: 36 }}>
          I concetti chiave delle neuroscienze e dell'attaccamento, spiegati ai genitori
        </p>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {concepts.map((c, i) => (
            <div key={i} id={`lib-card-${i}`} className={selected === i ? "active-card-scroll" : ""} role="button" tabIndex={0} onClick={() => { const opening = selected !== i; setSelected(opening ? i : null); if (opening) scrollToCard(`lib-card-${i}`); }} style={{
              background: selected === i ? COLORS.deepSlate : "white",
              border: `2px solid ${selected === i ? COLORS.deepSlate : COLORS.sageLight}`,
              borderRadius: 28, overflow: "hidden", cursor: "pointer",
              transition: "all 0.25s",
              boxShadow: selected === i ? "0 8px 40px rgba(45,59,58,0.2)" : "0 2px 12px rgba(45,59,58,0.05)",
            }}
              onMouseEnter={e => { if (selected !== i) e.currentTarget.style.boxShadow = "0 8px 30px rgba(45,59,58,0.12)"; }}
              onMouseLeave={e => { if (selected !== i) e.currentTarget.style.boxShadow = "0 2px 12px rgba(45,59,58,0.05)"; }}
            >
              <div style={{ background: selected === i ? "rgba(255,255,255,0.08)" : c.color, padding: "20px 24px 16px" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{c.icon}</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", color: selected === i ? COLORS.cream : COLORS.deepSlate, fontSize: 17, margin: "0 0 4px" }}>{c.title}</h3>
                <p style={{ color: selected === i ? COLORS.sageMid : COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontStyle: "italic", fontSize: 15, margin: 0 }}>{c.subtitle}</p>
              </div>
              {selected === i && (
                <div style={{ padding: "20px 24px" }}>
                  {c.content.split('\n\n').map((para, j) => (
                    <p key={j} style={{
                      fontFamily: "'Nunito', sans-serif", color: "rgba(251,245,236,0.88)", fontSize: 15.5, lineHeight: 1.75, margin: "0 0 14px",
                      ...(para.startsWith('**') ? { fontWeight: 700 } : {})
                    }}>
                      {renderRichContent(para, { boldColor: "#FBF5EC" })}
                    </p>
                  ))}
                </div>
              )}
              {selected !== i && (
                <div style={{ padding: "8px 24px 16px", color: COLORS.sage, fontFamily: "'Nunito', sans-serif", fontSize: 14 }}>
                  Tocca per leggere →
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Reading list */}
        <div style={{ marginTop: 48, background: COLORS.lavenderLight, borderRadius: 32, padding: 36 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 24 }}>
            📚 Letture consigliate
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { title: "Il cervello del bambino", author: "D. Siegel & T. Bryson", tag: "Neuroscienze" },
              { title: "Madri e neonati", author: "D.W. Winnicott", tag: "Psicoanalisi" },
              { title: "Il bambino filosofo", author: "A. Gopnik", tag: "Neuroscienze" },
              { title: "Attaccamento e perdita", author: "J. Bowlby", tag: "Attaccamento" },
              { title: "Il mondo interpersonale del bambino", author: "D. Stern", tag: "Psiche" },
              { title: "No drama discipline", author: "D. Siegel & T. Bryson", tag: "Pratico" },
              { title: "Can Love Last?", author: "S.A. Mitchell", tag: "Relazioni" },
            ].map((book, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 28, padding: 20 }}>
                <div style={{
                  display: "inline-block", background: COLORS.sage, color: "white",
                  borderRadius: 6, padding: "6px 14px", fontSize: 13,
                  fontFamily: "'Nunito', sans-serif", marginBottom: 10
                }}>{book.tag}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 14, marginBottom: 6 }}>{book.title}</div>
                <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 14, fontStyle: "italic" }}>{book.author}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    <CrossLinks cards={[
      { emoji: "📖", label: "Glossario", desc: "Approfondisci i termini chiave", section: "glossario", bg: COLORS.lavenderLight },
      { emoji: "🔍", label: "Curiosità e miti", desc: "La scienza contro le credenze comuni", section: "curiosita", bg: COLORS.peachLight },
    ]} />
    <SuggerimentoButton compact />
    </div>
  );
}
function CuriositaPage({ zone }) {
  const isMobile = useIsMobile();
  const [openMito, setOpenMito] = useState(null);
  const [openForum, setOpenForum] = useState(null);

  const effectiveZone = zone === "papa" ? "gravidanza" : zone;
  const d = CURIOSITA_DATA[effectiveZone] || CURIOSITA_DATA["0-3"];
  const myths = d.myths;
  const forumTopics = d.forumTopics;

  const zoneTitle = effectiveZone === "0-3" ? "0–3 anni" : effectiveZone === "3-6" ? "3–6 anni" : effectiveZone === "6-12" ? "6–12 anni" : effectiveZone === "12-15" ? "12–15 anni" : effectiveZone === "15-18" ? "15–18 anni" : effectiveZone === "gravidanza" ? "Gravidanza" : "Tutte le fasce";

  return (
    <div style={{ background: "#FFFCFA", minHeight: "100vh", paddingBottom: 48 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "44px 20px 0" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 32, marginBottom: 8 }}>
          🇮🇹 Curiosità · {zoneTitle}
        </h2>
        <p style={{ color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontStyle: "italic", marginBottom: 40 }}>
          Miti da sfatare e temi caldi dai forum italiani — per questa fascia d'età
        </p>

        {/* Myths section */}
        <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 20 }}>
          Miti da sfatare 🔬
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 52 }}>
          {myths.map((m, i) => (
            <div key={i} id={`mito-card-${i}`} className={openMito === i ? "active-card-scroll" : ""} style={{ background: COLORS.warmWhite, borderRadius: 28, overflow: "hidden", border: "2px solid rgba(45,59,58,0.07)", cursor: "pointer" }}
              onClick={() => { const opening = openMito !== i; setOpenMito(opening ? i : null); if (opening) scrollToCard(`mito-card-${i}`); }}>
              <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 32, flexShrink: 0 }}>{m.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "inline-block", background: m.labelBg, color: m.labelColor, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: "'Nunito', sans-serif", fontWeight: 700, marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{m.title}</div>
                  <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 14, lineHeight: 1.5 }}>{m.short}</div>
                </div>
                <div style={{ fontSize: 20, color: COLORS.slateLight, flexShrink: 0 }}>{openMito === i ? "▲" : "▼"}</div>
              </div>
              {openMito === i && (
                <div style={{ borderTop: `2px solid rgba(45,59,58,0.06)`, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ background: "#F0F7FF", borderRadius: 18, padding: "14px 18px" }}>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: "#1A5F9E", fontSize: 13, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>🔬 Cosa dice la scienza</div>
                    <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{parseLinks(m.science)}</p>
                  </div>
                  <div style={{ background: "#F0FFF5", borderRadius: 18, padding: "14px 18px" }}>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: "#1A7A3A", fontSize: 13, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>✅ La verità</div>
                    <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{parseLinks(m.truth)}</p>
                  </div>
                  <div style={{ background: COLORS.goldLight, borderRadius: 18, padding: "14px 18px" }}>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: "#7A5800", fontSize: 13, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>🌍 Nel mondo</div>
                    <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{parseLinks(m.fun)}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Forum topics */}
        <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 8 }}>
          Dai forum delle mamme (e papà) 💬
        </h3>
        <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 15, fontStyle: "italic", marginBottom: 24 }}>
          I temi più discussi online per questa fascia d'età — con quello che la scienza dice davvero
        </p>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {forumTopics.map((t, i) => {
            const sty = { fontFamily: "'Nunito', Georgia, sans-serif" };
            return (
              <div key={i} id={`forum-card-${i}`} className={openForum === i ? "active-card-scroll" : ""} role="button" tabIndex={0} onClick={() => { const opening = openForum !== i; setOpenForum(opening ? i : null); if (opening) scrollToCard(`forum-card-${i}`); }}
                style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}CC)`, borderRadius: 28, overflow: "hidden", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
                <div style={{ padding: "22px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <span style={{ fontSize: 36 }}>{t.emoji}</span>
                    <span style={{ background: "rgba(255,255,255,0.30)", borderRadius: 6, padding: "3px 10px", ...sty, color: "white", fontSize: 11, fontWeight: 700 }}>{t.category}</span>
                  </div>
                  <div style={{ ...sty, color: "white", fontSize: 17, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{t.title}</div>
                  <div style={{ ...sty, color: "rgba(255,255,255,0.92)", fontSize: 13, fontStyle: "italic", marginBottom: 10 }}>{t.rank}</div>
                  <div style={{ ...sty, color: "white", fontSize: 14, lineHeight: 1.6 }}>{parseLinks(t.desc)}</div>
                  <div style={{ marginTop: 14, ...sty, color: "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: 600 }}>
                    {openForum === i ? "▲ Nascondi" : "▼ Cosa dice la scienza"}
                  </div>
                </div>
                {openForum === i && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 20px" }}>
                      {t.idea.split("\n\n").map((para, pi) => (
                        <div key={pi} style={{
                          background: pi === 0 ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.18)",
                          borderRadius: 10, padding: "12px 14px",
                          ...sty, color: "white", fontSize: 14, lineHeight: 1.65,
                        }}>{parseLinks(para)}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


/* ─── PRIVACY POLICY ─── */
function PrivacyPage({ onClose }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ background: "#FFFCFA", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "32px 20px" : "52px 40px" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 15, marginBottom: 32, display: "flex", alignItems: "center", gap: 8 }}>
          ← Torna all'app
        </button>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: isMobile ? 28 : 36, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 14, marginBottom: 40, fontStyle: "italic" }}>
          Ultimo aggiornamento: marzo 2025 · Versione 1.0
        </p>

        {[
          {
            title: "1. Titolare del trattamento",
            content: `Il titolare del trattamento dei dati personali è il Dott. Daniele Lami, Psicologo Psicoterapeuta, con studio a Roma. La Bebi App è uno strumento informativo gratuito sviluppato a supporto dei genitori, senza finalità commerciali dirette.\n\nPer qualsiasi richiesta relativa alla privacy: danielelami@libero.it`
          },
          {
            title: "2. Dati raccolti e finalità",
            content: `La Bebi App non raccoglie dati personali identificativi (nome, cognome, email, numero di telefono) né richiede registrazione.\n\nL'unica funzionalità che comporta un trattamento di dati è la sezione Profilo interattivo, in cui l'utente seleziona liberamente osservazioni e risorse relative al proprio figlio o al proprio percorso. Questi dati sono:\n\n• Inviati al servizio Groq, Inc. (USA) per la generazione della risposta tramite il modello llama-3.3-70b-versatile\n• Non memorizzati sui server della Bebi App\n• Non associati a nessun identificativo personale\n• Trattati in forma anonima e transitoria\n\nSi raccomanda di non inserire in questa sezione informazioni che permettano di identificare il minore (nome, dati anagrafici, codice fiscale, dati sanitari strutturati).`
          },
          {
            title: "3. Trattamento da parte di terzi (Groq)",
            content: `La funzionalità AI utilizza i servizi di Groq, Inc. (USA) tramite il modello llama-3.3-70b-versatile. Groq elabora i testi inviati secondo la propria Privacy Policy, disponibile su groq.com/privacy.\n\nL'utente, utilizzando la sezione Profilo interattivo, acconsente consapevolmente al trasferimento del testo inserito verso i server di Groq per l'elaborazione della risposta.`
          },
          {
            title: "4. Base giuridica del trattamento",
            content: `Il trattamento si basa sul consenso dell'utente (art. 6, comma 1, lett. a del GDPR), espresso con l'utilizzo volontario della funzionalità AI. L'utente può in qualsiasi momento astenersi dall'utilizzare tale funzionalità senza alcuna conseguenza sull'accesso alle altre sezioni dell'app.`
          },
          {
            title: "5. Conservazione dei dati",
            content: `La Bebi App non conserva alcun dato inserito dagli utenti. I testi inviati alla funzionalità AI vengono trasmessi a Groq, Inc. e non vengono archiviati su alcun server proprio dell'app. Le risposte generate vengono visualizzate esclusivamente nella sessione corrente e non vengono memorizzate.`
          },
          {
            title: "6. Diritti dell'utente (GDPR)",
            content: `In quanto interessato al trattamento dei dati, l'utente ha diritto a:\n\n• Accesso ai propri dati personali (art. 15 GDPR)\n• Rettifica dei dati inesatti (art. 16 GDPR)\n• Cancellazione ("diritto all'oblio") (art. 17 GDPR)\n• Limitazione del trattamento (art. 18 GDPR)\n• Portabilità dei dati (art. 20 GDPR)\n• Opposizione al trattamento (art. 21 GDPR)\n\nPoiché l'app non raccoglie dati identificativi, l'esercizio di tali diritti si applica principalmente ai dati eventualmente trasmessi a Groq, Inc., nei confronti del quale l'utente può esercitare i propri diritti secondo la Privacy Policy di Groq (groq.com/privacy).\n\nPer qualsiasi richiesta: danielelami@libero.it`
          },
          {
            title: "7. Cookie e tecnologie di tracciamento",
            content: `La Bebi App non utilizza cookie di profilazione né tecnologie di tracciamento pubblicitario. Non vengono installati cookie di terze parti. L'app utilizza esclusivamente la memoria locale del browser (localStorage) per conservare la fascia d'età selezionata dall'utente, al solo scopo di mantenere la navigazione coerente tra una sessione e l'altra. Questo dato non viene mai inviato a server esterni.`
          },
          {
            title: "8. Minori",
            content: `La Bebi App è destinata a genitori e professionisti. Non raccoglie dati di minori. Le informazioni inserite nella sezione AI riguardano situazioni relative a minori ma non vengono associate ad alcun dato identificativo. In ogni caso, si raccomanda di non inserire dati anagrafici o sanitari strutturati riferibili al minore.`
          },
          {
            title: "9. Modifiche alla Privacy Policy",
            content: `Il Titolare si riserva il diritto di modificare la presente Privacy Policy. Le modifiche sostanziali saranno comunicate tramite aggiornamento della data in cima al documento. L'uso continuato dell'app dopo la modifica costituisce accettazione della nuova versione.`
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 20, marginBottom: 12 }}>{section.title}</h2>
            {section.content.split("\n\n").map((para, j) => (
              <p key={j} style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, lineHeight: 1.85, marginBottom: 12 }}>
                {para.split("\n").map((line, k) => (
                  <span key={k}>{line}{k < para.split("\n").length - 1 && <br />}</span>
                ))}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── TERMINI DI SERVIZIO ─── */
function TerminiPage({ onClose }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ background: "#FFFCFA", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "32px 20px" : "52px 40px" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 15, marginBottom: 32, display: "flex", alignItems: "center", gap: 8 }}>
          ← Torna all'app
        </button>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: isMobile ? 28 : 36, marginBottom: 8 }}>Termini di Servizio</h1>
        <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 14, marginBottom: 40, fontStyle: "italic" }}>
          Ultimo aggiornamento: marzo 2025 · Versione 1.0
        </p>

        {/* Prominent disclaimer box */}
        <div style={{ background: "#FFF8E7", border: "2px solid #F0C040", borderRadius: 22, padding: "20px 24px", marginBottom: 40, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>⚕️</span>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", color: "#7A5800", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Avviso importante sulla natura dei contenuti</div>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: "#7A5800", fontSize: 15, lineHeight: 1.75, margin: 0 }}>
              La Bebi App fornisce esclusivamente informazioni di carattere generale su psicologia dello sviluppo, neuroscienze e teoria dell'attaccamento, elaborate a scopo divulgativo. I contenuti dell'app — incluse le risposte generate dalla funzionalità AI — <strong>non costituiscono in alcun modo una consulenza clinica, psicologica, medica o pedagogica individuale</strong>, né possono sostituire la valutazione di un professionista della salute mentale, del pediatra o di qualsiasi altro specialista. L'utente che utilizzi i contenuti dell'app come base per decisioni cliniche o terapeutiche lo fa sotto la propria esclusiva responsabilità.
            </p>
          </div>
        </div>

        {[
          {
            title: "1. Natura del servizio",
            content: `La Bebi App è uno strumento informativo e divulgativo gratuito, realizzato dal Dott. Daniele Lami, Psicologo Psicoterapeuta, con l'obiettivo di supportare i genitori con informazioni fondate su ricerche scientifiche in ambito di psicologia dello sviluppo, neuroscienze e teoria dell'attaccamento.\n\nLa Bebi App non è un servizio di psicoterapia, consulenza psicologica, consulenza medica o intervento clinico di alcun tipo. Non stabilisce alcuna relazione terapeutica tra l'utente e il Dott. Lami o qualsiasi altro professionista.`
          },
          {
            title: "2. Limitazioni della funzionalità AI",
            content: `La sezione Profilo interattivo utilizza un sistema di intelligenza artificiale (Groq — llama-3.3-70b-versatile) per generare risposte informative sulla base delle difficoltà selezionate dall'utente. Tali risposte:\n\n• Sono generate automaticamente da un sistema AI e non sono redatte né verificate dal Dott. Lami in tempo reale\n• Hanno carattere esclusivamente divulgativo e generale\n• Non tengono conto della storia clinica del minore né di eventuali diagnosi preesistenti\n• Non sostituiscono in alcun modo la valutazione di un professionista della salute\n• Potrebbero contenere imprecisioni o non essere aggiornate agli sviluppi più recenti della letteratura scientifica\n\nIn caso di dubbi sul benessere psicofisico del proprio figlio, l'utente è invitato a rivolgersi al pediatra di riferimento o a uno specialista della salute mentale infantile.`
          },
          {
            title: "3. Riferimenti scientifici",
            content: `I contenuti dell'app citano ricerche e autori della letteratura scientifica in psicologia dello sviluppo, neuroscienze e teoria dell'attaccamento. Tali riferimenti sono forniti a scopo divulgativo. Il Titolare si è impegnato per garantire l'accuratezza delle informazioni, ma non può garantire che ogni dato sia aggiornato alla pubblicazione scientifica più recente.\n\nL'utente che necessiti di informazioni clinicamente accurate e aggiornate è invitato a consultare le fonti primarie o un professionista qualificato.`
          },
          {
            title: "4. Esclusione di responsabilità",
            content: `Nei limiti consentiti dalla legge applicabile, il Dott. Daniele Lami e i soggetti coinvolti nello sviluppo della Bebi App non sono responsabili per:\n\n• Decisioni prese dall'utente sulla base dei contenuti dell'app\n• Eventuali danni diretti o indiretti derivanti dall'uso o dall'impossibilità di usare l'app\n• Imprecisioni nei contenuti generati dalla funzionalità AI\n• Interruzioni del servizio dovute a problemi tecnici o di terze parti (Groq, Vercel, etc.)\n\nLa responsabilità professionale del Dott. Lami si esercita esclusivamente nell'ambito delle prestazioni professionali erogate direttamente e non si estende all'uso dei contenuti divulgativi di questa app.`
          },
          {
            title: "5. Uso appropriato",
            content: `L'utente si impegna a utilizzare la Bebi App in modo appropriato, in particolare:\n\n• Non inserendo nella funzionalità AI dati anagrafici o sanitari identificativi del minore\n• Non utilizzando i contenuti dell'app come unica base per decisioni che riguardano la salute del figlio\n• Non condividendo i contenuti generati dall'AI come se fossero pareri clinici individuali\n• Riconoscendo che le informazioni hanno carattere generale e divulgativo`
          },
          {
            title: "6. Proprietà intellettuale",
            content: `I contenuti testuali originali della Bebi App (testi delle sezioni, struttura dei contenuti, selezione e organizzazione delle informazioni) sono di proprietà del Dott. Daniele Lami. È consentita la condivisione di singoli contenuti per uso personale e non commerciale, con citazione della fonte. È vietata la riproduzione integrale dell'app o di sezioni sostanziali della stessa senza autorizzazione scritta.`
          },
          {
            title: "7. Normativa applicabile",
            content: `I presenti Termini di Servizio sono regolati dalla legge italiana. Per qualsiasi controversia è competente il Foro di Roma. Il Codice del Consumo (D.Lgs. 206/2005) si applica nei confronti degli utenti che agiscano in qualità di consumatori.`
          },
          {
            title: "8. Contatti",
            content: `Per qualsiasi domanda relativa ai presenti Termini o all'utilizzo dell'app:\n\nDott. Daniele Lami — Psicologo Psicoterapeuta\nStudio a Roma\ndanielelami@libero.it\npsicologo-romanord.it`
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 20, marginBottom: 12 }}>{section.title}</h2>
            {section.content.split("\n\n").map((para, j) => (
              <p key={j} style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, lineHeight: 1.85, marginBottom: 12 }}>
                {para.split("\n").map((line, k) => (
                  <span key={k}>{line}{k < para.split("\n").length - 1 && <br />}</span>
                ))}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function OnboardingScreen({ onSelect, onLegal }) {
  const isMobile = useIsMobile();
  const zones = [
    {
      id: "gravidanza", icon: "🤰", label: "Gravidanza",
      desc: "In attesa del bambino. Emozioni, lista nascita, i tre trimestri e consigli per i futuri genitori.",
      color: COLORS.rose, shadow: "rgba(212,68,122,0.40)", gradient: `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.roseDark})`,
    },
    {
      id: "0-3", icon: "🌱", label: "0–3 anni",
      desc: "Neonato, primi passi, prime parole. Il periodo della costruzione del legame e dello sviluppo cerebrale più intenso.",
      color: COLORS.mint, shadow: "rgba(107,174,138,0.40)", gradient: `linear-gradient(135deg, ${COLORS.mint}, #4A8C6A)`,
    },
    {
      id: "3-6", icon: "🌸", label: "3–6 anni",
      desc: "I perché infiniti, il gioco simbolico, la scuola dell'infanzia. L'età della fantasia e dell'identità che emerge.",
      color: COLORS.amber, shadow: "rgba(240,184,74,0.40)", gradient: `linear-gradient(135deg, ${COLORS.amber}, #E07800)`,
    },
    {
      id: "6-12", icon: "🌟", label: "6–12 anni",
      desc: "La scuola primaria, i primi amici veri, le sfide sociali. Il lungo cammino verso l'adolescenza.",
      color: COLORS.coral, shadow: "rgba(212,68,122,0.40)", gradient: `linear-gradient(135deg, ${COLORS.coral}, #E03040)`,
    },
    {
      id: "12-15", icon: "🌊", label: "12–15 anni",
      desc: "Preadolescenza: pubertà, cervello in cantiere, pari come bussola. Il periodo più intenso del cambiamento.",
      color: "#5BA4D4", shadow: "rgba(91,164,212,0.40)", gradient: "linear-gradient(135deg, #5BA4D4, #2A70A0)",
    },
    {
      id: "15-18", icon: "✨", label: "15–18 anni",
      desc: "Adolescenza: identità, primo amore, il futuro che bussa. Costruire un adulto insieme.",
      color: COLORS.gold, shadow: "rgba(240,184,74,0.40)", gradient: `linear-gradient(135deg, ${COLORS.gold}, #C07000)`,
    },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: `linear-gradient(160deg, #F8D8E8 0%, #FDE0D4 30%, #ECE0F8 65%, #D8EEE4 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: isMobile ? "32px 20px" : "60px 40px",
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <img
          src="/gifiniziale.webp"
          alt="La Bebi App"
          style={{
            width: isMobile ? 198 : 315,
            height: isMobile ? 198 : 315,
            objectFit: "contain",
          }}
        />
      </div>

      {/* Title */}
      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: isMobile ? 30 : 38,
        fontWeight: 700,
        color: COLORS.deepSlate,
        textAlign: "center",
        margin: "0 auto 20px",
        lineHeight: 1.2,
      }}>La Bebi App</h1>

      {/* P1 */}
      <p style={{
        fontFamily: "'Playfair Display', serif",
        fontStyle: "italic",
        fontSize: isMobile ? 19 : 22,
        color: COLORS.deepSlate,
        textAlign: "center",
        lineHeight: 1.6,
        maxWidth: 640,
        margin: "0 auto 16px",
      }}>
        "Dalla gravidanza all'adolescenza, ogni fase ha la sua guida —
        neuroscienze, emozioni e consigli pratici in parole vere."
      </p>

      {/* P2 */}
      <p style={{
        fontFamily: "'Playfair Display', serif",
        fontStyle: "italic",
        fontSize: isMobile ? 16 : 19,
        color: "rgba(107,85,112,0.80)",
        textAlign: "center",
        lineHeight: 1.65,
        maxWidth: 600,
        margin: "0 auto 32px",
      }}>
        "Profili AI per il tuo bambino e per te, guida all'uso consapevole degli schermi,
        glossario psicologico e curiosità sui miti più diffusi.
        Un percorso dedicato anche per i genitori in attesa!"
      </p>

      {/* CTA + scroll indicator */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: isMobile ? 18 : 22, fontWeight: 700, lineHeight: 1.4, marginBottom: 12 }}>
          Scegli la fascia d'età
        </div>
        <div style={{ fontSize: 22, color: "rgba(155,100,140,0.55)", animation: "ob-bounce 1.6s ease-in-out infinite", display: "inline-block" }}>
          ↓
        </div>
      </div>

      {/* Zone cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, width: "100%", maxWidth: 860 }}>
        {zones.map(z => (
          <button key={z.id} onClick={() => onSelect(z.id)} style={{
            touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
            background: "rgba(255,255,255,0.10)", border: "2px solid rgba(255,255,255,0.22)",
            borderRadius: 32, padding: isMobile ? "22px 20px" : "30px 24px",
            cursor: "pointer", textAlign: "center", transition: "all 0.25s",
            backdropFilter: "blur(4px)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.12)";
            e.currentTarget.style.borderColor = z.color;
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = `0 12px 40px ${z.shadow}`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}>
            <img src={ZONE_IMAGES[z.id]} alt={z.label} style={{ width: 72, height: 72, objectFit: "contain", marginBottom: 12, display: "block", margin: "0 auto 12px" }} />
            <div style={{
              display: "inline-block", background: z.gradient, borderRadius: 50,
              padding: "7px 20px",
              fontFamily: "'Playfair Display', serif", color: "white", fontSize: 16, fontWeight: 700,
              boxShadow: `0 4px 16px ${z.shadow}`,
            }}>{z.label}</div>
          </button>
        ))}
      </div>

      <p style={{ color: "rgba(107,85,112,0.55)", fontFamily: "'Nunito', sans-serif", fontSize: 12, marginTop: 28, textAlign: "center" }}>
        Potrai cambiare fascia d'età in qualsiasi momento dalle impostazioni
      </p>
      <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 16 }}>
        {onLegal && [
          { label: "Privacy Policy", page: "privacy" },
          { label: "Termini di Servizio", page: "termini" },
        ].map(l => (
          <button key={l.page} onClick={() => onLegal(l.page)} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(107,85,112,0.55)", fontFamily: "'Nunito', sans-serif",
            fontSize: 12, textDecoration: "underline", padding: 0,
          }}>{l.label}</button>
        ))}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// GLOSSARIO PSICOLOGICO
// ─────────────────────────────────────────────

const GLOSSARIO_TERMS = [
  // ── NEUROSCIENZE ──
  {
    category: "Neuroscienze",
    emoji: "🧠",
    term: "Plasticità neurale",
    simple: "La capacità del cervello di modificarsi in risposta all'esperienza, potenziando i circuiti usati e potando quelli non usati.",
    clinical: "È massima nei primi 3 anni di vita (\"finestre critiche\"). Ogni interazione ripetuta — essere consolati, letti, giocati — costruisce letteralmente connessioni sinaptiche permanenti. Non si esaurisce mai del tutto: il cervello mantiene plasticità per tutta la vita.",
    ref: "Kandel \"In Search of Memory\" (2006); Sacks \"An Anthropologist on Mars\" (1995); Huttenlocher (1979)"
  },
  {
    category: "Neuroscienze",
    emoji: "✂️",
    term: "Pruning sinaptico",
    simple: "La \"potatura\" delle connessioni neurali non utilizzate: il cervello elimina i circuiti inutilizzati per rendere più efficienti quelli attivi.",
    clinical: "Avviene in due grandi ondate: prima infanzia e adolescenza. Non è una perdita — è un'ottimizzazione. Il cervello produce il doppio delle sinapsi necessarie, poi seleziona quelle che l'esperienza ha reso utili. Il principio è: use it or lose it.",
    ref: "Huttenlocher (1979); Gopnik \"The Philosophical Baby\" (2009)"
  },
  {
    category: "Neuroscienze",
    emoji: "🪞",
    term: "Neuroni specchio",
    simple: "Neuroni che si attivano sia quando si compie un'azione sia quando si osserva qualcun altro compierla: la base neurologica dell'imitazione e dell'empatia.",
    clinical: "Scoperti da Rizzolatti a Parma (1992). Funzionali dalla nascita: il neonato imita le espressioni facciali perché il suo cervello è così configurato. Ramachandran li ha definiti \"le cellule nervose che hanno plasmato la civiltà\" — sono alla base del linguaggio, dell'apprendimento sociale e della trasmissione culturale.",
    ref: "Rizzolatti & Craighero (2004); Ramachandran \"The Tell-Tale Brain\" (2011)"
  },
  {
    category: "Neuroscienze",
    emoji: "🌊",
    term: "Sistema limbico",
    simple: "Il \"cervello emotivo\": la rete di strutture cerebrali che elabora le emozioni, la memoria emotiva e le risposte allo stress.",
    clinical: "È operativo dalla nascita, molto prima della corteccia prefrontale. Include amigdala, ippocampo, ipotalamo. LeDoux ha dimostrato che l'amigdala risponde alle minacce in ~12 millisecondi — prima che la corteccia possa elaborare. Questo spiega perché calmare prima e spiegare dopo è neurobiologia, non debolezza.",
    ref: "LeDoux \"The Emotional Brain\" (1996); Damasio \"Descartes' Error\" (1994)"
  },
  {
    category: "Neuroscienze",
    emoji: "🎛️",
    term: "Corteccia prefrontale",
    simple: "La sede del ragionamento, del controllo degli impulsi e della pianificazione — l'ultima area del cervello a completare la maturazione, intorno ai 20-25 anni.",
    clinical: "La sua immaturità nei bambini spiega i capricci, l'impulsività e la difficoltà a gestire la frustrazione: non è cattiveria, è biologia. Matura attraverso migliaia di esperienze di co-regolazione con adulti calmi. Damasio ha dimostrato che le sue funzioni sono inseparabili dall'elaborazione emotiva.",
    ref: "Damasio \"Descartes' Error\" (1994); Siegel \"The Developing Mind\" (2020); Giedd NIH (2004)"
  },
  {
    category: "Neuroscienze",
    emoji: "⚡",
    term: "Mielinizzazione",
    simple: "Il processo di \"isolamento\" delle fibre nervose che rende la trasmissione degli impulsi più rapida ed efficiente.",
    clinical: "Procede in dal basso verso l'alto (dal basso verso l'alto) e dura fino ai 20+ anni. La mielinizzazione del corpo calloso (che collega i due emisferi) migliora notevolmente intorno ai 5-6 anni, spiegando il salto cognitivo in quella fase. Kandel ha dimostrato che ogni apprendimento consolidato lascia tracce misurabili in questo processo.",
    ref: "Kandel \"In Search of Memory\" (2006); PMC Maturation of the Adolescent Brain (2013)"
  },
  {
    category: "Neuroscienze",
    emoji: "🔄",
    term: "Asse HPA / Cortisolo",
    simple: "Il sistema ipotalamo-ipofisi-surrene che regola la risposta allo stress, rilasciando cortisolo come \"ormone dell'allerta\".",
    clinical: "Sapolsky ha documentato come lo stress cronico nei primi anni (imprevedibilità, abbandono, conflitto persistente) alteri strutturalmente questo asse, con effetti sulla risposta allo stress misurabili per tutta la vita. La presenza di un genitore o persona di riferimento responsivo è il principale regolatore di questo sistema nel bambino.",
    ref: "Sapolsky \"Why Zebras Don't Get Ulcers\" (2004); Sapolsky \"Behave\" (2017)"
  },
  // ── ATTACCAMENTO ──
  {
    category: "Attaccamento",
    emoji: "🔐",
    term: "Teoria dell'attaccamento",
    simple: "La teoria di Bowlby secondo cui i bambini hanno un bisogno biologico primario di formare legami emotivi profondi con uno o pochi genitore o persona di riferimento privilegiati.",
    clinical: "Non è un'opzione educativa — è una necessità biologica evolutiva. Il sistema di attaccamento si attiva in caso di pericolo (reale o percepito) e la vicinanza al genitore o persona di riferimento è la risposta evolutiva. Ainsworth ha identificato i pattern principali: sicuro, ansioso-ambivalente, evitante, disorganizzato.",
    ref: "Bowlby (1969); Ainsworth Strange Situation (1978)"
  },
  {
    category: "Attaccamento",
    emoji: "🏡",
    term: "Base sicura",
    simple: "Il paradosso di Bowlby: i bambini con attaccamento sicuro esplorano di più, non di meno. La sicurezza non rende dipendenti — rende liberi.",
    clinical: "La base sicura regola il sistema dello stress (asse HPA), abbassando i livelli di cortisolo e permettendo al cervello di operare in modalità \"apprendimento\" anziché \"sopravvivenza\". Perry ha documentato come anche dopo traumi precoci, relazioni sicure successive possano parzialmente riorganizzare questi circuiti.",
    ref: "Bowlby (1969); Perry \"The Boy Who Was Raised as a Dog\" (2006); Sapolsky (2004)"
  },
  {
    category: "Attaccamento",
    emoji: "🤝",
    term: "Co-regolazione",
    simple: "Il processo attraverso cui un adulto calmo aiuta il bambino a regolare le proprie emozioni, costruendo gradualmente la sua capacità di autoregolarsi.",
    clinical: "La corteccia prefrontale — sede del controllo emotivo — matura lentamente. Il bambino non può autoregolarsi: \"scarica\" sul sistema nervoso dell'adulto. Migliaia di ripetizioni costruiscono progressivamente l'autoregolazione futura. Porges (teoria polivagale) ha dimostrato che la voce e il volto del genitore o persona di riferimento sono stimoli co-regolatori primari.",
    ref: "Porges (2011); Schore (2012); van der Kolk \"The Body Keeps the Score\" (2014)"
  },
  {
    category: "Attaccamento",
    emoji: "🔁",
    term: "Ciclo rottura-riparazione",
    simple: "La scoperta di Tronick: anche nelle coppie genitore-bambino funzionanti, solo il 30% delle interazioni è in sintonizzazione. Il restante 70% è momenti di incomprensione seguita da riparazione.",
    clinical: "Non è la perfezione a costruire l'attaccamento sicuro — è il ciclo di rottura e riparazione. Il bambino impara che i legami si possono riparare. Sapolsky ha mostrato che la riparazione prevedibile è neurologicamente ciò che costruisce la resilienza: non l'assenza di stress, ma la sua risolubilità.",
    ref: "Tronick & Gold \"The Power of Discord\" (2020); Winnicott (1971); Sapolsky \"Behave\" (2017)"
  },
  {
    category: "Attaccamento",
    emoji: "🌡️",
    term: "Sintonizzazione affettiva",
    simple: "La capacità del genitore o persona di riferimento di rispecchiare emotivamente il bambino — non imitando le sue azioni ma rispondendo con un'emozione simile in un'altra modalità (es. il bambino agita il braccio di gioia, il genitore risponde con un \"ahhh!\" intonato).",
    clinical: "Stern ha identificato la sintonizzazione come il meccanismo attraverso cui il bambino impara che i propri stati interni sono comunicabili e condivisibili. È la precondizione dello sviluppo del Sé. La sua assenza cronica produce isolamento emotivo anche in assenza di traumi evidenti.",
    ref: "Stern \"The Interpersonal World of the Infant\" (1985); Tronick (1989)"
  },
  {
    category: "Attaccamento",
    emoji: "💛",
    term: "Genitore \"abbastanza buono\"",
    simple: "Il concetto di Winnicott: non serve essere genitori perfetti. Serve essere genitori che rispondono abbastanza bene — e che riparano quando sbagliano.",
    clinical: "Winnicott introdusse questo concetto per liberare i genitori dall'ansia della perfezione. Un genitore troppo perfetto (\"facilitating environment\" eccessivo) non allena la capacità del bambino di tollerare la frustrazione. La frustrazione ottimale — quella riparabile — è parte necessaria dello sviluppo.",
    ref: "Winnicott \"Playing and Reality\" (1971); Fosha (2000)"
  },
  // ── SVILUPPO COGNITIVO ──
  {
    category: "Sviluppo cognitivo",
    emoji: "🔮",
    term: "Teoria della mente",
    simple: "La capacità di capire che gli altri hanno pensieri, credenze e intenzioni diversi dai propri — che la propria mente non è l'unica esistente.",
    clinical: "Si consolida intorno ai 4-5 anni (test della falsa credenza, Wimmer & Perner 1983). È la base dell'empatia cognitiva, della comprensione delle bugie, del gioco di ruolo. La sua maturazione è facilitata da genitori \"mentalizzanti\" che parlano degli stati mentali: \"penso che tu sia arrabbiato perché...\"",
    ref: "Wimmer & Perner (1983); Fonagy et al. (2002)"
  },
  {
    category: "Sviluppo cognitivo",
    emoji: "🧩",
    term: "Funzioni esecutive",
    simple: "Le capacità cognitive di alto livello: pianificazione, controllo degli impulsi, memoria di lavoro, flessibilità cognitiva. Dipendono dalla corteccia prefrontale.",
    clinical: "Iniziano a svilupparsi intorno ai 3-4 anni e continuano fino ai 25+. Damasio ha dimostrato che sono inseparabili dall'elaborazione emotiva: un bambino emotivamente regolato ha funzioni esecutive migliori, non solo un comportamento più obbediente. Sono uno dei fattori predittivi più solidi del successo scolastico e relazionale.",
    ref: "Damasio \"Descartes' Error\" (1994); Diamond (2013)"
  },
  {
    category: "Sviluppo cognitivo",
    emoji: "🎭",
    term: "Gioco simbolico",
    simple: "Il gioco del \"far finta\": usare un oggetto per rappresentarne un altro, interpretare ruoli, costruire scenari immaginari. Emerge intorno ai 18-24 mesi.",
    clinical: "È il principale strumento di sviluppo cognitivo, emotivo e sociale nella prima infanzia. Sviluppa corteccia prefrontale, regolazione emotiva, narrazione, teoria della mente. Perry ha documentato come il gioco sia il meccanismo evolutivo primario attraverso cui il cervello integra le esperienze emotive. Nessuno schermo lo sostituisce.",
    ref: "Vygotsky (1978); Lillard (2017); Perry (2006)"
  },
  {
    category: "Sviluppo cognitivo",
    emoji: "🏗️",
    term: "Zona di sviluppo prossimale (ZDP)",
    simple: "Il concetto di Vygotsky: la distanza tra ciò che un bambino sa fare da solo e ciò che sa fare con l'aiuto di un adulto competente. È lì che avviene l'apprendimento reale.",
    clinical: "Il supporto graduale dell'adulto — l'impalcatura temporanea dell'adulto — è il modo in cui la ZDP viene attivata. L'adulto non fa al posto del bambino: offre il supporto minimo necessario, poi si ritrae. Questo principio si applica al linguaggio, al movimento, alla regolazione emotiva.",
    ref: "Vygotsky \"Mind in Society\" (1978)"
  },
  {
    category: "Sviluppo cognitivo",
    emoji: "🌱",
    term: "Pensiero operatorio concreto",
    simple: "Lo stadio di Piaget (6-12 anni): il bambino ragiona su oggetti e situazioni reali, capisce conservazione, reversibilità e classificazione, ma ancora non astrae.",
    clinical: "Il pensiero astratto emerge solo nell'adolescenza (operatorio formale). Sapere a che stadio è il bambino evita fraintendimenti: chiedere a un bambino di 7 anni di \"pensare alle conseguenze future\" è neurologicamente prematuro. L'apprendimento deve essere concreto, vissuto, incarnato.",
    ref: "Piaget (1954); Sapolsky \"Behave\" (2017)"
  },
  {
    category: "Sviluppo cognitivo",
    emoji: "📖",
    term: "Video deficit effect",
    simple: "Il fenomeno documentato per cui i bambini sotto i 2 anni imparano molto meno da uno schermo che dalla stessa interazione con una persona reale.",
    clinical: "Kuhl (2003) ha dimostrato che i neonati imparano i fonemi di una lingua straniera ascoltando una persona, ma non dalla TV. Il motivo: il cervello in sviluppo richiede contingenza sociale — azione-risposta in tempo reale. Damasio ha mostrato come l'apprendimento senza risposta emotiva non si consolidi a lungo termine.",
    ref: "Kuhl (2003); Damasio (1994); Christakis (2009)"
  },
  {
    category: "Sviluppo cognitivo",
    emoji: "🧠",
    term: "Default mode network",
    simple: "La rete cerebrale attiva quando non facciamo nulla di specifico — durante il riposo, la fantasia, la riflessione su sé stessi e sugli altri.",
    clinical: "Matura significativamente tra gli 8 e i 12 anni, abilitando la capacità di pensiero astratto, prospettiva futura e introspezione. È la rete della creatività e dell'elaborazione emotiva. Gli schermi, non lasciando mai il cervello a \"riposo\", ne ostacolano lo sviluppo. Sacks ha documentato quanto sia essenziale per la costruzione del Sé narrativo.",
    ref: "Buckner et al. (2008); Sacks \"An Anthropologist on Mars\" (1995)"
  },
  // ── SVILUPPO EMOTIVO ──
  {
    category: "Sviluppo emotivo",
    emoji: "💭",
    term: "Mentalizzazione",
    simple: "La capacità di vedere sé stessi e gli altri come esseri con stati mentali propri — desideri, credenze, intenzioni, emozioni.",
    clinical: "Fonagy la ha identificata come il fattore predittivo più forte dell'attaccamento sicuro. Un genitore mentalizzante non dice \"è un capriccio\" ma \"sta cercando di dirmi qualcosa\". I figli di genitori mentalizzanti sviluppano prima la teoria della mente e mostrano migliore regolazione emotiva. Sacks in \"The Man Who Mistook His Wife for a Hat\" ha documentato cosa significa vivere senza questa capacità.",
    ref: "Fonagy et al. \"Affect Regulation, Mentalization\" (2002); Sacks (1985)"
  },
  {
    category: "Sviluppo emotivo",
    emoji: "😤",
    term: "Disregolazione emotiva / Tantrum",
    simple: "Una crisi di rabbia o pianto intensa non è una strategia manipolativa: è una disregolazione del sistema nervoso autonomo in un cervello che non ha ancora gli strumenti per autoregolarsi.",
    clinical: "L'amigdala — attivata in 12ms da segnali di minaccia (LeDoux) — può \"dirottare\" l'elaborazione cognitiva prima che la corteccia prefrontale intervenga. A 3-5 anni la PFC è ancora immaturo. La risposta efficace non è ignorare o punire: è co-regolare (abbassare il tono di voce, avvicinarsi, nominare l'emozione) e poi, solo dopo, ragionare.",
    ref: "LeDoux \"The Emotional Brain\" (1996); Porges (2011)"
  },
  {
    category: "Sviluppo emotivo",
    emoji: "😨",
    term: "Paure evolutive",
    simple: "Le paure che compaiono e scompaiono in fasi specifiche dello sviluppo (buio, mostri, morte, separazione) sono normali e riflettono la maturazione cognitiva.",
    clinical: "A 3-6 anni il bambino ha abbastanza immaginazione per creare mostri, ma non abbastanza comprensione della causalità per smontarli. Non serve negare la paura (\"i mostri non esistono\") ma validarla e contenerne l'intensità. Le paure evolutive si risolvono con la maturazione, non con la rassicurazione cognitiva forza.",
    ref: "Siegel \"The Whole-Brain Child\" (2011)"
  },
  {
    category: "Sviluppo emotivo",
    emoji: "🪞",
    term: "Marcatori somatici",
    simple: "Le \"sensazioni fisiche\" che il corpo associa a esperienze positive o negative passate, e che guidano le nostre decisioni — spesso prima che la mente conscia elabori.",
    clinical: "Il concetto fondamentale di Damasio: le emozioni non sono disturbi della ragione ma sue componenti essenziali. Le decisioni dei pazienti con danni alla corteccia prefrontale ventromediale — neurologicamente razionali — risultano disastrose perché privi di marcatori somatici. Insegnare ai bambini a riconoscere le proprie emozioni è insegnare loro a decidere bene.",
    ref: "Damasio \"Descartes' Error\" (1994); Damasio \"The Feeling of What Happens\" (1999)"
  },
  {
    category: "Sviluppo emotivo",
    emoji: "💪",
    term: "Mindset di crescita",
    simple: "La credenza che le proprie capacità siano sviluppabili attraverso impegno e strategie — opposta al mindset fisso, che le considera innate e immutabili.",
    clinical: "Dweck ha dimostrato che lodare il risultato (\"sei intelligente\") costruisce mindset fisso: il bambino evita le sfide per non rischiare. Lodare il processo (\"hai lavorato bene\") costruisce mindset di crescita. Damasio fornisce la base neurologica: le emozioni associate al processo si inscrivono come marcatori somatici che guidano la motivazione futura.",
    ref: "Dweck \"Mindset\" (2006); Damasio (1994)"
  },
  {
    category: "Sviluppo emotivo",
    emoji: "🌊",
    term: "Trauma del corpo",
    simple: "La scoperta di van der Kolk: le esperienze traumatiche o le emozioni cronicamente non regolate nell'infanzia si inscrivono nel sistema nervoso autonomo e nel corpo, non solo nella memoria dichiarativa.",
    clinical: "Non basta \"elaborare cognitivamente\" un'esperienza difficile. Il corpo ha una propria memoria. La regolazione emotiva precoce — essere contenuti, consolati, co-regolati — è una protezione biologica concreta. Le terapie più efficaci per il trauma lavorano sul corpo, non solo sulla narrativa.",
    ref: "van der Kolk \"The Body Keeps the Score\" (2014)"
  },
  // ── CLINICA ──
  {
    category: "Clinica",
    emoji: "📋",
    term: "DSA – Disturbi Specifici dell'Apprendimento",
    simple: "Dislessia, disortografia, disgrafia, discalculia: difficoltà specifiche in abilità di lettura, scrittura e calcolo non spiegate da basso QI o assenza di opportunità educative.",
    clinical: "Colpiscono il 5-15% dei bambini (ISS 2022). Hanno basi neurobiologiche documentate: la dislessia è associata a differenze nel processamento fonologico, non all'intelligenza. Sacks ha dedicato estesa documentazione alla neurodiversità come diversa organizzazione cerebrale, non deficit. La diagnosi precoce e il supporto adeguato cambiano radicalmente la traiettoria.",
    ref: "Sacks \"An Anthropologist on Mars\" (1995); ISS Linee Guida DSA (2022)"
  },
  {
    category: "Clinica",
    emoji: "🎯",
    term: "disturbo da deficit di attenzione (ADHD)",
    simple: "Disturbo da Deficit di Attenzione e Iperattività: difficoltà persistenti di attenzione, impulsività e/o iperattività che compromettono il funzionamento in più contesti.",
    clinical: "Non è \"mancanza di volontà\": è una differenza neurologica nel circuito del piacere nel cervello e nei circuiti della corteccia prefrontale. La diagnosi richiede valutazione specialistica. L'ambiente (routine prevedibili, stimoli ridotti, movimento permesso) può compensare significativamente. Sapolsky ha mostrato come stress e imprevedibilità ambientale aggravino la disregolazione attentiva.",
    ref: "Sapolsky \"Behave\" (2017); Barkley (2015)"
  },
  {
    category: "Clinica",
    emoji: "😰",
    term: "Ansia somatica",
    simple: "Dolori fisici reali (mal di pancia, mal di testa, nausea) che compaiono in risposta a stress emotivo o situazioni ansiose — comuni in età scolare.",
    clinical: "Non è simulazione: la connessione intestino-cervello (asse enterico) è bidirezionale. Lo stress attiva risposte fisiche reali. In età 6-12 anni, l'ansia da performance, da separazione o da esclusione sociale spesso si esprime somaticamente perché la via verbale è ancora immatura. Il corpo parla prima della mente.",
    ref: "Porges (2011); van der Kolk (2014)"
  },
  {
    category: "Clinica",
    emoji: "🏫",
    term: "Rifiuto scolastico",
    simple: "Il rifiuto persistente di andare a scuola, con sintomi d'ansia reali (fisici ed emotivi) — da distinguere dalla \"svogliatura\" e dalla simulazione.",
    clinical: "È quasi sempre espressione di ansia (da separazione, sociale, da performance) o di un disagio relazionale nel contesto scolastico. L'approccio punitivo (forzare) peggiora il circolo. L'intervento efficace è graduale, condiviso tra famiglia e scuola, e spesso richiede supporto clinico. LeDoux ha mostrato come la memoria di paura scolastica sia particolarmente resistente all'estinzione.",
    ref: "LeDoux \"Anxious\" (2015); Kearney (2008)"
  },
  {
    category: "Clinica",
    emoji: "🤝",
    term: "Teoria polivagale",
    simple: "La teoria di Porges: il sistema nervoso autonomo ha tre stati — sicurezza/connessione sociale, mobilizzazione (attacco/fuga), immobilizzazione (congelamento). La sicurezza relazionale è la condizione del benessere e dell'apprendimento.",
    clinical: "Il nervo vago ventrale (\"sicurezza\") si attiva in presenza di un genitore o persona di riferimento sintonizzato — voce morbida, sguardo morbido, viso rilassato. È la base neurofisiologica del perché la qualità della presenza del genitore conta più di quello che dice o fa. Un adulto regolato co-regola il bambino per via autononomica, non solo cognitiva.",
    ref: "Porges \"The Polyvagal Theory\" (2011)"
  },
  {
    category: "Clinica",
    emoji: "😔",
    term: "Burnout genitoriale",
    simple: "Uno stato di esaurimento fisico ed emotivo specifico del ruolo genitoriale, con distanziamento emotivo dai figli e senso di perdita di sé come genitore.",
    clinical: "Riconosciuto come costrutto clinico distinto dal burnout lavorativo. Mikolajczak et al. (2018) hanno documentato che colpisce il 5-8% dei genitori in Europa e che, non trattato, aumenta il rischio di comportamenti genitoriali negativi verso i figli. Non è mancanza di amore — è esaurimento di risorse. La prima risposta è autorizzarsi a ricevere aiuto.",
    ref: "Mikolajczak et al. (2018); Roskam et al. (2018)"
  },
  {
    category: "Clinica",
    emoji: "👥",
    term: "Bullismo e vittimizzazione",
    simple: "Il bullismo è un comportamento aggressivo ripetuto e asimmetrico (una parte ha più potere). Non è conflitto tra pari: è persecuzione.",
    clinical: "L'esclusione sociale attiva le stesse reti neurali del dolore fisico (Eisenberger 2003). Il bullismo cronico è associato a livelli elevati di cortisolo, riduzione del volume ippocampale e aumentato rischio di depressione (Viding et al. 2012). Sapolsky ha mostrato come lo stress da gerarchia sociale sia tra i più potenti e biologicamente dannosi per i mammiferi sociali.",
    ref: "Eisenberger (2003); Viding et al. (2012); Sapolsky \"Why Zebras Don't Get Ulcers\" (2004)"
  },
  // ── TERMINI AGGIUNTIVI ──
  {
    category: "Neuroscienze",
    emoji: "💧",
    term: "Cortisolo",
    simple: "L'ormone che il corpo produce quando siamo sotto stress.",
    clinical: "In dosi normali è utile: ci sveglia al mattino, ci aiuta a reagire ai pericoli. Ma se è cronicamente elevato nei primi anni — per stress ripetuto e non consolato — può alterare il modo in cui il cervello risponde alle difficoltà per tutta la vita.",
    ref: "Sapolsky 'Why Zebras Don't Get Ulcers' (2004)"
  },
  {
    category: "Neuroscienze",
    emoji: "🤝",
    term: "Ossitocina",
    simple: "L'ormone del legame: si libera nel contatto fisico, nell'allattamento, nello sguardo condiviso.",
    clinical: "Non è solo un 'ormone romantico': abbassa il cortisolo, riduce l'ansia, rinforza la memoria delle esperienze positive. Si attiva nel contatto pelle a pelle, nel gioco fisico, nella cura.",
    ref: "Feldman (2007); Carter (1998)"
  },
  {
    category: "Neuroscienze",
    emoji: "🔥",
    term: "Amigdala",
    simple: "Una piccola zona del cervello a forma di mandorla, che funziona come un 'allarme antincendio': si attiva quando percepiamo una minaccia o una emozione intensa.",
    clinical: "È operativa dalla nascita ed è la prima a rispondere alle situazioni emotivamente cariche. Nella pubertà si iperattiva. La corteccia prefrontale, quando è matura, la 'calma' e ci permette di ragionare prima di agire.",
    ref: "LeDoux 'The Emotional Brain' (1996)"
  },
  {
    category: "Attaccamento",
    emoji: "👤",
    term: "Bowlby",
    simple: "Lo psichiatra britannico (1907-1990) che ha dimostrato scientificamente che il bisogno di legame affettivo è biologico, non un capriccio.",
    clinical: "Prima di Bowlby si pensava che i bambini si attaccassero ai genitori per il cibo. Lui dimostrò che il legame emotivo è un bisogno primario indipendente dal nutrimento. La sua teoria dell'attaccamento è uno dei fondamenti della psicologia dello sviluppo moderna.",
    ref: "Bowlby 'Attachment' (1969)"
  },
  {
    category: "Attaccamento",
    emoji: "🏠",
    term: "Ainsworth",
    simple: "La psicologa (1913-1999) che ha classificato i diversi tipi di legame tra genitori e figli, sviluppando il test della 'Strange Situation'.",
    clinical: "Ha identificato tre tipi principali di attaccamento: sicuro, ansioso-ambivalente, evitante. I bambini con attaccamento sicuro esplorano con più coraggio perché sanno di avere un porto sicuro a cui tornare.",
    ref: "Ainsworth et al. 'Patterns of Attachment' (1978)"
  },
  {
    category: "Attaccamento",
    emoji: "🌱",
    term: "Winnicott",
    simple: "Il pediatra e psicoanalista britannico (1896-1971) che ha introdotto concetti come 'madre sufficientemente buona', 'oggetto transizionale' e 'holding'.",
    clinical: "Winnicott ha spostato l'attenzione dalla perfezione genitoriale alla sufficiente bontà: non serve essere perfetti, serve essere abbastanza presenti, abbastanza riparativi. Ha anche mostrato come il gioco sia il lavoro più serio dell'infanzia.",
    ref: "Winnicott 'Playing and Reality' (1971)"
  },
  {
    category: "Neuroscienze",
    emoji: "🔬",
    term: "OMS",
    simple: "Organizzazione Mondiale della Sanità: l'agenzia dell'ONU che emette raccomandazioni sanitarie valide per tutti i Paesi del mondo.",
    clinical: "Le linee guida OMS su allattamento, schermi, attività fisica, vaccinazioni sono il riferimento principale per la pediatria internazionale. Quando diciamo 'secondo le linee guida OMS', intendiamo le raccomandazioni basate sull'insieme delle ricerche scientifiche disponibili.",
    ref: "who.int"
  },
  {
    category: "Neuroscienze",
    emoji: "👶",
    term: "AAP",
    simple: "American Academy of Pediatrics: l'associazione dei pediatri americani, una delle fonti di linee guida pediatriche più autorevoli al mondo.",
    clinical: "Le raccomandazioni AAP su schermi, sonno, alimentazione e sviluppo vengono aggiornate regolarmente e citate in tutto il mondo. Spesso anticipano le raccomandazioni europee di qualche anno.",
    ref: "aap.org"
  },
  {
    category: "Sviluppo emotivo",
    emoji: "🔄",
    term: "Resilienza",
    simple: "La capacità di attraversare le difficoltà e di riprendersi dopo un evento doloroso — non l'assenza di dolore, ma la capacità di rialzarsi.",
    clinical: "Non è una caratteristica innata e fissa: si costruisce attraverso esperienze ripetute di difficoltà superate con supporto. Il fattore più predittivo di resilienza nei bambini è la presenza di almeno un adulto stabile e affettuoso nella loro vita.",
    ref: "Masten 'Ordinary Magic' (2015)"
  },
  {
    category: "Sviluppo emotivo",
    emoji: "💭",
    term: "Angoscia da separazione",
    simple: "La sofferenza che il bambino mostra quando si allontana dal genitore — tipica tra i 6 mesi e i 3 anni circa.",
    clinical: "Non è un problema da eliminare: è la prova che il bambino ha formato un legame. Scompare naturalmente quando il bambino sviluppa la capacità di portare il genitore 'dentro di sé' anche in sua assenza. Forzare le separazioni non accelera questo processo — lo rallenta.",
    ref: "Bowlby (1969); Ainsworth (1978)"
  },

  {
    category: "Attaccamento",
    emoji: "🔒",
    term: "Attaccamento sicuro",
    simple: "Il tipo di legame che si forma quando un bambino sa che il suo genitore risponderà ai suoi bisogni — e può quindi esplorare il mondo con fiducia.",
    clinical: "Ainsworth ha identificato l'attaccamento sicuro come il tipo più comune e più sano. I bambini con attaccamento sicuro protestano alla separazione ma si calmano rapidamente al ritorno del genitore. Da adulti tendono ad avere relazioni più stabili, maggiore autostima e migliore capacità di gestire lo stress.",
    ref: "Ainsworth et al. 'Patterns of Attachment' (1978); Bowlby (1969)"
  },
  {
    category: "Attaccamento",
    emoji: "🪞",
    term: "Fantasmi nella nursery",
    simple: "Le esperienze infantili dolorose non elaborate dei genitori che si ripresentano — spesso senza consapevolezza — nella relazione col proprio figlio. Fraiberg le ha chiamate 'fantasmi' perché sono visitatori invisibili del passato.",
    clinical: "Fraiberg ha osservato che quando un genitore ha subito esperienze precoci di trascuratezza, rifiuto o trauma senza averle mai elaborate emotivamente, queste esperienze si riattivano nella relazione col figlio — in particolare nei momenti di pianto, dipendenza o bisogno intenso del bambino. Il genitore può reagire con angoscia sproporzionata, ritiro emotivo o rigidità senza comprenderne l'origine. La buona notizia clinica: Fraiberg ha dimostrato che la psicoterapia genitore-bambino può interrompere questa trasmissione. Lieberman ha poi esteso il concetto, mostrando che accanto ai fantasmi esistono anche gli 'angeli nella nursery' — le esperienze positive della propria infanzia che proteggono la relazione col figlio.",
    ref: "Fraiberg, Adelson & Shapiro \"Ghosts in the Nursery\" (1975); Lieberman, Padrón, Van Horn & Harris \"Angels in the Nursery\" (2005)"
  },
  // ── NUOVI TERMINI ──
  {
    category: "Neuroscienze",
    emoji: "⚡",
    term: "Dopamina",
    simple: "Il neurotrasmettitore del piacere, della motivazione e della ricompensa — si attiva quando anticipiamo o riceviamo qualcosa di gratificante.",
    clinical: "Il sistema dopaminergico raggiunge il picco di sensibilità in preadolescenza, spiegando la ricerca di stimoli intensi, l'attrazione per il rischio e l'importanza sproporzionata del giudizio dei pari. I social media e i videogiochi sfruttano questo sistema con meccanismi di 'ricompensa variabile' — la stessa struttura delle slot machine. Volkow (2011) ha mostrato come l'esposizione cronica a ricompense digitali alteri la sensibilità del sistema dopaminergico, rendendo le attività 'lente' (studio, lettura, conversazione) meno piacevoli per contrasto. Quando questo sistema viene sovrastimolato cronicamente — dai social, dal gaming o da sostanze come il THC — la soglia del piacere si alza: ciò che prima era gratificante non basta più. È questo il meccanismo che sta dietro a molte delle lamentele di 'noia' e 'vuoto' che gli adolescenti portano. Non è pigrizia, non è cattivo carattere — è neurochimica.",
    ref: "Steinberg 'Age of Opportunity' (2014); Volkow 'Addiction: Beyond Dopamine Reward Circuitry' (2011); Blum et al. 'Cannabis-Induced Hypodopaminergic Anhedonia' (Frontiers in Psychiatry, 2021)"
  },
  {
    category: "Neuroscienze",
    emoji: "🔗",
    term: "Sinapsi",
    simple: "I punti di connessione tra i neuroni — dove un segnale elettrico o chimico passa da una cellula nervosa all'altra.",
    clinical: "Il cervello del neonato produce sinapsi a velocità incredibile: nei primi anni si formano milioni di nuove connessioni ogni secondo. Il principio che governa il loro destino è 'use it or lose it': le sinapsi usate si rafforzano, quelle non usate vengono 'potate' (pruning sinaptico). Questo spiega perché le esperienze precoci — essere consolati, giocati, letti — costruiscono letteralmente l'architettura del cervello. Ogni interazione ripetuta non è solo un momento: è un filo aggiunto alla rete neurale.",
    ref: "Huttenlocher (1979); Kandel 'In Search of Memory' (2006)"
  },
  {
    category: "Neuroscienze",
    emoji: "🧪",
    term: "Ormoni",
    simple: "Messaggeri chimici prodotti dal corpo che regolano crescita, umore, energia, risposta allo stress e sviluppo sessuale.",
    clinical: "Gli ormoni principali nello sviluppo includono: cortisolo (stress), ossitocina (legame), dopamina (piacere), melatonina (sonno), e gli ormoni sessuali (estrogeni, testosterone) che esplodono in pubertà. Importante: 'è solo colpa degli ormoni' è una semplificazione. La ristrutturazione cerebrale dell'adolescenza — pruning sinaptico, maturazione della corteccia prefrontale — è altrettanto responsabile delle turbolenze emotive. Gli ormoni contribuiscono, ma il cervello in costruzione spiega di più.",
    ref: "Blakemore 'Inventing Ourselves' (2018); Sapolsky 'Behave' (2017)"
  },
  // ── NUOVI TERMINI v4.47 ──
  {
    category: "Sviluppo emotivo",
    emoji: "🫥",
    term: "Languishing",
    simple: "Lo spazio grigio tra lo stare male e lo stare bene — sentirsi vuoti, senza slancio, come se si attraversasse la vita in automatico. Non è depressione, ma non è nemmeno benessere.",
    clinical: "Costrutto introdotto dal sociologo Corey Keyes (Emory University, 2002) per descrivere l'assenza di salute mentale positiva — distinta sia dalla depressione che dal flourishing. Si misura attraverso 14 item che valutano benessere emotivo, psicologico e sociale (Mental Health Continuum – Short Form). Il languishing è caratterizzato dalla mancanza di indicatori di flourishing: scopo, crescita personale, auto-accettazione, connessione, contributo. Nelle ricerche di Keyes, il 40-50% degli adolescenti della scuola media si trova in questo stato. Il dato clinicamente rilevante: il languishing è un fattore di rischio indipendente per depressione e disturbi d'ansia. Daniel [[Stern]] avrebbe forse descritto il languishing come un collasso degli [[affetti vitali]] — la perdita di quella qualità dinamica che rende l'esperienza viva.",
    ref: "Keyes 'The Mental Health Continuum' (2002); Keyes 'Languishing: How to Feel Alive Again in a World That Wears Us Down' (2024); Stern 'Forms of Vitality' (2010)"
  },
  {
    category: "Sviluppo emotivo",
    emoji: "🩶",
    term: "Anedonia",
    simple: "La difficoltà a provare piacere per cose che prima piacevano — non perché siano cambiate quelle cose, ma perché è cambiato il modo in cui il cervello le registra.",
    clinical: "Esperienza trasversale a diverse condizioni psicologiche: depressione, disturbi di personalità, ma anche — come la ricerca recente mostra — conseguenza dell'uso cronico di cannabis in adolescenza. Si distingue dall'apatia (perdita di motivazione) e dalla noia (assenza di stimoli): nell'anedonia lo stimolo c'è, ma il piacere no. Il meccanismo coinvolge il sistema dopaminergico mesolimbico — le stesse strutture che assegnano 'valore' alle esperienze e che in adolescenza sono al picco della loro sensibilità. Il rapporto con la cannabis è bidirezionale: l'anedonia può portare all'uso, e l'uso intensifica l'anedonia.",
    ref: "Skumlien et al. (International Journal of Neuropsychopharmacology, 2021, 2023); Leventhal et al. (Journal of Abnormal Psychology, 2017); Blum et al. (Frontiers in Psychiatry, 2021)"
  },
  {
    category: "Neuroscienze",
    emoji: "🌊",
    term: "Affetti vitali",
    simple: "La qualità 'viva' di ogni esperienza — il suo ritmo, la sua intensità, il suo slancio. Quello che fa la differenza tra fare qualcosa e sentire qualcosa.",
    clinical: "Concetto introdotto da Daniel [[Stern]] (2010) per descrivere una dimensione dell'esperienza soggettiva che non coincide con le emozioni discrete (gioia, rabbia, paura) ma le attraversa tutte: la vitalità è il 'come' dell'esperienza, non il 'cosa'. Stern la descrive attraverso cinque proprietà dinamiche: movimento, tempo, forza, spazio, direzione/intenzionalità. Un neonato che si protende verso la madre con slancio e un adolescente che risponde 'boh' con voce piatta stanno descrivendo, ai due estremi, la stessa dimensione. La perdita di vitalità affettiva è una chiave di lettura per il [[languishing]] e il senso di vuoto adolescenziale che non ricade nei criteri della depressione.",
    ref: "Stern 'Forms of Vitality: Exploring Dynamic Experience in Psychology, the Arts, Psychotherapy, and Development' (2010); Stern 'The Interpersonal World of the Infant' (1985)"
  },
  {
    category: "Attaccamento",
    emoji: "👩‍🔬",
    term: "Beebe",
    simple: "Beatrice Beebe: la ricercatrice che ha filmato in slow motion le interazioni madre-bambino, scoprendo un dialogo emotivo invisibile a occhio nudo.",
    clinical: "Beebe e Lachmann hanno mostrato che il dialogo tra genitore e neonato avviene in frazioni di secondo: micro-espressioni facciali, variazioni di tono, ritmi di avvicinamento e allontanamento che costruiscono — interazione dopo interazione — le strutture cerebrali che regolano le emozioni. Il loro lavoro ha dimostrato che la qualità della comunicazione nei primi mesi predice la sicurezza dell'attaccamento a un anno. Il principio vale anche oltre l'infanzia: il cervello si costruisce nella qualità degli scambi relazionali, non nella quantità di informazioni. Questo è vero anche a 16 anni — un adolescente che trova un adulto capace di rispondere ai suoi stati emotivi in modo contingente sta ancora costruendo il proprio sistema di regolazione.",
    ref: "Beebe & Lachmann 'The Origins of Attachment' (2014); Beebe, Jaffe, Markese et al. (2010)"
  },
  {
    category: "Attaccamento",
    emoji: "👨‍🔬",
    term: "Tronick",
    simple: "Edward Tronick: lo psicologo americano che ha scoperto il 'ciclo rottura-riparazione' e ideato l'esperimento del 'volto immobile' (still face).",
    clinical: "Tronick ha dimostrato che anche nelle interazioni genitore-bambino più sane, solo il 30% del tempo è in sintonizzazione perfetta. Il restante 70% sono momenti di incomprensione — seguiti da riparazione. La scoperta rivoluzionaria: non è la perfezione a costruire l'attaccamento sicuro, ma la capacità di riparare. L'esperimento 'still face' mostra che già a 2-3 mesi il bambino si aspetta una risposta emotiva: quando il volto del genitore si 'spegne', il bambino prima protesta, poi si ritira. L'esperimento originale è disponibile su YouTube cercando 'Still Face Experiment Tronick' — due minuti che mostrano, meglio di qualsiasi spiegazione, quanto il volto del genitore sia importante per il bambino.",
    ref: "Tronick & Gold 'The Power of Discord' (2020); Tronick et al. (1978)"
  },
  {
    category: "Attaccamento",
    emoji: "🔗",
    term: "Psicoanalisi relazionale",
    simple: "Un approccio in psicologia che parte da un'idea semplice ma potente: la mente non si sviluppa in isolamento, ma si costruisce dentro le relazioni. Ciò che siamo dipende da come siamo stati — e continuiamo a essere — in rapporto con gli altri.",
    clinical: "Stephen Mitchell (1988) ha dato un nome al filo rosso che collega Bowlby, Winnicott, Stern, Tronick e Fraiberg: tutti, da prospettive diverse, hanno mostrato che lo sviluppo del bambino non avviene 'dentro' la sua testa, ma 'tra' lui e chi si prende cura di lui. L'implicazione per i genitori: ogni interazione quotidiana — anche quelle imperfette, anche quelle in cui si sbaglia — è materiale di costruzione della mente del bambino. Non conta solo ciò che il genitore fa, ma ciò che accade nello spazio relazionale tra genitore e bambino.",
    ref: "Mitchell 'Relational Concepts in Psychoanalysis' (1988); Mitchell & Greenberg 'Object Relations in Psychoanalytic Theory' (1983)"
  },
  {
    category: "Attaccamento",
    emoji: "🎭",
    term: "Stern",
    simple: "Daniel Stern: lo psichiatra che ha studiato come madre e bambino comunicano attraverso le emozioni, coniando i termini 'sintonizzazione affettiva' e 'affetti vitali'.",
    clinical: "Stern ha mostrato che il dialogo emotivo tra genitore e bambino non è imitazione ma trasformazione: il bambino agita il braccio di gioia, il genitore risponde con un 'ahhh!' intonato — stessa emozione, modalità diversa. Questo 'rispecchiamento emotivo' insegna al bambino che le sue emozioni sono reali, comunicabili, e condivisibili. Stern ha anche descritto i 'momenti di incontro': istanti di connessione autentica che costruiscono il senso di sé del bambino. Nel suo ultimo lavoro (2010) ha introdotto il concetto di [[affetti vitali]]: la qualità dinamica dell'esperienza — il suo ritmo, la sua intensità, il suo slancio — che attraversa tutte le emozioni e che, quando si spegne, può manifestarsi come quel senso di vuoto che molti adolescenti descrivono senza riuscire a nominarlo.",
    ref: "Stern 'The Interpersonal World of the Infant' (1985); Stern 'Forms of Vitality' (2010)"
  },
  {
    category: "Attaccamento",
    emoji: "🚶",
    term: "Mahler",
    simple: "Margaret Mahler: la psicoanalista che ha descritto come il bambino si separa psicologicamente dalla madre, passando dalla fusione all'individualità.",
    clinical: "Mahler ha chiamato questo processo 'separazione-individuazione': il bambino deve staccarsi emotivamente dal genitore per costruire un senso di sé autonomo. Tra i 15 e i 24 mesi c'è una fase di 'riavvicinamento': il bambino si allontana per esplorare, poi torna a 'ricaricarsi' emotivamente. I 'no' e le crisi di autonomia di questa età non sono oppositività: sono il lavoro di diventare una persona separata. Il genitore che tollera questa ambivalenza — senza respingerla né soffocarla — permette al bambino di individuarsi senza perdere il legame.",
    ref: "Mahler et al. 'The Psychological Birth of the Human Infant' (1975)"
  },
  {
    category: "Sviluppo cognitivo",
    emoji: "🎭",
    term: "Teoria della mente",
    simple: "La capacità di capire che gli altri hanno pensieri, desideri e credenze diversi dai propri — e che possono anche sbagliarsi o essere ingannati.",
    clinical: "Emerge tipicamente tra i 3 e i 5 anni. Prima di questa età il bambino pensa che tutti sappiano quello che sa lui. È la base dell'empatia cognitiva, della comprensione sociale e — interessante — della capacità di mentire. Il test classico è quello della 'falsa credenza' (Sally-Anne): richiede di capire che un personaggio non sa qualcosa che il bambino sa. Bambini con disturbi dello spettro autistico possono mostrare difficoltà specifiche in quest'area.",
    ref: "Baron-Cohen et al. (1985); Premack & Woodruff (1978)"
  },
  {
    category: "Sviluppo cognitivo",
    emoji: "🧸",
    term: "Oggetto transizionale",
    simple: "Il peluche consumato, l'angolo di copertina, il ciuccio: l'oggetto che il bambino usa per consolarsi quando il genitore non c'è.",
    clinical: "Winnicott ha introdotto questo concetto per descrivere un fenomeno universale: il bambino investe un oggetto di proprietà magiche — è 'abbastanza reale' da dare conforto, ma abbastanza simbolico da non richiedere la presenza fisica del genitore. È un ponte sofisticato tra la fusione con il genitore e l'indipendenza. Non è una debolezza né una dipendenza patologica: è uno strumento di crescita. Il bambino lo abbandonerà spontaneamente quando non ne avrà più bisogno — non serve toglierlo né sminuirlo.",
    ref: "Winnicott 'Playing and Reality' (1971)"
  },
  {
    category: "Sviluppo emotivo",
    emoji: "🧘",
    term: "Autoregolazione",
    simple: "La capacità di gestire le proprie emozioni, impulsi e comportamenti senza l'aiuto di un adulto — si costruisce gradualmente nei primi anni.",
    clinical: "Il bambino non nasce capace di autoregolarsi: impara attraverso migliaia di esperienze di co-regolazione con un adulto calmo. È un processo lento che dipende dalla maturazione della corteccia prefrontale (completa solo verso i 25 anni). Aspettarsi autoregolazione da un bambino di 3 anni è biologicamente irrealistico. L'adulto che 'presta' la propria calma al bambino in crisi non lo vizia: sta costruendo i circuiti neurali che un giorno permetteranno l'autoregolazione autonoma.",
    ref: "Schore (2012); Porges (2011)"
  },
  {
    category: "Neuroscienze",
    emoji: "🌙",
    term: "Melatonina",
    simple: "L'ormone che regola il ciclo sonno-veglia — viene prodotto quando cala la luce e induce sonnolenza.",
    clinical: "In adolescenza il rilascio di melatonina viene ritardato di circa 2 ore rispetto all'infanzia: i ragazzi si addormentano più tardi non per pigrizia, ma per biologia. Svegliarli presto per la scuola li priva cronicamente di sonno REM — la fase cruciale per consolidamento della memoria e regolazione emotiva. Walker (2017) ha mostrato che la privazione cronica di sonno in adolescenza è associata a peggior rendimento scolastico, maggiore irritabilità e aumento del rischio di depressione.",
    ref: "Walker 'Why We Sleep' (2017); Carskadon (2002)"
  },
  {
    category: "Neuroscienze",
    emoji: "💔",
    term: "Eisenberger",
    simple: "Naomi Eisenberger: la neuroscienziata che ha dimostrato che l'esclusione sociale attiva le stesse aree cerebrali del dolore fisico.",
    clinical: "Nel 2003 Eisenberger ha condotto un esperimento rivoluzionario: ha fatto giocare delle persone a un videogioco in cui venivano gradualmente escluse dagli altri giocatori, mentre monitorava il loro cervello con la risonanza magnetica. Risultato: l'esclusione attivava la corteccia cingolata anteriore dorsale — la stessa area che si accende durante il dolore fisico. Questo spiega perché il rifiuto sociale 'fa male' in senso letterale, e perché i bambini esclusi dai pari non stanno esagerando: il loro cervello sta davvero registrando sofferenza.",
    ref: "Eisenberger et al. 'Does Rejection Hurt?' (Science, 2003)"
  },
  {
    category: "Sviluppo emotivo",
    emoji: "👩‍🔬",
    term: "Eisenberg",
    simple: "Nancy Eisenberg: la psicologa dello sviluppo che ha studiato come i bambini imparano a regolare le proprie emozioni e a sviluppare comportamenti prosociali.",
    clinical: "Eisenberg ha dimostrato che la regolazione emotiva non è innata ma si apprende attraverso la co-regolazione con adulti calmi. I bambini che ricevono supporto emotivo adeguato — non soppressione delle emozioni, ma aiuto nel gestirle — sviluppano nel tempo una migliore capacità di autoregolarsi e mostrano più comportamenti prosociali (empatia, aiuto, condivisione). Il suo lavoro ha contribuito a spostare l'attenzione dall'obbedienza comportamentale alla competenza emotiva come obiettivo educativo.",
    ref: "Eisenberg et al. 'Emotion-Related Regulation' (2010)"
  },
  {
    category: "Sviluppo cognitivo",
    emoji: "🧩",
    term: "Piaget",
    simple: "Lo psicologo svizzero (1896-1980) che ha mostrato che il bambino non è un adulto in miniatura: pensa in modo diverso, e ogni stadio va attraversato, non accelerato.",
    clinical: "Ha descritto quattro stadi del pensiero, dal sensomotorio (0-2 anni) all'astratto (dai 12 in poi). Il contributo più importante per i genitori: chiedere a un bambino di 5 anni di 'ragionare sulle conseguenze' è come chiedere a qualcuno di vedere un colore che il suo occhio non percepisce ancora. Non è disobbedienza — è sviluppo.",
    ref: "Piaget 'The Construction of Reality in the Child' (1954)"
  },
  {
    category: "Attaccamento",
    emoji: "👶",
    term: "Brazelton",
    simple: "Il pediatra americano (1918-2018) che ha dimostrato che i neonati non sono tavole bianche: arrivano con un temperamento, competenze e preferenze propri.",
    clinical: "Ha creato il primo strumento per osservare il neonato come persona, non solo come organismo. Il suo concetto di 'touchpoints' — momenti prevedibili di crisi prima di ogni salto evolutivo — aiuta i genitori a leggere i passi indietro come segnali di crescita, non come fallimenti.",
    ref: "Brazelton 'Touchpoints' (1992); Brazelton & Nugent 'NBAS' (1995)"
  },
  {
    category: "Neuroscienze",
    emoji: "🧠",
    term: "Siegel",
    simple: "Il neuropsichiatra americano che ha tradotto le neuroscienze in linguaggio per i genitori — mostrando che capire il cervello del bambino cambia il modo di rispondere alle sue emozioni.",
    clinical: "Il suo contributo più noto: nominare un'emozione ne riduce l'intensità, perché attiva la corteccia prefrontale che calma l'amigdala. Ha anche descritto la 'finestra di tolleranza' — quando un bambino è fuori dalla finestra (troppo agitato o troppo spento), ragionare con lui non serve: prima va riportato nella calma, poi si può parlare.",
    ref: "Siegel 'The Whole-Brain Child' (2011); Siegel & Bryson 'No-Drama Discipline' (2014)"
  },
  // ── SEPARAZIONE / LUTTO — Nuove voci ──
  {
    category: "Clinica",
    emoji: "🔺",
    term: "Triangolazione",
    simple: "Quando il figlio viene coinvolto nel conflitto tra i genitori e messo nella posizione impossibile di fare da tramite, da giudice o da alleato di uno dei due.",
    clinical: "Concetto introdotto da Minuchin (1974) nella terapia familiare strutturale. Si verifica quando un genitore coinvolge il figlio nel conflitto di coppia — come messaggero, confidente o alleato — violando il confine generazionale. La triangolazione è uno dei fattori più dannosi per il benessere del minore in contesti di separazione, indipendentemente dall'età.",
    ref: "Minuchin, 'Families and Family Therapy' (1974)"
  },
  {
    category: "Clinica",
    emoji: "🔄",
    term: "Parentificazione",
    simple: "Quando un figlio si trova a fare il genitore del proprio genitore — prendendosi cura delle sue emozioni, dei fratelli o della casa al posto suo.",
    clinical: "Inversione di ruolo in cui il minore assume funzioni di accudimento emotivo o pratico verso il genitore. Jurkovic (1997) distingue tra parentificazione strumentale (compiti pratici) ed emotiva (supporto psicologico). La seconda è più insidiosa perché spesso viene scambiata per maturità e viene premiata anziché riconosciuta come segnale di sofferenza.",
    ref: "Jurkovic, 'Lost Childhoods' (1997)"
  },
  {
    category: "Sviluppo emotivo",
    emoji: "💔",
    term: "Conflitto di lealtà",
    simple: "La sensazione dolorosa di dover scegliere tra mamma e papà — come se voler bene a uno significasse tradire l'altro.",
    clinical: "Esperienza emotiva in cui il bambino sente che la propria relazione con un genitore è minacciata dall'affetto per l'altro. Si attiva ogni volta che — esplicitamente o implicitamente — il figlio percepisce che amare un genitore significa deludere l'altro. È uno dei predittori più robusti di disagio psicologico nei minori in contesti di separazione (Buchanan, Maccoby & Dornbusch, 1996).",
    ref: "Buchanan, Maccoby & Dornbusch, 'Adolescents After Divorce' (1996)"
  },
  {
    category: "Sviluppo cognitivo",
    emoji: "✨",
    term: "Pensiero magico",
    simple: "La convinzione, tipica dei bambini piccoli, che i propri pensieri o desideri possano causare gli eventi — come credere che la separazione sia successa perché 'ho fatto qualcosa di sbagliato'.",
    clinical: "Modalità cognitiva normale nello sviluppo tra i 2 e i 6 anni circa, in cui il bambino attribuisce potere causale ai propri pensieri, emozioni o azioni. In contesti di separazione, il pensiero magico alimenta il senso di colpa: il bambino crede di aver provocato o di poter riparare la rottura tra i genitori. Non va ridicolizzato — va gentilmente disconfermato con parole concrete e ripetute.",
    ref: "Piaget, 'La représentation du monde chez l'enfant' (1926)"
  },
  {
    category: "Sviluppo cognitivo",
    emoji: "⏳",
    term: "Irreversibilità",
    simple: "La comprensione che la morte è definitiva — chi è morto non può tornare. I bambini la acquisiscono progressivamente tra i 5 e i 7 anni; prima di quell'età possono credere che la morte sia temporanea e reversibile.",
    clinical: "Una delle tre componenti della comprensione matura della morte identificate da Speece & Brent (1984), insieme a universalità (tutti gli esseri viventi muoiono) e non-funzionalità (il corpo smette di funzionare). L'acquisizione dell'irreversibilità è un passaggio cognitivo che dipende dallo sviluppo del pensiero operatorio concreto descritto da [[Piaget]]. Prima di questa acquisizione, il bambino in lutto può aspettare attivamente il ritorno della persona morta — non per negazione emotiva, ma per immaturità cognitiva.",
    ref: "Speece & Brent, 'Children's Understanding of Death' (1984); Piaget (1926); Slaughter, 'Young children's understanding of death' (2005)"
  },
  {
    category: "Sviluppo emotivo",
    emoji: "🦋",
    term: "Individuazione",
    simple: "Il processo attraverso cui un adolescente costruisce la propria identità separandosi emotivamente — non fisicamente — dalla famiglia d'origine. È un passaggio normale e necessario.",
    clinical: "Concetto centrale della psicologia dell'adolescenza, descritto da Mahler in età precoce (separazione-individuazione) e ripreso da Blos (1967) come 'secondo processo di individuazione' in adolescenza. Il ragazzo ha bisogno di differenziarsi dai genitori per costruire un sé autonomo — ma questo movimento richiede che la base familiare resti stabile. Se la famiglia si disgrega mentre il ragazzo si sta separando, i due processi si complicano reciprocamente.",
    ref: "Blos, 'The Second Individuation Process of Adolescence' (1967); Mahler, 'The Psychological Birth of the Human Infant' (1975)"
  },
  {
    category: "Clinica",
    emoji: "⚡",
    term: "Acting out",
    simple: "Quando un'emozione che non riesce a trovare parole si esprime attraverso un comportamento — spesso trasgressivo o rischioso. Non è cattiveria: è un messaggio che passa per le azioni anziché per la bocca.",
    clinical: "Concetto di origine psicoanalitica che descrive l'espressione di conflitti interni attraverso l'azione anziché la verbalizzazione o il pensiero. In adolescenza, i comportamenti a rischio (uso di sostanze, trasgressioni, sfide all'autorità) possono rappresentare un tentativo di comunicare o gestire un disagio emotivo non elaborabile altrimenti. Non va confuso con la normale sperimentazione adolescenziale.",
    ref: "Freud, 'Ricordare, ripetere e rielaborare' (1914); Steinberg, 'Adolescence' (12ª ed.)"
  },
  {
    category: "Clinica",
    emoji: "🌑",
    term: "Anedonia",
    simple: "La perdita di piacere e interesse per le cose che prima facevano stare bene — quando niente sembra più divertente, interessante o degno di impegno.",
    clinical: "Sintomo cardine dei disturbi depressivi, definito come incapacità di provare piacere per attività precedentemente gratificanti. In adolescenza può essere confuso con noia o pigrizia. La distinzione clinica: la noia cerca stimoli, l'anedonia non ne cerca più. È un segnale che merita attenzione, soprattutto se persistente (oltre 2 settimane) e associato a ritiro sociale.",
    ref: "DSM-5-TR; Steinberg, 'Adolescence' (12ª ed.)"
  },
];

function GlossarioPage({ highlightTerm, setHighlightTerm }) {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tutti");
  const [expandedTerm, setExpandedTerm] = useState(null);

  useEffect(() => {
    if (!highlightTerm) return;
    const matched = GLOSSARIO_TERMS.find(t => t.term.toLowerCase() === highlightTerm.toLowerCase());
    const termToUse = matched ? matched.term : highlightTerm;
    setExpandedTerm(termToUse);
    setActiveCategory("Tutti");
    setSearchTerm("");
    setTimeout(() => {
      const id = "gloss-" + termToUse.replace(/\s+/g, "-");
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (setHighlightTerm) setHighlightTerm(null);
    }, 200);
  }, [highlightTerm]);

  const categories = ["Tutti", "Neuroscienze", "Attaccamento", "Sviluppo cognitivo", "Sviluppo emotivo", "Clinica"];

  const catColors = {
    "Neuroscienze":       { bg: "#EAF3FD", text: "#3A7AB0", accent: "#5BA4D4" },
    "Attaccamento":       { bg: "#FBEAF2", text: "#8B4513", accent: "#F4A261" },
    "Sviluppo cognitivo": { bg: "#F0EFF8", text: "#4A3580", accent: "#7B5EA7" },
    "Sviluppo emotivo":   { bg: "#FFF8E7", text: "#7A5A00", accent: "#F4C842" },
    "Clinica":            { bg: "#F0F8F0", text: "#1A6B3A", accent: "#6BCB77" },
  };

  const filtered = GLOSSARIO_TERMS.filter(t => {
    const matchCat = activeCategory === "Tutti" || t.category === activeCategory;
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || t.term.toLowerCase().includes(q) || t.simple.toLowerCase().includes(q) || t.clinical.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div style={{ background: "#FFFCFA", minHeight: "100vh" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "32px 20px 60px" : "44px 20px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: isMobile ? 26 : 34, marginBottom: 8 }}>
            📖 Glossario psicologico
          </h2>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            I termini della psicologia dello sviluppo spiegati ai genitori — con i fondamenti scientifici e i riferimenti agli autori.
          </p>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="🔍  Cerca un termine..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "12px 18px", borderRadius: 18,
              border: "1.5px solid #DDD", fontFamily: "'Nunito', sans-serif",
              fontSize: 15, color: COLORS.deepSlate,
              background: "#FAFAFA", outline: "none",
            }}
          />
        </div>

        {/* Category filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
          {categories.map(cat => {
            const active = activeCategory === cat;
            const col = catColors[cat] || { bg: COLORS.mint, text: COLORS.deepSlate, accent: COLORS.sage };
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "7px 16px", borderRadius: 28, border: "none", cursor: "pointer",
                  fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: active ? 700 : 400,
                  background: active ? col.accent : "#F0F0F0",
                  color: active ? "#fff" : COLORS.slateLight,
                  transition: "all 0.2s",
                }}>
                {cat} {cat !== "Tutti" && !active && <span style={{ color: "#999", fontSize: 11 }}>
                  ({GLOSSARIO_TERMS.filter(t => t.category === cat).length})
                </span>}
              </button>
            );
          })}
        </div>

        {/* Results count */}
        <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 13, marginBottom: 20 }}>
          {filtered.length} {filtered.length === 1 ? "termine" : "termini"}{searchTerm ? ` per "${searchTerm}"` : ""}
        </p>

        {/* Terms list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif" }}>
              Nessun termine trovato per "{searchTerm}"
            </div>
          )}
          {filtered.map((t, i) => {
            const col = catColors[t.category];
            const isOpen = expandedTerm && expandedTerm.toLowerCase() === t.term.toLowerCase();
            return (
              <div key={t.term} id={"gloss-" + t.term.replace(/\s+/g,"-")}
                style={{
                  background: "#fff", borderRadius: 28,
                  border: isOpen ? `2px solid ${col.accent}` : "1.5px solid #EEE",
                  overflow: "hidden", transition: "all 0.2s",
                  boxShadow: isOpen ? `0 4px 20px ${col.accent}22` : "0 1px 4px rgba(0,0,0,0.05)",
                }}>

                {/* Term header */}
                <button onClick={() => setExpandedTerm(isOpen ? null : t.term)}
                  style={{
                    width: "100%", background: "none", border: "none", cursor: "pointer",
                    padding: "16px 20px", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 14,
                  }}>
                  <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{t.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 17, fontWeight: 700 }}>
                        {t.term}
                      </span>
                      <span style={{ background: col.bg, color: col.text, fontSize: 11, padding: "2px 10px", borderRadius: 10, fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
                        {t.category}
                      </span>
                    </div>
                    <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                      {t.simple}
                    </p>
                  </div>
                  <span style={{ color: col.accent, fontSize: 18, flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                    ▾
                  </span>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ padding: "0 20px 20px 56px", borderTop: `1px solid ${col.bg}` }}>
                    <div style={{ background: col.bg, borderRadius: 10, padding: "14px 18px", marginBottom: 14, marginTop: 16 }}>
                      <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.8, margin: 0 }}>
                        <strong style={{ color: col.text }}>📌 Approfondimento clinico: </strong>
                        {t.clinical}
                      </p>
                    </div>
                    <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                      <strong>📚 Riferimenti:</strong> {t.ref}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 48, background: "#FFF8E7", borderRadius: 28, padding: "18px 22px", border: "1px solid #F4C84244" }}>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: "#7A5A00", fontSize: 13, lineHeight: 1.8, margin: 0 }}>
            <strong>📖 Sul Glossario:</strong> Le definizioni sono concepite per i genitori, non per gli specialisti — privilegiano la comprensione pratica sulla precisione tecnica. Per approfondimenti clinici si raccomanda sempre la consultazione con un professionista della salute mentale o dello sviluppo.
          </p>
        </div>

      </div>
    {_glossaryReturnSection && (
      <button
        aria-label={_glossaryReturnLabel || "Torna alla sezione precedente"}
        onClick={() => {
          const returnTo = _glossaryReturnSection;
          _glossaryReturnSection = null;
          _glossaryReturnScrollY = 0;
          _glossaryReturnLabel = null;
          /* _glossaryReturnTab e _glossaryReturnPhase vengono consumati
             dai lazy initializer dei componenti al rimontaggio — non azzerare qui */
          if (_globalSetSection) _globalSetSection(returnTo);
          scrollToTabBar();
        }}
        style={{
          position: "fixed", bottom: 24, left: 20, zIndex: 999,
          height: 44, borderRadius: 28,
          padding: "0 18px",
          background: "linear-gradient(135deg, #8B7AC0, #7060A0)",
          border: "none", cursor: "pointer",
          boxShadow: "0 4px 18px rgba(112,96,160,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6,
          fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700,
          color: "white",
          transition: "opacity 0.25s, transform 0.2s",
          opacity: 0.94,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.94"; }}
      >← {_glossaryReturnLabel || "Torna indietro"}</button>
    )}
    <SuggerimentoButton compact />
    </div>
  );
}
function PreadolescenzaPage() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState(() => { const t = _glossaryReturnTab; _glossaryReturnTab = null; return t || "emozioni"; });
  useEffect(() => { _globalCurrentTab = activeTab; _globalCurrentPhase = null; }, [activeTab]);

  const tabs = [
    { id: "emozioni",  label: "🌊 Emozioni" },
    { id: "relazioni", label: "👥 Relazioni" },
    { id: "scuola",    label: "📚 Scuola" },
    { id: "genitore",  label: "🤝 Genitore" },
    { id: "cervello",  label: "🧠 Cervello" },
  ];

  const content = {
    cervello: {
      titolo: "Un cantiere aperto — il cervello tra 12 e 15 anni",
      intro: "La pubertà scatena la più grande ristrutturazione cerebrale dopo i primi anni di vita. Non è adolescenza 'difficile' — è biologia.",
      cards: [
        { icon: "🔥", titolo: "L'amigdala al massimo volume", testo: "Il centro delle emozioni intense si iperattiva all'inizio della pubertà. Le reazioni emotive sembrano sproporzionate — perché neurologicamente lo sono: il segnale emotivo è amplificato, il freno ([[corteccia prefrontale]]) non tiene ancora il passo. LeDoux, 'The Emotional Brain' (1996)." },
        { icon: "✂️", titolo: "La grande potatura", testo: "Il cervello in questa fase elimina fino al 50% delle [[sinapsi|connessioni sinaptiche]] costruite nell'infanzia. Quello che non si usa si perde. È un processo di [[pruning sinaptico|potatura sinaptica]] — come potare un albero per farlo crescere meglio. Blakemore, 'Inventing Ourselves' (2018)." },
        { icon: "⚡", titolo: "Il sistema della ricompensa", testo: "La [[dopamina]] — il neurotrasmettitore del piacere e della motivazione — raggiunge il picco di sensibilità in questa fase. Spiega la ricerca di stimoli intensi, il rischio, l'importanza esagerata del giudizio dei pari. Steinberg, 'Age of Opportunity' (2014)." },
        { icon: "🌙", titolo: "Il sonno cambia fase", testo: "La [[melatonina]] viene prodotta 2 ore dopo rispetto all'infanzia. Non è pigrizia — è biologia: il loro orologio biologico interno è spostato in avanti. Svegliarli presto per la scuola è neurologicamente problematico. Walker, 'Why We Sleep' (2017)." },
        { icon: "🧩", titolo: "La corteccia prefrontale in costruzione", testo: "La parte del cervello che controlla impulsi, pianificazione e conseguenze è ancora in costruzione. Non sarà matura fino a 25 anni. Questo spiega decisioni impulsive, difficoltà a valutare rischi, reattività emotiva. Non è mancanza di carattere." },
        { icon: "👥", titolo: "I neuroni specchio e i pari", testo: "Il cervello del preadolescente è biologicamente calibrato per pesare il giudizio dei pari più di qualsiasi altra fonte. Non è un difetto di carattere — è il riflesso di un sistema sociale che si sta attivando al massimo della sua sensibilità. L'importanza dei pari è biologica, non capriccio. Blakemore, 'Inventing Ourselves' (2018)." },
      ]
    },
    emozioni: {
      titolo: "Sbalzi d'umore: non è teatro, è neurobiologia",
      intro: "Un momento ride, un momento scoppia. Non sta manipolando — il suo cervello elabora le emozioni in modo completamente diverso da quello adulto.",
      cards: [
        { icon: "🎭", titolo: "Le emozioni vengono elaborate diversamente", testo: "Gli adulti elaborano le espressioni emotive degli altri nella [[corteccia prefrontale]] (ragionamento). I preadolescenti usano prevalentemente l'[[amigdala]] (reazione). Questo spiega perché leggono male le emozioni altrui — letteralmente processano il viso di un genitore arrabbiato come una minaccia." },
        { icon: "😰", titolo: "L'ansia come compagna fissa", testo: "L'ansia è tra le difficoltà psicologiche più frequenti in preadolescenza. L'ansia da prestazione scolastica, l'ansia sociale, la paura del giudizio sono tra le forme più frequenti. Spesso non riescono a nominarla — la [[ansia somatica|somatizzano]]: mal di pancia, mal di testa, insonnia." },
        { icon: "🌧️", titolo: "La tristezza che non si vede", testo: "I preadolescenti che attraversano una fase depressiva raramente piangono: si irritano, si isolano, perdono interesse per le cose che amavano. I segnali da osservare: calo improvviso del rendimento, ritiro sociale, cambiamento nel sonno e nell'appetito, frasi come 'non vale la pena di niente'. Se noti più di uno di questi segnali persistere per settimane, confrontarti con il pediatra o uno specialista può aiutarti a orientarti." },
        { icon: "💥", titolo: "La rabbia come linguaggio", testo: "La rabbia intensa in questa fase è spesso paura o dolore travestiti. Il preadolescente non ha ancora gli strumenti linguistici per dire 'mi sento inadeguato', 'ho paura di non piacere', 'sono confuso'. La rabbia viene prima. Il genitore che riesce a restare curioso — invece di difensivo — rompe il circolo." },
        { icon: "🔍", titolo: "Identità: chi sono?", testo: "Erikson chiamava questa fase 'identità vs. confusione di ruolo'. Il preadolescente testa identità diverse — look, linguaggio, gruppo di amici — come si provano i vestiti. Non è instabilità caratteriale: è la ricerca di sé. Lasciare spazio a questa ricerca — senza giudicarla — è uno dei modi più efficaci per accompagnarla." },
        { icon: "📱", titolo: "Il sé digitale", testo: "Per i preadolescenti di oggi l'identità si costruisce anche online. I like, i follower, le storie non sono frivolezze — sono l'equivalente digitale della validazione del gruppo. Più che demonizzare i social, il punto è conoscerli insieme — e restare presenti. Se noti una distanza significativa tra chi è online e chi è nella vita, vale la pena parlarne con curiosità, non con allarme." },
        { icon: "🫥", titolo: "Quando 'non sentire niente' diventa la normalità", testo: "Alcuni preadolescenti non mostrano tristezza né rabbia — mostrano assenza. Rispondono 'boh' non per provocare, ma perché davvero non sanno come stanno. [[Stern]] ha descritto la qualità 'viva' dell'esperienza — gli [[affetti vitali]] — come il ritmo, lo slancio, l'intensità di tutto ciò che facciamo. Quando questa vitalità si spegne, il ragazzo può sembrare semplicemente 'svogliato'. Ma dentro sta descrivendo qualcosa di diverso dalla pigrizia: un'assenza che non sa nominare. Non è un problema da risolvere con la predica — è un segnale da accogliere con curiosità." },
      ]
    },
    relazioni: {
      titolo: "Pari, famiglia, primo amore",
      intro: "Il gruppo dei pari diventa il sistema gravitazionale principale. Non scompare il bisogno del genitore — cambia forma.",
      cards: [
        { icon: "👫", titolo: "I pari come sistema di validazione", testo: "L'approvazione del gruppo non è una preferenza — è un bisogno neurologico. Il cervello del preadolescente è letteralmente calibrato per pesare il giudizio dei pari più di qualsiasi altra fonte. Non è che non ascoltano i genitori: è che il segnale dei pari viene amplificato biologicamente." },
        { icon: "💔", titolo: "Esclusione e bullismo: effetti reali", testo: "Un preadolescente escluso dal gruppo non sta esagerando quando dice che gli fa male — la ricerca ha mostrato che il cervello elabora il rifiuto sociale con la stessa intensità di una ferita fisica. Il [[bullismo e vittimizzazione|bullismo]] — fisico, verbale o digitale — in questa fase può lasciare tracce misurabili nello sviluppo cerebrale (Viding et al., 2012)." },
        { icon: "❤️", titolo: "I primi amori", testo: "Le prime infatuazioni sono vissute con un'intensità neurobiologica reale: la [[dopamina]] e l'[[ossitocina]] si attivano come negli adulti, ma senza l'esperienza per gestirle. Non ridere di quello che sente — per lui o lei è reale. La delusione amorosa in questa fase va presa sul serio." },
        { icon: "🔒", titolo: "Segreti e privacy", testo: "Il preadolescente inizia a tenere una vita interiore separata da quella familiare. Ha segreti. Non è disonestà — è la costruzione dell'identità. Rispettare questa privacy costruisce la fiducia che poi permette di parlare delle cose importanti." },
        { icon: "🌐", titolo: "Amicizie online", testo: "Molti preadolescenti costruiscono amicizie significative online — spesso più autentiche di quelle scolastiche perché basate su interessi condivisi piuttosto che su vicinanza geografica. Non demonizzarle, ma conoscerle: chi sono questi amici? Di cosa parlano?" },
        { icon: "🏠", titolo: "Il genitore ancora necessario", testo: "Nonostante il distacco apparente, il preadolescente ha ancora bisogno del genitore come [[base sicura]]. Lo cercherà nei momenti di crisi — ed è il segno che il legame tiene, anche quando sembra invisibile. La sfida è mantenersi vicini senza invadere." },
      ]
    },
    scuola: {
      titolo: "La scuola media e il primo anno delle superiori",
      intro: "Il passaggio alla scuola media è uno dei cambiamenti più traumatici dell'infanzia. Poi arrivano le superiori — con nuove sfide e nuove possibilità.",
      cards: [
        { icon: "📉", titolo: "Il calo del rendimento è quasi universale", testo: "Il rendimento scolastico cala quasi universalmente tra i 12 e i 14 anni — anche nei bambini che andavano bene. Le cause: riorganizzazione cerebrale, cambiamento del sistema scolastico, calo della motivazione intrinseca. Non è pigrizia: è fisiologico. La questione è come rispondervi." },
        { icon: "🧩", titolo: "DSA: questa è spesso l'età della diagnosi", testo: "Molti [[disturbo da deficit di attenzione (ADHD)|Disturbi Specifici dell'Apprendimento]] emergono chiaramente con le richieste della scuola media: la dislessia, la discalculia, la disortografia — e anche il disturbo da deficit di attenzione (ADHD), che pur non essendo un DSA in senso stretto, emerge spesso con le richieste organizzative della scuola media. Una diagnosi precoce non è un'etichetta — è uno strumento per trovare strategie efficaci." },
        { icon: "💡", titolo: "La motivazione intrinseca è il vero target", testo: "Punire e premiare funziona meno di prima. Quello che muove un preadolescente è la rilevanza percepita — 'a cosa mi serve?' — e la competenza percepita — 'sono in grado di farlo?'. Trovare il collegamento tra studio e vita reale è più efficace di qualsiasi pressione esterna." },
        { icon: "🎯", titolo: "Gli interessi come porte d'ingresso", testo: "Un ragazzo appassionato di gaming può imparare matematica attraverso la programmazione. Una ragazza appassionata di musica può imparare storia attraverso i contesti musicali. Gli interessi non sono distrazioni dallo studio — sono le sue porte d'ingresso." },
        { icon: "😟", titolo: "Ansia da prestazione e perfezionismo", testo: "L'ansia da voti è tra le difficoltà più comuni nei preadolescenti italiani. Il perfezionismo — la paura dell'errore — blocca più che motivare. Insegnare che l'errore è parte del processo di apprendimento (Dweck, [[mindset di crescita]]) è uno dei regali più utili che un genitore possa fare." },
        { icon: "🏫", titolo: "Relazione con i professori", testo: "In questa fase i professori diventano figure di attaccamento secondarie importanti — o fonti di stress significativo. Un professore che vede il ragazzo, non solo il voto, può fare la differenza per anni. Se il rapporto è conflittuale, aiuta il ragazzo a distinguere tra 'questo professore è difficile' e 'non valgo niente'." },
      ]
    },
    genitore: {
      titolo: "Come stare vicino senza soffocare",
      intro: "Il paradosso della preadolescenza: hai bisogno di me ma non puoi dirmelo. Il tuo lavoro è restare disponibile senza invadere.",
      cards: [
        { icon: "📡", titolo: "La presenza silenziosa", testo: "Non devi fare domande per essere presente. Essere in casa mentre lui è in casa, cucinare insieme senza parlare necessariamente, guardare la stessa serie — sono forme di vicinanza che non richiedono parole. I ragazzi parlano quando si sentono al sicuro, non quando vengono interrogati." },
        { icon: "🚗", titolo: "Le conversazioni in macchina", testo: "Le conversazioni più importanti avvengono in macchina, sul divano mentre guardano la TV, durante una passeggiata — mai faccia a faccia. Il contatto visivo diretto è percepito come confronto. La posizione fianco a fianco abbassa le difese." },
        { icon: "🪞", titolo: "Non diventare il suo specchio", testo: "Non rispecchiare le sue emozioni amplificandole ('Capisco che sei devastata!') ma regolarle ('Sembra che tu sia molto arrabbiata — è comprensibile sentirsi così'). La [[co-regolazione]] funziona anche in adolescenza: la tua calma è ancora il suo termostato emotivo." },
        { icon: "❌", titolo: "Cosa non fare", testo: "Non ridere di quello che sente. Non confrontarlo con i fratelli o i coetanei. Non leggere il suo diario o i messaggi senza motivi gravi. Non minacciare di parlare con i professori senza coinvolgerlo. Non dire 'ai miei tempi'. Ognuno di questi è un mattone tolto dalla fiducia." },
        { icon: "✅", titolo: "Cosa fare invece", testo: "Interesse genuino per i suoi interessi — anche se non li capisci. Regole chiare con spiegazioni ('lo faccio perché mi preoccupo' non 'perché lo dico io'). Riparare dopo i conflitti — 'mi sono arrabbiato, ti voglio bene lo stesso'. Modellare l'errore e la riparazione." },
        { icon: "🆘", titolo: "Quando cercare aiuto professionale", testo: "Calo significativo del rendimento, ritiro sociale prolungato, cambiamenti nel sonno o nell'alimentazione, automutilazioni (tagli, graffi), uso di sostanze, frasi che esprimono mancanza di speranza — sono segnali da non ignorare. Non aspettare che passi da solo — il pediatra, il consultorio familiare o uno psicologo possono aiutarti a capire cosa fare." },
      ]
    }
  };

  const current = content[activeTab];

  return (
    <div style={{ background: COLORS.warmWhite, minHeight: "100vh" }}>

      {/* ── Hero centrato ── */}
      <div style={{
        background: "linear-gradient(160deg, #FBEAF2 0%, #FCDFD8 30%, #F9E8F8 65%, #E8E2F8 100%)",
        padding: isMobile ? "28px 16px 36px" : "36px 20px 48px",
        position: "relative", overflow: "hidden",
      }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: [220, 140, 100][i], height: [220, 140, 100][i],
            borderRadius: "50%",
            border: `1px solid rgba(255,255,255,${[0.05, 0.06, 0.07][i]})`,
            top: ["15%", "55%", "30%"][i],
            left: ["-3%", "82%", "60%"][i],
          }} />
        ))}
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <img
            src={ZONE_IMAGES["12-15"]}
            alt="12–15 anni"
            style={{ width: 80, height: 80, objectFit: "contain", display: "block", margin: "0 auto 10px" }}
          />
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: COLORS.deepSlate, fontSize: isMobile ? 24 : 32,
            fontWeight: 700, lineHeight: 1.2, margin: "0 0 6px",
          }}>{HERO_DATA["12-15"].title}</h1>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: isMobile ? 16 : 20, fontWeight: 400, fontStyle: "italic",
            background: `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.peach})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            margin: "0 0 14px",
          }}>{HERO_DATA["12-15"].accent}</p>
          <p style={{
            color: COLORS.slateLight, fontSize: isMobile ? 14 : 15, lineHeight: 1.65,
            fontFamily: "'Nunito', sans-serif", maxWidth: 520, margin: "0 auto",
          }}>{HERO_DATA["12-15"].desc}</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "32px 20px" : "44px 20px" }}>


        <p style={{
            fontFamily:  "'Nunito', sans-serif",
            fontSize:    isMobile ? 13 : 14,
            fontWeight:  700,
            color:       COLORS.slateLight,
            fontStyle:   "italic",
            textAlign:   "center",
            margin:      "0 0 8px",
            letterSpacing: "0.1px",
          }}>Cosa vuoi approfondire?</p>
        <div id="main-tab-bar" role="tablist" aria-label="Argomenti preadolescenza" style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 32, padding: "0 4px" }}>
          {tabs.map(tab => (
            <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); scrollToTabBar(); }} style={{
              background: activeTab === tab.id ? `linear-gradient(135deg, #1565C0, #1E88E5)` : "#E3F2FD",
              border: "none", borderRadius: 22, cursor: "pointer",
              padding: "9px 18px", whiteSpace: "nowrap",
              fontFamily: "'Nunito', sans-serif", fontSize: 14,
              color: activeTab === tab.id ? "white" : COLORS.deepSlate,
              fontWeight: activeTab === tab.id ? 700 : 500,
              transition: "all 0.2s", WebkitTapHighlightColor: "transparent", userSelect: "none",
            }}>{tab.label}</button>
          ))}
        </div>

        <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: COLORS.slateLight, fontSize: 16, marginBottom: 28, lineHeight: 1.65 }}>
          {current.intro}
        </p>
        <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: isMobile ? 20 : 24, marginBottom: 24 }}>{current.titolo}</h3>

        {activeTab === "cervello" && (
          <div style={{ marginBottom: 32 }}>
            <BrainInfographic zone="12-15" />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 16 }}>
          {current.cards.map((card, i) => (
            <div key={i} style={{ background: COLORS.warmWhite, borderRadius: 22, padding: 22, border: "1.5px solid #E3F2FD", borderLeft: "4px solid #1565C0" }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{card.icon}</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 17, marginBottom: 8, lineHeight: 1.3 }}>{card.titolo}</h3>
              <p style={{ fontFamily: "'Nunito', sans-serif", color: "#3A3A4A", fontSize: 14, lineHeight: 1.72 }}>{parseLinks(card.testo)}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32 }}>
          <QuoteCard quote={QUOTES["winnicott_gioco"]} />
        </div>
        <CrossLinks cards={[
          { emoji: "🖥️", label: "Schermi e tecnologia", desc: "Social, gaming e tempi schermo a 12–15 anni", section: "screens", bg: COLORS.skyLight },
          { emoji: "📚", label: "La scienza dietro", desc: "Neuroscienze e attaccamento approfonditi", section: "library", bg: COLORS.mintLight },
          { emoji: "🌊", label: "Capire il tuo preadolescente", desc: "Strumenti per accompagnarlo con più consapevolezza", section: "checklist", bg: COLORS.skyLight },
        ]} />
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 32 }}>
          <button onClick={() => { if (_globalSetSection) _globalSetSection("checklist"); }} style={{
            background: `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.roseDark})`,
            color: "white", border: "2px solid rgba(255,150,180,0.4)", borderRadius: 50,
            padding: "13px 28px", fontSize: 15,
            fontFamily: "'Nunito', sans-serif", cursor: "pointer",
            fontWeight: 800, minHeight: 50,
            animation: "rose-pulse 2s ease-in-out infinite",
            letterSpacing: "0.2px",
          }}>🌊 Capire il mio preadolescente</button>
          <button onClick={() => { if (_globalSetSection) _globalSetSection("genitori"); }} style={{
            background: `linear-gradient(135deg, ${COLORS.lavender}, #7060A0)`,
            color: "white", border: "2px solid rgba(180,160,230,0.4)", borderRadius: 50,
            padding: "13px 28px", fontSize: 15,
            fontFamily: "'Nunito', sans-serif", cursor: "pointer",
            fontWeight: 800, minHeight: 50,
            animation: "lavender-pulse 2s ease-in-out infinite",
            letterSpacing: "0.2px",
          }}>💛 Come sto tenendo il filo?</button>
        </div>
        <SuggerimentoButton />
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   🌟  ADOLESCENZA PAGE — 15–18 anni
   Razionale scientifico: 15-18 = identità in consolidamento,
   pensiero astratto maturo (Piaget stadio formale completo),
   relazioni romantiche reali, autonomia, pianificazione del futuro,
   rischio esistenziale (Erikson), cervello ancora in maturazione
   ma con maggiore capacità metacognitiva.
═══════════════════════════════════════════════════════════════ */
function AdolescenzaPage() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState(() => { const t = _glossaryReturnTab; _glossaryReturnTab = null; return t || "identita"; });
  useEffect(() => { _globalCurrentTab = activeTab; _globalCurrentPhase = null; }, [activeTab]);

  const tabs = [
    { id: "identita",  label: "🪞 Identità" },
    { id: "relazioni", label: "❤️ Relazioni" },
    { id: "rischi",    label: "⚠️ Rischi" },
    { id: "genitore",  label: "🤝 Genitore" },
    { id: "cervello",  label: "🧠 Cervello" },
  ];

  const content = {
    cervello: {
      titolo: "Il cervello tra 15 e 18 anni: capace ma non ancora adulto",
      intro: "A 15 anni un ragazzo può ragionare in modo astratto, pianificare, riflettere su se stesso. Ma la corteccia prefrontale completerà la sua maturazione solo verso i 25 anni. Capace e ancora vulnerabile.",
      cards: [
        { icon: "🔭", titolo: "Il pensiero astratto matura", testo: "Verso i 15-16 anni emerge il pensiero formale completo ([[Piaget]]): la capacità di ragionare su ipotesi, di pensare al futuro in modo non lineare, di elaborare concetti filosofici e morali. Non sono più solo 'concreti' — possono pensare a come potrebbe essere il mondo." },
        { icon: "🪞", titolo: "La metacognizione: pensare al proprio pensiero", testo: "L'adolescente inizia a chiedersi come impara, cosa lo motiva, quali sono i suoi limiti e i suoi punti di forza. Questa capacità — la metacognizione — è la base dell'autonomia intellettuale. Va incoraggiata, non temuta." },
        { icon: "⚡", titolo: "La dopamina e il rischio", testo: "Il sistema della ricompensa rimane iperattivo fino ai 25 anni. La ricerca di sensazioni forti, l'attrattiva del rischio, l'impulsività in situazioni cariche emotivamente — sono ancora presenti. La [[dopamina]] in questa fase amplifica tutto ciò che promette novità o gratificazione. Sapolsky in 'Behave' (2017) mostra come le decisioni rischiose degli adolescenti siano biologicamente comprensibili." },
        { icon: "😴", titolo: "Il sonno è ancora fondamentale", testo: "L'orologio biologico rimane spostato: i ragazzi di 15-18 anni hanno naturalmente sonno dopo la mezzanotte e si svegliano tardi. La privazione del sonno riduce drasticamente le [[funzioni esecutive]], la regolazione emotiva e la memoria. Non è pigrizia — è fisiologia." },
        { icon: "🧬", titolo: "La mielinizzazione si completa gradualmente", testo: "Le fibre nervose continuano a ricoprirsi di [[mielinizzazione|mielina]] — la guaina che le rende più veloci ed efficienti — fino ai 25 anni. La [[corteccia prefrontale]] è l'ultima ad essere completamente mielinizzata. Questo spiega perché i comportamenti impulsivi non scompaiono magicamente a 18 anni." },
        { icon: "🌱", titolo: "Plasticità ancora alta", testo: "Il cervello adolescente è ancora altamente plastico. Le esperienze di questa fase — positive e negative — lasciano tracce neurali durature. Gli ambienti arricchenti (musica, sport, lettura, relazioni significative) costruiscono letteralmente il cervello adulto." },
        { icon: "🫥", titolo: "Il sistema della ricompensa e il vuoto", testo: "Quando il sistema dopaminergico viene sovrastimolato cronicamente — dai social, dal gaming, o da sostanze come il THC — può verificarsi un appiattimento: la soglia del piacere si alza, e ciò che prima era gratificante non basta più. Il ragazzo può descrivere un vuoto che non è tristezza — è un'assenza di interesse, di slancio, di vitalità. Non è pigrizia: è neurochimica. (Volkow, 2011; Blum et al. 2021)." },
        { icon: "🦠", titolo: "Crescere durante una pandemia", testo: "Chi ha oggi 15-18 anni aveva 9-12 anni durante i lockdown. La preadolescenza è il momento in cui il cervello è biologicamente più sensibile alle relazioni con i pari — [[Stern]] ha descritto come la conoscenza relazionale si costruisca attraverso micro-momenti di incontro. Per milioni di ragazzi, il lockdown ha significato una riduzione massiccia di questi momenti dal vivo. Racine et al. (JAMA Pediatrics, 2021) hanno documentato un raddoppio della prevalenza di sintomi depressivi e ansiosi nei giovani durante e dopo la pandemia. Per chi ha attraversato la preadolescenza in lockdown, la finestra critica di socializzazione dal vivo è stata significativamente ridotta." },
      ]
    },
    identita: {
      titolo: "Chi sono? Costruire se stessi",
      intro: "Erikson chiamava questa fase il compito cruciale della vita: trovare un'identità coerente invece di restare nella confusione. È un processo normale — e necessario.",
      cards: [
        { icon: "🔮", titolo: "L'identità come sperimentazione", testo: "Cambiare stile, gruppo di amici, passioni, opinioni politiche — è il processo normale di costruzione dell'identità. Non è instabilità: è esplorazione. I ragazzi che vengono lasciati esplorare in sicurezza costruiscono un'identità più solida di quelli che vengono fissati in un'immagine." },
        { icon: "🌈", titolo: "Identità sessuale e di genere", testo: "Tra i 15 e i 18 anni emergono le domande più profonde sull'orientamento sessuale e sull'identità di genere. Uno studio su larga scala (Ryan et al., 2010, Pediatrics) ha evidenziato che il supporto familiare in questa fase è tra i fattori più predittivi del benessere psicologico a lungo termine. Il non-giudizio non è permissivismo — è protezione." },
        { icon: "📱", titolo: "L'identità digitale", testo: "Il sé online e il sé offline si intrecciano in modi complessi. I ragazzi usano i social per testare versioni di sé, ricevere feedback, costruire una narrativa pubblica di chi sono. Il problema non è l'identità digitale in sé — è quando sostituisce quella reale invece di integrarla." },
        { icon: "🎯", titolo: "I valori che stanno diventando propri", testo: "In questa fase i ragazzi iniziano a sviluppare un sistema di valori autonomo — non necessariamente uguale a quello dei genitori. Il disaccordo su valori politici, religiosi, sociali è parte normale del processo. Discuterne senza squalificare il punto di vista del ragazzo costruisce pensiero critico." },
        { icon: "💼", titolo: "Il futuro come identità", testo: "Le domande sul futuro — cosa farò, chi sarò, dove vivrò — diventano cariche di significato identitario. La pressione della scelta universitaria o lavorativa può essere schiacciante. Non sovrapporre le proprie aspettative alle sue: aiutalo a esplorare, non a scegliere quello che vuoi tu." },
        { icon: "🧘", titolo: "Autostima e corpo", testo: "Il corpo continua a cambiare e l'autostima è strettamente legata all'immagine corporea in questa fase. Confronto con gli standard social, ritardo puberale o pubertà precoce — sono tutte fonti di stress reale. Non minimizzare le preoccupazioni sul corpo: ascoltarle è il primo passo." },
        { icon: "🫥", titolo: "Quando l'identità non si trova: il vuoto", testo: "Erikson ha descritto cosa succede quando la ricerca dell'identità si blocca: la 'diffusione di ruolo' — una condizione in cui il ragazzo non sa chi è, cosa vuole, dove sta andando. Se questo stato si prolunga, può manifestarsi come quel senso di vuoto che molti adolescenti descrivono senza riuscire a nominarlo. Non è depressione — è l'assenza di qualcosa che non è ancora stato costruito. È come se mancasse la qualità viva dell'esperienza — quel senso che le cose contano, che i giorni hanno un sapore. Questa generazione ha affrontato una combinazione senza precedenti — pandemia durante la preadolescenza, social media ad alta intensità, disponibilità di THC — che può rendere più difficile il processo di costruzione identitaria. Non è un destino: è una circostanza da riconoscere." },
      ]
    },
    relazioni: {
      titolo: "Amori, amicizie e distanza dai genitori",
      intro: "Le relazioni sono il laboratorio in cui l'adolescente sperimenta chi è. Amori, amicizie profonde, prime delusioni — tutto contribuisce alla costruzione dell'adulto.",
      cards: [
        { icon: "❤️", titolo: "Le relazioni romantiche reali", testo: "Le prime relazioni romantiche tra i 15 e i 18 anni non sono giochi — sono prove generali della vita adulta. Si imparano l'intimità, la fiducia, il conflitto, la perdita. Il genitore che riesce a parlare di queste relazioni senza giudicare rimane un riferimento prezioso." },
        { icon: "💔", titolo: "La fine di una storia", testo: "Una rottura amorosa in adolescenza può attivare le stesse aree cerebrali coinvolte nel dolore adulto — la sofferenza che sente è reale. Non sminuirla ('troverai un altro'). Stargli vicino, nominare il dolore, normalizzarlo. Se la sofferenza è molto intensa e prolungata, considera supporto professionale." },
        { icon: "👫", titolo: "Amicizie profonde e fedeltà", testo: "In questa fase le amicizie diventano più selettive e più intense. Il 'migliore amico' può essere più importante del genitore come confidente. Rispetta questo. L'amicizia è l'altra grande scuola dell'intimità." },
        { icon: "🏠", titolo: "Il distacco dalla famiglia", testo: "Il processo di crescita e conquista dell'autonomia richiede che il ragazzo prenda distanza emotiva dalla famiglia. Blos lo chiamava 'secondo processo di individuazione' — il primo era quello dei primi tre anni di vita, quando il bambino scopre di essere una persona separata dal genitore. Ora si ripete, in forma più consapevole e più dolorosa per entrambi. Ma un ragazzo che si allontana sapendo che ci sei è un ragazzo che sta crescendo — non uno che non vuole bene. La [[base sicura]] deve essere lì, silenziosa." },
        { icon: "🌐", titolo: "Relazioni online e dipendenza affettiva", testo: "Le relazioni romantiche online sono reali e possono essere intense. I rischi da conoscere: dipendenza affettiva, sexting, incontri con persone che non si conoscono. Non vietare — educare alla sicurezza e mantenere un dialogo aperto." },
        { icon: "🔑", titolo: "Insegnargli a chiedere aiuto", testo: "I ragazzi che sanno chiedere aiuto quando ne hanno bisogno — agli amici, agli adulti, ai professionisti — sono più [[resilienza|resilienti]]. Modella questo comportamento: mostra che anche tu chiedi aiuto. E fai sapere che sei disponibile senza che sia un obbligo parlare con te." },
      ]
    },
    rischi: {
      titolo: "Rischi reali e come parlarne",
      intro: "Non per spaventare — per preparare. I rischi dell'adolescenza si affrontano con informazione, dialogo e fiducia, non con il controllo.",
      cards: [
        { icon: "🍺", titolo: "Alcol e sostanze", testo: "In Italia la prima esperienza con l'alcol avviene mediamente intorno ai 13-14 anni (ISTAT 2022). Il cervello adolescente è più vulnerabile ai suoi effetti a lungo termine — l'ippocampo (memoria) è particolarmente a rischio. Parlarne prima della prima occasione, senza moralismi, in modo informativo è la strategia più efficace." },
        { icon: "🌿", titolo: "Cannabis e cervello in costruzione", testo: "Il THC agisce sullo stesso sistema cerebrale che regola piacere, motivazione e umore. In un cervello adolescente — dove la [[dopamina]] è al picco della sua sensibilità — l'uso regolare è associato a un appiattimento della risposta di piacere: le cose che normalmente danno gratificazione diventano meno interessanti. Non è che sono cambiate quelle cose — è cambiata la soglia del cervello per registrarle. Il rapporto è anche bidirezionale: gli adolescenti che già si sentono 'vuoti' hanno più probabilità di avvicinarsi alla cannabis, e l'uso tende a intensificare quel vuoto. Riconoscere questo circolo — senza giudizio — è il primo passo per interromperlo. (Blum et al., Frontiers in Psychiatry 2021; Leventhal et al. 2017; Skumlien et al. 2021)." },
        { icon: "🫥", titolo: "Quel senso di vuoto che non è tristezza", testo: "Molti adolescenti descrivono una sensazione che non è tristezza, non è rabbia, non è ansia — è un'assenza. Come attraversare le giornate in automatico, senza sentirle. [[Stern]] l'avrebbe descritto come un collasso degli [[affetti vitali]] — la qualità 'viva' dell'esperienza che si spegne. Il sociologo Corey Keyes chiama questa condizione [[languishing]]: lo spazio grigio tra lo stare male e lo stare bene. Nelle sue ricerche, il 40-50% degli adolescenti della scuola media si trova in questo stato. Non è una diagnosi — ma non va ignorato: il languishing prolungato è un fattore di rischio per depressione. La buona notizia: risponde a cose semplici — relazioni calde, esperienze con senso, movimento, gioco." },
        { icon: "📱", titolo: "Dipendenza digitale", testo: "Secondo i dati ESPAD Italia, l'uso problematico dei social riguarda una quota significativa di adolescenti, con stime tra il 15 e il 20%. I segnali: incapacità di staccarsi, umore che dipende dai like, notturne digitali frequenti, perdita di interesse per attività offline. Non è solo questione di tempo-schermo: è qualità dell'uso." },
        { icon: "🌀", titolo: "Disturbi alimentari", testo: "L'incidenza dei disturbi alimentari raggiunge il picco tra i 14 e i 18 anni, con un aumento significativo nel periodo post-pandemico (ISS, 2022). Non riguardano il cibo — riguardano il controllo, l'identità, il dolore. I segnali da non ignorare: restrizione alimentare marcata, abbuffate, esercizio compulsivo, ossessione per il corpo." },
        { icon: "🩹", titolo: "Autolesionismo", testo: "Il cutting e altre forme di autolesionismo non sono sempre tentativi di suicidio — spesso sono un modo per gestire emozioni insopportabili. Va preso sul serio sempre. Non reagire con panico o rabbia: con calma chiedi come sta, mostrati disponibile, accompagnalo da un professionista." },
        { icon: "💙", titolo: "Salute mentale: i numeri", testo: "Secondo le stime dell'OMS (2021), circa un adolescente su cinque attraversa difficoltà psicologiche significative — e la maggior parte non riceve un supporto adeguato. Ansia e depressione sono le più frequenti. Rivolgersi per tempo a un professionista può fare una differenza importante. Non aspettare che 'passi da solo'." },
        { icon: "🆘", titolo: "Pensieri suicidari", testo: "Se il ragazzo esprime pensieri di non voler esistere, di essere un peso per gli altri, o fa domande sul suicidio — prendi sul serio. Non lasciarlo solo, non minimizzare, non arrabbiarti. Contatta un professionista o un servizio di emergenza. Numeri utili: Telefono Azzurro 19696, Telefono Amico 02 2327 2327, emergenze 112. Anche tu come genitore potresti avere bisogno di supporto in quel momento — chiedere aiuto è un atto di cura, non di debolezza." },
      ]
    },
    genitore: {
      titolo: "Essere genitore di un adolescente",
      intro: "Non è più il momento di insegnare — è il momento di essere. La tua presenza silenziosa, la tua stabilità emotiva, la tua capacità di riparare dopo i conflitti sono gli strumenti più potenti che hai.",
      cards: [
        { icon: "🧭", titolo: "Da guida a punto di riferimento", testo: "Non sei più il centro del suo mondo — sei l'ancora. Non ti chiede di guidarlo ogni passo, ma di essere lì quando torna dalla tempesta. La tua stabilità emotiva — non le tue regole — è quello di cui ha bisogno." },
        { icon: "🤐", titolo: "Parlare meno, ascoltare di più", testo: "I lunghi monologhi genitoriali chiudono la comunicazione. Le domande aperte, il silenzio confortante, la risposta breve che non giudica — aprono. 'Come ti sei sentito?' vale più di 'Avresti dovuto...'." },
        { icon: "🔄", titolo: "Riparare dopo i conflitti", testo: "I conflitti con i genitori in adolescenza sono inevitabili e fisiologici. Quello che conta è la riparazione: 'Ieri ho reagito male, mi dispiace. Ti voglio bene anche quando sono arrabbiato'. Il [[ciclo rottura-riparazione|ciclo di rottura e riparazione]] insegna più del conflitto." },
        { icon: "📏", titolo: "Regole con senso", testo: "Le regole senza spiegazione vengono ignorate o aggirate. Le regole con ragionamento — 'ti chiedo di rientrare alle undici perché mi preoccupo per la tua sicurezza, non perché non mi fido di te' — vengono rispettate di più. Negoziate le regole: non dando vinto, ma ascoltando." },
        { icon: "👁️", titolo: "Monitoraggio senza controllo", testo: "Sapere dove si trova, chi frequenta, cosa fa online non è invasione — è responsabilità. Ma c'è differenza tra sapere e spiare. Il monitoraggio aperto ('come mai rientri così tardi?') costruisce responsabilità. Il controllo segreto (leggere i messaggi) distrugge la fiducia." },
        { icon: "❤️", titolo: "Dirti che gli vuoi bene", testo: "Sembra ovvio ma non lo è: dirglielo anche quando è difficile, anche dopo un litigio, anche quando fa fatica. 'Ti voglio bene' detto spesso, in modo autentico, è il fondamento su cui costruisce la sua sicurezza interna per tutta la vita." },
        { icon: "🫥", titolo: "Stare con il vuoto senza la fretta di risolverlo", testo: "Con un adolescente che sembra 'spento', la tentazione è riempire: proporre attività, dare consigli, cercare soluzioni. Ma [[Stern]] e [[Beebe]] ci hanno mostrato che la [[sintonizzazione affettiva]] — la capacità di rispondere a ciò che l'altro sente — è il motore dello sviluppo emotivo a ogni età. Winnicott parlava della capacità di essere soli in presenza di qualcuno. Per un adolescente che si sente disconnesso, sapere che il genitore c'è — senza invadere, senza interrogare — può essere l'esperienza relazionale più importante. Non è fare niente: è esserci." },
        { icon: "🌱", titolo: "Nutrire la vitalità: cose semplici che contano", testo: "Le relazioni che rispondono: l'attività condivisa senza agenda (cucinare, camminare, guidare) apre più porte di qualsiasi domanda diretta. [[Tronick]] ha mostrato che la regolazione emotiva si ripara attraverso i cicli di rottura e riparazione — non attraverso la perfezione dell'incontro. Le esperienze con senso: i ragazzi che contribuiscono a qualcosa riportano livelli più alti di benessere — non è il fare che conta, è sentire che ha un impatto. Il movimento fisico: tra gli interventi più efficaci per la regolazione dell'umore — quello che [[Stern]] chiamerebbe il recupero della vitalità attraverso la dimensione corporea." },
      ]
    }
  };

  const current = content[activeTab];

  return (
    <div style={{ background: COLORS.warmWhite, minHeight: "100vh" }}>

      {/* ── Hero centrato ── */}
      <div style={{
        background: "linear-gradient(160deg, #FBEAF2 0%, #FCDFD8 30%, #F9E8F8 65%, #E8E2F8 100%)",
        padding: isMobile ? "28px 16px 36px" : "36px 20px 48px",
        position: "relative", overflow: "hidden",
      }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: [220, 140, 100][i], height: [220, 140, 100][i],
            borderRadius: "50%",
            border: `1px solid rgba(255,255,255,${[0.05, 0.06, 0.07][i]})`,
            top: ["15%", "55%", "30%"][i],
            left: ["-3%", "82%", "60%"][i],
          }} />
        ))}
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <img
            src={ZONE_IMAGES["15-18"]}
            alt="15–18 anni"
            style={{ width: 80, height: 80, objectFit: "contain", display: "block", margin: "0 auto 10px" }}
          />
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: COLORS.deepSlate, fontSize: isMobile ? 24 : 32,
            fontWeight: 700, lineHeight: 1.2, margin: "0 0 6px",
          }}>{HERO_DATA["15-18"].title}</h1>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: isMobile ? 16 : 20, fontWeight: 400, fontStyle: "italic",
            background: `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.peach})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            margin: "0 0 14px",
          }}>{HERO_DATA["15-18"].accent}</p>
          <p style={{
            color: COLORS.slateLight, fontSize: isMobile ? 14 : 15, lineHeight: 1.65,
            fontFamily: "'Nunito', sans-serif", maxWidth: 520, margin: "0 auto",
          }}>{HERO_DATA["15-18"].desc}</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "32px 20px" : "44px 20px" }}>


        <p style={{
            fontFamily:  "'Nunito', sans-serif",
            fontSize:    isMobile ? 13 : 14,
            fontWeight:  700,
            color:       COLORS.slateLight,
            fontStyle:   "italic",
            textAlign:   "center",
            margin:      "0 0 8px",
            letterSpacing: "0.1px",
          }}>Cosa vuoi approfondire?</p>
        <div id="main-tab-bar" role="tablist" aria-label="Argomenti adolescenza" style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 32, padding: "0 4px" }}>
          {tabs.map(tab => (
            <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); scrollToTabBar(); }} style={{
              background: activeTab === tab.id ? `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})` : COLORS.goldLight,
              border: "none", borderRadius: 22, cursor: "pointer",
              padding: "9px 18px", whiteSpace: "nowrap",
              fontFamily: "'Nunito', sans-serif", fontSize: 14,
              color: activeTab === tab.id ? "white" : COLORS.deepSlate,
              fontWeight: activeTab === tab.id ? 700 : 500,
              transition: "all 0.2s", WebkitTapHighlightColor: "transparent", userSelect: "none",
            }}>{tab.label}</button>
          ))}
        </div>

        <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: COLORS.slateLight, fontSize: 16, marginBottom: 28, lineHeight: 1.65 }}>
          {current.intro}
        </p>
        <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: isMobile ? 20 : 24, marginBottom: 24 }}>{current.titolo}</h3>

        {activeTab === "cervello" && (
          <div style={{ marginBottom: 32 }}>
            <BrainInfographic zone="15-18" />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 16 }}>
          {current.cards.map((card, i) => (
            <div key={i} style={{ background: COLORS.warmWhite, borderRadius: 22, padding: 22, border: `1.5px solid ${COLORS.goldLight}`, borderLeft: `4px solid ${COLORS.gold}` }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{card.icon}</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 17, marginBottom: 8, lineHeight: 1.3 }}>{card.titolo}</h3>
              <p style={{ fontFamily: "'Nunito', sans-serif", color: "#3A3A2A", fontSize: 14, lineHeight: 1.72 }}>{parseLinks(card.testo)}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32 }}>
          <QuoteCard quote={QUOTES["bowlby_autonomia"]} />
        </div>
        <CrossLinks cards={[
          { emoji: "🖥️", label: "Schermi e tecnologia", desc: "Social, rischi digitali e autonomia a 15–18 anni", section: "screens", bg: COLORS.skyLight },
          { emoji: "📚", label: "La scienza dietro", desc: "Neuroscienze e psicologia dell'identità", section: "library", bg: COLORS.mintLight },
          { emoji: "✨", label: "Capire il tuo adolescente", desc: "Strumenti per accompagnarlo con più consapevolezza", section: "checklist", bg: COLORS.goldLight },
        ]} />
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 32 }}>
          <button onClick={() => { if (_globalSetSection) _globalSetSection("checklist"); }} style={{
            background: `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.roseDark})`,
            color: "white", border: "2px solid rgba(255,150,180,0.4)", borderRadius: 50,
            padding: "13px 28px", fontSize: 15,
            fontFamily: "'Nunito', sans-serif", cursor: "pointer",
            fontWeight: 800, minHeight: 50,
            animation: "rose-pulse 2s ease-in-out infinite",
            letterSpacing: "0.2px",
          }}>✨ Capire il mio adolescente</button>
          <button onClick={() => { if (_globalSetSection) _globalSetSection("genitori"); }} style={{
            background: `linear-gradient(135deg, ${COLORS.lavender}, #7060A0)`,
            color: "white", border: "2px solid rgba(180,160,230,0.4)", borderRadius: 50,
            padding: "13px 28px", fontSize: 15,
            fontFamily: "'Nunito', sans-serif", cursor: "pointer",
            fontWeight: 800, minHeight: 50,
            animation: "lavender-pulse 2s ease-in-out infinite",
            letterSpacing: "0.2px",
          }}>💛 Come sto tenendo il filo?</button>
        </div>
        <SuggerimentoButton />
      </div>
    </div>
  );
}


const GEN_RISORSE = {
  servizi: [
    { icon: "📞", title: "Telefono Azzurro — Linea Adulti (19696)", text: "Linea gratuita h24 di ascolto e consulenza per genitori in difficoltà. Non serve essere in emergenza per chiamare.", url: "https://azzurro.it/adulti/" },
    { icon: "🗺️", title: "Ministero della Salute — Consultori familiari", text: "Mappa nazionale dei consultori familiari: supporto psicologico, educativo e sociale gratuito sul territorio.", url: "https://www.salute.gov.it/new/it/tema/salute-riproduttiva/mappa-consultori/" },
  ],
  footer: [
    { label: "SIP — Sezione Genitori (risorse divulgative per famiglie)", url: "https://sip.it/genitori/" },
    { label: "Roskam, Raes & Mikolajczak — 'Exhausted Parents' (2017), Developmental Psychology", url: null },
    { label: "Winnicott — 'The Maturational Processes and the Facilitating Environment' (1965)", url: null },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   💛  GENITORI PAGE — Sezione dedicata al benessere del genitore
   Difficoltà + punti di forza + profilo AI focalizzato sull'adulto
═══════════════════════════════════════════════════════════════ */
function GenitoriPage({ zone }) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  const [selectedDiff, setSelectedDiff] = useState([]);
  const [selectedStr, setSelectedStr] = useState([]);
  const [diagnosis, setDiagnosis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef(null);
  const [showIntro, setShowIntro] = useState(true);

  const ZONE_LABELS = {
    "gravidanza": "🤰 Gravidanza", "0-3": "🌱 0–3 anni", "3-6": "🌸 3–6 anni",
    "6-12": "🌟 6–12 anni", "12-15": "🌊 12–15 anni", "15-18": "✨ 15–18 anni",
  };
  const currentZoneLabel = zone ? ZONE_LABELS[zone] : null;

  const introCards = [
    { icon: "🔋", title: "La fatica invisibile",
      text: "Ci sono giorni in cui la stanchezza non è solo fisica — è qualcosa di più profondo, che ha a che fare con il sentirsi svuotati dal ruolo stesso di genitore. La ricerca lo chiama burnout genitoriale (Roskam & Mikolajczak, 2018): un esaurimento specifico, diverso da quello lavorativo, che non dipende da quanto ami i tuoi figli ma da quanto a lungo la fatica supera le risorse disponibili. Non è un fallimento. È un segnale che merita ascolto." },
    { icon: "📱", title: "Il confronto che logora",
      text: "Scorrere i social e vedere genitori sorridenti, case ordinate, bambini sereni può far sentire inadeguati. Ma quel confronto avviene con versioni curate e selezionate della vita degli altri — nessuno posta le notti insonni o i momenti in cui ha alzato la voce. Il confronto sociale è un meccanismo umano, ma quando diventa l'unico metro di misura della propria genitorialità, logora. Il tuo valore come genitore non si misura a confronto con nessuno." },
    { icon: "🌿", title: "Il genitore perfetto non esiste",
      text: "Winnicott lo ha detto con una formula diventata celebre: basta essere 'sufficientemente buoni'. Non perfetti — sufficientemente presenti, sufficientemente capaci di riparare quando si sbaglia. E la riparazione è la parola chiave: il genitore che riconosce l'errore e lo ripara costruisce nel figlio più sicurezza di quello che non sbaglia mai. L'obiettivo non è non cadere — è rialzarsi insieme." },
    { icon: "🪞", title: "A volte la difficoltà non riguarda il figlio",
      text: "Non sempre la fatica che senti come genitore nasce da qualcosa che tuo figlio fa o non fa. A volte arriva dalla tua storia — dalle aspettative che hai interiorizzato, dalla solitudine del ruolo, da emozioni che la genitorialità risveglia e che vengono da lontano. Fraiberg li chiamava 'fantasmi nella nursery': esperienze della propria infanzia che si riattivano quando si diventa genitori. Riconoscerli non è debolezza — è il primo passo per non trasmetterli." },
  ];

  const activeItems = step === 1 ? DIFFICULTIES_GENITORI : STRENGTHS_GENITORI;
  const activeSelected = step === 1 ? selectedDiff : selectedStr;
  const categories = [...new Set(activeItems.map(d => d.category))];

  const toggle = id => {
    if (step === 1) setSelectedDiff(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    else setSelectedStr(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const resetAll = () => { setStep(1); setSelectedDiff([]); setSelectedStr([]); setDiagnosis(""); setError(""); };

  const analyze = async () => {
    setLoading(true); setDiagnosis(""); setError("");
    const diffLabels = selectedDiff.map(id => DIFFICULTIES_GENITORI.find(d => d.id === id)?.label).filter(Boolean);
    const strLabels = selectedStr.map(id => STRENGTHS_GENITORI.find(d => d.id === id)?.label).filter(Boolean);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          max_tokens: 1200,
          system: `Sei un clinico specializzato nel benessere genitoriale e nella psicologia della genitorialità. Hai competenze in psicoterapia sistemica, attaccamento adulto (Bowlby, Main), burnout genitoriale (Roskam, Mikolajczak), psicologia del sé (Kohut), genitorialità consapevole e presenza emotiva. Parli con calore, rispetto e concretezza. Non giudichi, non moralizzi.

Il genitore che parla con te non sta descrivendo il figlio — sta descrivendo SE STESSO. Questo è fondamentale. Il tuo compito è:
- Riconoscere e normalizzare la fatica del genitore senza minimizzarla
- Spiegare il substrato psicologico delle sue difficoltà
- Valorizzare i suoi punti di forza come risorse reali
- Offrire strumenti concreti per il suo benessere — non solo per aiutare il figlio, ma per stare bene lui/lei

REGOLA DI TONO NELL'APERTURA (applica sempre):
Non parlare mai in prima persona emotiva (es. "Sento la tua fatica", "Capisco quanto sia difficile"). Sei un sistema AI: non simuli empatia soggettiva. Apri sempre ancorandoti ai dati selezionati (es. "Dalle risposte che hai indicato emerge…", "Le aree che hai segnalato mostrano…"). Nel corpo della risposta usa la seconda persona diretta con calore ("Stai attraversando…", "La fase che stai vivendo…") o il noi inclusivo ("Possiamo osservare che…"). Mai toni da referto né finzioni emotive.

REGOLA ANTI-RIDONDANZA (applica sempre prima di scrivere):
Raggruppa le selezioni che si riferiscono allo stesso nucleo psicologico. Ad esempio: stanchezza cronica + non dormo da mesi + mi sento al limite sono tutte espressioni di esaurimento/burnout — trattale come un unico tema. Senso di colpa + mi confronto con altri genitori + ho paura di sbagliare sono tutte espressioni di insicurezza genitoriale — un unico tema. Identifica massimo 2-3 nuclei per le difficoltà e 2-3 per i punti di forza. Non ripetere la stessa spiegazione per item diversi che hanno la stessa radice. Se le selezioni sono poche (1-3), trattale individualmente.

Struttura la risposta così:

## 💛 Quello che stai vivendo — riconosciuto
Nomina le difficoltà senza giudizio. Normalizza con dati (es. il burnout genitoriale riguarda il X% dei genitori). Riconosci la fatica con rispetto, senza simulare di averla vissuta.

## 🧠 Cosa ci dicono la psicologia e la scienza
Spiega il substrato psicologico delle sue difficoltà specifiche. Cita ricercatori reali.

## 🌿 Le tue risorse — come usarle per stare meglio
Descrivi come i suoi punti di forza sono risorse concrete per affrontare le difficoltà che vive. Specifico, non generico.

## ✨ 3 cose che puoi fare per te — adesso
Pratiche concrete, realizzabili, basate sulla ricerca. Focalizzate sul benessere del GENITORE, non del figlio.

## 🤝 Quando il supporto professionale è utile
Senza allarmismi. Breve.

Rispondi in italiano, tono caldo e diretto. Massimo 600 parole.`,
          messages: [{ role: "user", content: `Sono un genitore${zone ? ` con un figlio nella fascia ${ZONE_LABELS[zone] || zone}` : ""}.

DIFFICOLTÀ che sto vivendo: ${diffLabels.length > 0 ? diffLabels.join(", ") : "nessuna selezionata"}.

I miei PUNTI DI FORZA come genitore: ${strLabels.length > 0 ? strLabels.join(", ") : "nessuno selezionato"}.` }]
        })
      });
      const data = await res.json();
      if (data.content?.[0]?.text) {
        setDiagnosis(data.content[0].text);
        setStep(3);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      } else {
        const detail = data.error?.message || data.error || JSON.stringify(data).slice(0, 300);
        const isKey = detail.toLowerCase().includes("key") || detail.toLowerCase().includes("401");
        setError(isKey ? "❌ API Key non valida. Verifica la chiave API Groq nelle variabili d'ambiente di Vercel." : "Errore: " + detail);
      }
    } catch (e) {
      if (e.name === "AbortError") setError("⏳ La risposta sta impiegando troppo — riprova tra qualche istante.");
      else setError("Errore di connessione: " + e.message);
    } finally { clearTimeout(timeoutId); }
    setLoading(false);
  };

  // Step indicator
  const steps3 = [
    { n: 1, label: "Le difficoltà", icon: "🚧" },
    { n: 2, label: "I tuoi punti di forza", icon: "✨" },
    { n: 3, label: "Il tuo profilo", icon: "💛" },
  ];

  return (
    <div style={{ background: "#FFFCFA", minHeight: "100vh" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "32px 20px" : "44px 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          {/* AI Disclaimer */}
          <AIDisclaimer variant="genitore" />
          <div style={{ marginBottom: 8 }}><SuggerimentoButton compact /></div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: COLORS.roseLight, color: COLORS.roseDark, borderRadius: 50, padding: "6px 16px", fontSize: 13, fontWeight: 800 }}>
              💛 Sezione dedicata a te
            </div>
            {currentZoneLabel && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.warmWhite, border: `1.5px solid ${COLORS.roseLight}`, color: COLORS.slateLight, borderRadius: 50, padding: "6px 14px", fontSize: 12, fontWeight: 700 }}>
                Fascia attiva: <strong style={{ color: COLORS.deepSlate }}>{currentZoneLabel}</strong>
              </div>
            )}
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: isMobile ? 26 : 34, marginBottom: 8, lineHeight: 1.2 }}>
            {step === 1 ? "Come stai tu, genitore?" : step === 2 ? "✨ Le tue risorse" : "💛 Il tuo profilo"}
          </h2>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 15, lineHeight: 1.75 }}>
            {step === 1 ? "Questa sezione è per te — non per tuo figlio. Seleziona le difficoltà che stai vivendo come genitore." :
             step === 2 ? "Ora seleziona i punti di forza che riconosci in te come genitore. Sono le risorse reali da cui partire." :
             "Il tuo profilo — basato sulle difficoltà e le risorse che hai condiviso."}
          </p>
        </div>

        {/* ── Card introduttive — accoglienza pre-checklist ── */}
        {step < 3 && (
          <div style={{ marginBottom: 28 }}>
            <button onClick={() => setShowIntro(v => !v)} style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700,
              color: COLORS.slateLight, padding: "4px 0", marginBottom: showIntro ? 14 : 0,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 15 }}>💛</span>
              {showIntro ? "▲ Nascondi" : "▾ Prima di iniziare — leggi con calma"}
            </button>
            {showIntro && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 14 }}>
                {introCards.map((c, i) => (
                  <div key={i} style={{
                    background: COLORS.warmWhite, borderRadius: 22, padding: "18px 20px",
                    border: `1.5px solid ${COLORS.roseLight}`, borderLeft: `4px solid ${COLORS.rose}`,
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 10 }}>{c.icon}</div>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 16, marginBottom: 8, lineHeight: 1.3 }}>{c.title}</h3>
                    <p style={{ fontFamily: "'Nunito', sans-serif", color: "#4A3A4A", fontSize: 13.5, lineHeight: 1.72, margin: 0 }}>{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
          {steps3.map((s, i) => (
            <div key={s.n} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: step >= s.n ? `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.peach})` : COLORS.roseLight,
                  color: step >= s.n ? "white" : COLORS.slateLight,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17, fontWeight: 700, transition: "all 0.3s",
                  boxShadow: step >= s.n ? "0 4px 18px rgba(212,68,122,0.45), 0 1px 0 rgba(255,255,255,0.25) inset" : "none",
                }}>{step > s.n ? "✓" : s.icon}</div>
                <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: step >= s.n ? COLORS.deepSlate : COLORS.slateLight, fontWeight: step === s.n ? 800 : 400, textAlign: "center" }}>{s.label}</span>
              </div>
              {i < 2 && <div style={{ height: 2, flex: 1, background: step > s.n ? COLORS.rose : COLORS.roseLight, marginBottom: 22, transition: "all 0.3s" }} />}
            </div>
          ))}
        </div>

        {/* Checklist items */}
        {step < 3 && categories.map(cat => {
          const catItems = activeItems.filter(d => d.category === cat);
          const catStyle = CATEGORY_COLORS[cat] || { bg: COLORS.roseLight, text: COLORS.roseDark };
          return (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div style={{ display: "inline-block", background: catStyle.bg, color: catStyle.text, borderRadius: 8, padding: "4px 14px", fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 800, marginBottom: 10, letterSpacing: 0.5 }}>{cat}</div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {catItems.map(d => (
                  <button key={d.id} aria-pressed={activeSelected.includes(d.id)} onClick={() => toggle(d.id)} style={{
                    background: activeSelected.includes(d.id) ? (step === 1 ? `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.peach})` : `linear-gradient(135deg, ${COLORS.mint}, ${COLORS.olive})`) : "white",
                    border: activeSelected.includes(d.id) ? `2px solid ${step === 1 ? COLORS.rose : COLORS.mint}` : `2px solid ${COLORS.roseLight}`,
                    borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
                    cursor: "pointer", transition: "all 0.2s", textAlign: "left",
                    minHeight: 52, WebkitTapHighlightColor: "transparent",
                  }}>
                    <span style={{ fontSize: 18 }}>{d.icon}</span>
                    <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, lineHeight: 1.4, color: activeSelected.includes(d.id) ? "white" : COLORS.deepSlate, fontWeight: activeSelected.includes(d.id) ? 700 : 400 }}>{d.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* CTA step 1 */}
        {step === 1 && (
          <div style={{ textAlign: "center", margin: "36px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontSize: 14 }}>{selectedDiff.length} difficoltà selezionate</div>
            <button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={selectedDiff.length === 0}
              style={{ background: selectedDiff.length === 0 ? "#E0D0D8" : `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.peach})`, color: "white", border: "none", borderRadius: 50, padding: isMobile ? "16px 32px" : "18px 48px", fontSize: 16, fontFamily: "'Nunito', sans-serif", fontWeight: 800, cursor: selectedDiff.length === 0 ? "not-allowed" : "pointer", touchAction: "manipulation", WebkitTapHighlightColor: "transparent", boxShadow: selectedDiff.length > 0 ? "0 8px 28px rgba(212,68,122,0.3)" : "none", minHeight: 54, transition: "all 0.2s" }}>
              Continua → I miei punti di forza ✨
            </button>
            <button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{ background: "none", border: "none", color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
              Salta — vai direttamente ai punti di forza →
            </button>
          </div>
        )}

        {/* CTA step 2 */}
        {step === 2 && (
          <div style={{ textAlign: "center", margin: "36px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontSize: 14 }}>{selectedStr.length} punti di forza selezionati</div>
            <button onClick={analyze} disabled={loading}
              style={{ background: `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.lavender})`, color: "white", border: "none", borderRadius: 50, padding: isMobile ? "16px 32px" : "18px 48px", fontSize: 16, fontFamily: "'Nunito', sans-serif", fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 28px rgba(212,68,122,0.3)", minHeight: 54 }}>
              {loading ? "⏳ Analisi in corso..." : "💛 Analizza il mio profilo come genitore"}
            </button>
            <button onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{ background: "none", border: "none", color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
              ← Torna alle difficoltà
            </button>
          </div>
        )}

        {error && <div style={{ background: "#FFE5E5", borderRadius: 16, padding: 20, marginBottom: 20, color: "#C0392B", fontFamily: "'Nunito', sans-serif", fontSize: 15, lineHeight: 1.7 }}>{error}</div>}

        {/* Result step 3 */}
        {step === 3 && (
          <div ref={resultRef}>
            {/* Summary chips */}
            <div style={{ background: COLORS.warmWhite, borderRadius: 18, padding: 18, marginBottom: 20, border: `1.5px solid ${COLORS.roseLight}` }}>
              {selectedDiff.length > 0 && (
                <div style={{ marginBottom: selectedStr.length > 0 ? 12 : 0 }}>
                  <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 800, color: COLORS.slateLight }}>🚧 Le tue difficoltà</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {selectedDiff.map(id => {
                      const d = DIFFICULTIES_GENITORI.find(x => x.id === id);
                      return d ? <span key={id} style={{ background: COLORS.roseLight, color: COLORS.roseDark, borderRadius: 20, padding: "4px 12px", fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 600 }}>{d.icon} {d.label}</span> : null;
                    })}
                  </div>
                </div>
              )}
              {selectedStr.length > 0 && (
                <div>
                  <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 800, color: COLORS.slateLight }}>✨ I tuoi punti di forza</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {selectedStr.map(id => {
                      const s = STRENGTHS_GENITORI.find(x => x.id === id);
                      return s ? <span key={id} style={{ background: "#E4F4EC", color: "#2A6A3A", borderRadius: 20, padding: "4px 12px", fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 600 }}>{s.icon} {s.label}</span> : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: COLORS.warmWhite, borderRadius: 24, padding: isMobile ? "20px 16px" : 34, border: `1.5px solid ${COLORS.roseLight}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, paddingBottom: 18, borderBottom: `1px solid ${COLORS.roseLight}` }}>
                <div style={{ fontSize: 32 }}>💛</div>
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 19, margin: 0, marginBottom: 3 }}>Il tuo profilo come genitore</h3>
                  <p style={{ color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontSize: 14, margin: 0, fontStyle: "italic" }}>Analisi basata su difficoltà e risorse personali</p>
                </div>
              </div>
              <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, lineHeight: 1.85 }}>{renderMarkdownJSX(diagnosis, { headingColor: "#2A1F2E", badgeColor: "#D4447A" })}</div>
              <div style={{ marginTop: 22, padding: "14px 18px", background: COLORS.roseLight, border: `1px solid ${COLORS.rose}`, borderRadius: 12, fontFamily: "'Nunito', sans-serif", fontSize: 13, color: COLORS.roseDark }}>
                <strong>⚕️ Avviso:</strong> questa risposta ha scopo esclusivamente informativo. Non costituisce diagnosi né consulenza clinica. Se senti il bisogno di un confronto più approfondito, rivolgiti a uno specialista: il tuo pediatra, il consultorio familiare o uno psicologo dell'età evolutiva sono risorse preziose e accessibili.
              </div>
            </div>

            <div style={{ textAlign: "center", margin: "28px 0" }}>
              <button onClick={resetAll} style={{ background: `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.peach})`, color: "white", border: "none", borderRadius: 50, padding: "14px 36px", fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 18px rgba(212,68,122,0.3)" }}>
                🔄 Ricomincia
              </button>
            </div>
          </div>
        )}

        {/* ── Quote Winnicott — chiusura sezione genitori ── */}
        <QuoteCard quote={QUOTES["winnicott_buoni_genitori"]} style={{ marginTop: 36, marginBottom: 8 }} />

        {/* Disclaimers */}
        <div style={{ background: COLORS.goldLight, border: `1.5px solid ${COLORS.gold}`, borderRadius: 16, padding: "14px 18px", marginTop: 36, marginBottom: 12 }}>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: "#7A5A00", fontSize: 13 }}>⚕️ Avviso clinico</span>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 13, lineHeight: 1.7, margin: "6px 0 0" }}>
            Le risposte sono generate da un'intelligenza artificiale e hanno scopo informativo. Non sostituiscono il supporto di uno psicologo. Se senti di averne bisogno, rivolgiti a uno specialista della salute mentale.
          </p>
        </div>
        <div style={{ background: "#F0F7FF", border: "1px solid #B8D8F8", borderRadius: 12, padding: "10px 16px", marginBottom: 8 }}>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: "#1A4A7A", fontSize: 13, lineHeight: 1.65, margin: 0 }}>
            🔒 <strong>Privacy:</strong> il testo che selezioni viene inviato al servizio Groq (llama-3.3-70b-versatile) per generare la risposta e non viene conservato.
          </p>
        </div>

        {/* Risorse per famiglie */}
        <div style={{ marginTop: 36, marginBottom: 8 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 22, marginBottom: 8 }}>
            📋 Supporto e risorse
          </h3>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 14, fontStyle: "italic", marginBottom: 16 }}>
            A chi rivolgersi sul territorio
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {GEN_RISORSE.servizi.map((srv, i) => (
              <a key={i} href={srv.url} target="_blank" rel="noopener noreferrer" style={{
                background: "white", borderRadius: 18, border: "1.5px solid rgba(0,0,0,0.06)",
                padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start",
                textDecoration: "none", color: "inherit", cursor: "pointer",
                transition: "border-color 0.18s, box-shadow 0.18s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.rose; e.currentTarget.style.boxShadow = "0 2px 12px rgba(212,68,122,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>{srv.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: COLORS.deepSlate, fontSize: 14, marginBottom: 4 }}>{srv.title}</div>
                  <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 13, lineHeight: 1.7 }}>{srv.text}</div>
                </div>
                <span style={{ fontSize: 14, color: COLORS.rose, flexShrink: 0, marginTop: 2 }}>↗</span>
              </a>
            ))}
          </div>
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: COLORS.slateLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Riferimenti scientifici</p>
            {GEN_RISORSE.footer.map((ref, i) => ref.url ? (
              <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer" style={{
                display: "block", fontFamily: "'Nunito', sans-serif", fontSize: 12,
                color: COLORS.slateLight, textDecoration: "underline", textUnderlineOffset: 2,
                marginBottom: 4, lineHeight: 1.5,
              }}>{ref.label}</a>
            ) : (
              <span key={i} style={{
                display: "block", fontFamily: "'Nunito', sans-serif", fontSize: 12,
                color: COLORS.slateLight, marginBottom: 4, lineHeight: 1.5,
              }}>{ref.label}</span>
            ))}
          </div>
        </div>

        <CrossLinks cards={[
          { emoji: "📚", label: "La scienza dietro", desc: "Neuroscienze e attaccamento per genitori", section: "library", bg: COLORS.mintLight },
          { emoji: "📖", label: "Glossario", desc: "Termini psicologici spiegati con semplicità", section: "glossario", bg: COLORS.lavenderLight },
        ]} />

      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   🤰  GRAVIDANZA PAGE — In attesa del bambino
═══════════════════════════════════════════════════════════════ */
const GRAV_RISORSE = {
  servizi: [
    { icon: "📋", title: "Ministero della Salute — Agenda della gravidanza", text: "Guida ufficiale ai controlli, agli esami e ai diritti durante la gravidanza. Tutto quello che il SSN prevede, spiegato chiaramente.", url: "https://www.salute.gov.it/portale/donna/dettaglioContenutiDonna.jsp?lingua=italiano&id=4547&area=Salute+donna&menu=gravidanza" },
    { icon: "📞", title: "Telefono Rosa — 1522", text: "Numero gratuito h24 per supporto e orientamento. Utile anche in gravidanza per situazioni di difficoltà, pressione o violenza domestica. Non serve essere in emergenza per chiamare.", url: "https://www.telefono-rosa.it/" },
  ],
  footer: [
    { label: "SIP — Allattamento e salute mentale materna (Position Statement TAS 2023)", url: "https://sip.it/2024/05/07/allattamento-e-salute-mentale-materna/" },
    { label: "OMS — Breastfeeding (raccomandazioni internazionali)", url: "https://www.who.int/health-topics/breastfeeding" },
  ],
};

function GravidanzaPage() {
  const isMobile = useIsMobile();
  const [openSection, setOpenSection] = useState(null);
  const [activeTab, setActiveTab] = useState(() => { const t = _glossaryReturnTab; _glossaryReturnTab = null; return t || "emozioni"; });
  useEffect(() => { _globalCurrentTab = activeTab; _globalCurrentPhase = null; }, [activeTab]);

  const tabs = [
    { id: "emozioni",  label: "💛 Come ti senti" },
    { id: "trimestri", label: "🌱 I tre trimestri" },
    { id: "lista",     label: "🛍️ Lista nascita" },
    { id: "coppia",    label: "👫 La coppia" },
    { id: "tips",      label: "✨ Consigli pratici" },
    { id: "cura",      label: "🌿 Prenditi cura di te" },
  ];

  const emozioni = [
    { icon: "🎢", title: "Le montagne russe emotive sono normali",
      text: "Gioia intensa, poi ansia improvvisa, poi tenerezza infinita — tutto nello stesso giorno. Non sei strana: stai attraversando uno dei cambiamenti identitari più profondi della vita. Il cervello si riorganizza durante la gravidanza (Hoekzema et al., Nature Neuroscience 2017) per prepararsi alla maternità." },
    { icon: "😰", title: "'Sarò capace?' — La paura più comune",
      text: "Nei forum italiani questa è la domanda più condivisa. La ricerca risponde: la paura di non essere all'altezza è un segnale che il lavoro psicologico verso la genitorialità sta iniziando. Non indica incapacità — indica responsabilità. La 'preoccupazione materna primaria' di [[Winnicott]] è il primo atto d'amore." },
    { icon: "💔", title: "L'ambivalenza non è un difetto",
      text: "Desiderare il bambino e aver paura dei cambiamenti sono emozioni che coesistono normalmente. La società racconta la gravidanza solo come 'dolce attesa' — ma i forum mostrano la realtà: malinconia per la vita di prima, ansia per il futuro, stanchezza del corpo che cambia. Tutto normale, tutto da condividere." },
    { icon: "🪞", title: "Quando l'emozione viene da lontano",
      text: "Ogni gravidanza risveglia emozioni dell'essere stati bambini. A volte la paura, la tristezza o l'angoscia che si provano non riguardano solo il presente — sono tracce di esperienze precoci che si riattivano. Fraiberg li ha chiamati [[Fantasmi nella nursery]]: i ricordi dolorosi non elaborati dei propri genitori che si ripresentano quando si diventa genitori a propria volta. Riconoscerli non è un segno di fragilità — è il primo passo per impedire che si trasmettano. Parlarne con uno psicologo perinatale può trasformare questi fantasmi in una risorsa di consapevolezza." },
    { icon: "🌊", title: "Il corpo che cambia e l'identità",
      text: "Non riconoscersi allo specchio genera disorientamento reale. Il passaggio da donna a madre-e-donna richiede un lavoro psicologico attivo. Chi aveva un'identità professionale forte può sperimentare conflitti intensi tra i due ruoli." },
    { icon: "👫", title: "La coppia come risorsa",
      text: "L'arrivo di un figlio richiede una rinegoziazione completa della coppia: tempi, spazi, ruoli, sessualità. Le coppie che parlano apertamente di queste trasformazioni durante la gravidanza affrontano la nuova fase con più strumenti. Non aspettate che le tensioni emergano da sole." },
    { icon: "🤝", title: "Non farlo da sola",
      text: "I corsi preparto non servono solo per respirare durante il travaglio: sono il luogo in cui si incontra il normale turbamento dell'attesa. Le ostetriche, i consultori familiari, i gruppi di mamme sono risorse concrete. Chiedere aiuto durante la gravidanza è un atto di cura, non una debolezza." },
  ];

  const trimestri = [
    { n: "1°", settimane: "1–13 settimane", icon: "🌱", color: COLORS.mint,
      titolo: "Il tempo del segreto",
      corpo: "Nausea, stanchezza intensa, seno sensibile. Il corpo cambia prima ancora che la pancia si veda. Molti genitori aspettano per annunciarlo — nel frattempo si naviga da soli un mondo cambiato.",
      cervello: "Il cervello materno inizia a riorganizzarsi. La [[corteccia prefrontale]] si modifica per aumentare la sintonizzazione con il bambino. È un processo involontario e meraviglioso.",
      psiche: "Ambivalenza intensa: incredulità, paura, gioia alternata ad ansia. È il trimestre in cui la perdita è statisticamente più frequente — il che amplifica l'ansia. Parlarne aiuta. A volte le emozioni più intense non vengono dalla gravidanza in sé, ma dalla propria storia: sono i [[Fantasmi nella nursery]] di Fraiberg — esperienze infantili che si riattivano quando si diventa genitori. Riconoscerli è già un atto di cura.",
      consigli: ["Non sentirti in colpa se non ti senti felice ogni giorno.", "L'acido folico è fondamentale: inizialo prima del concepimento se possibile.", "Evita alcol e fumo. Per qualsiasi farmaco, chiedi sempre al ginecologo.", "Il sonno è una priorità, non un lusso."] },
    { n: "2°", settimane: "14–27 settimane", icon: "🌸", color: COLORS.rose,
      titolo: "Il tempo del fiore",
      corpo: "La nausea di solito passa. La pancia inizia a vedersi. E poi — il primo calcio. Quel momento cambia tutto: il bambino immaginario diventa reale.",
      cervello: "Il bambino sviluppa le prime connessioni sensoriali. Sente la voce della madre, risponde ai suoni, si muove in risposta agli stimoli. È già in comunicazione.",
      psiche: "Spesso il trimestre più sereno. L'identità materna si consolida. Le fantasie sul bambino diventano più specifiche. Nascono i primi dialoghi con il bambino nel pancione.",
      consigli: ["Parla con il tuo bambino: sentirà la tua voce e imparerà a riconoscerla.", "Scegli il nome con calma: è un atto identitario importante.", "Pensa al congedo di maternità e ai supporti pratici.", "Comincia a organizzare la cameretta — ma senza frenesia."] },
    { n: "3°", settimane: "28–40 settimane", icon: "🌟", color: COLORS.gold,
      titolo: "Il tempo dell'attesa",
      corpo: "Il corpo è impegnato, muoversi diventa faticoso, dormire pure. Il bambino prende spazio — fisico e mentale. La data si avvicina e l'attesa diventa quasi insopportabile.",
      cervello: "Il cervello del feto accumula connessioni neurali a ritmo vertiginoso. La [[mielinizzazione]] inizia. Il sistema del sonno e della veglia si organizza.",
      psiche: "Paura del parto (normale e fisiologica), voglia di conoscere il bambino, stanchezza. È il momento di prepararsi al grande incontro: il bambino reale sarà diverso da quello immaginato — e va benissimo così.",
      consigli: ["Prepara la valigia per l'ospedale entro il 7° mese.", "Fai il piano del parto ma tienilo flessibile.", "Parla apertamente con il partner dei primi giorni a casa.", "Chiedi supporto pratico per le prime settimane."] },
  ];

  const listaNascita = [
    { categoria: "🛏️ La cameretta", items: ["Culla sidecar o next-to-me — vicini senza stare tutti nel lettone. Comoda per le poppate notturne, sicura per il sonno", "Materasso rigido certificato + coprimaterasso impermeabile", "Fasciatoio con bordatura di sicurezza", "Baby monitor — indispensabile per dormire tranquilli", "Umidificatore — protegge le vie respiratorie nelle prime settimane", "Lampada notturna soffusa per i cambi di notte"] },
    { categoria: "🚗 Mobilità", items: ["Seggiolino auto gruppo 0+ — OBBLIGATORIO per uscire dall'ospedale", "Trio passeggino (navicella + ovetto + carrozzina) — il più versatile", "Fascia portabebè — insostituibile per la calma del bambino nei primi mesi", "Borsa fasciatoio capiente — accompagna ogni uscita per anni"] },
    { categoria: "🛁 Igiene e cura", items: ["Vaschetta per il bagnetto + termometro acqua", "Prodotti igiene certificati per neonati: shampoo, crema cambio, salviette", "Aspiratore nasale — salva le notti durante i primi raffreddori", "Termometro digitale rettale (il più preciso nei primi 3 mesi)", "Pinzette unghie — le loro unghie crescono velocissime"] },
    { categoria: "🍼 Alimentazione", items: ["Cuscino da allattamento — salva la schiena in settimane di poppate", "Tiralatte (elettrico se pensi di allattare a lungo) — valuta il noleggio", "2–3 biberon in vetro anche se allatti — servono sempre", "Sterilizzatore — obbligatorio per i biberon", "Una confezione di latte artificiale di riserva — senza senso di colpa"] },
    { categoria: "👕 Abbigliamento", items: ["Body con apertura snap sotto + apertura sulla spalla (per le emergenze)", "Tutine aperte davanti (detti 'antipanico') — salvano la sanità mentale", "Almeno 8 body + 6 tutine per taglia 0-3 mesi", "Sacco nanna al posto di coperte (riduce rischio sindrome della morte improvvisa del lattante (SIDS))", "Non comprare troppo: crescono velocissimo e ricevete tantissimi regali"] },
    { categoria: "💊 Salute", items: ["Vitamina D in gocce — prescritta dal pediatra dalla prima settimana", "Acido folico per la mamma fino alla fine dell'allattamento", "Numero del pediatra di fiducia salvato nel telefono PRIMA della nascita", "Prenota la visita con il pediatra entro la prima settimana"] },
  ];

  return (
    <div style={{ background: COLORS.warmWhite, minHeight: "100vh" }}>

      {/* ── Hero centrato ── */}
      <div style={{
        background: "linear-gradient(160deg, #FBEAF2 0%, #FCDFD8 30%, #F9E8F8 65%, #E8E2F8 100%)",
        padding: isMobile ? "28px 16px 36px" : "36px 20px 48px",
        position: "relative", overflow: "hidden",
      }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: [220, 140, 100][i], height: [220, 140, 100][i],
            borderRadius: "50%",
            border: `1px solid rgba(255,255,255,${[0.05, 0.06, 0.07][i]})`,
            top: ["15%", "55%", "30%"][i],
            left: ["-3%", "82%", "60%"][i],
          }} />
        ))}
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <img
            src={ZONE_IMAGES["gravidanza"]}
            alt="Gravidanza"
            style={{ width: 80, height: 80, objectFit: "contain", display: "block", margin: "0 auto 10px" }}
          />
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: COLORS.deepSlate, fontSize: isMobile ? 24 : 32,
            fontWeight: 700, lineHeight: 1.2, margin: "0 0 6px",
          }}>{HERO_DATA["gravidanza"].title}</h1>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: isMobile ? 16 : 20, fontWeight: 400, fontStyle: "italic",
            background: `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.peach})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            margin: "0 0 14px",
          }}>{HERO_DATA["gravidanza"].accent}</p>
          <p style={{
            color: COLORS.slateLight, fontSize: isMobile ? 14 : 15, lineHeight: 1.65,
            fontFamily: "'Nunito', sans-serif", maxWidth: 520, margin: "0 auto",
          }}>{HERO_DATA["gravidanza"].desc}</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "32px 20px" : "44px 20px" }}>


        <p style={{
            fontFamily:  "'Nunito', sans-serif",
            fontSize:    isMobile ? 13 : 14,
            fontWeight:  700,
            color:       COLORS.slateLight,
            fontStyle:   "italic",
            textAlign:   "center",
            margin:      "0 0 8px",
            letterSpacing: "0.1px",
          }}>Cosa vuoi approfondire?</p>
        <div id="main-tab-bar" role="tablist" aria-label="Argomenti gravidanza" style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 32, padding: "0 4px" }}>
          {tabs.map(tab => (
            <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); scrollToTabBar(); }} style={{
              background: activeTab === tab.id ? `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.peach})` : COLORS.roseLight,
              border: "none", borderRadius: 22, cursor: "pointer",
              padding: "9px 18px", whiteSpace: "nowrap",
              fontFamily: "'Nunito', sans-serif", fontSize: 14,
              color: activeTab === tab.id ? "white" : COLORS.deepSlate,
              fontWeight: activeTab === tab.id ? 700 : 500,
              transition: "all 0.2s", WebkitTapHighlightColor: "transparent", userSelect: "none",
            }}>{tab.label}</button>
          ))}
        </div>

        {activeTab === "emozioni" && (
          <div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: COLORS.slateLight, fontSize: 16, marginBottom: 24, lineHeight: 1.65 }}>
              "Mesi di attese, sogni, speranze — scanditi da emozioni contrastanti. La nascita di un figlio è un vortice emotivo intenso: montagne russe che fanno virare da un'emozione all'altra." — Psicologia clinica della gravidanza
            </p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 16 }}>
              {emozioni.map((e, i) => (
                <div key={i} style={{ background: COLORS.warmWhite, borderRadius: 22, padding: 22, border: `1.5px solid ${COLORS.roseLight}`, borderLeft: `4px solid ${COLORS.rose}` }}>
                  <div style={{ fontSize: 26, marginBottom: 10 }}>{e.icon}</div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 17, marginBottom: 8, lineHeight: 1.3 }}>{e.title}</h3>
                  <p style={{ fontFamily: "'Nunito', sans-serif", color: "#4A3A4A", fontSize: 14, lineHeight: 1.72 }}>{parseLinks(e.text)}</p>
                </div>
              ))}
            </div>
            <div style={{ background: COLORS.roseLight, borderRadius: 18, padding: 20, marginTop: 20, border: `1.5px solid ${COLORS.rose}` }}>
              <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.roseDark, fontSize: 14, fontWeight: 800, marginBottom: 6 }}>⚕️ Quando chiedere supporto professionale</p>
              <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.7 }}>
                Ansia intensa persistente, umore molto basso, pensieri intrusivi o paure che limitano la vita quotidiana durante la gravidanza non sono da ignorare. I consultori familiari offrono supporto psicologico gratuito e accessibile. Se senti il bisogno di uno spazio di ascolto dedicato, rivolgiti a uno specialista della salute mentale perinatale.
              </p>
            </div>
          </div>
        )}

        {activeTab === "trimestri" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {trimestri.map((t, i) => (
              <div key={i} id={`grav-trim-${i}`} className={openSection === i ? "active-card-scroll" : ""} style={{ background: COLORS.warmWhite, borderRadius: 24, overflow: "hidden", border: `1.5px solid ${COLORS.roseLight}` }}>
                <button onClick={() => { const opening = openSection !== i; setOpenSection(opening ? i : null); if (opening) scrollToCard(`grav-trim-${i}`); }}
                  style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "18px 22px", display: "flex", alignItems: "center", gap: 14, textAlign: "left", WebkitTapHighlightColor: "transparent", userSelect: "none" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: t.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{t.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: COLORS.deepSlate, fontSize: 15 }}>{t.n} Trimestre · {t.settimane}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: COLORS.slateLight, fontSize: 13 }}>{t.titolo}</div>
                  </div>
                  <span style={{ color: COLORS.slateLight }}>{openSection === i ? "▲" : "▼"}</span>
                </button>
                {openSection === i && (
                  <div style={{ padding: "0 22px 20px", borderTop: `1px solid ${COLORS.roseLight}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 14, marginTop: 18 }}>
                      {[["Il corpo", t.corpo, COLORS.rose], ["Il cervello del bambino", t.cervello, COLORS.mint], ["La psiche", t.psiche, COLORS.lavender]].map(([label, txt, col]) => (
                        <div key={label} style={{ background: "#FFFCFA", borderRadius: 14, padding: 14, borderTop: `3px solid ${col}` }}>
                          <p style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: col, fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{label}</p>
                          <p style={{ fontFamily: "'Nunito', sans-serif", color: "#3A2A3A", fontSize: 13, lineHeight: 1.65 }}>{parseLinks(txt)}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14 }}>
                      {t.consigli.map((c, j) => (
                        <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0" }}>
                          <span style={{ width: 20, height: 20, borderRadius: "50%", background: COLORS.gold, color: "white", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{j+1}</span>
                          <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.6 }}>{c}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "lista" && (
          <div>
            <div style={{ background: COLORS.goldLight, borderRadius: 16, padding: "12px 18px", marginBottom: 20, border: `1.5px solid ${COLORS.gold}` }}>
              <p style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: "#7A5A00", fontSize: 14 }}>
                💡 Aspetta il 7°-8° mese prima di comprare tutto. I bambini crescono velocissimo e riceverete tantissimi regali. Parti dagli essenziali.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {listaNascita.map((cat, i) => (
                <div key={i} id={`grav-lista-${i}`} className={openSection === `l${i}` ? "active-card-scroll" : ""} style={{ background: COLORS.warmWhite, borderRadius: 20, overflow: "hidden", border: `1.5px solid ${COLORS.roseLight}` }}>
                  <button onClick={() => { const opening = openSection !== `l${i}`; setOpenSection(opening ? `l${i}` : null); if (opening) scrollToCard(`grav-lista-${i}`); }}
                    style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", WebkitTapHighlightColor: "transparent", userSelect: "none" }}>
                    <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: COLORS.deepSlate, fontSize: 15 }}>{cat.categoria}</span>
                    <span style={{ color: COLORS.slateLight }}>{openSection === `l${i}` ? "▲" : "▼"}</span>
                  </button>
                  {openSection === `l${i}` && (
                    <div style={{ padding: "4px 20px 16px", borderTop: `1px solid ${COLORS.roseLight}` }}>
                      {cat.items.map((item, j) => (
                        <div key={j} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: j < cat.items.length - 1 ? `1px solid ${COLORS.roseLight}` : "none" }}>
                          <span style={{ color: COLORS.rose, fontWeight: 800, flexShrink: 0 }}>✓</span>
                          <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.65 }}>{item}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "coppia" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: "🗣️", title: "Parlate dei ruoli prima che arrivino", text: "Chi fa il bagnetto? Chi gestisce i risvegli notturni? Decidere i ruoli prima è uno dei regali più grandi che potete farvi. La stanchezza post-parto non è il momento migliore per negoziare." },
              { icon: "💤", title: "Il sonno è la grande crisi", text: "La privazione del sonno è tra i fattori più destabilizzanti per la coppia nei primi mesi. Organizzate turni, chiedete aiuto ai nonni, non siate eroi. Un genitore riposato è un genitore presente." },
              { icon: "❤️", title: "La sessualità cambia — è normale", text: "Durante la gravidanza il desiderio oscilla enormemente. Dopo il parto ci vuole tempo — fisico e psicologico. La comunicazione aperta è più importante della frequenza." },
              { icon: "🧑‍🍼", title: "Il partner non è un 'aiutante'", text: "Il partner non aiuta — è un genitore. Coinvolgetelo fin dalla gravidanza: ecografie, corsi preparto, cameretta. Il coinvolgimento precoce predice la qualità del legame per anni." },
            ].map((c, i) => (
              <div key={i} style={{ background: COLORS.warmWhite, borderRadius: 20, padding: 22, border: `1.5px solid ${COLORS.roseLight}`, display: "flex", gap: 14 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{c.icon}</div>
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 17, marginBottom: 7 }}>{c.title}</h3>
                  <p style={{ fontFamily: "'Nunito', sans-serif", color: "#4A3A4A", fontSize: 14, lineHeight: 1.72 }}>{parseLinks(c.text)}</p>
                </div>
              </div>
            ))}
            <QuoteCard quote={QUOTES["winnicott_coppia"]} />
          </div>
        )}

        {activeTab === "tips" && (
          <div>
            {[
              { icon: "📋", title: "Il piano del parto", text: "Scrivilo ma tienilo flessibile. Indica le tue preferenze su anestesia, chi vuoi vicino — ma sapendo che il parto ha i suoi tempi. Un piano rigido può diventare fonte di delusione." },
              { icon: "🏥", title: "La valigia per l'ospedale", text: "Preparala entro il 7° mese: documenti, tessera sanitaria, ecografie, abbigliamento confortevole per la mamma, vestitino per il bambino, car seat già montata in auto." },
              { icon: "👩‍⚕️", title: "Scegli il pediatra prima della nascita", text: "Molti genitori lo scoprono solo dopo: il pediatra va scelto prima della nascita. Fai un colloquio conoscitivo, chiedi del suo approccio, della reperibilità." },
              { icon: "🌙", title: "Il piano per il sonno post-parto", text: "I primi mesi con un neonato sono devastanti per il sonno. Organizzate in anticipo: chi si alza di notte, chi chiede ai nonni di dare un turno. Parlarne prima evita conflitti nella stanchezza." },
              { icon: "💆", title: "Il quarto trimestre esiste", text: "I primi tre mesi dopo il parto sono un vero quarto trimestre — per il bambino e per la mamma. Il bambino si adatta al mondo, la mamma alla nuova identità. È normale non sentirsi subito 'normali'." },
              { icon: "📱", title: "Attenzione al sovraccarico di informazioni", text: "Google fa impazzire i neo-genitori. Sviluppa una lista corta di fonti affidabili (pediatra, OMS, AAP) e smetti di cercare ogni sintomo. L'ansia da ricerca è reale." },
              { icon: "📞", title: "Salva questi numeri adesso", text: "Dubbi su un farmaco assunto, un'esposizione a una sostanza, un rischio in gravidanza o allattamento? In Italia esistono linee gratuite con specialisti che rispondono proprio a queste domande. Li trovi nella tab 🌿 Prenditi cura di te. Salvali nel telefono prima che servano." },
            ].map((tip, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.roseLight}` : "none" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: COLORS.roseLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{tip.icon}</div>
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 16, marginBottom: 5 }}>{tip.title}</h3>
                  <p style={{ fontFamily: "'Nunito', sans-serif", color: "#4A3A4A", fontSize: 14, lineHeight: 1.7 }}>{parseLinks(tip.text)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "cura" && (() => {
          const curaCat = [
            {
              emoji: "🥦", titolo: "Alimentazione",
              breve: "La gravidanza non è un regime. È il momento in cui il tuo corpo ha bisogno di più — più attenzione, più varietà, più qualità. Pochi rischi reali, molti miti da sfatare.",
              dettaglio: `DA SAPERE CON CERTEZZA (ISS, EFSA, OMS, ACOG)\n\n• Alcol: nessuna dose sicura documentata in gravidanza. La letteratura scientifica internazionale è unanime su questo — senza eccezioni. (ACOG, 2020)\n• Folati (vitamina B9): supplementazione raccomandata dal pre-concepimento fino alla 12ª settimana. Consenso unanime.\n• Vitamina D: carenza diffusissima in Italia. La supplementazione va valutata con il tuo curante — non autoprescritta.\n\nCOSA EVITARE — evidenza solida\n\n• Pesce ad alto contenuto di mercurio: tonno rosso, pesce spada, squalo, luccio (linee guida EFSA)\n• Carni crude o poco cotte, salumi non cotti, carpacci, ostriche: rischio Listeria e Toxoplasma\n• Formaggi a latte crudo (brie, camembert, roquefort): stesso rischio\n• Fegato e derivati in grandi quantità: vitamina A preformata, teratogena ad alte dosi\n• Liquirizia in grandi quantità: altera i livelli di cortisolo fetale (Räikkönen et al., 2017)\n\nAREA GRIGIA — segnalata come tale\n\n• Caffeina: EFSA raccomanda di non superare 200 mg/die (~2 caffè espresso). L'evidenza sul danno sotto questa soglia è ancora dibattuta.\n• Sushi: il rischio è il pesce crudo, non il sushi come categoria. Pesce abbattuto è sicuro per la Listeria — non per il mercurio nei pesci a rischio.\n\nCOSA FUNZIONA DAVVERO\n\nLa dieta mediterranea è associata a outcome positivi per madre e bambino (Chatzi et al., 2012). Varietà, legumi, pesce azzurro, verdura, frutta, olio extravergine — senza acquistare nulla di speciale.`,
              fonte: "ISS — Linee guida per una sana alimentazione in gravidanza (2021); EFSA; ACOG (2020); Räikkönen et al. (2017), American Journal of Epidemiology.",
              curante: "Prima di assumere qualsiasi integratore — anche 'naturale' — parlane sempre con il tuo ginecologo o ostetrica.",
            },
            {
              emoji: "💅", titolo: "Smalti e unghie",
              breve: "Le unghie belle non sono un lusso frivolo — ma non tutti gli smalti si equivalgono. Tre sostanze in particolare meritano attenzione, e i prodotti 'free' non sono tutti uguali.",
              dettaglio: `SOSTANZE DA EVITARE — evidenza moderata (EWG, NICNAS, studi su perturbatori endocrini)\n\n• DBP (dibutilftalato): ftalato perturbatore endocrino, presente in molti smalti tradizionali\n• Formaldeide: classificata cancerogena (IARC Gruppo 1), usata come indurente\n• Toluene: solvente con effetti neurotossici documentati ad alta esposizione\n• TPHP (trifenilfosfato): usato come sostituto degli ftalati, ma studi recenti mostrano effetti simili (Mendelsohn et al., 2016)\n\nCOSA SAPERE SUI PRODOTTI "FREE"\n\n"5-free", "7-free", "10-free" indicano l'esclusione progressiva delle sostanze più critiche. Non è solo greenwashing: la lista ingredienti (INCI) è però sempre più affidabile del claim in etichetta. Leggi gli ingredienti, non solo il numero.\n\nCOSA TRANQUILLIZZA\n\nL'esposizione occasionale non equivale all'esposizione professionale di chi lavora in un nail salon per ore ogni giorno. La dose fa la differenza. Applicare lo smalto in un ambiente ben ventilato riduce ulteriormente l'esposizione ai vapori.`,
              fonte: "EWG Skin Deep Database; Mendelsohn et al. (2016), Environment International; NICNAS (Australia).",
              curante: null,
            },
            {
              emoji: "💇", titolo: "Tinte per capelli",
              breve: "Uno degli argomenti su cui circola più confusione — in entrambe le direzioni. La realtà è più rassicurante di quanto il mercato della paura voglia far credere, con qualche coordinata utile.",
              dettaglio: `COSA DICE LA LETTERATURA (ACOG; revisione Krstev & Maric, 2012)\n\nL'assorbimento cutaneo delle tinte chimiche durante un'applicazione personale è limitato. Gli studi disponibili non mostrano un'associazione chiara tra uso personale (non occupazionale) di tinte e danni fetali. Chi tinge i capelli una volta ogni due mesi ha un profilo di rischio molto diverso da un parrucchiere esposto quotidianamente.\n\nCONVENZIONE CLINICA — non evidenza diretta forte\n\nIl primo trimestre è il periodo di maggiore precauzione per principio, non perché esistano evidenze specifiche di danno a dosi personali.\n\nDOPO IL PRIMO TRIMESTRE\n\nACOG (2020) ritiene le tinte chimiche probabilmente sicure, pur riconoscendo la scarsità di studi definitivi. Non è una certezza — è una valutazione del rischio ragionevole.\n\nALTERNATIVE A PROFILO RIDOTTO\n\n• Tecniche senza contatto con il cuoio capelluto: colpi di luce, balayage, meches\n• Tinte vegetali: henné puro (non henné nero, che contiene PPD — alta allergenicità)\n• Ambienti sempre ben ventilati`,
              fonte: "ACOG Committee Opinion (2020); Krstev S. & Maric G. (2012), Journal of Occupational Health.",
              curante: null,
            },
            {
              emoji: "🧴", titolo: "Creme corpo e idratanti",
              breve: "La pelle in gravidanza si trasforma. Idratarla è cura di sé — ma non tutti gli ingredienti sono equivalenti. La maggior parte dei prodotti semplici è più che sufficiente.",
              dettaglio: `DA EVITARE — evidenza buona\n\n• Retinolo e derivati della vitamina A (retinoidi topici): teratogeni documentati ad alte dosi — per coerenza con il dato alimentare. (FDA, EMA)\n• Idrochinone: agente schiarente con assorbimento cutaneo significativo; sconsigliato in gravidanza per cautela\n\nDA LIMITARE — evidenza moderata\n\n• Parabeni (methylparaben, propylparaben): perturbatori endocrini deboli; le evidenze umane sono ancora dibattute ma la precauzione è razionale. (SCHER — Scientific Committee on Health and Environmental Risks, EU)\n• "Parfum" / "Fragrance" in etichetta: termine ombrello che può nascondere ftalati non dichiarati singolarmente\n\nSICURI E OTTIMI\n\n• Burro di karité puro\n• Olio di mandorle dolci\n• Olio di argan\n• Vitamina E topica (tocoferolo)\n• Creme idratanti senza fragranze artificiali\n\nUNA COSA ONESTA SULLE SMAGLIATURE\n\nLe smagliature sono un fenomeno genetico-ormonale: la pelle si distende più velocemente di quanto le fibre di collagene riescano ad adattarsi. Nessuna crema le "elimina" o le "previene" con certezza — chi lo afferma fa pubblicità ingannevole. Le creme migliorano il comfort cutaneo e sono un atto di cura verso se stesse. Vale già per questo.`,
              fonte: "FDA; EMA; SCHER — Scientific Committee on Health and Environmental Risks (EU).",
              curante: null,
            },
            {
              emoji: "🌿", titolo: "Tisane ed erbe",
              breve: "'Naturale' non significa automaticamente sicuro in gravidanza. La natura è piena di sostanze potentissime — alcune meravigliose, alcune da usare con attenzione.",
              dettaglio: `DA EVITARE — evidenze documentate (ISS, EMA monografie sulle piante medicinali)\n\n• Liquirizia in quantità elevate: la glicirrizina altera i livelli di cortisolo fetale\n• Salvia: proprietà emmenagoghe (può stimolare le contrazioni uterine), contiene tuione\n• Rosmarino in dosi concentrate: stesso meccanismo della salvia\n• Aloe vera per os: lassativo stimolante antrachinoinico, controindicato\n• Ginseng: effetti ormonali documentati; dati insufficienti per dichiararlo sicuro\n\nCON MODERAZIONE — evidenze variabili\n\n• Zenzero: evidenza positiva sulla nausea in gravidanza (Viljoen et al., 2014 — metanalisi); dosi moderate fino a 1 g/die considerate sicure dalla letteratura disponibile\n• Camomilla comune in quantità moderate: nessuna evidenza di rischio a dosi alimentari normali, ma EMA raccomanda cautela per insufficienza di studi specifici\n• Menta piperita in tisana: sicura in uso alimentare; l'olio essenziale concentrato è altra questione\n\nIL PUNTO CHE CONTA\n\nMolte tisane "per la gravidanza" vendute in erboristeria non hanno studi di sicurezza specifici su questo periodo. L'assenza di studi non equivale a sicurezza dimostrata.`,
              fonte: "EMA — Monografie sulle piante medicinali; ISS; Viljoen et al. (2014), PLoS ONE; Brinker F., Herb Contraindications and Drug Interactions (4ª ed.).",
              curante: "Prima di aggiungere una tisana alla tua routine quotidiana, vale sempre una parola con la tua ostetrica.",
            },
            {
              emoji: "🏠", titolo: "Ambiente domestico",
              breve: "Non serve trasformare casa in una camera bianca. Bastano qualche accorgimento e un po' di buon senso — soprattutto nel primo trimestre.",
              dettaglio: `DA RIDURRE — con buone ragioni (WHO Indoor Air Quality, IARC)\n\n• Spray in ambienti chiusi: profumatori, lacche, insetticidi — i VOC (composti organici volatili) irritano le vie respiratorie e, in studi occupazionali, sono associati a outcome negativi. Ventilare sempre.\n• Vernici e pitture con solventi: preferire prodotti a base d'acqua (VOC bassi); evitare di dormire in ambienti appena verniciati, soprattutto nel primo trimestre\n• Pesticidi domestici: ridurre al minimo; preferire metodi meccanici dove possibile\n\nCOSA SI PUÒ USARE SENZA PREOCCUPAZIONE ECCESSIVA\n\nCandeggina a dosi domestiche, con finestre aperte: nessuna evidenza di rischio fetale a questi livelli di esposizione. L'odore intenso può essere disturbante per la sensibilità olfattiva aumentata in gravidanza — motivo pratico più che tossicologico.\n\nALTERNATIVE SEMPLICI\n\nAceto bianco, bicarbonato, sapone di Marsiglia e acqua calda puliscono efficacemente superfici, vetri e sanitari. Non è ideologia: è chimica semplice e sicura.`,
              fonte: "WHO — Indoor Air Quality Guidelines; IARC Monographs.",
              curante: null,
            },
            {
              emoji: "💊", titolo: "Integratori — orientarsi",
              breve: "Il mercato degli integratori in gravidanza è enorme. Molto è utile, qualcosa è inutile, qualcosa è da evitare. La regola base: nessun integratore senza indicazione del curante.",
              dettaglio: `RACCOMANDATI CON EVIDENZA SOLIDA\n\n• Acido folico (B9): 400 mcg/die dal pre-concepimento fino alla 12ª settimana — raccomandazione unanime (ISS, OMS, ACOG)\n• Vitamina D: supplementazione raccomandata nella maggior parte delle donne in gravidanza in Italia; la dose va definita con il curante\n• DHA (omega-3): evidenza positiva sullo sviluppo neurologico fetale (Helland et al., 2003); il pesce grasso è la fonte alimentare ottimale; supplementazione indicata in caso di dieta carente\n\nSOLO SU INDICAZIONE SPECIFICA\n\n• Ferro: non tutte le donne in gravidanza ne hanno carenza; l'eccesso non è privo di effetti. Va dosato e prescritto.\n• Iodio: in alcune aree geografiche la carenza è diffusa — da valutare con il curante\n• Magnesio: spesso consigliato per i crampi notturni; evidenza modesta ma profilo di sicurezza buono a dosi standard\n\nDA EVITARE SENZA INDICAZIONE\n\n• Vitamina A preformata (retinolo) in dosi elevate: teratogena\n• Erbe in capsule o estratti concentrati: la concentrazione cambia radicalmente il profilo di rischio rispetto alla tisana`,
              fonte: "ISS — Linee guida gravidanza; OMS; ACOG; Helland et al. (2003), Pediatrics.",
              curante: "Nessun integratore — nemmeno quelli 'naturali' — va assunto in gravidanza senza indicazione del tuo curante.",
            },
            {
              emoji: "🧠", titolo: "Il corpo che cambia — uno sguardo psicologico",
              breve: "Guardare il proprio corpo allo specchio e non riconoscersi del tutto — o provare emozioni contrastanti verso di esso — è normale in gravidanza. Più normale di quanto si ammetta.",
              dettaglio: `COSA DICE LA RICERCA\n\nL'immagine corporea in gravidanza è una delle aree più complesse dal punto di vista psicologico. L'ambivalenza — meraviglia e disorientamento insieme — è documentata e frequente (Skouteris et al., 2005). Il corpo si trasforma a una velocità che la mente fatica a integrare. Non è un problema da risolvere: è un processo da attraversare.\n\nIL CONCETTO DI "MATRESCENCE"\n\nDana Raphael (1973) e, più recentemente, la psicologa Aurelie Athan hanno nominato il processo di diventare madre "matrescence" — un secondo processo di individuazione, paragonabile per intensità all'adolescenza. La gravidanza trasforma l'identità, non solo il corpo. Riconoscerlo — invece di aspettarsi di "restare le stesse" — alleggerisce il peso.\n\nCURA DI SÉ COME ATTO RELAZIONALE\n\nPrendersi cura del proprio corpo in gravidanza non è egoismo — è il primo ambiente che il bambino sperimenta. Un corpo trattato con rispetto, attenzione e piacere trasmette qualcosa. Questo non significa perfezione: significa intenzione.\n\nQUANDO CHIEDERE SUPPORTO\n\nSe l'immagine corporea diventa fonte di angoscia persistente, o se emergono comportamenti restrittivi rispetto all'alimentazione, uno spazio di ascolto con un professionista può fare una differenza reale — senza aspettare che diventi "abbastanza grave".`,
              fonte: "Skouteris et al. (2005), Body Image; Athan A.M. (2016), Journal of Prenatal and Perinatal Psychology and Health; Raphael D. (1973), The Tender Gift.",
              curante: null,
            },
          ];

          const curaSai = [
            {
              titolo: "\"Dermatologicamente testato\" non significa sicuro",
              testo: "Significa solo che il prodotto è stato applicato su pelle umana senza causare irritazione acuta in quel campione. Non dice nulla sulla sicurezza degli ingredienti a lungo termine, né in gravidanza. È un claim legale, non una garanzia tossicologica.",
            },
            {
              titolo: "\"Clinicamente provato\" può voler dire qualsiasi cosa",
              testo: "La legge non impone uno standard minimo per usare questa dicitura. Può riferirsi a uno studio su 10 persone, commissionato dall'azienda produttrice, non pubblicato su nessuna rivista scientifica. Cerca sempre: lo studio è stato pubblicato su una rivista peer-reviewed? Da chi è stato finanziato?",
            },
            {
              titolo: "Le smagliature non si \"prevengono\" con le creme",
              testo: "Sono determinate principalmente dalla genetica e dalla velocità di espansione della pelle. Nessuna crema, per quanto costosa, le elimina o le previene con certezza scientifica. Idratare la pelle migliora il comfort e il benessere — un motivo più che sufficiente, senza aspettarsi miracoli.",
            },
            {
              titolo: "\"Naturale\" non significa sicuro in gravidanza",
              testo: "L'aconitina è naturale. La cicuta è naturale. La logica \"se viene dalla natura non fa male\" non regge né in farmacologia né in gravidanza. Alcune piante medicinali hanno controindicazioni specifiche e documentate in questo periodo. L'origine non è sinonimo di innocuità.",
            },
            {
              titolo: "Gli smalti \"7-free\" non sono tutti uguali",
              testo: "Il numero indica quante sostanze sono state escluse dalla formulazione — ma non dice quali sono state aggiunte al loro posto. L'INCI (la lista ingredienti) è sempre l'unico strumento affidabile. Impara a leggerne almeno i primi cinque: sono quelli presenti in maggiore quantità.",
            },
            {
              titolo: "\"Testato in gravidanza\" quasi mai esiste come standard",
              testo: "Per ragioni etiche comprensibili, i trial clinici escludono sistematicamente le donne in gravidanza. Questo significa che per moltissimi prodotti i dati di sicurezza specifica in gravidanza sono limitati o assenti. Quando un prodotto dichiara di essere \"sicuro in gravidanza\" senza citare studi specifici, sta facendo un'affermazione non verificabile.",
            },
          ];

          return (
            <div>
              {/* Disclaimer caldo */}
              <div style={{ background: "#FFF8E7", border: "1.5px solid #F4C842", borderRadius: 18, padding: "14px 18px", marginBottom: 28 }}>
                <p style={{ fontFamily: "'Nunito', sans-serif", color: "#7A5A00", fontSize: 14, lineHeight: 1.75, margin: 0 }}>
                  <strong>🌿 Una bussola, non un elenco di divieti.</strong> Il mercato offre migliaia di prodotti "pensati per te". Qui trovi la consapevolezza per scegliere con fiducia quello che fa bene davvero — a te e al bambino che stai accogliendo.<br />
                  <span style={{ fontSize: 13, opacity: 0.85 }}>I contenuti hanno carattere informativo e divulgativo. Per ogni scelta che riguarda la tua salute in gravidanza, il riferimento rimane sempre il tuo ginecologo, la tua ostetrica o il tuo medico di base.</span>
                </p>
              </div>

              {/* Numeri utili — gravidanza e allattamento */}
              <div style={{ background: "linear-gradient(135deg, #EDF6F3, #F0F7F4)", border: "1.5px solid #A8D5C2", borderRadius: 18, padding: isMobile ? "16px 16px" : "18px 22px", marginBottom: 28 }}>
                <p style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 17, fontWeight: 700, margin: "0 0 6px" }}>📞 Numeri utili — farmaci e sostanze in gravidanza</p>
                <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 13, lineHeight: 1.65, margin: "0 0 14px" }}>
                  Per dubbi sull'assunzione di farmaci, esposizione a sostanze o rischi in gravidanza e allattamento. Salvali nel telefono adesso — prima che servano.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { nome: "Centro Antiveleni Bergamo", sotto: "Ospedale Papa Giovanni XXIII", numero: "800 883 300", nota: "Numero Verde gratuito · attivo 24 ore su 24", primary: true },
                    { nome: "Centro Antiveleni Niguarda", sotto: "Milano — Servizio gravidanza dedicato", numero: "02 6610 1029", nota: "Lun e Gio 11:00–18:00 · anche via email: farmaci.gravidanza@ospedaleniguarda.it" },
                    { nome: "Telefono Rosso", sotto: "Policlinico Gemelli — Roma", numero: "06 3015 6298", nota: "Lunedì e Venerdì 14:00–19:00 · rischi teratogeni e farmacologici" },
                    { nome: "Emergenza tossicologica", sotto: null, numero: "112", nota: "In caso di emergenza immediata" },
                  ].map((item, i) => (
                    <div key={i} style={{
                      background: item.primary ? "white" : "#FAFFFE",
                      borderRadius: 14, padding: "12px 16px",
                      border: item.primary ? "1.5px solid #4A9C7E" : "1px solid #C8E6D8",
                      boxShadow: item.primary ? "0 2px 8px rgba(74,156,126,0.12)" : "none",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: COLORS.deepSlate, fontSize: 14, margin: 0, lineHeight: 1.3 }}>{item.nome}</p>
                          {item.sotto && <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 12, margin: "2px 0 0", lineHeight: 1.3 }}>{item.sotto}</p>}
                        </div>
                        <span style={{
                          fontFamily: "'Nunito', sans-serif", fontWeight: 900,
                          fontSize: item.primary ? 16 : 14,
                          color: item.primary ? "#2E7D5A" : "#4A7A66",
                          whiteSpace: "nowrap",
                          letterSpacing: "0.5px",
                        }}>{item.numero}</span>
                      </div>
                      <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 12, margin: "6px 0 0", lineHeight: 1.5 }}>{item.nota}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 12, margin: "12px 0 0", lineHeight: 1.6, fontStyle: "italic" }}>
                  È sempre consigliabile contattare prima il proprio ginecologo o medico curante. Questi servizi sono un supporto specialistico in più — non sostituiscono il rapporto con il tuo curante.
                </p>
              </div>

              {/* Card categorie */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
                {curaCat.map((cat, i) => {
                  const key = `cura_cat_${i}`;
                  const isOpen = openSection === key;
                  return (
                    <div key={i} id={key} className={isOpen ? "active-card-scroll" : ""} style={{ background: COLORS.warmWhite, borderRadius: 20, overflow: "hidden", border: `1.5px solid ${COLORS.roseLight}` }}>
                      <button
                        onClick={() => { const opening = !isOpen; setOpenSection(opening ? key : null); if (opening) scrollToCard(key); }}
                        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", WebkitTapHighlightColor: "transparent", userSelect: "none" }}
                      >
                        <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: COLORS.deepSlate, fontSize: 15, display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 22 }}>{cat.emoji}</span> {cat.titolo}
                        </span>
                        <span style={{ color: COLORS.slateLight, fontSize: 16, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                      </button>
                      {isOpen && (
                        <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${COLORS.roseLight}` }}>
                          <p style={{ fontFamily: "'Nunito', sans-serif", color: "#4A3A4A", fontSize: 14, lineHeight: 1.75, marginTop: 14, marginBottom: 14, fontStyle: "italic" }}>{cat.breve}</p>
                          {cat.dettaglio.split("\n\n").map((block, bi) => {
                            const isHeader = /^[A-ZÀÈÌÒÙ][A-ZÀÈÌÒÙ\s\-—()]+$/.test(block.split("\n")[0]);
                            if (isHeader) {
                              const lines = block.split("\n");
                              return (
                                <div key={bi} style={{ marginBottom: 14 }}>
                                  <p style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 12, color: COLORS.rose, letterSpacing: "0.6px", textTransform: "uppercase", margin: "0 0 6px" }}>{lines[0]}</p>
                                  {lines.slice(1).map((l, li) => (
                                    <p key={li} style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.75, margin: "0 0 4px" }}>{l}</p>
                                  ))}
                                </div>
                              );
                            }
                            return <p key={bi} style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.75, marginBottom: 10 }}>{block}</p>;
                          })}
                          <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 12, lineHeight: 1.65, margin: "10px 0 0", fontStyle: "italic" }}>
                            📚 {cat.fonte}
                          </p>
                          {cat.curante && (
                            <div style={{ background: COLORS.roseLight, borderRadius: 12, padding: "10px 14px", marginTop: 12 }}>
                              <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.roseDark, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
                                <strong>👩‍⚕️ Parola al tuo curante:</strong> {cat.curante}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sezione Lo sapevi che? */}
              <div style={{ background: "linear-gradient(135deg, #F3EEF8, #F8EEF3)", borderRadius: 22, padding: isMobile ? "20px 16px" : "24px 24px", marginBottom: 8 }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: isMobile ? 18 : 20, marginBottom: 6, marginTop: 0 }}>💡 Lo sapevi che?</h3>
                <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 14, marginBottom: 18, marginTop: 0, lineHeight: 1.6 }}>Sei claim del mercato smontati con gentilezza ma senza sconti.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {curaSai.map((card, i) => {
                    const key = `cura_sai_${i}`;
                    const isOpen = openSection === key;
                    return (
                      <div key={i} id={key} className={isOpen ? "active-card-scroll" : ""} style={{ background: COLORS.warmWhite, borderRadius: 16, overflow: "hidden", border: `1px solid rgba(204,34,104,0.15)` }}>
                        <button
                          onClick={() => { const opening = !isOpen; setOpenSection(opening ? key : null); if (opening) scrollToCard(key); }}
                          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", WebkitTapHighlightColor: "transparent", userSelect: "none", gap: 12 }}
                        >
                          <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: COLORS.deepSlate, fontSize: 14, textAlign: "left", lineHeight: 1.4 }}>💡 {card.titolo}</span>
                          <span style={{ color: COLORS.slateLight, fontSize: 14, flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                        </button>
                        {isOpen && (
                          <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${COLORS.roseLight}` }}>
                            <p style={{ fontFamily: "'Nunito', sans-serif", color: "#4A3A4A", fontSize: 14, lineHeight: 1.75, margin: "12px 0 0" }}>{card.testo}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Risorse per famiglie */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px", marginTop: 40, marginBottom: 8 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 8 }}>
            📋 Risorse e riferimenti
          </h3>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 15, fontStyle: "italic", marginBottom: 20 }}>
            Portali istituzionali e supporto durante l'attesa
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {GRAV_RISORSE.servizi.map((srv, i) => (
              <a key={i} href={srv.url} target="_blank" rel="noopener noreferrer" style={{
                background: "white", borderRadius: 18, border: "1.5px solid rgba(0,0,0,0.06)",
                padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start",
                textDecoration: "none", color: "inherit", cursor: "pointer",
                transition: "border-color 0.18s, box-shadow 0.18s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.rose; e.currentTarget.style.boxShadow = "0 2px 12px rgba(212,68,122,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>{srv.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: COLORS.deepSlate, fontSize: 14, marginBottom: 4 }}>{srv.title}</div>
                  <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 13, lineHeight: 1.7 }}>{srv.text}</div>
                </div>
                <span style={{ fontSize: 14, color: COLORS.rose, flexShrink: 0, marginTop: 2 }}>↗</span>
              </a>
            ))}
          </div>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: COLORS.slateLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Riferimenti scientifici</p>
            {GRAV_RISORSE.footer.map((ref, i) => (
              <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer" style={{
                display: "block", fontFamily: "'Nunito', sans-serif", fontSize: 12,
                color: COLORS.slateLight, textDecoration: "underline", textUnderlineOffset: 2,
                marginBottom: 4, lineHeight: 1.5,
              }}>{ref.label}</a>
            ))}
          </div>
        </div>

      <CrossLinks cards={[
          { emoji: "🖥️", label: "Schermi e gravidanza", desc: "Abitudini digitali e benessere in attesa", section: "screens", bg: COLORS.skyLight },
          { emoji: "🔍", label: "Curiosità e miti", desc: "Falsi miti sulla gravidanza e la nascita", section: "curiosita", bg: COLORS.peachLight },
          { emoji: "🤰", label: "Come stai attraversando questa attesa?", desc: "Uno spazio per riflettere sulla tua gravidanza", section: "checklist", bg: COLORS.roseLight },
        ]} />

      {/* CTA checklist — in fondo alla guida */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 32, marginBottom: 8 }}>
        <button onClick={() => { if (_globalSetSection) _globalSetSection("checklist"); }} style={{
          background: `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.roseDark})`,
          color: "white", border: "2px solid rgba(255,150,180,0.4)", borderRadius: 50,
          padding: "13px 28px", fontSize: 15,
          fontFamily: "'Nunito', sans-serif", cursor: "pointer",
          fontWeight: 800, minHeight: 50,
          animation: "rose-pulse 2s ease-in-out infinite",
          letterSpacing: "0.2px",
        }}>🤰 Come sto vivendo questa gravidanza?</button>
        <button onClick={() => { _globalChecklistOverride = "papa"; if (_globalSetSection) _globalSetSection("checklist"); }} style={{
          background: "linear-gradient(135deg, #5B8FB9, #3A6A8A)",
          color: "white", border: "2px solid rgba(140,180,220,0.4)", borderRadius: 50,
          padding: "13px 28px", fontSize: 15,
          fontFamily: "'Nunito', sans-serif", cursor: "pointer",
          fontWeight: 800, minHeight: 50,
          animation: "papa-pulse 2s ease-in-out infinite",
          letterSpacing: "0.2px",
        }}>🤝 Come sto diventando genitore?</button>
      </div>

      <SuggerimentoButton />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ZONE PICKER PAGE (solo bottoni, nessun testo)
// Raggiungibile dal pulsante "Cambia fascia"
// ─────────────────────────────────────────────
function ZonePickerPage({ onSelect, compact = false }) {
  const isMobile = useIsMobile();
  const zones = [
    {
      id: "gravidanza", icon: "🤰", label: "Gravidanza",
      color: COLORS.rose, shadow: "rgba(212,68,122,0.40)", gradient: `linear-gradient(135deg, ${COLORS.rose}, ${COLORS.roseDark})`,
    },
    {
      id: "0-3", icon: "🌱", label: "0–3 anni",
      color: COLORS.mint, shadow: "rgba(107,174,138,0.40)", gradient: `linear-gradient(135deg, ${COLORS.mint}, #4A8C6A)`,
    },
    {
      id: "3-6", icon: "🌸", label: "3–6 anni",
      color: COLORS.amber, shadow: "rgba(240,184,74,0.40)", gradient: `linear-gradient(135deg, ${COLORS.amber}, #E07800)`,
    },
    {
      id: "6-12", icon: "🌟", label: "6–12 anni",
      color: COLORS.coral, shadow: "rgba(212,68,122,0.40)", gradient: `linear-gradient(135deg, ${COLORS.coral}, #E03040)`,
    },
    {
      id: "12-15", icon: "🌊", label: "12–15 anni",
      color: "#5BA4D4", shadow: "rgba(91,164,212,0.40)", gradient: "linear-gradient(135deg, #5BA4D4, #2A70A0)",
    },
    {
      id: "15-18", icon: "✨", label: "15–18 anni",
      color: COLORS.gold, shadow: "rgba(240,184,74,0.40)", gradient: `linear-gradient(135deg, ${COLORS.gold}, #C07000)`,
    },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg, #F8D8E8 0%, #FDE0D4 30%, #ECE0F8 65%, #D8EEE4 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: compact ? "flex-start" : "center",
      padding: compact
        ? (isMobile ? "40px 20px 32px" : "60px 40px 48px")
        : (isMobile ? "32px 20px" : "60px 40px"),
    }}>
      {/* Logo e intestazione — solo prima apertura */}
      {!compact && (
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img
            src="/gifiniziale.webp"
            alt="La Bebi App"
            style={{
              width: isMobile ? 220 : 350,
              height: isMobile ? 220 : 350,
              objectFit: "contain",
            }}
          />
          <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: isMobile ? 22 : 28, fontWeight: 700, marginTop: 12, letterSpacing: "0.01em" }}>
            la Bebi App
          </div>
          <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 13, marginTop: 4, letterSpacing: "0.04em" }}>
            v4.20
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", color: "rgba(155,100,140,0.75)", fontSize: isMobile ? 15 : 17, marginTop: 10, fontStyle: "italic", letterSpacing: "0.02em" }}>
            scegli la tua fascia d'età
          </div>
          <div style={{ fontSize: 22, color: "rgba(155,100,140,0.55)", animation: "ob-bounce 1.6s ease-in-out infinite", display: "inline-block", marginTop: 6 }}>
            ↓
          </div>
        </div>
      )}

      {/* 6 Zone cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, width: "100%", maxWidth: 860 }}>
        {zones.map(z => (
          <button key={z.id} onClick={() => onSelect(z.id)} style={{
            touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
            background: "rgba(255,255,255,0.10)", border: "2px solid rgba(255,255,255,0.22)",
            borderRadius: 32, padding: isMobile ? "22px 20px" : "30px 24px",
            cursor: "pointer", textAlign: "center", transition: "all 0.25s",
            backdropFilter: "blur(4px)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.12)";
            e.currentTarget.style.borderColor = z.color;
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = `0 12px 40px ${z.shadow}`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}>
            <img src={ZONE_IMAGES[z.id]} alt={z.label} style={{ width: 72, height: 72, objectFit: "contain", marginBottom: 12, display: "block", margin: "0 auto 12px" }} />
            <div style={{
              display: "inline-block", background: z.gradient, borderRadius: 50,
              padding: "7px 20px",
              fontFamily: "'Playfair Display', serif", color: "white", fontSize: 16, fontWeight: 700,
              boxShadow: `0 4px 16px ${z.shadow}`,
            }}>{z.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── OGNI BAMBINO — Risorse e footer bibliografico ─── */
const OB_RISORSE = {
  servizi: [
    { icon: "🔬", title: "ISS — Osservatorio Nazionale Autismo", text: "Mappatura servizi, linee guida, informazioni per famiglie.", url: "https://osservatorionazionaleautismo.iss.it/" },
    { icon: "📖", title: "AID — Associazione Italiana Dislessia", text: "Sportelli territoriali, risorse per famiglie, supporto DSA.", url: "https://www.aiditalia.org/" },
    { icon: "💡", title: "dislessia.it", text: "Campagna divulgativa AID — \"Solo un altro modo di vedere il mondo\".", url: "https://www.dislessia.it/" },
  ],
  footer: [
    { label: "ISS — Linee Guida ASD 2023", url: "https://osservatorionazionaleautismo.iss.it/linee-guida1" },
    { label: "SINPIA — Linee Guida", url: "https://sinpia.eu/linee-guida-3/" },
  ],
};

/* ─── GUIDE — Footer bibliografico ─── */
const GUIDE_FOOTER = [
  { label: "SIP — Sezione Genitori", url: "https://sip.it/genitori/" },
  { label: "AAP — Ages & Stages", url: "https://www.healthychildren.org/English/ages-stages/Pages/default.aspx" },
  { label: "FIMP — Schede neurosviluppo 0-3", url: "https://www.fimp.pro/area-scientifica/aree-tematiche/neurosviluppo/schede-di-sorveglianza" },
];

/* ─── CHECKLIST — Footer bibliografico per zona ─── */
const CHECKLIST_FOOTER = {
  papa: [
    { label: "SIP — Allattamento e salute mentale materna (Position Statement TAS 2023)", url: "https://sip.it/2024/05/07/allattamento-e-salute-mentale-materna/" },
    { label: "Paulson & Bazemore — 'Prenatal and Postpartum Depression in Fathers' (2010), JAMA", url: null },
    { label: "Palkovitz — 'Reconstructing Involvement' (2002)", url: null },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   🌿 OGNI BAMBINO È UNICO — Sezione trasversale neurodivergenza
   3 tab: Capire · Nella vita di ogni giorno · A chi rivolgersi
   Contenuti approvati — nessuna tab "Osservare"
═══════════════════════════════════════════════════════════════ */
function OgniBambinoPage() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("capire");

  const tabs = [
    { id: "capire",     label: "🧩 Capire" },
    { id: "strategie",  label: "🌱 Nella vita di ogni giorno" },
    { id: "percorso",   label: "🧭 A chi rivolgersi" },
  ];

  const capireCards = [
    {
      emoji: "🎯", title: "Attenzione e movimento",
      text: "Alcuni bambini hanno un motore che sembra sempre acceso. Altri si perdono nei dettagli e faticano a seguire il filo. Non è questione di volontà: il cervello organizza l'attenzione e il movimento in modi diversi da persona a persona. Quando questa differenza rende la vita quotidiana più faticosa — a scuola, a casa, con gli amici — vale la pena capirla meglio.",
    },
    {
      emoji: "💬", title: "Comunicazione e relazione",
      text: "Ci sono bambini che parlano tanto e bambini che parlano poco. Ma la comunicazione non è solo parole: è sguardo, gesto, comprensione di quello che l'altro intende dire anche senza dirlo. Alcuni bambini leggono queste sfumature con naturalezza, altri hanno bisogno di impararle in modo più esplicito. Nessuna delle due cose è un difetto.",
    },
    {
      emoji: "📖", title: "Apprendimento",
      text: "Leggere, scrivere, calcolare: competenze che la scuola dà per scontate. Ma il cervello di ogni bambino le costruisce con percorsi diversi. Alcuni hanno bisogno di più tempo, di strategie diverse, di strumenti che compensino una fatica reale. Riconoscerlo presto permette di trovare la strada giusta — non di etichettare.",
    },
    {
      emoji: "🌊", title: "Intensità e sensibilità",
      text: "Luci troppo forti, rumori che gli altri ignorano, etichette dei vestiti che diventano insopportabili. Oppure emozioni che arrivano tutte insieme, a un volume che sembra eccessivo. Per alcuni bambini il mondo è semplicemente più intenso. Non stanno esagerando — sentono di più.",
    },
  ];

  const strategieCards = [
    {
      emoji: "🗓️", title: "Routine e prevedibilità",
      text: "Sapere cosa succederà dopo aiuta. Non è rigidità — è sicurezza. Anticipa i cambiamenti (\"tra 5 minuti smettiamo\"), usa supporti visivi se servono, mantieni i passaggi chiave della giornata in un ordine stabile. Non devi eliminare ogni sorpresa — devi offrire un'impalcatura su cui appoggiarsi.",
    },
    {
      emoji: "🔊", title: "Quando il mondo è troppo",
      text: "Se il tuo bambino si copre le orecchie, rifiuta certi vestiti, o reagisce in modo intenso a odori e luci, non sta facendo i capricci. Ridurre gli stimoli quando possibile, rispettare le sue preferenze sensoriali, creare un angolo tranquillo dove ritirarsi: sono gesti semplici che fanno molta differenza.",
    },
    {
      emoji: "🗣️", title: "Comunicazione chiara",
      text: "Frasi brevi. Una richiesta alla volta. Tempo per rispondere. Molti bambini non rispondono lentamente perché non hanno capito — hanno bisogno di più tempo per elaborare. Evita le domande doppie, evita il sarcasmo con i piccoli, usa il contatto visivo come invito e mai come obbligo.",
    },
    {
      emoji: "💪", title: "Valorizzare i punti di forza",
      text: "Un bambino che sa tutto sui dinosauri, che smonta e rimonta oggetti, che nota dettagli che nessun altro vede — non ha \"solo\" una fissazione. Ha un'area di competenza che può diventare una risorsa enorme. Le difficoltà vanno accompagnate, ma i punti di forza vanno alimentati: sono la base dell'autostima e spesso della futura direzione professionale.",
    },
    {
      emoji: "🤝", title: "Scuola: collaborare, non delegare",
      text: "La scuola è un partner, non un tribunale. Se il bambino ha una diagnosi, gli strumenti compensativi (PDP, PEI) sono un diritto, non un favore. Se non c'è ancora diagnosi, il dialogo con gli insegnanti resta fondamentale: quello che l'insegnante osserva in classe e quello che tu vedi a casa, insieme, formano il quadro completo. Chiedi incontri regolari — non solo quando c'è un problema.",
    },
  ];

  const percorsoSteps = [
    {
      emoji: "👩‍⚕️", title: "Il pediatra è il primo passo",
      text: "Non servono certezze per parlarne. Basta un'osservazione, un dubbio, una domanda. Il pediatra di libera scelta conosce il bambino nel tempo e può valutare se è il caso di approfondire con una visita specialistica. Non devi \"dimostrare\" nulla — devi solo raccontare quello che vedi.",
    },
    {
      emoji: "🏥", title: "La valutazione specialistica",
      text: "Se il pediatra lo ritiene opportuno, può inviare il bambino al servizio di Neuropsichiatria Infantile (NPI) della ASL — è gratuito e non richiede impegnativa a pagamento. La valutazione è un percorso, non un test singolo: include osservazione, colloqui con i genitori e spesso anche con la scuola.",
    },
    {
      emoji: "⏱️", title: "I tempi reali",
      text: "Le liste d'attesa nel servizio pubblico possono essere lunghe, da alcuni mesi a oltre un anno a seconda della regione. Mentre aspetti puoi comunque chiedere strategie al pediatra, parlare con la scuola, contattare associazioni che offrono orientamento.",
    },
    {
      emoji: "📋", title: "Dopo la valutazione",
      text: "Se emerge un profilo specifico, la diagnosi apre l'accesso a strumenti concreti: PDP per i DSA, PEI per le disabilità certificate, trattamenti riabilitativi nel servizio pubblico o convenzionato. Non è un'etichetta — è una chiave che apre porte.",
    },
    {
      emoji: "🔄", title: "Il percorso privato",
      text: "Se i tempi del pubblico non sono compatibili, un neuropsichiatra infantile o uno psicologo dell'età evolutiva possono effettuare la valutazione privatamente. Per i DSA la diagnosi privata va generalmente confermata dalla ASL per avere valore scolastico; la procedura varia da regione a regione.",
    },
  ];

  const [openCards, setOpenCards] = useState({});
  const toggleCard = (id) => setOpenCards(prev => ({ ...prev, [id]: !prev[id] }));

  const renderCard = (card, idx, prefix) => {
    const cardId = `${prefix}-${idx}`;
    const isOpen = openCards[cardId];
    return (
      <div key={cardId} id={cardId} style={{
        background: "white", borderRadius: 22,
        border: `1.5px solid ${isOpen ? "rgba(82,163,122,0.35)" : "rgba(0,0,0,0.06)"}`,
        overflow: "hidden", marginBottom: 12,
        boxShadow: isOpen ? "0 4px 20px rgba(82,163,122,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
        transition: "all 0.2s",
      }}>
        <button onClick={() => { toggleCard(cardId); if (!isOpen) scrollToCard(cardId); }} style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
          textAlign: "left", touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
        }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>{card.emoji}</span>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.deepSlate, flex: 1 }}>{card.title}</span>
          <span style={{ fontSize: 18, color: COLORS.slateLight, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
        </button>
        {isOpen && (
          <div style={{ padding: "0 20px 18px", borderTop: `1px solid rgba(0,0,0,0.05)` }}>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.75, margin: "14px 0 0" }}>
              {renderRichContent(card.text)}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: "#FFFCFA", minHeight: "100vh" }}>

      {/* ── Hero ── */}
      <div style={{
        background: "linear-gradient(160deg, #EDF6F3 0%, #F0F7F4 30%, #F5F0F8 65%, #FBEAF2 100%)",
        padding: isMobile ? "28px 16px 36px" : "36px 20px 48px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <span style={{ fontSize: 48, display: "block", marginBottom: 12 }}>🌿</span>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: COLORS.deepSlate, fontSize: isMobile ? 24 : 32,
            fontWeight: 700, lineHeight: 1.2, margin: "0 0 10px",
          }}>Ogni bambino è unico</h1>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: isMobile ? 16 : 20, fontWeight: 400, fontStyle: "italic",
            color: COLORS.slateLight, margin: "0 0 14px",
          }}>quando il percorso è diverso</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>

        {/* ── Disclaimer ── */}
        <div style={{
          background: "#F0F7F4", border: "1.5px solid #A8D5C2",
          borderRadius: 18, padding: "14px 18px", marginBottom: 28,
        }}>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: "#2D5740", fontSize: 14, lineHeight: 1.75, margin: 0 }}>
            <strong>🌿 Uno spazio per capire, non per etichettare.</strong>{" "}
            Questa sezione offre spunti per osservare con più consapevolezza il proprio bambino. Non contiene strumenti diagnostici e non sostituisce una valutazione specialistica. In caso di dubbi, parlarne con il pediatra è sempre il primo passo.
          </p>
        </div>

        {/* ── Tab bar ── */}
        <div id="main-tab-bar" role="tablist" aria-label="Sezioni Ogni bambino è unico" style={{
          display: "flex", gap: 6, marginBottom: 28, overflowX: "auto",
          scrollbarWidth: "none", msOverflowStyle: "none",
          paddingBottom: 4,
        }}>
          {tabs.map(t => (
            <button key={t.id} role="tab" aria-selected={activeTab === t.id} onClick={() => { setActiveTab(t.id); setOpenCards({}); }} style={{
              background: activeTab === t.id ? "#52A37A" : "white",
              color: activeTab === t.id ? "white" : COLORS.deepSlate,
              border: activeTab === t.id ? "none" : `1.5px solid rgba(0,0,0,0.08)`,
              borderRadius: 20, padding: isMobile ? "8px 14px" : "8px 18px",
              fontFamily: "'Nunito', sans-serif", fontSize: isMobile ? 12 : 13,
              fontWeight: activeTab === t.id ? 800 : 600,
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              boxShadow: activeTab === t.id ? "0 2px 10px rgba(82,163,122,0.3)" : "none",
              touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
              transition: "all 0.17s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ═══ TAB: CAPIRE ═══ */}
        {activeTab === "capire" && (
          <div>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, lineHeight: 1.75, marginBottom: 24 }}>
              Ogni bambino cresce a modo suo. Alcuni hanno un modo diverso di percepire il mondo, di muoversi, di comunicare, di imparare. Non migliore, non peggiore — diverso. Capire queste differenze è il primo passo per accompagnarle nel modo giusto.
            </p>
            {capireCards.map((c, i) => renderCard(c, i, "capire"))}

            {/* Box chiusura + paragrafo sostitutivo di "Osservare" */}
            <div style={{
              background: "linear-gradient(135deg, #F0F7F4, #EDF6F3)",
              border: "1.5px solid #A8D5C2", borderRadius: 18,
              padding: "16px 20px", marginTop: 24,
            }}>
              <p style={{ fontFamily: "'Nunito', sans-serif", color: "#2D5740", fontSize: 14, lineHeight: 1.75, margin: 0 }}>
                Queste aree non sono diagnosi. Sono modi di guardare il tuo bambino con attenzione e curiosità. Se noti una fatica persistente in più di un'area, parlane con il pediatra — è il passo più semplice e più utile. Nelle prossime tab trovi strategie pratiche e indicazioni su come muoverti.
              </p>
            </div>
          </div>
        )}

        {/* ═══ TAB: NELLA VITA DI OGNI GIORNO ═══ */}
        {activeTab === "strategie" && (
          <div>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, lineHeight: 1.75, marginBottom: 24 }}>
              Non servono tecniche complicate. Servono piccoli aggiustamenti che possono fare una grande differenza — per qualsiasi bambino, con o senza una diagnosi.
            </p>
            {strategieCards.map((c, i) => renderCard(c, i, "strategie"))}
          </div>
        )}

        {/* ═══ TAB: A CHI RIVOLGERSI ═══ */}
        {activeTab === "percorso" && (
          <div>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, lineHeight: 1.75, marginBottom: 24 }}>
              Non devi avere una diagnosi in tasca per chiedere aiuto. Basta un dubbio, un'osservazione, una domanda. Ecco il percorso, passo dopo passo.
            </p>
            {percorsoSteps.map((step, i) => (
              <div key={i} style={{
                display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-start",
              }}>
                {/* Step number + icon */}
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "linear-gradient(135deg, #52A37A, #6BAE8A)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, boxShadow: "0 2px 10px rgba(82,163,122,0.25)",
                }}>
                  <span style={{ fontSize: 22 }}>{step.emoji}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: 800,
                    color: COLORS.deepSlate, margin: "0 0 6px",
                  }}>Step {i + 1} — {step.title}</h3>
                  <p style={{
                    fontFamily: "'Nunito', sans-serif", fontSize: 14, lineHeight: 1.75,
                    color: COLORS.deepSlate, margin: 0,
                  }}>{renderRichContent(step.text)}</p>
                </div>
              </div>
            ))}

            {/* ── Card risorse cliccabili ── */}
            <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 20, marginTop: 36, marginBottom: 8 }}>
              🔗 Risorse utili
            </h3>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 14, fontStyle: "italic", marginBottom: 16 }}>
              Portali istituzionali per famiglie
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {OB_RISORSE.servizi.map((srv, i) => (
                <a key={i} href={srv.url} target="_blank" rel="noopener noreferrer" style={{
                  background: "white", borderRadius: 18, border: "1.5px solid rgba(0,0,0,0.06)",
                  padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start",
                  textDecoration: "none", color: "inherit",
                  transition: "border-color 0.18s, box-shadow 0.18s", cursor: "pointer",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#52A37A"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(82,163,122,0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{srv.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: 800, color: COLORS.deepSlate, marginBottom: 2 }}>{srv.title}</div>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: COLORS.slateLight, lineHeight: 1.6 }}>{srv.text}</div>
                  </div>
                  <span style={{ fontSize: 14, color: "#52A37A", flexShrink: 0, marginTop: 2 }}>↗</span>
                </a>
              ))}
            </div>

            {/* Footer bibliografico */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: COLORS.slateLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Riferimenti scientifici</p>
              {OB_RISORSE.footer.map((ref, i) => (
                <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer" style={{
                  display: "block", fontFamily: "'Nunito', sans-serif", fontSize: 12,
                  color: COLORS.slateLight, textDecoration: "underline", textUnderlineOffset: 2,
                  marginBottom: 4, lineHeight: 1.5,
                }}>{ref.label}</a>
              ))}
            </div>
          </div>
        )}

        {/* ── Box chiusura sezione ── */}
        <div style={{
          background: "linear-gradient(135deg, #FFF9F2, #FBEAF2)",
          border: `1.5px solid ${COLORS.roseLight}`, borderRadius: 22,
          padding: "18px 22px", marginTop: 36, textAlign: "center",
        }}>
          <p style={{
            fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate,
            fontSize: isMobile ? 16 : 18, fontWeight: 700, fontStyle: "italic",
            lineHeight: 1.6, margin: 0,
          }}>
            Non devi avere le risposte. Devi solo sentirti libero di fare la domanda.{" "}
            <span style={{ color: COLORS.slateLight, fontWeight: 400 }}>Il pediatra è lì per questo.</span>
          </p>
        </div>

        {/* ── CrossLinks verso altre sezioni ── */}
        <CrossLinks cards={[
          { emoji: "🏠", label: "Separazione", desc: "Quando la famiglia cambia forma", section: "separazione", bg: "#FFF5F0" },
          { emoji: "🕊️", label: "Lutto", desc: "Quando qualcuno non c'è più", section: "lutto", bg: "#F5F0F8" },
        ]} />

      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   🏠 SEPARAZIONE — Dati per fascia evolutiva
═══════════════════════════════════════════════════════════════ */
const SEPARAZIONE_GATE = {
  title: "Prima di entrare",
  text: "Questa sezione affronta un tema delicato e personale. I contenuti che troverai sono informativi e basati sulla letteratura scientifica — non sostituiscono il supporto di un professionista e non possono tenere conto della tua situazione specifica. Se stai attraversando questo momento, prenditi il tempo che ti serve. Non c'è fretta.",
  cta: "Prosegui",
  footer: "Se senti il bisogno di parlare con qualcuno, puoi rivolgerti al consultorio familiare della tua ASL, a un servizio di mediazione familiare o a uno psicologo dell'età evolutiva.",
  disclaimer_rafforzato: "I contenuti di questa sezione non contengono indicazioni legali di alcun tipo. In caso di separazione conflittuale con figli minori, è raccomandato rivolgersi a un mediatore familiare qualificato e, se necessario, a un avvocato specializzato in diritto di famiglia.",
};

const SEPARAZIONE_DATA = {
  "0-3": {
    comprensione: "Il bambino sotto i tre anni non comprende il concetto di separazione come evento relazionale tra i genitori. Non ha le strutture cognitive per capire cosa significhi \"mamma e papà non stanno più insieme\". Quello che percepisce, però, è **l'assenza** — e la percepisce nel corpo prima che nella mente. Se una delle due figure di riferimento sparisce dalla routine quotidiana, il suo sistema di attaccamento si attiva: cerca, protesta, si disorienta. Bowlby (1973) ha descritto questa sequenza come protesta → disperazione → distacco, e si manifesta con la stessa intensità sia che il genitore sia in viaggio di lavoro sia che se ne sia andato per sempre. Per il bambino di quest'età non esiste differenza tra un'assenza temporanea e una definitiva — entrambe sono vissute come perdita, finché l'esperienza ripetuta del ritorno non costruisce prevedibilità.",
    comprensione_ref: "Bowlby, \"Separation: Anxiety and Anger\" (1973); Ainsworth et al., \"Patterns of Attachment\" (1978); Mahler, Pine & Bergman, \"The Psychological Birth of the Human Infant\" (1975)",
    reazioni_tipiche: [
      { icon: "🔙", title: "Regressioni", text: "Il bambino che aveva conquistato un'autonomia (dormire nel suo letto, usare il vasino, mangiare da solo) può tornare indietro. Non è un capriccio — è il sistema nervoso che cerca sicurezza nel già conosciuto." },
      { icon: "🌙", title: "Disturbi del sonno", text: "Risvegli notturni più frequenti, difficoltà ad addormentarsi senza contatto fisico, incubi. Il sonno è il momento in cui il bambino \"lascia andare\" il controllo — e se il mondo è diventato meno prevedibile, lasciare andare spaventa." },
      { icon: "😢", title: "Irritabilità e pianto aumentato", text: "Il bambino non sa dire \"sono confuso\", ma lo comunica con il corpo. Pianti inconsolabili, agitazione motoria, difficoltà a calmarsi anche in braccio." },
      { icon: "🤲", title: "Attaccamento intensificato", text: "Si aggrappa al genitore presente, protesta violentemente alla separazione anche breve (inserimento al nido, babysitter). Non è manipolazione — è il tentativo di non perdere anche l'altro." },
      { icon: "🍼", title: "Cambiamenti nell'alimentazione", text: "Rifiuto del cibo o, al contrario, bisogno di mangiare più spesso come modo per cercare sicurezza attraverso un gesto rassicurante e familiare." },
    ],
    reazioni_ref: "Amato & Keith (1991), meta-analisi sugli effetti del divorzio per fascia d'età; Solomon & George (1999) sull'attaccamento disorganizzato in contesti di separazione",
    cosa_aiuta_cards: [
      { icon: "🔄", title: "Prevedibilità", text: "La parola chiave in questa fascia è **prevedibilità**. Il bambino non può capire perché il suo mondo è cambiato, ma può imparare che il nuovo mondo ha una struttura affidabile. Le routine — il rituale della buonanotte, il momento del pasto, la sequenza del mattino — sono l'architettura della sicurezza per un bambino sotto i tre anni. Non servono spiegazioni elaborate: serve che le cose accadano nello stesso modo, alla stessa ora, con la stessa calma, in entrambe le case." },
      { icon: "🧸", title: "L'oggetto ponte", text: "Il passaggio da una casa all'altra è il momento più delicato. Un [[oggetto transizionale]] — il peluche, la copertina, qualcosa che profuma dell'altra casa — funziona come ponte emotivo. Winnicott lo sapeva: l'oggetto transizionale porta con sé il legame anche quando il genitore non c'è fisicamente. In un contesto di separazione, questo oggetto diventa ancora più prezioso." },
      { icon: "🤝", title: "Entrambi presenti", text: "Il bambino ha bisogno che entrambi i genitori restino emotivamente disponibili e coerenti. Non significa essere d'accordo su tutto — significa non far passare il conflitto attraverso il corpo e le reazioni del bambino." },
      { icon: "🌡️", title: "La calma del passaggio", text: "La [[co-regolazione]] resta il meccanismo fondamentale: quando il genitore è calmo al momento del passaggio, il [[cortisolo]] del bambino scende. Quando il genitore è teso, impaurito o arrabbiato, il bambino assorbe quella tensione senza poterla nominare." },
    ],
    cosa_aiuta_ref: "Emery, \"Renegotiating Family Relationships\" (2012); Schore, \"Affect Regulation and the Origin of the Self\" (2003); Winnicott, \"Playing and Reality\" (1971)",
    cosa_evitare_cards: [
      { icon: "🚫", title: "Non usarlo come termometro", text: "Il bambino sotto i tre anni non va usato come termometro emotivo dell'altro genitore. Domande come \"com'era papà?\" o \"mamma era triste?\" lo caricano di una responsabilità emotiva che non può reggere. Non è un informatore — è un bambino che ha bisogno di amare entrambi i genitori senza sentire che amare uno significhi tradire l'altro." },
      { icon: "⚡", title: "Transizioni caotiche", text: "Le transizioni caotiche — orari che cambiano, arrivi in ritardo non spiegati, litigi sulla porta — sono la fonte di stress più documentata per i bambini piccoli in contesti di separazione. Il conflitto interparentale visibile è il singolo fattore più dannoso, più della separazione in sé (Amato, 2001): non è la struttura familiare che predice il benessere del bambino, ma il livello di conflitto a cui è esposto." },
      { icon: "👋", title: "Non sparire senza salutare", text: "Evitare di sparire senza spiegazione, anche se il bambino \"tanto non capisce\". Capisce molto più di quanto verbalizzi. Un saluto breve, caldo e onesto — \"vado, torno domani, la mamma è qui con te\" — vale più di qualsiasi strategia di distrazione." },
    ],
    cosa_evitare_ref: "Amato, \"Children of Divorce in the 1990s\" (2001); Cummings & Davies, \"Marital Conflict and Children\" (2010)",
    segnali_professionista: [
      "Le regressioni persistono oltre le 6–8 settimane senza alcun miglioramento.",
      "Il bambino smette di cercare il contatto — non protesta più, si ritira in un'apparente indifferenza. Questo non è adattamento: può essere distacco difensivo.",
      "Compaiono comportamenti autoconsolatori ripetitivi e intensi: dondolamento prolungato, battere la testa, strapparsi i capelli.",
      "Il sonno è gravemente compromesso per settimane (risvegli ogni ora, terrori notturni frequenti).",
      "Il bambino mostra paura intensa e persistente di uno dei due genitori.",
    ],
    segnali_intro: "Nella maggior parte dei casi le reazioni descritte sopra si attenuano entro alcune settimane, man mano che il bambino sperimenta la nuova routine come prevedibile. Serve una valutazione professionale quando:",
    segnali_footer: "In questi casi il riferimento è il pediatra, il consultorio familiare o uno psicologo dell'età evolutiva. Non come ultima spiaggia — come strumento tempestivo.",
    segnali_ref: "Linee guida SINPIA; Solomon & George (1999)",
    tips: [
      "Mantieni le routine identiche in entrambe le case — stessa sequenza della buonanotte, stessi rituali del pasto.",
      "Lascia che porti con sé un [[oggetto transizionale]] da una casa all'altra — non è un vizio, è un ponte.",
      "Saluta sempre quando vai via, anche se piange. Sparire è peggio del pianto.",
      "Non chiedere mai \"vuoi stare con mamma o con papà?\" — è una domanda impossibile a quest'età.",
      "Al momento del passaggio, sii calmo. La tua calma è la sua.",
    ],
  },
  "3-6": {
    comprensione: "Tra i tre e i sei anni il bambino inizia a costruire narrazioni — e la separazione dei genitori diventa una storia che ha bisogno di un senso. Il problema è che il pensiero di questa età è ancora egocentrico nel senso piagetiano del termine: il bambino si colloca al centro di ogni evento. Se i genitori si separano, la spiegazione più accessibile alla sua mente è \"è colpa mia\". Qualcosa che ho fatto, qualcosa che ho detto, qualcosa che ho pensato ha causato questa rottura. Questa colpevolizzazione non è sempre esplicita — a volte si manifesta come un tentativo frenetico di \"fare il bravo\" per riparare la situazione, come se un comportamento perfetto potesse ricucire il legame tra i genitori.\n\nIl bambino di questa età capisce che qualcosa è cambiato, ma non capisce l'irreversibilità. Può continuare a chiedere \"quando torna papà a casa?\" per settimane, mesi. Non è provocazione — è il [[pensiero magico]] tipico della fase: se lo desidero abbastanza forte, succederà. La fantasia di riconciliazione è una delle reazioni più documentate in questa fascia e può persistere anche anni dopo la separazione (Wallerstein & Kelly, 1980).",
    comprensione_ref: "Wallerstein & Kelly, \"Surviving the Breakup\" (1980); Piaget, \"La représentation du monde chez l'enfant\" (1926)",
    reazioni_tipiche: [
      { icon: "😔", title: "Senso di colpa", text: "\"Se facevo il bravo, papà non se ne andava.\" Può manifestarsi come ipercompliance — un bambino improvvisamente \"troppo buono\", che non protesta mai, che cerca di compiacere entrambi i genitori. Non è maturazione precoce — è ansia." },
      { icon: "🌈", title: "Fantasia di riconciliazione", text: "Disegna la famiglia ancora unita, chiede ai genitori di dormire insieme, inventa occasioni per riunirli. Può durare molto a lungo." },
      { icon: "👻", title: "Paure amplificate", text: "Le paure evolutive normali di questa fascia (buio, mostri, abbandono) si intensificano. La paura di perdere anche l'altro genitore è centrale — \"se papà è andato via, anche mamma potrebbe andare via\"." },
      { icon: "🔙", title: "Regressioni selettive", text: "Pipì a letto dopo mesi di continenza, ritorno al linguaggio infantile, richiesta del ciuccio abbandonato. Sono più evidenti nei momenti di transizione tra le due case." },
      { icon: "🌪️", title: "Aggressività o ritiro", text: "Alcuni bambini esternalizzano (rabbia, crisi, provocazioni), altri internalizzano (silenzio, tristezza, ritiro dal gioco con i pari). Entrambe le direzioni sono risposte legittime allo stesso dolore." },
      { icon: "🧸", title: "Gioco simbolico rivelatore", text: "Pupazzi che litigano, case che si rompono, famiglie che si riuniscono. Il gioco è il linguaggio clinico di questa età — quello che il bambino non può dire, lo mette in scena." },
    ],
    reazioni_ref: "Wallerstein & Kelly (1980); Amato (2001); Emery (2012)",
    cosa_aiuta_cards: [
      { icon: "💬", title: "Parole vere e ripetibili", text: "A questa età il bambino ha bisogno di **parole vere, semplici e ripetibili**. La spiegazione della separazione va data insieme, se possibile, da entrambi i genitori — e deve contenere tre messaggi fondamentali: non è colpa tua, non puoi aggiustarlo, e ti vogliamo bene tutti e due uguale. Queste tre frasi vanno ripetute, non dette una volta sola. Il bambino testerà la loro solidità nel tempo, perché ha bisogno di verificare che siano ancora vere." },
      { icon: "🏗️", title: "Linguaggio concreto", text: "Il linguaggio deve essere concreto, non astratto. \"Mamma e papà vivranno in due case diverse\" è comprensibile. \"Mamma e papà non vanno più d'accordo come coppia ma restano genitori\" è troppo astratto per un bambino di quattro anni — lo confonde e lo spaventa, perché \"non andare d'accordo\" nella sua esperienza significa litigare, e litigare significa pericolo." },
      { icon: "🧸", title: "Proteggere il gioco simbolico", text: "Il gioco simbolico va accolto e protetto, non corretto. Se il bambino mette in scena famiglie che si rompono e si ricompongono, sta elaborando. Interrompere quel gioco o commentarlo (\"ma non è così, papà non torna\") blocca il processo. Il genitore che si siede accanto e guarda, senza interpretare né correggere, offre un contenimento prezioso." },
      { icon: "🏠", title: "Coerenza tra le due case", text: "La coerenza tra le due case non significa identità rigida: significa che le regole fondamentali (orari del sonno, poche cose non negoziabili) siano allineate, e che il bambino non senta di vivere in due mondi con leggi opposte. Il bambino di questa età è un osservatore acutissimo delle incongruenze — e ogni contraddizione tra i genitori genera in lui l'ansia di dover scegliere da che parte stare." },
    ],
    cosa_aiuta_ref: "Emery, \"Renegotiating Family Relationships\" (2012); Winnicott, \"Playing and Reality\" (1971)",
    cosa_evitare_cards: [
      { icon: "🪞", title: "Non svalutare l'altro genitore", text: "Il bambino di 3–6 anni è nel pieno dello sviluppo del pensiero morale: comincia a dividere il mondo in \"buoni\" e \"cattivi\". Se un genitore parla male dell'altro — anche in modo indiretto, anche con un sospiro, un'espressione facciale, un silenzio carico — il bambino assorbe quel giudizio e lo porta dentro di sé. E poiché sa di essere fatto di entrambi i genitori, svalutare uno significa svalutare una parte di lui." },
      { icon: "⚖️", title: "Il conflitto di lealtà", text: "Il [[conflitto di lealtà]] è la trappola più dolorosa di questa fase. Si attiva ogni volta che il bambino sente di dover scegliere — esplicitamente (\"con chi vuoi stare a Natale?\") o implicitamente (\"ah, da papà mangi i dolci a cena?\"). Ogni domanda che contiene un giudizio sull'altro genitore mette il bambino in una posizione impossibile: per proteggere un legame, deve tradire l'altro." },
      { icon: "📨", title: "Non usarlo come messaggero", text: "Non usare mai il bambino come messaggero (\"di' a mamma che...\"). Non interrogarlo al ritorno dall'altra casa (\"cos'avete fatto? c'era qualcuno?\"). Non reagire con visibile dolore o rabbia quando il bambino racconta di essersi divertito con l'altro genitore — quel racconto non è un tradimento, è un bambino che si fida abbastanza di te da condividere la sua gioia." },
      { icon: "🌈", title: "Non promettere la riconciliazione", text: "Non promettere la riconciliazione per consolarlo, anche quando la tentazione è fortissima. Le false speranze prolungano la fantasia di riunione e impediscono l'adattamento. Meglio la verità gentile: \"Mamma e papà non torneranno a vivere insieme, ma ti vogliono bene tutti e due, e questo non cambierà mai.\"" },
    ],
    cosa_evitare_ref: "Amato, \"The Consequences of Divorce for Adults and Children\" (2000); Buchanan, Maccoby & Dornbusch, \"Adolescents After Divorce\" (1996); Minuchin, \"Families and Family Therapy\" (1974) sulla [[triangolazione]]",
    segnali_professionista: [
      "Il senso di colpa è pervasivo e dichiarato: il bambino dice esplicitamente \"è colpa mia\" e nessuna rassicurazione lo scalfisce.",
      "L'ansia di separazione dal genitore presente diventa invalidante: non riesce a restare a scuola, non tollera nessun distacco nemmeno brevissimo.",
      "Il gioco scompare — il bambino smette di giocare, di inventare, di fare finta. La perdita del gioco simbolico è un segnale clinico importante a questa età.",
      "Compaiono sintomi somatici persistenti senza causa medica: mal di pancia cronico, cefalee, enuresi che non si risolve.",
      "Il bambino mostra un cambiamento marcato di personalità: da espansivo a chiuso, o da tranquillo a costantemente aggressivo, per più di 4–6 settimane.",
      "Rifiuta attivamente uno dei due genitori con angoscia — non con la normale preferenza momentanea, ma con paura reale.",
    ],
    segnali_intro: "L'elaborazione della separazione in questa fascia richiede tempo — settimane, a volte alcuni mesi. La maggior parte dei bambini si stabilizza quando la nuova routine diventa prevedibile. Serve una valutazione quando:",
    segnali_footer: "Il riferimento è il pediatra, il consultorio familiare o uno psicologo dell'età evolutiva. La mediazione familiare è una risorsa specifica per ridurre il conflitto interparentale.",
    segnali_ref: "Linee guida SINPIA; Emery (2012); Wallerstein (2000)",
    tips: [
      "\"Non è colpa tua\" — diglielo con parole chiare, più di una volta, e poi ancora.",
      "Non correggere il gioco simbolico in cui mette in scena la famiglia: sta elaborando, lascialo lavorare.",
      "Quando racconta qualcosa di bello fatto con l'altro genitore, sorridi. Quel sorriso vale più di mille discorsi.",
      "Le transizioni funzionano meglio se brevi e ritualizzate: stesso giorno, stessa ora, stesso saluto.",
      "Se chiede \"perché?\", rispondi con onestà semplice — non servono dettagli, serve verità.",
      "Non forzarlo mai a scegliere tra voi due, nemmeno per le piccole cose.",
    ],
  },
  "6-12": {
    comprensione: "Il bambino tra i sei e i dodici anni capisce la separazione — la capisce davvero. Sa che i genitori non vivranno più insieme, sa che non è una cosa temporanea, e spesso sa molto più di quanto gli adulti credano, perché ha ascoltato conversazioni, registrato tensioni, colto silenzi. La comprensione cognitiva, però, non significa comprensione emotiva: sapere cosa sta succedendo non lo protegge dal dolore. Anzi, in questa fascia può amplificarlo, perché il bambino ha abbastanza strumenti per capire la portata della perdita, ma non abbastanza maturità per elaborarla senza aiuto.\n\nÈ l'età in cui emerge con forza il **senso di giustizia**. Il bambino ragiona in termini morali — chi ha ragione, chi ha torto, chi ha \"rotto\" la famiglia. Cerca un colpevole, perché trovare un colpevole dà ordine a un'esperienza caotica. Questa ricerca può portare a schierarsi con un genitore contro l'altro — non per scelta ideologica, ma per bisogno psicologico di semplificazione. Wallerstein (2000) ha documentato come l'alleanza rigida con un genitore sia una delle difese più comuni in questa fascia, e una delle più costose a lungo termine.",
    comprensione_ref: "Wallerstein, \"The Unexpected Legacy of Divorce\" (2000); Amato, \"Children of Divorce in the 1990s\" (2001); Piaget, \"Il giudizio morale nel fanciullo\" (1932)",
    reazioni_tipiche: [
      { icon: "🔥", title: "Rabbia", text: "È la reazione più visibile. Rabbia verso il genitore percepito come responsabile, rabbia verso entrambi, rabbia verso la situazione. Può esplodere a scuola, con i pari, in contesti che non c'entrano nulla con la separazione — perché a quest'età il bambino inizia a spostare le emozioni, ma non sa ancora farlo in modo consapevole." },
      { icon: "😶", title: "Vergogna sociale", text: "Tra i sei e i dodici anni il gruppo dei pari conta enormemente. Il bambino può sentirsi \"diverso\" — soprattutto se nel suo contesto la separazione è ancora percepita come eccezione o fallimento. Può evitare di parlarne, mentire sulla struttura familiare, rifiutare che i compagni vengano a casa." },
      { icon: "💔", title: "Conflitto di lealtà consapevole", text: "A differenza del bambino più piccolo, quello di questa fascia percepisce il [[conflitto di lealtà]] e ne soffre con lucidità. Sa che se racconta a mamma di essersi divertito con papà, mamma si rattrista. Impara a censurare, a calibrare cosa dire a chi — e questo lavoro emotivo è estenuante." },
      { icon: "📉", title: "Calo scolastico", text: "La concentrazione richiede energia mentale, e l'energia mentale è assorbita dalla gestione emotiva della separazione. Il calo di rendimento è uno dei marcatori più studiati (Amato, 2001) — non è svogliatezza, è sovraccarico." },
      { icon: "🤒", title: "Sintomi somatici", text: "Mal di pancia la domenica sera prima del passaggio, cefalee il lunedì mattina, stanchezza cronica. Il corpo parla quando la bocca tace." },
      { icon: "🔄", title: "Parentificazione", text: "Alcuni bambini — più spesso le femmine, più spesso i primogeniti — assumono un ruolo di cura verso il genitore che percepiscono come più fragile. Consolano, mediano, si fanno carico. Non è maturità — è inversione di ruolo, e ha un costo documentato sulla salute emotiva futura ([[parentificazione]])." },
    ],
    reazioni_ref: "Amato (2001, 2010); Wallerstein (2000); Jurkovic, \"Lost Childhoods\" (1997)",
    cosa_aiuta_cards: [
      { icon: "💡", title: "Verità proporzionata", text: "Il bambino di questa fascia ha bisogno di **verità proporzionata e spazio per le emozioni scomode**. Può ricevere spiegazioni più articolate — ma \"più articolate\" non significa \"tutti i dettagli\". Ha bisogno di sapere che la decisione è degli adulti, che è definitiva, e che non gli viene chiesto di giudicarla. Ha bisogno, soprattutto, del permesso esplicito di amare entrambi i genitori senza che questo sia un problema per nessuno." },
      { icon: "🔥", title: "Accogliere la rabbia", text: "La rabbia va accolta, non repressa. Un bambino di otto anni che dice \"vi odio tutti e due\" non sta mancando di rispetto — sta comunicando un dolore che non sa dire altrimenti. La risposta più efficace non è il rimprovero né la giustificazione — è il riconoscimento: \"Capisco che sei arrabbiato. Hai il diritto di esserlo. Sono qui.\" Questo non significa accettare comportamenti distruttivi: significa distinguere tra l'emozione (legittima) e il comportamento (contenibile)." },
      { icon: "📋", title: "Risposte concrete", text: "Le informazioni pratiche contano molto a quest'età. Il bambino vuole sapere dove vivrà, dove andrà a scuola, dove saranno le sue cose, se potrà vedere i suoi amici, cosa succede a Natale. Sono domande concrete che meritano risposte concrete — non vaghe promesse. Ogni risposta chiara riduce l'ansia; ogni \"vedremo\" la amplifica." },
      { icon: "👫", title: "Il potere delle amicizie", text: "Il rapporto con i pari è un fattore protettivo potente. Il bambino che ha almeno un'amicizia solida attraversa la separazione con più risorse. Facilitare la socializzazione — invitare amici, mantenere le attività sportive, non isolare il bambino nella logistica delle due case — è un investimento diretto sulla sua [[resilienza]]." },
    ],
    cosa_aiuta_ref: "Emery (2012); Hetherington & Kelly, \"For Better or For Worse\" (2002)",
    cosa_evitare_cards: [
      { icon: "🔄", title: "No alla parentificazione", text: "La [[parentificazione]] è il rischio specifico di questa fascia e va attivamente prevenuta. Il bambino non è il confidente del genitore, non è il suo terapeuta, non è il suo alleato nella guerra con l'ex partner. \"Tu mi capisci meglio di chiunque altro\" detto a un figlio di dieci anni non è un complimento — è un fardello. Il bambino ha bisogno di sentirsi accudito, non di accudire." },
      { icon: "✋", title: "Non chiedere di scegliere", text: "Non chiedere al bambino di scegliere con chi vivere. Anche quando la legge prevede che il minore venga ascoltato, l'ascolto del minore è una procedura protetta condotta da professionisti formati — non una domanda fatta in cucina. Mettere un bambino di fronte a questa scelta nella vita quotidiana è una violenza emotiva, anche se fatta con le migliori intenzioni." },
      { icon: "💰", title: "Il denaro fuori dal conflitto", text: "Non usare il denaro come linguaggio del conflitto. \"Papà non paga il mantenimento\", \"mamma spende i soldi per sé\" — queste frasi raggiungono il bambino anche quando non gli sono dette direttamente. Il bambino non deve sapere nulla della dimensione economica del conflitto tra i genitori." },
      { icon: "🛡️", title: "Proteggere l'immagine di entrambi", text: "Non esporre il bambino ai dettagli della separazione: tradimenti, motivi personali, rancori. Il suo bisogno è di mantenere un'immagine sufficientemente buona di entrambi i genitori — non perché siano perfetti, ma perché da quell'immagine dipende la costruzione della propria identità. Distruggere l'immagine di un genitore nella mente di un figlio è distruggere un pezzo del figlio." },
    ],
    cosa_evitare_ref: "Amato (2000); Emery (2012); Jurkovic (1997)",
    segnali_professionista: [
      "Calo scolastico marcato e persistente — non un brutto voto, ma un cambiamento di traiettoria che dura più di un trimestre.",
      "Ritiro sociale: il bambino smette di cercare gli amici, rifiuta inviti, si isola.",
      "Aggressività che non si attenua con il tempo e che si estende a contesti diversi dalla famiglia.",
      "Il bambino prende esplicitamente le parti di un genitore e rifiuta rigidamente l'altro — non con la normale preferenza momentanea, ma con un'alleanza fissa e carica di disprezzo o paura.",
      "Autoaccuse persistenti: continua a dire o a credere che la separazione sia colpa sua nonostante le rassicurazioni ripetute.",
      "Segnali di [[parentificazione]] avanzata: si preoccupa costantemente per il benessere emotivo di un genitore, fatica a concentrarsi su altro, rinuncia alle proprie attività per \"stare vicino\" al genitore fragile.",
      "Disturbi alimentari emergenti, autolesionismo, idee di morte.",
    ],
    segnali_intro: "Il bambino di questa fascia è capace di mascherare il disagio per un tempo sorprendentemente lungo. Proprio per questo, i segnali vanno cercati con attenzione:",
    segnali_footer: "Il riferimento è lo psicologo dell'età evolutiva, il consultorio familiare o il servizio di neuropsichiatria infantile. La mediazione familiare è una risorsa specifica per ridurre il conflitto interparentale — che resta il fattore più dannoso in assoluto.",
    segnali_ref: "Linee guida SINPIA; Amato (2001); Emery (2012)",
    tips: [
      "Ripeti spesso — con i fatti, non solo con le parole — che amare un genitore non significa tradire l'altro.",
      "Non chiedergli com'è stato dall'altro genitore con tono investigativo — chiediglielo come chiederesti di una giornata a scuola.",
      "Proteggi il suo tempo da bambino: non è il tuo confidente, il tuo alleato, il tuo messaggero.",
      "Mantieni sport, amici, attività — sono ancore di normalità.",
      "Se il rendimento scolastico cala, parla con gli insegnanti prima di parlare con lui. Capire se c'è un cambiamento a scuola aiuta a calibrare la risposta.",
      "Quando è arrabbiato con te per la separazione, non difenderti. Ascolta. La rabbia accolta si spegne; la rabbia respinta si cronicizza.",
      "Se senti che si sta prendendo cura di te, fermati. È il segnale che i ruoli si stanno invertendo.",
    ],
  },
  "12-15": {
    comprensione: "Il preadolescente capisce tutto. Capisce la separazione, capisce i motivi — spesso li ha intuiti prima dell'annuncio — e capisce anche quello che i genitori cercano di nascondergli. Ha un pensiero ipotetico-deduttivo ormai funzionante: sa immaginare scenari alternativi (\"se non avessero litigato quella sera\"), sa attribuire cause complesse, sa giudicare. E giudica. La separazione dei genitori arriva in un momento evolutivo in cui il ragazzo sta già facendo un lavoro psichico enorme: separarsi lui stesso dalla famiglia, costruire un'identità autonoma, rinegoziare il rapporto con le figure di autorità. Se i genitori si separano mentre lui sta cercando di separarsi da loro, i due processi si intrecciano e si complicano a vicenda.\n\nC'è un paradosso specifico di questa fascia: il ragazzo che sta lottando per la propria indipendenza può sentirsi improvvisamente risucchiato indietro dalla separazione dei genitori — richiamato a un ruolo di cura, di mediazione, di testimone che non ha chiesto. Oppure, all'opposto, può usare la separazione come acceleratore di un'autonomia prematura e non sostenuta: \"tanto non gliene importa niente a nessuno, faccio quello che voglio.\" Entrambe le direzioni sono risposte a uno stesso bisogno tradito — quello di avere una [[base sicura]] da cui partire, non una base che si sta sgretolando.",
    comprensione_ref: "Wallerstein, \"The Unexpected Legacy of Divorce\" (2000); Steinberg, \"Adolescence\" (12ª ed.); Amato (2010)",
    reazioni_tipiche: [
      { icon: "⚖️", title: "Rabbia morale", text: "Non è più la rabbia indifferenziata del bambino piccolo — è un giudizio. Il preadolescente cerca il colpevole, e quando lo trova (o crede di averlo trovato) può schierarsi con una rigidità feroce. \"Tu hai rovinato tutto\" — una frase che può sentirsi rivolgere il genitore percepito come responsabile. Non è una sentenza definitiva — è un'emozione travestita da verdetto." },
      { icon: "😐", title: "Indifferenza apparente", text: "\"Non mi interessa\", \"fate quello che volete\", \"è uguale\". Questa facciata può convincere i genitori che il ragazzo stia bene. Raramente è così. L'indifferenza ostentata è spesso il modo in cui il preadolescente protegge la propria vulnerabilità — perché a quest'età mostrare dolore è percepito come debolezza." },
      { icon: "😶", title: "Vergogna amplificata", text: "Il gruppo dei pari è il centro di gravità emotiva. La separazione può essere vissuta come marchio, come difetto, come motivo di esclusione — anche quando oggettivamente non lo è. Il ragazzo può nascondere la situazione familiare agli amici." },
      { icon: "⚡", title: "Acting out", text: "Comportamenti rischiosi, trasgressioni, sfide all'autorità che vanno oltre la normale sperimentazione preadolescenziale. L'uso eccessivo di schermi come fuga, le trasgressioni alle regole e le provocazioni relazionali sono le forme più comuni di [[acting out]] in questa fascia oggi." },
      { icon: "📉", title: "Rendimento scolastico oscillante", text: "Non sempre un calo lineare — più spesso un andamento imprevedibile, con punte di performance alternati a crolli inspiegabili. La discontinuità riflette la discontinuità emotiva interna." },
      { icon: "🔄", title: "Parentificazione consapevole", text: "A differenza del bambino di 8 anni che si parentifica senza saperlo, il preadolescente spesso sceglie attivamente di fare il genitore del genitore fragile. \"Mamma ha bisogno di me\" diventa un'identità — e rinunciarci genera senso di colpa ([[parentificazione]])." },
    ],
    reazioni_ref: "Hetherington & Kelly (2002); Buchanan, Maccoby & Dornbusch, \"Adolescents After Divorce\" (1996); Jurkovic (1997)",
    cosa_aiuta_cards: [
      { icon: "🎯", title: "Onestà calibrata", text: "Il preadolescente ha bisogno di **onestà calibrata**. Non vuole le spiegazioni semplificate che funzionavano a sei anni — le percepisce come bugie o come mancanza di rispetto. Vuole la verità, ma una verità che non lo travolga. La linea è sottile: può sapere che i genitori non andavano più d'accordo, che ci hanno provato, che la decisione è stata dolorosa anche per loro. Non deve sapere i dettagli intimi — i tradimenti, i rancori, le accuse reciproche. La differenza tra verità proporzionata e confessione è che la prima risponde al bisogno del ragazzo, la seconda al bisogno del genitore." },
      { icon: "⚖️", title: "Il permesso di non schierarsi", text: "Ha bisogno del permesso esplicito di non schierarsi. \"Non ti chiediamo di capire chi ha ragione. Non c'è una parte giusta. Sei nostro figlio, non il nostro giudice.\" Questa frase — o una equivalente, detta con naturalezza — può alleggerire un peso enorme. Il preadolescente che si sente autorizzato a non scegliere respira." },
      { icon: "⚓", title: "Continuità della vita quotidiana", text: "Ha bisogno che la sua vita continui. Lo sport, il gruppo di amici, le attività, le abitudini — tutto ciò che ancora funziona nella sua quotidianità va protetto con cura. La tentazione di riorganizzare tutto — cambiare casa, cambiare scuola, cambiare città — può essere necessaria, ma va valutata sapendo che ogni cambiamento ulteriore si somma alla perdita già in corso. Meno cose cambiano contemporaneamente, meglio è." },
      { icon: "🔥", title: "Accettare la rabbia", text: "Ha bisogno di sapere che la sua rabbia è accettata. Un genitore che sa ascoltare \"ti odio per quello che hai fatto\" senza crollare, senza vendicarsi e senza sparire trasmette un messaggio potentissimo: il legame regge anche quando è attraversato dalla furia." },
    ],
    cosa_aiuta_ref: "Emery (2012); Steinberg (12ª ed.); Blakemore, \"Inventing Ourselves: The Secret Life of the Teenage Brain\" (2018)",
    cosa_evitare_cards: [
      { icon: "🧠", title: "Non è un adulto", text: "Non trattarlo come un adulto. Il preadolescente che sembra maturo, che parla con lucidità, che tiene tutto sotto controllo è ancora un ragazzo con un cervello in costruzione — la [[corteccia prefrontale]] non sarà matura prima dei venticinque anni. Affidargli decisioni da adulto (\"secondo te dovremmo vendere la casa?\"), confidenze da adulto (\"tuo padre ha un'altra\") o responsabilità da adulto (\"tieni d'occhio tuo fratello quando sei da papà\") è sfruttare la sua apparente maturità a spese del suo sviluppo." },
      { icon: "🚪", title: "Non chiudere la porta", text: "Non reagire alla sua indifferenza con indifferenza. \"Se non ti importa, allora non ne parliamo\" chiude una porta che il ragazzo ha lasciato socchiusa apposta. L'indifferenza ostentata è quasi sempre un invito mascherato — sta dicendo \"vedi se ti importa abbastanza da insistere\". Non significa essere invadenti: significa far sapere che la porta resta aperta. \"Non ne dobbiamo parlare ora. Ma quando vuoi, io ci sono\" è sufficiente." },
      { icon: "🕵️", title: "No a spia, messaggero, contabile", text: "Non usare il ragazzo come spia, come messaggero, come contabile. A questa età lo capisce perfettamente — e il disprezzo che ne consegue è proporzionale alla consapevolezza. Il preadolescente che si accorge di essere strumentalizzato perde rispetto per il genitore che lo fa, e quella perdita di rispetto è molto difficile da recuperare." },
      { icon: "💑", title: "Tempi del nuovo partner", text: "Non introdurre un nuovo partner come sostituto genitoriale. La tempistica e le modalità di presentazione di un nuovo partner sono tra le questioni più delicate della separazione in preadolescenza. Il ragazzo ha bisogno di tempo per elaborare la fine prima di accettare un nuovo inizio — e forzare i tempi produce rifiuto, non adattamento." },
    ],
    cosa_evitare_ref: "Hetherington & Kelly (2002); Buchanan, Maccoby & Dornbusch (1996); Emery (2012)",
    segnali_professionista: [
      "Isolamento sociale progressivo — non la normale ricerca di privacy, ma un ritiro dai pari che dura settimane e si accompagna a tristezza o irritabilità persistente.",
      "Comportamenti a rischio nuovi e ripetuti: uso di sostanze, fughe, trasgressioni gravi che non c'erano prima della separazione.",
      "Rifiuto rigido e angosciato di uno dei due genitori che non si attenua nel tempo e si accompagna a disprezzo o paura — non la normale oscillazione di preferenze.",
      "Calo scolastico che non si recupera dopo un trimestre, soprattutto se associato a perdita di motivazione generalizzata (\"non mi importa più di niente\").",
      "Il ragazzo si è assunto un ruolo genitoriale strutturale: cucina, pulisce, si occupa dei fratelli, consola il genitore — e ha smesso di vivere la propria vita da ragazzo.",
      "Segnali depressivi: ritiro, [[anedonia]], disturbi del sonno persistenti, verbalizzazioni di disperazione o inutilità.",
      "Autolesionismo o ideazione suicidaria — che in preadolescenza può manifestarsi anche in forme indirette, come ricerca attiva di situazioni pericolose.",
    ],
    segnali_intro: "Il preadolescente è particolarmente abile nel nascondere la sofferenza. I segnali vanno cercati nei cambiamenti di traiettoria, non nei singoli episodi:",
    segnali_footer: "Il riferimento è lo psicologo dell'età evolutiva o il servizio di neuropsichiatria infantile. Per il conflitto interparentale, la mediazione familiare resta una risorsa specifica e spesso sottoutilizzata.",
    segnali_ref: "Linee guida SINPIA; Hetherington & Kelly (2002); Amato (2010)",
    tips: [
      "Non scambiare il silenzio per indifferenza. Quasi mai lo è.",
      "Digli che non deve scegliere da che parte stare — e dimostralo con i fatti, non solo con le parole.",
      "Se ti giudica con durezza, ascolta prima di rispondere. La rabbia che trova ascolto si trasforma; quella che trova un muro si fortifica.",
      "Proteggi le sue attività e amicizie: sono la sua normalità, non un lusso.",
      "Non presentargli un nuovo partner finché non ha avuto il tempo di elaborare la separazione — e quel tempo lo decide lui, non tu.",
      "Se lo vedi prendersi cura di te, fermati e chiedigli come sta lui. È il segnale che ha smesso di fare il figlio.",
      "Tieni aperta la porta: \"Quando vuoi parlare, io ci sono\" — e poi stai in silenzio, senza forzare.",
    ],
  },
  "15-18": {
    comprensione: "L'adolescente comprende la separazione con una profondità che si avvicina a quella adulta — ma la vive con un'intensità che è tutta sua. Ha il pensiero astratto maturo, sa cogliere le sfumature, sa immaginare il prima e il dopo, sa ricostruire la storia della coppia genitoriale con uno sguardo retrospettivo che a volte sorprende per lucidità. Questa comprensione, però, convive con un'emotività ancora in costruzione: il cervello che analizza è più avanti del cervello che regola. Il risultato è un ragazzo che può fare un'analisi impeccabile della situazione e poi crollare per un dettaglio apparentemente insignificante — una foto, un posto a tavola vuoto, un'abitudine perduta.\n\nLa separazione dei genitori in adolescenza colpisce il processo di [[individuazione]] nel suo punto più sensibile. L'adolescente ha bisogno di allontanarsi dalla famiglia per costruirsi — ma ha bisogno che la famiglia resti lì, stabile, come sfondo sicuro. Quando lo sfondo si frantuma, il movimento di allontanamento può diventare una fuga (autonomia forzata, precoce, non sostenuta) o un blocco (impossibilità di andarsene perché \"chi si occupa di mamma/papà se me ne vado?\"). Wallerstein (2000) ha documentato come gli effetti della separazione possano riemergere proprio in adolescenza avanzata, quando il ragazzo inizia a formare le proprie relazioni sentimentali e si chiede — consapevolmente o meno — se l'amore possa durare.",
    comprensione_ref: "Wallerstein, \"The Unexpected Legacy of Divorce\" (2000); Steinberg, \"Adolescence\" (12ª ed.); Erikson, \"Identity: Youth and Crisis\" (1968)",
    reazioni_tipiche: [
      { icon: "🛡️", title: "Cinismo relazionale", text: "\"Tanto l'amore non esiste\", \"tutte le coppie si lasciano\", \"non mi sposerò mai\". Non è filosofia — è una difesa preventiva. Se l'amore fallisce sempre, allora non ha senso rischiare, e se non rischio non soffro. Questa posizione protegge nel breve termine, ma può cristallizzarsi in un modello relazionale evitante." },
      { icon: "🚀", title: "Accelerazione dell'autonomia", text: "Lasciare casa prima del tempo, cercare relazioni sentimentali intense e precoci come sostituto della sicurezza familiare persa, assumere responsabilità economiche o pratiche non proporzionate all'età. Non è maturità — è una compensazione." },
      { icon: "🧊", title: "Blocco dell'individuazione", text: "Il ragazzo che non riesce ad andarsene perché sente di dover tenere insieme i pezzi. Rinuncia a uscite, viaggi, esperienze, relazioni per restare vicino al genitore fragile. È la [[parentificazione]] nella sua forma più matura e più insidiosa." },
      { icon: "🔍", title: "Rivisitazione del passato", text: "L'adolescente rilegge tutta la storia familiare alla luce della separazione. Momenti che sembravano normali acquistano un significato nuovo e doloroso. \"Allora quando andavamo al mare eravate già infelici?\" Questa rivisitazione è un lavoro psichico necessario ma faticoso." },
      { icon: "💘", title: "Impatto sulle relazioni sentimentali", text: "I primi amori dell'adolescente avvengono mentre sta osservando la fine dell'amore dei genitori. La paura di ripetere lo stesso schema può manifestarsi come evitamento, come ipercontrollo, o come scelta inconsapevole di relazioni che confermano la convinzione che l'amore finisca." },
      { icon: "⚗️", title: "Uso di sostanze", text: "L'alcol, la cannabis e altre sostanze possono diventare un modo per attutire il dolore emotivo. Non ogni adolescente che sperimenta sostanze lo fa per la separazione — ma la separazione è un fattore di rischio documentato (Hetherington, 2002)." },
    ],
    reazioni_ref: "Wallerstein (2000); Hetherington & Kelly (2002); Amato (2010); Buchanan, Maccoby & Dornbusch (1996)",
    cosa_aiuta_cards: [
      { icon: "🎯", title: "Verità piena e responsabilità", text: "L'adolescente ha bisogno di **verità piena e responsabilità riconosciuta**. Non vuole la versione edulcorata — la percepisce come menzogna e la punisce con il disprezzo. Vuole sapere che i genitori si assumono la responsabilità della loro scelta senza scaricarla su di lui, sull'altro genitore o sulle circostanze. \"Abbiamo fatto degli errori, la responsabilità è nostra, non tua\" è una frase che un adolescente può rispettare — anche se nel momento la respinge." },
      { icon: "🔥", title: "Accogliere il giudizio", text: "Ha bisogno che il suo giudizio venga accolto senza ritorsioni. L'adolescente giudicherà — duramente, a volte ingiustamente, a volte con una precisione che fa male. Un genitore che sa ricevere quel giudizio senza crollare e senza contrattaccare offre qualcosa di raro e prezioso: la prova che l'amore genitoriale non è condizionato alla gratitudine o all'approvazione del figlio." },
      { icon: "🚀", title: "Il futuro al centro", text: "Ha bisogno che il suo futuro resti al centro. La separazione è un evento della coppia genitoriale, non della vita del ragazzo — eppure il rischio è che diventi l'evento organizzatore di tutto. Proteggere i progetti dell'adolescente — la scuola, l'anno all'estero, l'università, le amicizie, le prime relazioni — significa comunicargli che la sua vita ha un valore indipendente dalla crisi familiare." },
      { icon: "🪞", title: "Chiedere aiuto come modello", text: "Ha bisogno di vedere che i genitori stanno cercando aiuto per sé stessi. Un adolescente che vede un genitore andare in terapia, chiedere supporto, prendersi cura della propria sofferenza senza riversarla sul figlio impara qualcosa di fondamentale: che chiedere aiuto è un atto di forza, non di debolezza. È un modello che porterà con sé." },
    ],
    cosa_aiuta_ref: "Emery (2012); Steinberg (12ª ed.); Hetherington & Kelly (2002)",
    cosa_evitare_cards: [
      { icon: "🚫", title: "Non trattarlo come un pari", text: "Non trattarlo come un pari. L'adolescente che dice \"puoi dirmi tutto, io capisco\" sta offrendo qualcosa che non dovrebbe offrire. Accettare quell'offerta — raccontargli dei tradimenti, delle questioni economiche, delle battaglie legali — significa trasformarlo in un confidente adulto quando è ancora un figlio. La simmetria relazionale tra genitore e adolescente è un'illusione seduttiva e pericolosa: il genitore che la accetta si sente meno solo, ma il ragazzo paga il prezzo." },
      { icon: "🏴", title: "Non competere con la libertà", text: "Non competere con l'altro genitore attraverso la libertà concessa. \"Da me puoi fare quello che vuoi\" non è generosità — è abdicazione, e l'adolescente lo sa. La mancanza di limiti in una delle due case non viene letta come rispetto ma come disinteresse. I limiti coerenti — anche quando generano conflitto — comunicano presenza." },
      { icon: "👶", title: "Non delegare la cura dei fratelli", text: "Non chiedere all'adolescente di fare da genitore ai fratelli più piccoli. \"Tu sei grande, tieni d'occhio tuo fratello quando è da papà\" è una delega che ruba adolescenza. Il fratello maggiore non è un sostituto genitoriale — e caricarlo di questo ruolo produce risentimento." },
      { icon: "💘", title: "Non minimizzare l'impatto sentimentale", text: "Non minimizzare l'impatto sulle sue relazioni sentimentali. Se l'adolescente dice \"non mi fiderò mai di nessuno\", la risposta peggiore è \"ma no, vedrai che troverai la persona giusta\". La risposta che aiuta è: \"Capisco che quello che è successo tra noi ti fa paura. È normale. La nostra storia non è la tua storia — ma capisco che adesso sia difficile crederci.\"" },
    ],
    cosa_evitare_ref: "Wallerstein (2000); Jurkovic (1997); Hetherington & Kelly (2002)",
    segnali_professionista: [
      "Ritiro sociale marcato e prolungato — non la ricerca di solitudine tipica dell'età, ma la scomparsa progressiva dal mondo relazionale.",
      "Uso di sostanze che passa dalla sperimentazione alla regolarità — soprattutto se associato a isolamento e calo scolastico.",
      "Relazioni sentimentali caratterizzate da dipendenza intensa, gelosia estrema o accettazione di comportamenti lesivi — possibili segnali di un modello relazionale distorto dalla separazione.",
      "Cinismo relazionale rigido e pervasivo che si estende a tutte le relazioni — non solo a quelle sentimentali ma anche alle amicizie, agli adulti di riferimento, alle istituzioni.",
      "Blocco dell'[[individuazione]]: il ragazzo non esce, non progetta, non si separa — ha rinunciato alla propria adolescenza per tenere insieme la famiglia.",
      "Segnali depressivi persistenti: [[anedonia]], ritiro, disturbi del sonno, verbalizzazioni di vuoto o inutilità.",
      "Autolesionismo o ideazione suicidaria — in adolescenza può presentarsi anche come comportamenti ad alto rischio apparentemente ludici.",
    ],
    segnali_intro: "L'adolescente è il più capace di tutti nel mascherare la sofferenza — e il più a rischio di conseguenze a lungo termine non intercettate:",
    segnali_footer: "Il riferimento è lo psicologo clinico, il servizio di neuropsichiatria infantile (fino ai 18 anni), o i consultori giovani. Per l'adolescente è spesso più accettabile un percorso individuale che uno familiare — la sua autonomia va rispettata anche nella scelta del tipo di aiuto.",
    segnali_ref: "Linee guida SINPIA; Hetherington & Kelly (2002); Wallerstein (2000)",
    tips: [
      "Non scambiare la sua lucidità per invulnerabilità. Capire non significa non soffrire.",
      "Assumiti la responsabilità della separazione senza giustificarti. \"È una nostra scelta e un nostro errore\" si rispetta più di qualsiasi spiegazione.",
      "Se ti dice \"l'amore non esiste\", non correggere — ascolta la paura che c'è sotto.",
      "Proteggi i suoi progetti: la scuola, gli amici, i sogni. La sua vita non è un danno collaterale della vostra.",
      "Non renderlo confidente, alleato o genitore dei fratelli — anche se lui si offre.",
      "Se lo vedi bloccarsi — non uscire, non progettare, non separarsi — preoccupati più che se si ribella.",
      "Fagli vedere che chiedi aiuto per te stesso. È il modello più potente che puoi offrirgli.",
    ],
  },
};

/* ── Separazione — Sezione trasversale: miti, forumTopics, risorse ── */
const SEPARAZIONE_MITI = [
  {
    emoji: "🧩", label: "MITO DIFFUSO", labelBg: "#F5EEFF", labelColor: "#7B2FF7",
    title: "I bambini si adattano — sono elastici",
    short: "I bambini superano tutto perché sono resilienti. La ricerca racconta una storia più sfumata.",
    science: "La [[resilienza]] nei bambini non è automatica né universale. Le meta-analisi di Amato (2001, 2010) mostrano che i figli di genitori separati presentano, in media, punteggi più bassi in benessere emotivo, rendimento scolastico e qualità delle relazioni sociali rispetto ai figli di famiglie intatte. L'effetto medio è piccolo — ma è reale e consistente. Il fattore che lo amplifica o lo attenua non è la separazione in sé: è il livello di [[conflitto di lealtà|conflitto]] a cui il bambino è esposto e la qualità della relazione con entrambi i genitori dopo la separazione.",
    truth: "I bambini possono adattarsi bene a una separazione — ma non automaticamente, e non da soli. L'adattamento dipende da ciò che gli adulti fanno dopo: proteggere il bambino dal conflitto, mantenere entrambe le relazioni genitoriali, garantire prevedibilità e stabilità. La [[resilienza]] non è una proprietà innata del bambino — è qualcosa che l'ambiente costruisce intorno a lui.",
    fun: "In Svezia e Norvegia i servizi di mediazione familiare sono obbligatori prima di procedere con la separazione legale quando ci sono figli minori. Il risultato: livelli di conflitto post-separazione significativamente più bassi rispetto ai paesi dove la mediazione è facoltativa — e, di conseguenza, migliore adattamento dei figli.",
  },
  {
    emoji: "🏠", label: "MITO CULTURALE", labelBg: "#FFF0F0", labelColor: "#E8524A",
    title: "Meglio restare insieme per i figli",
    short: "Un matrimonio infelice è comunque meglio di una separazione. La ricerca dice il contrario — con una condizione importante.",
    science: "Amato (2001) ha dimostrato che i bambini cresciuti in famiglie ad alto conflitto che restano unite hanno esiti peggiori dei bambini i cui genitori si separano. Il conflitto cronico, visibile, non risolto è più tossico della separazione. Tuttavia — e questo è il dato spesso omesso — nelle famiglie a basso conflitto, dove i genitori sono semplicemente insoddisfatti ma non litigiosi, la separazione può essere più destabilizzante per i figli rispetto alla permanenza, perché il bambino non la capisce: il suo mondo sembrava funzionare.",
    truth: "Non esiste una risposta universale. La domanda non è 'separarsi o restare insieme?' — è 'a quale livello di conflitto è esposto il bambino?' Se il conflitto è alto e cronico, la separazione protegge il figlio. Se il conflitto è basso o assente, la separazione va gestita con cura ancora maggiore nella comunicazione con il bambino, perché per lui arriva senza preavviso in un mondo che sembrava sicuro.",
    fun: "L'espressione 'restare insieme per i figli' è quasi esclusivamente occidentale. In molte culture del mondo — giapponese, scandinava, sudamericana — la qualità della relazione genitoriale conta più della struttura familiare formale, e il giudizio sociale sulla separazione è proporzionalmente più basso.",
  },
  {
    emoji: "⚖️", label: "MITO LEGALE", labelBg: "#E8F2FF", labelColor: "#2A6ED4",
    title: "La custodia condivisa risolve tutto",
    short: "Dividere il tempo a metà è sempre la soluzione più giusta per il bambino. Le cose sono più complesse.",
    science: "L'affidamento condiviso è la regola in Italia e garantisce al minore il diritto a mantenere un rapporto equilibrato con entrambi i genitori. La ricerca (Bauserman, 2002; Nielsen, 2014) mostra che i bambini in affidamento condiviso hanno in media esiti migliori di quelli in affidamento esclusivo — ma solo quando il conflitto tra i genitori è basso o moderato. In contesti di alta conflittualità, l'affidamento condiviso può esporre il bambino a transizioni frequenti cariche di tensione e amplificare il [[conflitto di lealtà]].",
    truth: "La custodia condivisa è uno strumento — non una garanzia. Funziona quando i genitori riescono a collaborare con sufficiente rispetto reciproco, quando le due case sono sufficientemente vicine, e quando le transizioni avvengono senza conflitto visibile. In assenza di queste condizioni, la quantità di tempo trascorso con ciascun genitore conta meno della qualità di quel tempo.",
    fun: "In Belgio e in Svezia l'affidamento condiviso paritario (50/50) è la norma statistica oltre che legale. In Svezia, dal 1998, il tribunale può disporre l'affidamento condiviso anche se uno dei genitori si oppone — e oggi circa la metà dei bambini di genitori separati vive a settimane alterne tra le due case (Bergström et al., 2013).",
  },
  {
    emoji: "🤫", label: "MITO GENERAZIONALE", labelBg: "#FFF3E8", labelColor: "#D4712A",
    title: "I bambini non capiscono — meglio non dire niente",
    short: "Proteggere il bambino significa non parlargli della separazione finché non è più grande. La ricerca mostra il contrario.",
    science: "I bambini percepiscono il clima emotivo familiare molto prima di poterlo verbalizzare. Il sistema di attaccamento è tarato per rilevare i segnali di pericolo relazionale — tensione, silenzi, pianti notturni, cambiamenti di tono. Un bambino a cui non viene detto nulla non è un bambino protetto: è un bambino che percepisce un pericolo senza poterlo nominare, e questa condizione genera più ansia di una spiegazione onesta e calibrata per età (Emery, 2012).",
    truth: "I bambini hanno bisogno di parole vere, proporzionate alla loro età. Non hanno bisogno di tutti i dettagli — ma hanno bisogno di sapere che qualcosa sta cambiando, che non è colpa loro, e che saranno amati da entrambi i genitori. Il silenzio non protegge: confonde. E la confusione, nei bambini, si trasforma in ansia.",
    fun: "In Danimarca esiste un programma pubblico chiamato 'Familieambulatoriet' che offre ai genitori in via di separazione un percorso guidato su come comunicare la separazione ai figli — calibrato per fascia d'età, con materiali specifici e supporto professionale gratuito.",
  },
];

const SEPARAZIONE_FORUM = [
  {
    emoji: "💬", color: "#C77DFF", bg: "#F5EEFF", category: "COMUNICAZIONE",
    title: "Come glielo diciamo?",
    rank: "#1 topic nelle community di genitori in separazione",
    desc: "Il momento dell'annuncio è quello che i genitori temono di più — e spesso rimandano fino a quando le cose sono già evidenti.",
    idea: "🧠 La comunicazione della separazione ai figli ha alcune regole basate sulla ricerca (Emery, 2012): farla insieme se possibile, in un momento tranquillo, con un messaggio chiaro ('vivremo in due case diverse'), con le tre rassicurazioni fondamentali — non è colpa tua, non puoi aggiustarlo, ti vogliamo bene tutti e due. Evitare i dettagli del conflitto di coppia. Per i bambini sotto i 5 anni servono poche parole concrete e molta [[co-regolazione]] fisica; per i più grandi si può essere più articolati, senza mai superare la soglia della confidenza adulta.\n\n✅ Non esiste il momento perfetto — ma esiste il momento troppo tardi: quando il bambino ha già capito da solo e nessuno gli ha detto nulla. Meglio una comunicazione imperfetta che il silenzio.",
  },
  {
    emoji: "🚫", color: "#FF6B6B", bg: "#FFF0F0", category: "CONFLITTO",
    title: "Non vuole andare dall'altro genitore",
    rank: "Topic emotivamente più intenso",
    desc: "Il rifiuto di un genitore da parte del figlio è una delle situazioni più dolorose e più fraintese nelle separazioni.",
    idea: "🧠 Il rifiuto di un genitore può avere molte cause — e quasi mai è una sola: la transizione tra le due case è stressante e il bambino resiste al cambiamento, non al genitore; il bambino sente il [[conflitto di lealtà]] e si schiera per ridurre l'ansia; ci sono problemi reali nella relazione con quel genitore che meritano attenzione; il bambino è influenzato — consapevolmente o meno — dall'atteggiamento dell'altro genitore. Distinguere queste cause è fondamentale e raramente possibile senza un aiuto professionale.\n\n✅ Non forzare il bambino con la costrizione fisica — ma nemmeno cedere automaticamente al rifiuto senza capirne la ragione. Se il rifiuto è persistente e angosciato, una valutazione con uno psicologo dell'età evolutiva è il primo passo. In nessun caso la soluzione è chiedere al bambino di 'scegliere'.",
  },
  {
    emoji: "💑", color: "#FF9A3C", bg: "#FFF3E8", category: "NUOVI PARTNER",
    title: "Il nuovo partner — quando e come presentarlo",
    rank: "#2 topic per volume",
    desc: "La comparsa di un nuovo partner nella vita del genitore è il secondo terremoto dopo la separazione — soprattutto se arriva troppo presto.",
    idea: "🧠 La ricerca (Hetherington, 2002) indica che la tempistica è il fattore più importante: un nuovo partner introdotto prima che il bambino abbia elaborato la separazione viene percepito come sostitutivo, minaccioso o come la prova che il genitore 'ha già dimenticato'. Nei bambini piccoli il rischio è la confusione di ruoli; nei preadolescenti e adolescenti il rischio è la rabbia e la perdita di fiducia nel genitore.\n\n✅ Principi basati sulla letteratura: aspettare che la relazione sia stabile prima di introdurla al bambino; presentare il partner come persona, non come nuovo genitore; rispettare il ritmo del figlio — se non è pronto, non è pronto; non forzare mai il legame affettivo con il nuovo partner; non trasferirsi insieme prima che il bambino abbia avuto tempo di adattarsi alla nuova presenza.",
  },
  {
    emoji: "🏡", color: "#4D96FF", bg: "#E8F2FF", category: "QUOTIDIANITÀ",
    title: "Due case, due regole — come si fa?",
    rank: "#3 topic per volume",
    desc: "La gestione delle regole tra due case diverse è il terreno di micro-conflitto quotidiano più frequente.",
    idea: "🧠 I bambini si adattano bene a contesti diversi — lo fanno già con scuola, casa dei nonni, sport. La condizione è che le differenze siano normali ('da papà si cena prima') e non contraddittorie ('da papà si può, da mamma no') usate come arma relazionale. Le regole non devono essere identiche — devono essere coerenti sugli aspetti fondamentali: sonno, sicurezza, scuola.\n\n✅ Il principio-guida: concordare poche regole essenziali tra i due genitori e lasciare che il resto si declini liberamente. Non commentare le regole dell'altra casa davanti al bambino. Se il bambino dice 'da papà mi lasciano fare questo', la risposta efficace non è 'papà sbaglia' — è 'qui funziona così, e va bene che le case siano un po' diverse'.",
  },
  {
    emoji: "🎄", color: "#6BCB77", bg: "#E8F9EA", category: "FESTE",
    title: "Natale, compleanni, vacanze — il campo minato",
    rank: "Picco stagionale di ricerche",
    desc: "Le ricorrenze familiari sono il momento in cui l'assenza della famiglia unita diventa più visibile — per il bambino e per il genitore.",
    idea: "🧠 Le feste amplificano tutto: la nostalgia, il confronto con le altre famiglie, la logistica complicata, il senso di colpa. Per il bambino il rischio è sentirsi diviso — dover scegliere, dover essere felice due volte, dover fingere che va tutto bene. Per il genitore il rischio è compensare con eccesso: troppi regali, troppa allegria forzata.\n\n✅ Quello che aiuta: decidere in anticipo e con chiarezza chi sta dove e quando, comunicarlo al bambino senza drammatizzare, permettergli di portare un regalo da una casa all'altra senza farne un caso, accettare che le feste possano essere diverse da prima senza che questo significhi 'rovinate'. Un Natale tranquillo in una casa vale più di due Natali ansiosi in due case.",
  },
];

const SEPARAZIONE_RISORSE = {
  libri: [
    { fascia: "3–6 anni", items: [
      { title: "Due case", author: "Claire Masurel, ill. Kady MacDonald Denton", note: "Albo illustrato semplice e rassicurante: un bambino racconta le sue due case senza dramma." },
      { title: "Le mie due case", author: "Melanie Walsh", note: "Formato grande, frasi brevi, perfetto per i più piccoli." },
      { title: "Papà vive qui, mamma vive là", author: "Marian De Smet, ill. Nynke Talsma", note: "Racconto della quotidianità in due case con tono caldo e normalizzante." },
    ]},
    { fascia: "6–10 anni", items: [
      { title: "Il coraggio di Emil", author: "Meritxell Martí", note: "Per bambini che stanno attraversando il momento dell'annuncio." },
      { title: "Due nidi", author: "Laurence Anholt", note: "Metafora animale delicata che parla di separazione e di sicurezza mantenuta." },
    ]},
    { fascia: "10+ anni", items: [
      { title: "L'estate che conobbi il Che", author: "Luigi Ballerini", note: "Romanzo per preadolescenti che affronta il tema della famiglia che cambia con sensibilità e rispetto." },
      { title: "Perché mi fate questo?", author: "Lanciano (collana Strettamente Personale)", note: "Romanzo in forma di diario: un'adolescente racconta la tempesta emotiva della separazione dei genitori. Linguaggio diretto, senza filtri. Dai 12 anni." },
    ]},
  ],
  servizi: [
    { icon: "🏥", title: "Consultori familiari ASL", text: "Presenti su tutto il territorio nazionale, offrono supporto psicologico gratuito per genitori e figli in contesti di separazione. Per trovare il più vicino: sito della propria ASL di riferimento." },
    { icon: "🤝", title: "Mediazione familiare", text: "Percorso strutturato con un mediatore qualificato per ridurre il conflitto e raggiungere accordi centrati sul benessere del minore. L'elenco dei mediatori è consultabile presso i Tribunali e gli Ordini professionali territoriali.", url: "https://www.garanteinfanzia.org/sites/default/files/2025-07/mediazione-familiare-italia.pdf" },
    { icon: "🧠", title: "Servizi di Neuropsichiatria Infantile (NPI)", text: "Per valutazioni cliniche quando i segnali di disagio del bambino richiedono un intervento specialistico. Accesso tramite pediatra di base o consultorio." },
    { icon: "📞", title: "Telefono Azzurro — 19696", text: "Linea di ascolto e consulenza per situazioni che coinvolgono minori in difficoltà.", url: "https://azzurro.it/separazione/" },
    { icon: "👨‍👩‍👧", title: "Centri per le Famiglie (Regione Emilia-Romagna)", text: "Servizi pubblici gratuiti che offrono mediazione familiare, consulenza educativa e sostegno alla genitorialità. La pagina della Regione Emilia-Romagna illustra il modello di riferimento. Per il centro nel tuo territorio: sito del Comune o dell'ASL.", url: "https://sociale.regione.emilia-romagna.it/famiglie/centri-per-le-famiglie/la-mediazione-familiare-nei-centri-per-le-famiglie" },
  ],
  footer: [
    { label: "AAP — Impact of Divorce on Children (2016)", url: "https://publications.aap.org/pediatrics/article/138/1/e20160340/52679/" },
    { label: "AAP HealthyChildren — Helping Children Through Divorce (guida genitori)", url: "https://www.healthychildren.org/English/healthy-living/emotional-wellness/Building-Resilience/Pages/How-to-Support-Children-after-Parents-Separate-or-Divorce.aspx" },
    { label: "AAP — Children's Adjustment to Divorce: Theories, Hypotheses, and Empirical Support", url: "https://publications.aap.org/pediatricsinreview/article/23/5/171/34497/" },
    { label: "AACAP — Children and Divorce (Facts for Families, n. 1)", url: "https://www.aacap.org/AACAP/Families_and_Youth/Facts_for_Families/FFF-Guide/Children-And-Divorce-001.aspx" },
    { label: "L. 54/2006 — Affidamento condiviso (testo normativo integrale)", url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2006-02-08;54" },
  ],
};


/* ═══════════════════════════════════════════════════════════════
   🏠 SEPARAZIONE — Stub (contenuti nella prossima chat)
═══════════════════════════════════════════════════════════════ */
function SeparazionePage() {
  const isMobile = useIsMobile();
  const [gateOpen, setGateOpen] = useState(false);
  const [activeZone, setActiveZone] = useState("0-3");
  const [activeTab, setActiveTab] = useState("contenuti");
  const [openSections, setOpenSections] = useState({});
  const [openMito, setOpenMito] = useState(null);
  const [openForum, setOpenForum] = useState(null);
  const [openBook, setOpenBook] = useState(null);

  const toggleSection = (id) => setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  const zones = [
    { id: "0-3", label: "0–3" },
    { id: "3-6", label: "3–6" },
    { id: "6-12", label: "6–12" },
    { id: "12-15", label: "12–15" },
    { id: "15-18", label: "15–18" },
  ];

  const tabs = [
    { id: "contenuti", label: "📖 Per fascia d'età" },
    { id: "miti", label: "🔬 Miti da sfatare" },
    { id: "forum", label: "💬 Temi caldi" },
    { id: "risorse", label: "📚 Risorse" },
  ];

  const accent = "#C05A3C";
  const accentLight = "#FFF5F0";
  const accentBorder = "rgba(192,90,60,0.2)";

  const d = SEPARAZIONE_DATA[activeZone];

  /* ── GATE ── */
  if (!gateOpen) {
    return (
      <div style={{ background: "#FFFCFA", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>
          <span style={{ fontSize: 56, display: "block", marginBottom: 20 }}>🏠</span>
          <h1 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: isMobile ? 24 : 30, fontWeight: 700, margin: "0 0 16px", lineHeight: 1.3 }}>
            {SEPARAZIONE_GATE.title}
          </h1>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, lineHeight: 1.8, margin: "0 0 24px" }}>
            {SEPARAZIONE_GATE.text}
          </p>
          <button onClick={() => setGateOpen(true)} style={{
            background: `linear-gradient(135deg, ${accent}, #D4724A)`, color: "white",
            border: "none", borderRadius: 28, padding: "14px 40px",
            fontFamily: "'Nunito', sans-serif", fontSize: 16, fontWeight: 700,
            cursor: "pointer", boxShadow: `0 4px 16px ${accent}40`,
            marginBottom: 24,
          }}>
            {SEPARAZIONE_GATE.cta}
          </button>
          <div style={{ background: accentLight, border: `1.5px solid ${accentBorder}`, borderRadius: 18, padding: "14px 18px", marginBottom: 16, textAlign: "left" }}>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: "#7A4A30", fontSize: 13, lineHeight: 1.75, margin: 0 }}>
              {SEPARAZIONE_GATE.footer}
            </p>
          </div>
          <div style={{ background: "#FFF8E7", border: "1.5px solid #F4C842", borderRadius: 18, padding: "14px 18px", textAlign: "left" }}>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: "#7A5A00", fontSize: 13, lineHeight: 1.75, margin: 0 }}>
              <strong>⚖️</strong> {SEPARAZIONE_GATE.disclaimer_rafforzato}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Render una sezione accordion ── */
  const renderAccordion = (id, emoji, title, children, opts = {}) => {
    const isOpen = openSections[id];
    const borderColor = isOpen ? accentBorder : "rgba(0,0,0,0.06)";
    return (
      <div key={id} id={id} style={{
        background: "white", borderRadius: 22,
        border: `1.5px solid ${borderColor}`,
        overflow: "hidden", marginBottom: 12,
        boxShadow: isOpen ? `0 4px 20px ${accent}12` : "0 2px 8px rgba(0,0,0,0.04)",
        transition: "all 0.2s",
      }}>
        <button onClick={() => { toggleSection(id); if (!isOpen) scrollToCard(id); }} style={{
          width: "100%", background: isOpen ? accentLight : "none", border: "none", cursor: "pointer",
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
          textAlign: "left", touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{emoji}</span>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.deepSlate, flex: 1 }}>{title}</span>
          {opts.tag && <span style={{ background: opts.tagBg || "#FFF0E0", color: opts.tagColor || "#C05020", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontFamily: "'Nunito', sans-serif", fontWeight: 700, flexShrink: 0 }}>{opts.tag}</span>}
          <span style={{ fontSize: 18, color: COLORS.slateLight, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>▾</span>
        </button>
        {isOpen && (
          <div style={{ padding: "0 20px 18px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
            <div style={{ paddingTop: 14 }}>{children}</div>
          </div>
        )}
      </div>
    );
  };

  /* ── Paragrafo stile ── */
  const P = ({ children, style: s }) => (
    <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.8, margin: "0 0 12px", ...s }}>
      {typeof children === "string" ? renderRichContent(children) : children}
    </p>
  );

  /* ── Ref badge ── */
  const RefBadge = ({ text }) => (
    <div style={{ background: "#F5F5F0", borderRadius: 12, padding: "8px 14px", marginTop: 10 }}>
      <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 12, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
        📚 {text}
      </p>
    </div>
  );

  /* ── PAGINA PRINCIPALE ── */
  return (
    <div style={{ background: "#FFFCFA", minHeight: "100vh" }}>

      {/* ── Hero ── */}
      <div style={{
        background: "linear-gradient(160deg, #FFF5F0 0%, #FBEAF2 50%, #F5F0F8 100%)",
        padding: isMobile ? "28px 16px 36px" : "36px 20px 48px",
        textAlign: "center",
      }}>
        <span style={{ fontSize: 48, display: "block", marginBottom: 12 }}>🏠</span>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: "0 0 10px" }}>
          Quando la famiglia cambia forma
        </h1>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 16 : 20, fontStyle: "italic", color: COLORS.slateLight, margin: 0 }}>
          separazione e divorzio
        </p>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 48px" }}>

        {/* ── Disclaimer compatto ── */}
        <div style={{ background: accentLight, border: `1.5px solid ${accentBorder}`, borderRadius: 18, padding: "14px 18px", marginBottom: 28 }}>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: "#7A4A30", fontSize: 13, lineHeight: 1.75, margin: 0 }}>
            <strong>🏠 Centrato sul bambino, non sulla coppia.</strong>{" "}
            Questa sezione non prende posizione su chi ha ragione. Offre strumenti per proteggere tuo figlio durante un momento difficile. Non contiene indicazioni legali.
          </p>
        </div>

        {/* ── Tab bar principale ── */}
        <div id="main-tab-bar" role="tablist" aria-label="Sezioni Separazione" style={{
          display: "flex", gap: 6, marginBottom: 28, overflowX: "auto",
          scrollbarWidth: "none", msOverflowStyle: "none", paddingBottom: 4,
        }}>
          {tabs.map(t => (
            <button key={t.id} role="tab" aria-selected={activeTab === t.id} onClick={() => { setActiveTab(t.id); setOpenSections({}); setOpenMito(null); setOpenForum(null); }} style={{
              background: activeTab === t.id ? accent : "white",
              color: activeTab === t.id ? "white" : COLORS.deepSlate,
              border: activeTab === t.id ? "none" : "1.5px solid rgba(0,0,0,0.08)",
              borderRadius: 20, padding: isMobile ? "8px 14px" : "8px 18px",
              fontFamily: "'Nunito', sans-serif", fontSize: isMobile ? 12 : 13,
              fontWeight: activeTab === t.id ? 800 : 600,
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              boxShadow: activeTab === t.id ? `0 2px 10px ${accent}40` : "none",
              touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
              transition: "all 0.17s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ═══ TAB: CONTENUTI PER FASCIA ═══ */}
        {activeTab === "contenuti" && (
          <div>
            {/* Zone picker */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              {zones.map(z => (
                <button key={z.id} onClick={() => { setActiveZone(z.id); setOpenSections({}); }} style={{
                  background: activeZone === z.id ? accent : "white",
                  color: activeZone === z.id ? "white" : COLORS.deepSlate,
                  border: activeZone === z.id ? "none" : "1.5px solid rgba(0,0,0,0.08)",
                  borderRadius: 16, padding: "8px 16px",
                  fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: activeZone === z.id ? 800 : 600,
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: activeZone === z.id ? `0 2px 10px ${accent}30` : "none",
                }}>{z.label} anni</button>
              ))}
            </div>

            <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 22, marginBottom: 16 }}>
              Fascia {zones.find(z => z.id === activeZone)?.label} anni
            </h3>

            {/* ── Comprensione ── */}
            {renderAccordion(`sep-compr-${activeZone}`, "🧠", "Come vive la separazione a questa età", <>
              {d.comprensione.split("\n\n").map((para, i) => <P key={i}>{para}</P>)}
              <RefBadge text={d.comprensione_ref} />
            </>)}

            {/* ── Reazioni tipiche ── */}
            {renderAccordion(`sep-reaz-${activeZone}`, "📋", "Reazioni tipiche", <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {d.reazioni_tipiche.map((r, i) => (
                  <div key={i} style={{ background: accentLight, borderRadius: 16, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: COLORS.deepSlate, fontSize: 14, marginBottom: 4 }}>{r.title}</div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 13, lineHeight: 1.7 }}>{renderRichContent(r.text)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <RefBadge text={d.reazioni_ref} />
            </>)}

            {/* ── Cosa aiuta ── */}
            {renderAccordion(`sep-aiuta-${activeZone}`, "✅", "Cosa puoi fare", <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {d.cosa_aiuta_cards.map((c, i) => (
                  <div key={i} style={{ background: "#E8F9EA", borderRadius: 16, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: COLORS.deepSlate, fontSize: 14, marginBottom: 4 }}>{c.title}</div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 13, lineHeight: 1.7 }}>{renderRichContent(c.text)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <RefBadge text={d.cosa_aiuta_ref} />
            </>, { tag: "GUIDA", tagBg: "#E8F9EA", tagColor: "#2D7A40" })}

            {/* ── Cosa evitare ── */}
            {renderAccordion(`sep-evita-${activeZone}`, "⛔", "Cosa evitare", <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {d.cosa_evitare_cards.map((c, i) => (
                  <div key={i} style={{ background: "#FFF0E0", borderRadius: 16, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: COLORS.deepSlate, fontSize: 14, marginBottom: 4 }}>{c.title}</div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 13, lineHeight: 1.7 }}>{renderRichContent(c.text)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <RefBadge text={d.cosa_evitare_ref} />
            </>, { tag: "ATTENZIONE", tagBg: "#FFF0E0", tagColor: "#C05020" })}

            {/* ── Segnali professionista ── */}
            {renderAccordion(`sep-segnali-${activeZone}`, "🚨", "Quando serve aiuto professionale", <>
              <P>{d.segnali_intro}</P>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {d.segnali_professionista.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "#C05020", fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 2 }}>●</span>
                    <span style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 13, lineHeight: 1.7 }}>{renderRichContent(s)}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "#FFF8E7", borderRadius: 14, padding: "12px 16px", border: "1px solid #F4C842" }}>
                <p style={{ fontFamily: "'Nunito', sans-serif", color: "#7A5A00", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                  {renderRichContent(d.segnali_footer)}
                </p>
              </div>
              <RefBadge text={d.segnali_ref} />
            </>, { tag: "CLINICO", tagBg: "#FFF0E0", tagColor: "#C05020" })}

            {/* ── Tips ── */}
            <div style={{ background: "linear-gradient(135deg, #FFF5F0, #FBEAF2)", borderRadius: 22, padding: "20px 20px 16px", marginTop: 20, border: `1.5px solid ${accentBorder}` }}>
              <h4 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 17, margin: "0 0 14px" }}>
                💡 Consigli pratici
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {d.tips.map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ background: accent, color: "white", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, fontFamily: "'Nunito', sans-serif", flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                    <span style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.7 }}>{renderRichContent(tip)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: MITI DA SFATARE ═══ */}
        {activeTab === "miti" && (
          <div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 8 }}>
              Miti da sfatare 🔬
            </h3>
            <p style={{ color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontStyle: "italic", marginBottom: 24, fontSize: 15 }}>
              Convinzioni diffuse sulla separazione — e cosa dice davvero la ricerca
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {SEPARAZIONE_MITI.map((m, i) => (
                <div key={i} id={`sep-mito-${i}`} className={openMito === i ? "active-card-scroll" : ""} style={{ background: COLORS.warmWhite, borderRadius: 28, overflow: "hidden", border: "2px solid rgba(45,59,58,0.07)", cursor: "pointer" }}
                  onClick={() => { const opening = openMito !== i; setOpenMito(opening ? i : null); if (opening) scrollToCard(`sep-mito-${i}`); }}>
                  <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 32, flexShrink: 0 }}>{m.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "inline-block", background: m.labelBg, color: m.labelColor, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: "'Nunito', sans-serif", fontWeight: 700, marginBottom: 6 }}>{m.label}</div>
                      <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{m.title}</div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 14, lineHeight: 1.5 }}>{m.short}</div>
                    </div>
                    <div style={{ fontSize: 20, color: COLORS.slateLight, flexShrink: 0 }}>{openMito === i ? "▲" : "▼"}</div>
                  </div>
                  {openMito === i && (
                    <div style={{ borderTop: "2px solid rgba(45,59,58,0.06)", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ background: "#F0F7FF", borderRadius: 18, padding: "14px 18px" }}>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: "#1A5F9E", fontSize: 13, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>🔬 Cosa dice la scienza</div>
                        <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{parseLinks(m.science)}</p>
                      </div>
                      <div style={{ background: "#F0FFF5", borderRadius: 18, padding: "14px 18px" }}>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: "#1A7A3A", fontSize: 13, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>✅ La verità</div>
                        <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{parseLinks(m.truth)}</p>
                      </div>
                      <div style={{ background: COLORS.goldLight, borderRadius: 18, padding: "14px 18px" }}>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: "#7A5800", fontSize: 13, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>🌍 Nel mondo</div>
                        <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{parseLinks(m.fun)}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TAB: FORUM TOPICS ═══ */}
        {activeTab === "forum" && (
          <div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 8 }}>
              Temi caldi dalle community 💬
            </h3>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 15, fontStyle: "italic", marginBottom: 24 }}>
              Le domande più frequenti dei genitori in separazione — con quello che la ricerca suggerisce
            </p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
              {SEPARAZIONE_FORUM.map((t, i) => {
                const sty = { fontFamily: "'Nunito', Georgia, sans-serif" };
                return (
                  <div key={i} id={`sep-forum-${i}`} className={openForum === i ? "active-card-scroll" : ""} role="button" tabIndex={0}
                    onClick={() => { const opening = openForum !== i; setOpenForum(opening ? i : null); if (opening) scrollToCard(`sep-forum-${i}`); }}
                    style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}CC)`, borderRadius: 28, overflow: "hidden", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
                    <div style={{ padding: "22px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <span style={{ fontSize: 36 }}>{t.emoji}</span>
                        <span style={{ background: "rgba(255,255,255,0.30)", borderRadius: 6, padding: "3px 10px", ...sty, color: "white", fontSize: 11, fontWeight: 700 }}>{t.category}</span>
                      </div>
                      <div style={{ ...sty, color: "white", fontSize: 17, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{t.title}</div>
                      <div style={{ ...sty, color: "rgba(255,255,255,0.92)", fontSize: 13, fontStyle: "italic", marginBottom: 10 }}>{t.rank}</div>
                      <div style={{ ...sty, color: "white", fontSize: 14, lineHeight: 1.6 }}>{parseLinks(t.desc)}</div>
                      <div style={{ marginTop: 14, ...sty, color: "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: 600 }}>
                        {openForum === i ? "▲ Nascondi" : "▼ Cosa dice la scienza"}
                      </div>
                    </div>
                    {openForum === i && (
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 20px" }}>
                          {t.idea.split("\n\n").map((para, pi) => (
                            <div key={pi} style={{
                              background: pi === 0 ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.18)",
                              borderRadius: 10, padding: "12px 14px",
                              ...sty, color: "white", fontSize: 14, lineHeight: 1.65,
                            }}>{parseLinks(para)}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ TAB: RISORSE ═══ */}
        {activeTab === "risorse" && (
          <div>
            {/* Libri per bambini */}
            <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 8 }}>
              📚 Libri per bambini
            </h3>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 15, fontStyle: "italic", marginBottom: 24 }}>
              Albi illustrati e romanzi selezionati dalla letteratura clinica e dalla prassi educativa
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
              {SEPARAZIONE_RISORSE.libri.map((gruppo, gi) => (
                <div key={gi} id={`sep-libri-${gi}`} style={{ background: "white", borderRadius: 22, border: "1.5px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
                  <button onClick={() => { const opening = openBook !== gi; setOpenBook(opening ? gi : null); if (opening) scrollToCard(`sep-libri-${gi}`); }} style={{
                    width: "100%", background: openBook === gi ? "#FFF9F2" : "none", border: "none", cursor: "pointer",
                    padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                  }}>
                    <span style={{ fontSize: 20 }}>📖</span>
                    <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.deepSlate, flex: 1 }}>{gruppo.fascia}</span>
                    <span style={{ background: accentLight, color: accent, borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>{gruppo.items.length}</span>
                    <span style={{ fontSize: 16, color: COLORS.slateLight, transform: openBook === gi ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
                  </button>
                  {openBook === gi && (
                    <div style={{ padding: "0 20px 16px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                      {gruppo.items.map((libro, li) => (
                        <div key={li} style={{ padding: "12px 0", borderBottom: li < gruppo.items.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                          <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{libro.title}</div>
                          <div style={{ fontFamily: "'Nunito', sans-serif", color: accent, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{libro.author}</div>
                          <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 13, lineHeight: 1.6 }}>{libro.note}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Servizi e riferimenti */}
            <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 8 }}>
              🏥 Servizi e riferimenti
            </h3>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 15, fontStyle: "italic", marginBottom: 20 }}>
              A chi rivolgersi sul territorio
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {SEPARAZIONE_RISORSE.servizi.map((srv, i) => {
                const Wrapper = srv.url ? "a" : "div";
                const wrapperProps = srv.url
                  ? { href: srv.url, target: "_blank", rel: "noopener noreferrer",
                      style: {
                        background: "white", borderRadius: 18, border: "1.5px solid rgba(0,0,0,0.06)",
                        padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start",
                        textDecoration: "none", color: "inherit", cursor: "pointer",
                        transition: "border-color 0.18s, box-shadow 0.18s",
                      },
                      onMouseEnter: e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = "0 2px 12px rgba(192,90,60,0.15)"; },
                      onMouseLeave: e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)"; e.currentTarget.style.boxShadow = "none"; },
                    }
                  : { style: { background: "white", borderRadius: 18, border: "1.5px solid rgba(0,0,0,0.06)", padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start" } };
                return (
                  <Wrapper key={i} {...wrapperProps}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{srv.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: COLORS.deepSlate, fontSize: 14, marginBottom: 4 }}>{srv.title}</div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 13, lineHeight: 1.7 }}>{srv.text}</div>
                    </div>
                    {srv.url && <span style={{ fontSize: 14, color: accent, flexShrink: 0, marginTop: 2 }}>↗</span>}
                  </Wrapper>
                );
              })}
            </div>

            {/* Footer bibliografico */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: COLORS.slateLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Riferimenti scientifici</p>
              {SEPARAZIONE_RISORSE.footer.map((ref, i) => (
                <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer" style={{
                  display: "block", fontFamily: "'Nunito', sans-serif", fontSize: 12,
                  color: COLORS.slateLight, textDecoration: "underline", textUnderlineOffset: 2,
                  marginBottom: 4, lineHeight: 1.5,
                }}>{ref.label}</a>
              ))}
            </div>
          </div>
        )}

        {/* ── Box chiusura + CrossLinks ── */}
        <div style={{
          background: "linear-gradient(135deg, #FFF9F2, #FBEAF2)",
          border: `1.5px solid ${COLORS.roseLight}`, borderRadius: 22,
          padding: "18px 22px", marginTop: 36, textAlign: "center",
        }}>
          <p style={{
            fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate,
            fontSize: isMobile ? 16 : 18, fontWeight: 700, fontStyle: "italic",
            lineHeight: 1.6, margin: 0,
          }}>
            La famiglia cambia forma — l'amore per tuo figlio no.{" "}
            <span style={{ color: COLORS.slateLight, fontWeight: 400 }}>È la cosa che conta di più.</span>
          </p>
        </div>

        <CrossLinks cards={[
          { emoji: "🕊️", label: "Lutto", desc: "Quando qualcuno non c'è più", section: "lutto", bg: "#F5F0F8" },
          { emoji: "🌿", label: "Ogni bambino è unico", desc: "Quando il percorso è diverso", section: "ognibambino", bg: "#EDF6F3" },
        ]} />
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   🕊️ LUTTO — "Quando qualcuno non c'è più"
   Letteratura fondante: Bowlby (1980), Worden (2018), Christ (2000),
   Stroebe & Schut (1999), Klass/Silverman/Nickman (1996), Speece & Brent (1984)
═══════════════════════════════════════════════════════════════ */

const LUTTO_GATE = {
  title: "Uno spazio per capire, non per affrontare da soli",
  text: "Il lutto è un'esperienza profondamente personale. Questa sezione offre informazioni generali su come i bambini vivono la perdita alle diverse età. Non sostituisce il supporto di un professionista della salute mentale. Se tuo figlio mostra un disagio intenso o prolungato dopo una perdita, parlane con il pediatra o con uno psicologo dell'età evolutiva.",
  cta: "Prosegui",
  footer: "Se senti il bisogno di parlare con qualcuno, puoi rivolgerti al consultorio familiare della tua ASL, ai servizi di Neuropsichiatria Infantile o a uno psicologo dell'età evolutiva. Per il lutto perinatale: CiaoLapo Onlus (ciaolapo.it).",
  disclaimer_rafforzato: "Questa sezione non contiene strumenti diagnostici, scale di valutazione né indicazioni cliniche personalizzate. Il lutto si attraversa — non si \"supera\" con un protocollo. Se il disagio persiste, un professionista può aiutare.",
};

const LUTTO_DATA = {
  "perinatale": {
    cosa_prova: "Il lutto perinatale — aborto spontaneo, morte in utero, morte neonatale — è un lutto spesso invisibile. Chi non lo ha vissuto fatica a riconoscerlo: \"Non lo conoscevi nemmeno\", \"Potrete averne un altro\", \"Forse era il destino\". Questa invalidazione è una delle ragioni per cui il lutto perinatale è tra i più difficili da elaborare. La coppia perde non solo un figlio ma un'intera proiezione di futuro — e lo fa in un contesto che spesso non riconosce pienamente questa perdita.\n\nIl corpo della madre aggiunge una dimensione che altri lutti non hanno: il corpo si era preparato per un bambino che non c'è. L'allattamento che arriva senza nessuno da allattare, il corpo che torna alla forma precedente senza che questo \"ritorno\" sia desiderato — sono esperienze che possono generare una dissociazione tra corpo e mente.\n\nIl padre vive spesso un lutto invisibile: la pressione a \"essere forte per lei\" può impedire l'elaborazione. Le ricerche mostrano che i padri che non elaborano il lutto perinatale hanno un rischio significativamente più alto di sintomi depressivi e di difficoltà relazionali successive.",
    cosa_puoi_fare: "Dare un nome al bambino, se lo senti giusto, può aiutare a riconoscerne l'esistenza. Conservare un ricordo concreto (un'ecografia, un oggetto preparato per lui) dà alla perdita uno spazio fisico. Non avere fretta di \"andare avanti\" — il lutto perinatale ha i suoi tempi, e non esiste un calendario giusto per tornare a stare bene.\n\nParlare con un professionista non è un segno di debolezza ma un atto di cura verso se stessi e verso la coppia. Il lutto perinatale può colpire in modo molto diverso i due partner, e le differenze nei tempi e nei modi di elaborazione possono diventare fonte di distanza se non vengono comprese.\n\nSe ci sono già figli, anche piccoli: loro percepiscono il dolore dei genitori anche quando non viene spiegato. Una comunicazione semplice e vera (\"La mamma e il papà sono tristi perché il fratellino non è potuto nascere\") è sempre preferibile al silenzio.",
    ref: "Bowlby (1980); Kersting & Wagner (2012); CiaoLapo Onlus — Linee guida sul lutto perinatale",
  },
  "0-3": {
    cosa_prova: "Il bambino sotto i tre anni non comprende il concetto di morte — manca l'[[irreversibilità]]. Quello che percepisce è l'assenza: qualcuno che c'era non c'è più. E percepisce, con un'intensità che gli adulti spesso sottovalutano, il cambiamento emotivo dell'ambiente intorno a lui. Un genitore in lutto è un genitore meno disponibile — e per un bambino che dipende completamente dalla [[co-regolazione]], questo è destabilizzante.\n\nLe risposte tipiche: irritabilità, disturbi del sonno, regressioni (un bambino che aveva smesso il pannolino ricomincia a bagnare il letto), ricerca più intensa del contatto fisico, pianto apparentemente immotivato. Il bambino può anche cercare attivamente la persona scomparsa — guardare verso la porta, chiamarla.",
    cosa_puoi_fare: "Mantenere le routine è la cosa più protettiva che puoi offrire. La prevedibilità dell'ambiente compensa l'imprevedibilità emotiva. Se ti senti sopraffatto dal tuo stesso dolore e fai fatica a essere presente, chiedere aiuto a qualcuno che il bambino conosce e di cui si fida non è un fallimento — è una forma di [[co-regolazione]] indiretta.\n\nNon serve spiegare la morte: a questa età le parole servono meno della presenza. Quello che conta è che il bambino continui a sentirsi tenuto, visto, protetto. Se chiede della persona assente, rispondi con semplicità: \"Non è qui. Io sono qui con te.\" Non mentire (\"È partito per un viaggio\") — crea confusione e, nel tempo, sfiducia.",
    ref: "Bowlby, 'Loss: Sadness and Depression' (1980); Christ, 'Healing Children's Grief' (2000)",
  },
  "3-6": {
    cosa_prova: "Il bambino di questa fascia comincia a porsi domande sulla morte, ma la comprende in modo concreto e spesso magico. Può credere che la morte sia reversibile (\"Quando torna il nonno?\"), che sia contagiosa (\"Se muoio anch'io?\"), o che sia stata causata da qualcosa che ha fatto o pensato (\"Se non avessi fatto arrabbiare la nonna, non sarebbe morta\"). Questo [[pensiero magico]] è normale a questa età, ma se non viene intercettato può diventare una fonte di senso di colpa silenzioso e persistente.\n\nLe reazioni possono essere sconcertanti: il bambino può piangere intensamente per cinque minuti e poi tornare a giocare come se nulla fosse. Non è indifferenza — è il modo in cui la mente infantile dosa il dolore. Gli adulti elaborano il lutto in modo continuo; i bambini lo fanno a \"pozzanghere\" (puddle grief): entrano ed escono dal dolore rapidamente, perché non hanno ancora la capacità di sostenerne il peso per periodi prolungati.",
    cosa_puoi_fare: "Usare un linguaggio chiaro e concreto. Evitare metafore che un bambino prende alla lettera: \"Si è addormentato per sempre\" può generare terrore dell'addormentamento; \"È andato in cielo\" può far sì che il bambino guardi il cielo aspettando; \"L'abbiamo perso\" può far pensare che basti cercarlo.\n\nDire la verità nella forma più semplice possibile: \"Il nonno è morto. Il suo corpo ha smesso di funzionare. Non tornerà. Ma il bene che ci volevamo resta.\" È una frase che un bambino di quattro anni può comprendere e che non mente.\n\nIl [[gioco simbolico]] è il laboratorio naturale di elaborazione: il bambino può mettere in scena funerali, morte e rinascita con i pupazzi. Non interrompere questi giochi — sono la sua psicoterapia spontanea.\n\nSe il bambino esprime il timore di morire, o che tu possa morire: rassicuralo sulla concretezza del presente (\"Io sto bene, sono qui con te\") senza fare promesse impossibili (\"Non morirò mai\").",
    ref: "Speece & Brent (1984); Christ (2000); Worden, 'Grief Counseling and Grief Therapy' (2018)",
  },
  "6-12": {
    cosa_prova: "Tra i sei e i dieci anni il bambino comprende progressivamente l'[[irreversibilità]] e l'universalità della morte. Sa che è definitiva. Sa che riguarda tutti. E questo può generare un'ansia esistenziale reale — non più le paure immaginarie dei tre-sei anni, ma una consapevolezza che pesa.\n\nLe reazioni: può diventare iperprotettivo verso il genitore rimasto (\"Non uscire, non prendere la macchina\"), sviluppare paure somatiche (mal di testa, mal di stomaco), avere cali nel rendimento scolastico, oppure al contrario diventare \"troppo bravo\" — assumendo un ruolo di adulto in miniatura per non pesare. Quest'ultima reazione, apparentemente positiva, è tra le più insidiose perché viene rinforzata dall'ambiente (\"Com'è maturo, com'è forte\") quando in realtà è un segnale di inibizione del dolore.\n\nIl bambino in età scolare ha anche il problema del confronto con i pari: sentirsi \"diverso\" perché gli è successo qualcosa che ai compagni non è successo può portare a isolamento o, al contrario, a una ricerca compulsiva di normalità.",
    cosa_puoi_fare: "A questa età il bambino ha bisogno di informazioni vere e di spazio per le domande — anche quelle scomode (\"Ha sofferto?\", \"Dove è adesso?\", \"Perché è successo a noi?\"). Non serve avere tutte le risposte: \"Non lo so\" è una risposta onesta e potente, se accompagnata da \"Ma possiamo parlarne insieme.\"\n\nNormalizzare le emozioni contrastanti: è possibile essere tristi e arrabbiati allo stesso tempo, o tristi e sollevati. Il lutto non è un'emozione singola — è un'esperienza che contiene tutto lo spettro emotivo. Dare il permesso esplicito di provare quello che si prova è tra le cose più importanti che un genitore possa fare.\n\nCoinvolgere il bambino nei rituali (funerale, commemorazione, visita al cimitero) se lo desidera — ma senza obbligarlo. Prepararlo a quello che vedrà e sentirà. I rituali danno struttura al caos emotivo del lutto.\n\nAttenzione al \"bambino invisibile\": quello che non piange, non chiede, non dà problemi. Il lutto silenzioso non è assenza di lutto — è lutto non espresso. Aprire piccole finestre di dialogo (\"Mi stavo ricordando del nonno. Tu ci pensi qualche volta?\") senza forzare.",
    ref: "Worden (2018); Christ (2000); Speece & Brent (1984)",
  },
  "12-15": {
    cosa_prova: "Il preadolescente ha una comprensione adulta della morte ma strumenti emotivi ancora in costruzione. La [[corteccia prefrontale]] è in pieno cantiere — il che significa che la capacità di regolare le emozioni intense è limitata proprio nel momento in cui le emozioni sono al massimo volume.\n\nLe reazioni possono essere molto polarizzate: rabbia intensa (verso il defunto, verso il destino, verso il genitore rimasto), chiusura totale (\"Non ne voglio parlare\"), comportamenti a rischio come forma di scarica, oppure un'apparente indifferenza che maschera un dolore insostenibile. L'[[amigdala]] a quest'età è iper-attiva — le emozioni arrivano a volume massimo, senza il filtro che la corteccia fornirà più avanti.\n\nIl preadolescente può anche vivere un conflitto specifico: il lutto richiede dipendenza (ho bisogno di te, ho bisogno di vicinanza), ma l'adolescenza spinge verso l'autonomia. Questi due movimenti opposti possono creare un'oscillazione estenuante — un giorno cercano il contatto, il giorno dopo rifiutano qualsiasi vicinanza.",
    cosa_puoi_fare: "Rispettare i tempi e i modi senza interpretare il silenzio come rifiuto. Il preadolescente può preferire elaborare il lutto con i pari, con la musica, con la scrittura, piuttosto che con il genitore — e questo è sano, non è un affronto.\n\nEssere disponibile senza essere invadente: \"Quando vuoi parlarne, io ci sono\" è più efficace di \"Dobbiamo parlarne.\" Lasciare la porta aperta senza forzarla.\n\nAttenzione ai segnali di rischio: isolamento prolungato, calo drastico del rendimento, comportamenti autodistruttivi, uso di sostanze. Il lutto in preadolescenza può attivare o peggiorare un [[languishing]] già presente. Se i segnali persistono oltre le prime settimane, cercare un supporto professionale non è esagerato — è tempestivo.\n\nPermettergli di essere arrabbiato — anche con il defunto. \"Come ha potuto morire e lasciarmi?\" è una domanda legittima, non un'offesa alla memoria.",
    ref: "Worden (2018); Stroebe & Schut, 'Dual Process Model' (1999); Steinberg, 'Age of Opportunity' (2014)",
  },
  "15-18": {
    cosa_prova: "L'adolescente comprende la morte come un adulto, ma la vive con l'intensità amplificata di un sistema limbico ancora in calibrazione. Può porsi domande esistenziali profonde (\"Che senso ha tutto?\", \"Moriremo tutti, quindi a cosa serve?\") che non sono depressione clinica ma elaborazione filosofica legittima — anche se possono spaventare il genitore che le ascolta.\n\nIl lutto in adolescenza può riaprire o accelerare la crisi identitaria: \"Chi sono senza questa persona?\" è una domanda che si sovrappone al \"Chi sono io?\" che l'adolescente sta già affrontando. Se la persona perduta era un punto di riferimento forte (un nonno, un genitore, un fratello), il lutto diventa anche una crisi di identità.\n\nI social media aggiungono una dimensione nuova: il lutto pubblico (post commemorativi, messaggi condivisi) e il lutto privato possono entrare in conflitto. L'adolescente può sentire pressione a elaborare \"nel modo giusto\" davanti agli altri, o al contrario usare i social come spazio di elaborazione che l'adulto non comprende.",
    cosa_puoi_fare: "Trattarlo come un interlocutore alla pari nel dolore. Non proteggerlo dalla verità — a questa età la bugia viene percepita come tradimento, non come protezione. Condividere il proprio dolore (\"Anche io sto male, anche io faccio fatica\") è un atto di autenticità che rafforza il legame — a patto che il genitore non chieda all'adolescente di prendersi cura di lui.\n\nRispettare la sua modalità di elaborazione, anche se è diversa dalla tua. Se elabora scrivendo, ascoltando musica, parlando con gli amici e non con te — va bene così. L'importante è che elabori, non che lo faccia nella forma che il genitore preferirebbe.\n\nSe l'adolescente manifesta pensieri sulla propria morte o sul non senso della vita in modo persistente, non minimizzare (\"È solo una fase\") e non panicizzare. Ascolta, prendi sul serio, e se necessario proponi un percorso con un professionista — presentandolo come uno spazio per lui, non come un problema da risolvere.",
    ref: "Worden (2018); Klass, Silverman & Nickman, 'Continuing Bonds' (1996); Stroebe & Schut (1999)",
  },
};

const LUTTO_ERRORI = [
  { frase: "\"Non piangere, sii forte.\"", spiegazione: "Il pianto è il linguaggio del lutto. Inibirlo non lo elimina — lo spinge sottoterra dove diventa altro: rabbia, somatizzazione, chiusura." },
  { frase: "\"Adesso devi essere il capofamiglia / l'uomo di casa.\"", spiegazione: "Nessun bambino dovrebbe portare il peso di un ruolo adulto. Il lutto non accelera la crescita — la appesantisce." },
  { frase: "\"È meglio non portarlo al funerale, è troppo piccolo.\"", spiegazione: "I rituali aiutano a dare struttura al dolore. Se il bambino vuole partecipare e viene preparato a quello che vedrà, il funerale può essere un momento di elaborazione importante. Se non vuole, rispettare la sua scelta." },
  { frase: "\"Non parliamone, così non ci pensa.\"", spiegazione: "I bambini ci pensano comunque. Il silenzio non protegge — isola." },
  { frase: "\"Almeno non ha sofferto\" / \"Era molto anziano\" / \"Ne avrai un altro.\"", spiegazione: "Ogni tentativo di razionalizzare il dolore per renderlo più sopportabile invalida l'esperienza di chi lo sta vivendo. Il dolore non si argomenta — si accompagna." },
  { frase: "Sostituire la persona perduta troppo rapidamente.", spiegazione: "Un nuovo partner, un nuovo animale domestico \"per farlo stare meglio\". Il bambino ha bisogno di tempo per elaborare l'assenza prima di poter investire in una nuova presenza." },
];

const LUTTO_MITI = [
  {
    emoji: "🧒", label: "MITO PROTETTIVO", labelBg: "#F5EEFF", labelColor: "#7B2FF7",
    title: "I bambini non capiscono la morte — non soffrono come noi",
    short: "I bambini sono troppo piccoli per capire, quindi è meglio non coinvolgerli. La ricerca documenta il contrario.",
    science: "Speece & Brent (1984) hanno identificato tre componenti nella comprensione della morte: [[irreversibilità]], universalità e non-funzionalità. I bambini le acquisiscono progressivamente tra i 3 e i 10 anni — ma l'assenza di comprensione cognitiva completa non significa assenza di sofferenza. Già nel primo anno di vita il bambino reagisce all'assenza della figura di [[attaccamento]] con la sequenza protesta → disperazione → distacco descritta da Bowlby (1980). Il dolore c'è prima delle parole per dirlo.",
    truth: "I bambini soffrono — in modo diverso dall'adulto, non in misura minore. Il bambino piccolo non capisce 'per sempre' ma capisce 'non c'è più adesso', e quel 'adesso' si rinnova ogni giorno. Il bambino più grande capisce la definitività e ci aggiunge l'ansia esistenziale. Il mito che non soffrono nasce dalla nostra difficoltà ad accogliere il dolore infantile, non dalla loro incapacità di provarlo.",
    fun: "In Giappone esiste la tradizione dell'Obon, un festival annuale in cui si accolgono simbolicamente gli spiriti dei defunti in famiglia. I bambini partecipano attivamente ai rituali — e le ricerche cross-culturali mostrano che le culture che includono i bambini nei rituali di lutto hanno tassi più bassi di lutto complicato infantile rispetto a quelle che li escludono.",
  },
  {
    emoji: "⛪", label: "MITO CULTURALE", labelBg: "#FFF0F0", labelColor: "#E8524A",
    title: "Non portarlo al funerale — è troppo piccolo",
    short: "I funerali sono traumatici per i bambini. La letteratura clinica racconta una storia diversa — a una condizione.",
    science: "Worden (2018) e Christ (2000) concordano: la partecipazione ai rituali funebri è generalmente benefica per i bambini a partire dai 3-4 anni, a patto che vengano preparati in anticipo a quello che vedranno e sentiranno, e che abbiano un adulto di riferimento dedicato che possa portarli fuori se ne hanno bisogno. L'esclusione dal rituale, al contrario, può generare fantasie peggiori della realtà e un senso di esclusione dal dolore familiare.",
    truth: "Il funerale non è un trauma — è una cornice. Dà un inizio e una struttura al lutto, permette al bambino di vedere che anche gli altri sono tristi (e quindi che la sua tristezza è legittima), e segna un passaggio condiviso. La scelta va lasciata al bambino, quando possibile: se vuole venire, prepararlo; se non vuole, rispettarlo. L'errore è decidere al suo posto 'per il suo bene' senza chiedergli cosa preferisce.",
    fun: "In Messico il Día de los Muertos è una celebrazione familiare in cui i bambini partecipano alla costruzione degli altari, alla preparazione del cibo e alla visita ai cimiteri fin dalla prima infanzia. L'approccio è festoso e inclusivo — e l'OMS lo ha citato come esempio di elaborazione culturale sana del lutto.",
  },
  {
    emoji: "😢", label: "MITO EDUCATIVO", labelBg: "#FFF3E8", labelColor: "#D4712A",
    title: "Non piangere davanti a lui — devi essere forte",
    short: "Mostrare il proprio dolore al bambino lo spaventa e lo destabilizza. La ricerca suggerisce il contrario — con un limite importante.",
    science: "Stroebe & Schut (1999) hanno descritto il Dual Process Model del lutto: l'adulto oscilla naturalmente tra momenti di confronto con la perdita e momenti di orientamento verso la vita quotidiana. Il bambino ha bisogno di vedere entrambi i movimenti. Worden (2018) documenta che i bambini i cui genitori nascondono completamente il dolore tendono a inibirne l'espressione a loro volta — e l'inibizione emotiva è un fattore di rischio per il lutto complicato.",
    truth: "Piangere davanti a tuo figlio non lo traumatizza — gli mostra che il dolore è umano, esprimibile e condivisibile. La condizione è che il genitore resti funzionalmente presente: un pianto che si accompagna a 'sono triste perché mi manca, ma sto bene e sono qui con te' è radicalmente diverso da un crollo in cui il bambino sente di dover prendersi cura dell'adulto. Il primo è modellamento emotivo sano; il secondo è inversione di ruolo.",
    fun: "Nelle scuole finlandesi esiste il concetto di 'tunnetaidot' (competenze emotive) integrato nel curricolo. I bambini imparano che tutte le emozioni — incluse tristezza e paura — sono informazioni utili, non debolezze da nascondere. Il programma ha mostrato effetti positivi sulla capacità dei bambini di elaborare le perdite.",
  },
  {
    emoji: "⏳", label: "MITO UNIVERSALE", labelBg: "#E8F2FF", labelColor: "#2A6ED4",
    title: "Il tempo guarisce tutto",
    short: "Basta aspettare e il dolore passerà da solo. La ricerca sul lutto infantile dice qualcosa di più complesso.",
    science: "Il modello dei Continuing Bonds (Klass, Silverman & Nickman, 1996) ha ribaltato l'idea che il lutto 'sano' significhi staccarsi dal defunto. Al contrario, mantenere un legame interno con la persona perduta — attraverso ricordi, rituali, oggetti — è parte dell'elaborazione sana, soprattutto nei bambini. Il tempo da solo non guarisce: è ciò che accade nel tempo che fa la differenza — la qualità del supporto, la possibilità di esprimere il dolore, la presenza di adulti emotivamente disponibili.",
    truth: "Il tempo senza elaborazione non guarisce — sedimenta. Un bambino che 'sembra stare bene' dopo poche settimane potrebbe semplicemente aver imparato che il suo dolore non è benvenuto. Il lutto infantile può riemergere a ogni passaggio evolutivo: il bambino che ha perso un genitore a 4 anni potrebbe ri-elaborare quella perdita a 8, a 12, a 16 — ogni volta con strumenti cognitivi nuovi. Questo non è 'non averla superata': è il modo normale in cui il lutto cresce con il bambino.",
    fun: "In Svezia i centri 'Randiga Huset' (La Casa a Righe) offrono gruppi di supporto specifici per bambini in lutto, organizzati per fascia d'età. Il principio fondatore: il lutto non ha una scadenza, e un bambino può avere bisogno di tornare a parlarne anni dopo la perdita, quando la comprende in modo nuovo.",
  },
];

const LUTTO_FORUM = [
  {
    emoji: "💬", color: "#7B68AE", bg: "#F5EEFF", category: "COMUNICAZIONE",
    title: "Come gli dico che il nonno è morto?",
    rank: "#1 domanda dei genitori sul lutto infantile",
    desc: "Il momento della comunicazione è quello che spaventa di più — e la paura di sbagliare porta spesso a rimandare, delegare o usare eufemismi che confondono.",
    idea: "🧠 La regola fondamentale è una: usare la parola 'morto'. Non 'ci ha lasciati' (il bambino pensa all'abbandono), non 'si è addormentato' (il bambino sviluppa paura del sonno), non 'è andato via' (il bambino aspetta il ritorno), non 'l'abbiamo perso' (il bambino pensa che basti cercarlo). Christ (2000) documenta che il linguaggio concreto riduce l'ansia, non la aumenta.\n\n✅ Una formula efficace per i piccoli: 'Il nonno è morto. Il suo corpo ha smesso di funzionare e non può più tornare. Non è colpa di nessuno. Noi siamo tristi, e va bene esserlo.' Per i più grandi si può aggiungere contesto proporzionato all'età, sempre rispondendo alle domande con onestà — anche 'non lo so' è una risposta valida.",
  },
  {
    emoji: "🐾", color: "#6BCB77", bg: "#E8F9EA", category: "PERDITE",
    title: "È morto il nostro animale — conta come lutto?",
    rank: "Perdita più sottovalutata",
    desc: "La morte di un animale domestico è spesso la prima esperienza di perdita irreversibile per un bambino — e merita di essere presa sul serio.",
    idea: "🧠 Per un bambino l'animale domestico è una figura di [[attaccamento]] reale: presenza costante, affetto incondizionato, compagno di giochi e di notti. La sua morte attiva gli stessi meccanismi di lutto di qualsiasi altra perdita significativa. Minimizzare ('Era solo un gatto', 'Ne prenderemo un altro') invalida l'esperienza e insegna al bambino che il suo dolore non merita spazio.\n\n✅ Trattare la morte dell'animale come un'occasione per accompagnare il bambino nel primo lutto reale: nominare quello che è successo, permettere il pianto, creare un piccolo rituale (una sepoltura, un disegno, un ricordo condiviso). Non sostituire l'animale immediatamente — il bambino ha bisogno di tempo per l'assenza prima di investire in una nuova presenza.",
  },
  {
    emoji: "😶", color: "#4D96FF", bg: "#E8F2FF", category: "REAZIONI",
    title: "Mio figlio non piange — è normale?",
    rank: "#2 preoccupazione nei forum sul lutto",
    desc: "L'assenza di pianto non è assenza di dolore — ma distinguere il lutto silenzioso dalla vera resilienza non è semplice.",
    idea: "🧠 I bambini elaborano il lutto in modo intermittente e non lineare. Stroebe & Schut (1999) lo descrivono come oscillazione tra confronto con la perdita e ritorno alla normalità. Un bambino che gioca e ride il giorno dopo un funerale non è insensibile — sta dosando il dolore in quantità sopportabili (il 'puddle grief' descritto da Worden). Preoccuparsi quando il bambino non piange è comprensibile, ma il pianto non è l'unico indicatore di elaborazione.\n\n✅ I segnali da monitorare non sono l'assenza di pianto ma: ritiro sociale prolungato, regressioni persistenti, scomparsa dell'interesse per le attività abituali, somatizzazioni ricorrenti, oppure un'iperattività frenetica che sembra servire a 'non pensarci'. Se dopo 6-8 settimane il bambino sembra 'troppo bene' — cioè non mostra mai alcun segno di tristezza — vale la pena parlarne con un professionista.",
  },
  {
    emoji: "🤍", color: "#B07AA1", bg: "#F5EEFF", category: "LUTTO PERINATALE",
    title: "Lutto perinatale — come si sopravvive?",
    rank: "Topic con il tono più delicato",
    desc: "La perdita di un bambino durante la gravidanza o subito dopo la nascita è un lutto spesso invisibile, minimizzato dall'esterno e devastante nell'interno.",
    idea: "🧠 Il lutto perinatale è classificato dalla letteratura come uno dei più difficili da elaborare perché colpisce un legame che esisteva già — nella mente, nel corpo, nei progetti — ma che il mondo esterno fatica a riconoscere. Le frasi come 'potrai averne un altro', 'almeno non lo conoscevi', 'era il destino' sono tra le più dannose che un genitore in lutto possa ricevere. Invalidano un'esperienza che ha bisogno di spazio, non di soluzioni.\n\n✅ CiaoLapo Onlus (ciaolapo.it) è il riferimento italiano principale: supporto psicologico, gruppi di auto-mutuo-aiuto, e formazione per operatori sanitari. Dare un nome al bambino, conservare un ricordo concreto, darsi il permesso di un tempo senza pressione a 'riprendersi' sono tutti atti di cura verso se stessi. Se ci sono già altri figli, una comunicazione semplice e vera è sempre preferibile al silenzio.",
  },
];

const LUTTO_RISORSE = {
  libri: [
    { fascia: "3–6 anni", items: [
      { title: "L'anatra, la morte e il tulipano", author: "Wolf Erlbruch", note: "Un albo illustrato di rara delicatezza: la morte accompagna l'anatra come una presenza gentile, non minacciosa. Usato in molti percorsi educativi sulla morte." },
      { title: "Il buco", author: "Anna Llenas", note: "Non parla esplicitamente di lutto, ma di quel senso di vuoto che una perdita lascia — e di come, col tempo, si impara a conviverci." },
      { title: "Ci sarà sempre un 'noi'", author: "Camilla Sarnowski", note: "Affronta la morte di un nonno con il linguaggio della continuità del legame." },
    ]},
    { fascia: "6–10 anni", items: [
      { title: "Io dopo di te", author: "Lorenza Gentile, ill. Gioia Marchegiani", note: "Racconta il lutto di un bambino per la nonna con onestà e poesia — senza edulcorare." },
      { title: "L'isola del nonno", author: "Benji Davies", note: "Metafora visiva di separazione e memoria, premiato in diversi paesi." },
    ]},
    { fascia: "10+ anni", items: [
      { title: "L'estate che conobbi il Che", author: "Luigi Ballerini", note: "Per preadolescenti: la perdita si intreccia con la crescita in un romanzo delicato e mai didascalico." },
      { title: "Mio fratello rincorre i dinosauri", author: "Giacomo Mazzariol", note: "Non è un libro sul lutto ma sulla diversità e la perdita dell'aspettativa — può parlare anche a chi ha perso la 'normalità' della propria famiglia." },
    ]},
  ],
  servizi: [
    { icon: "🏥", title: "Consultori familiari ASL", text: "Supporto psicologico gratuito per famiglie in lutto — anche per i bambini. Accesso diretto o tramite pediatra di base." },
    { icon: "📞", title: "Telefono Azzurro — 19696", text: "Ascolto e consulenza per situazioni che coinvolgono minori in difficoltà.", url: "https://azzurro.it/adulti/" },
    { icon: "🤍", title: "CiaoLapo Onlus — ciaolapo.it", text: "Riferimento italiano principale per il lutto perinatale: supporto psicologico, gruppi di auto-mutuo-aiuto e formazione per operatori sanitari. Numero verde: 800 601 660 (lun–ven 13–15).", url: "https://www.ciaolapo.it/" },
    { icon: "💬", title: "CiaoLapo — Domande frequenti", text: "Risposte alle domande più comuni dopo una perdita perinatale: cosa dire, cosa fare, a chi rivolgersi.", url: "https://www.ciaolapo.it/faq/" },
    { icon: "🧠", title: "Psicologi dell'età evolutiva", text: "Per un accompagnamento strutturato quando i segnali di disagio del bambino persistono nel tempo o si intensificano. Il pediatra può orientare verso il servizio più adatto." },
  ],
  footer: [
    { label: "AAP — Clinical Report 2024: Supporting the Grieving Child and Family", url: "https://publications.aap.org/pediatrics/article/154/1/e2024067212/197497/Supporting-the-Grieving-Child-and-Family-Clinical" },
    { label: "AAP — How Children Understand Death (guida genitori)", url: "https://www.healthychildren.org/English/healthy-living/emotional-wellness/Building-Resilience/Pages/How-Children-Understand-Death-What-You-Should-Say.aspx" },
    { label: "ISS — Progetto SPItOSS (sorveglianza mortalità perinatale)", url: "https://www.iss.it/en/comunicati-stampa/-/asset_publisher/fjTKmjJgSgdK/content/id/5271759" },
    { label: "SINPIA — Linee guida", url: "https://sinpia.eu/linee-guida-3/" },
  ],
};

function LuttoPage() {
  const isMobile = useIsMobile();
  const [gateOpen, setGateOpen] = useState(false);
  const [activeZone, setActiveZone] = useState("0-3");
  const [activeTab, setActiveTab] = useState("contenuti");
  const [openSections, setOpenSections] = useState({});
  const [openMito, setOpenMito] = useState(null);
  const [openForum, setOpenForum] = useState(null);
  const [openBook, setOpenBook] = useState(null);

  const toggleSection = (id) => setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  const zones = [
    { id: "perinatale", label: "Perinatale", emoji: "🤍" },
    { id: "0-3", label: "0–3", emoji: "👶" },
    { id: "3-6", label: "3–6", emoji: "🧒" },
    { id: "6-12", label: "6–12", emoji: "📚" },
    { id: "12-15", label: "12–15", emoji: "🌊" },
    { id: "15-18", label: "15–18", emoji: "✨" },
  ];

  const tabs = [
    { id: "contenuti", label: "📖 Per fascia d'età" },
    { id: "miti", label: "🔬 Miti da sfatare" },
    { id: "forum", label: "💬 Temi caldi" },
    { id: "risorse", label: "📚 Risorse" },
  ];

  const accent = "#7B68AE";
  const accentLight = "#F5F0F8";
  const accentBorder = "rgba(123,104,174,0.2)";

  const d = LUTTO_DATA[activeZone];

  /* ── GATE ── */
  if (!gateOpen) {
    return (
      <div style={{ background: "#FFFCFA", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>
          <span style={{ fontSize: 56, display: "block", marginBottom: 20 }}>🕊️</span>
          <h1 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: isMobile ? 24 : 30, fontWeight: 700, margin: "0 0 16px", lineHeight: 1.3 }}>
            {LUTTO_GATE.title}
          </h1>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 15, lineHeight: 1.8, margin: "0 0 24px" }}>
            {LUTTO_GATE.text}
          </p>
          <button onClick={() => setGateOpen(true)} style={{
            background: `linear-gradient(135deg, ${accent}, #9B8EC4)`, color: "white",
            border: "none", borderRadius: 28, padding: "14px 40px",
            fontFamily: "'Nunito', sans-serif", fontSize: 16, fontWeight: 700,
            cursor: "pointer", boxShadow: `0 4px 16px ${accent}40`,
            marginBottom: 24,
          }}>
            {LUTTO_GATE.cta}
          </button>
          <div style={{ background: accentLight, border: `1.5px solid ${accentBorder}`, borderRadius: 18, padding: "14px 18px", marginBottom: 16, textAlign: "left" }}>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: "#5A4A7A", fontSize: 13, lineHeight: 1.75, margin: 0 }}>
              {LUTTO_GATE.footer}
            </p>
          </div>
          <div style={{ background: "#FFF8E7", border: "1.5px solid #F4C842", borderRadius: 18, padding: "14px 18px", textAlign: "left" }}>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: "#7A5A00", fontSize: 13, lineHeight: 1.75, margin: 0 }}>
              <strong>🕊️</strong> {LUTTO_GATE.disclaimer_rafforzato}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Render una sezione accordion ── */
  const renderAccordion = (id, emoji, title, children, opts = {}) => {
    const isOpen = openSections[id];
    const borderColor = isOpen ? accentBorder : "rgba(0,0,0,0.06)";
    return (
      <div key={id} id={id} style={{
        background: "white", borderRadius: 22,
        border: `1.5px solid ${borderColor}`,
        overflow: "hidden", marginBottom: 12,
        boxShadow: isOpen ? `0 4px 20px ${accent}12` : "0 2px 8px rgba(0,0,0,0.04)",
        transition: "all 0.2s",
      }}>
        <button onClick={() => { toggleSection(id); if (!isOpen) scrollToCard(id); }} style={{
          width: "100%", background: isOpen ? accentLight : "none", border: "none", cursor: "pointer",
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
          textAlign: "left", touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{emoji}</span>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.deepSlate, flex: 1 }}>{title}</span>
          {opts.tag && <span style={{ background: opts.tagBg || "#F5EEFF", color: opts.tagColor || "#7B68AE", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontFamily: "'Nunito', sans-serif", fontWeight: 700, flexShrink: 0 }}>{opts.tag}</span>}
          <span style={{ fontSize: 18, color: COLORS.slateLight, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>▾</span>
        </button>
        {isOpen && (
          <div style={{ padding: "0 20px 18px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
            <div style={{ paddingTop: 14 }}>{children}</div>
          </div>
        )}
      </div>
    );
  };

  /* ── Paragrafo stile ── */
  const P = ({ children, style: s }) => (
    <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.8, margin: "0 0 12px", ...s }}>
      {typeof children === "string" ? renderRichContent(children) : children}
    </p>
  );

  /* ── Ref badge ── */
  const RefBadge = ({ text }) => (
    <div style={{ background: "#F5F5F0", borderRadius: 12, padding: "8px 14px", marginTop: 10 }}>
      <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 12, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
        📚 {text}
      </p>
    </div>
  );

  /* ── PAGINA PRINCIPALE ── */
  return (
    <div style={{ background: "#FFFCFA", minHeight: "100vh" }}>

      {/* ── Hero ── */}
      <div style={{
        background: "linear-gradient(160deg, #F5F0F8 0%, #FBEAF2 50%, #EDF6F3 100%)",
        padding: isMobile ? "28px 16px 36px" : "36px 20px 48px",
        textAlign: "center",
      }}>
        <span style={{ fontSize: 48, display: "block", marginBottom: 12 }}>🕊️</span>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: "0 0 10px" }}>
          Quando qualcuno non c'è più
        </h1>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 16 : 20, fontStyle: "italic", color: COLORS.slateLight, margin: 0 }}>
          accompagnare un bambino nel lutto
        </p>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 48px" }}>

        {/* ── Disclaimer compatto ── */}
        <div style={{ background: accentLight, border: `1.5px solid ${accentBorder}`, borderRadius: 18, padding: "14px 18px", marginBottom: 28 }}>
          <p style={{ fontFamily: "'Nunito', sans-serif", color: "#5A4A7A", fontSize: 13, lineHeight: 1.75, margin: 0 }}>
            <strong>🕊️ Il lutto si attraversa — non si supera.</strong>{" "}
            Questa sezione offre informazioni per capire come tuo figlio vive la perdita. Non contiene strumenti diagnostici né indicazioni cliniche personalizzate.
          </p>
        </div>

        {/* ── Tab bar principale ── */}
        <div id="lutto-tab-bar" role="tablist" aria-label="Sezioni Lutto" style={{
          display: "flex", gap: 6, marginBottom: 28, overflowX: "auto",
          scrollbarWidth: "none", msOverflowStyle: "none", paddingBottom: 4,
        }}>
          {tabs.map(t => (
            <button key={t.id} role="tab" aria-selected={activeTab === t.id} onClick={() => { setActiveTab(t.id); setOpenSections({}); setOpenMito(null); setOpenForum(null); }} style={{
              background: activeTab === t.id ? accent : "white",
              color: activeTab === t.id ? "white" : COLORS.deepSlate,
              border: activeTab === t.id ? "none" : "1.5px solid rgba(0,0,0,0.08)",
              borderRadius: 20, padding: isMobile ? "8px 14px" : "8px 18px",
              fontFamily: "'Nunito', sans-serif", fontSize: isMobile ? 12 : 13,
              fontWeight: activeTab === t.id ? 800 : 600,
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              boxShadow: activeTab === t.id ? `0 2px 10px ${accent}40` : "none",
              touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
              transition: "all 0.17s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ═══ TAB: CONTENUTI PER FASCIA ═══ */}
        {activeTab === "contenuti" && (
          <div>
            {/* Zone picker */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              {zones.map(z => (
                <button key={z.id} onClick={() => { setActiveZone(z.id); setOpenSections({}); }} style={{
                  background: activeZone === z.id ? accent : "white",
                  color: activeZone === z.id ? "white" : COLORS.deepSlate,
                  border: activeZone === z.id ? "none" : "1.5px solid rgba(0,0,0,0.08)",
                  borderRadius: 16, padding: "8px 16px",
                  fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: activeZone === z.id ? 800 : 600,
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: activeZone === z.id ? `0 2px 10px ${accent}30` : "none",
                }}>{z.id === "perinatale" ? "🤍 Perinatale" : `${z.label} anni`}</button>
              ))}
            </div>

            <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 22, marginBottom: 16 }}>
              {activeZone === "perinatale" ? "Lutto perinatale" : `Fascia ${zones.find(z => z.id === activeZone)?.label} anni`}
            </h3>

            {/* ── Cosa prova ── */}
            {renderAccordion(`lut-prova-${activeZone}`, activeZone === "perinatale" ? "🤍" : "💔",
              activeZone === "perinatale" ? "Cosa succede" : "Cosa prova tuo figlio", <>
              {d.cosa_prova.split("\n\n").map((para, i) => <P key={i}>{para}</P>)}
            </>)}

            {/* ── Cosa puoi fare ── */}
            {renderAccordion(`lut-fare-${activeZone}`, "✅", "Cosa puoi fare", <>
              {d.cosa_puoi_fare.split("\n\n").map((para, i) => <P key={i}>{para}</P>)}
              <RefBadge text={d.ref} />
            </>, { tag: "GUIDA", tagBg: "#E8F9EA", tagColor: "#2D7A40" })}

            {/* ── Errori comuni (cross-fascia, sempre visibile) ── */}
            <div style={{ background: "linear-gradient(135deg, #F5F0F8, #FBEAF2)", borderRadius: 22, padding: "20px 20px 16px", marginTop: 24, border: `1.5px solid ${accentBorder}` }}>
              <h4 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 17, margin: "0 0 14px" }}>
                ⛔ Cose da evitare, a qualsiasi età
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {LUTTO_ERRORI.map((e, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 16, padding: "14px 16px" }}>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: COLORS.deepSlate, fontSize: 14, marginBottom: 4 }}>
                      {renderRichContent(e.frase)}
                    </div>
                    <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 13, lineHeight: 1.7 }}>
                      {renderRichContent(e.spiegazione)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: MITI DA SFATARE ═══ */}
        {activeTab === "miti" && (
          <div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 8 }}>
              Miti da sfatare 🔬
            </h3>
            <p style={{ color: COLORS.slateLight, fontFamily: "'Nunito', sans-serif", fontStyle: "italic", marginBottom: 24, fontSize: 15 }}>
              Convinzioni diffuse sul lutto infantile — e cosa dice davvero la ricerca
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {LUTTO_MITI.map((m, i) => (
                <div key={i} id={`lut-mito-${i}`} className={openMito === i ? "active-card-scroll" : ""} style={{ background: COLORS.warmWhite, borderRadius: 28, overflow: "hidden", border: "2px solid rgba(45,59,58,0.07)", cursor: "pointer" }}
                  onClick={() => { const opening = openMito !== i; setOpenMito(opening ? i : null); if (opening) scrollToCard(`lut-mito-${i}`); }}>
                  <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 32, flexShrink: 0 }}>{m.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "inline-block", background: m.labelBg, color: m.labelColor, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: "'Nunito', sans-serif", fontWeight: 700, marginBottom: 6 }}>{m.label}</div>
                      <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{m.title}</div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 14, lineHeight: 1.5 }}>{m.short}</div>
                    </div>
                    <div style={{ fontSize: 20, color: COLORS.slateLight, flexShrink: 0 }}>{openMito === i ? "▲" : "▼"}</div>
                  </div>
                  {openMito === i && (
                    <div style={{ borderTop: "2px solid rgba(45,59,58,0.06)", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ background: "#F0F7FF", borderRadius: 18, padding: "14px 18px" }}>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: "#1A5F9E", fontSize: 13, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>🔬 Cosa dice la scienza</div>
                        <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{parseLinks(m.science)}</p>
                      </div>
                      <div style={{ background: "#F0FFF5", borderRadius: 18, padding: "14px 18px" }}>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: "#1A7A3A", fontSize: 13, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>✅ La verità</div>
                        <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{parseLinks(m.truth)}</p>
                      </div>
                      <div style={{ background: COLORS.goldLight, borderRadius: 18, padding: "14px 18px" }}>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: "#7A5800", fontSize: 13, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>🌍 Nel mondo</div>
                        <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.deepSlate, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{parseLinks(m.fun)}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TAB: FORUM TOPICS ═══ */}
        {activeTab === "forum" && (
          <div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 8 }}>
              Temi caldi dalle community 💬
            </h3>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 15, fontStyle: "italic", marginBottom: 24 }}>
              Le domande più frequenti dei genitori sul lutto — con quello che la ricerca suggerisce
            </p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
              {LUTTO_FORUM.map((t, i) => {
                const sty = { fontFamily: "'Nunito', Georgia, sans-serif" };
                return (
                  <div key={i} id={`lut-forum-${i}`} className={openForum === i ? "active-card-scroll" : ""} role="button" tabIndex={0}
                    onClick={() => { const opening = openForum !== i; setOpenForum(opening ? i : null); if (opening) scrollToCard(`lut-forum-${i}`); }}
                    style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}CC)`, borderRadius: 28, overflow: "hidden", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
                    <div style={{ padding: "22px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <span style={{ fontSize: 36 }}>{t.emoji}</span>
                        <span style={{ background: "rgba(255,255,255,0.30)", borderRadius: 6, padding: "3px 10px", ...sty, color: "white", fontSize: 11, fontWeight: 700 }}>{t.category}</span>
                      </div>
                      <div style={{ ...sty, color: "white", fontSize: 17, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{t.title}</div>
                      <div style={{ ...sty, color: "rgba(255,255,255,0.92)", fontSize: 13, fontStyle: "italic", marginBottom: 10 }}>{t.rank}</div>
                      <div style={{ ...sty, color: "white", fontSize: 14, lineHeight: 1.6 }}>{parseLinks(t.desc)}</div>
                      <div style={{ marginTop: 14, ...sty, color: "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: 600 }}>
                        {openForum === i ? "▲ Nascondi" : "▼ Cosa dice la scienza"}
                      </div>
                    </div>
                    {openForum === i && (
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 20px" }}>
                          {t.idea.split("\n\n").map((para, pi) => (
                            <div key={pi} style={{
                              background: pi === 0 ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.18)",
                              borderRadius: 10, padding: "12px 14px",
                              ...sty, color: "white", fontSize: 14, lineHeight: 1.65,
                            }}>{parseLinks(para)}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ TAB: RISORSE ═══ */}
        {activeTab === "risorse" && (
          <div>
            {/* Libri per bambini */}
            <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 8 }}>
              📚 Libri per bambini
            </h3>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 15, fontStyle: "italic", marginBottom: 24 }}>
              Albi illustrati e romanzi selezionati dalla letteratura clinica e dalla prassi educativa
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
              {LUTTO_RISORSE.libri.map((gruppo, gi) => (
                <div key={gi} id={`lut-libri-${gi}`} style={{ background: "white", borderRadius: 22, border: "1.5px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
                  <button onClick={() => { const opening = openBook !== gi; setOpenBook(opening ? gi : null); if (opening) scrollToCard(`lut-libri-${gi}`); }} style={{
                    width: "100%", background: openBook === gi ? accentLight : "none", border: "none", cursor: "pointer",
                    padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                  }}>
                    <span style={{ fontSize: 20 }}>📖</span>
                    <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.deepSlate, flex: 1 }}>{gruppo.fascia}</span>
                    <span style={{ background: accentLight, color: accent, borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>{gruppo.items.length}</span>
                    <span style={{ fontSize: 16, color: COLORS.slateLight, transform: openBook === gi ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
                  </button>
                  {openBook === gi && (
                    <div style={{ padding: "0 20px 16px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                      {gruppo.items.map((libro, li) => (
                        <div key={li} style={{ padding: "12px 0", borderBottom: li < gruppo.items.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                          <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{libro.title}</div>
                          <div style={{ fontFamily: "'Nunito', sans-serif", color: accent, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{libro.author}</div>
                          <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 13, lineHeight: 1.6 }}>{libro.note}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Servizi e riferimenti */}
            <h3 style={{ fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate, fontSize: 24, marginBottom: 8 }}>
              🏥 Servizi e riferimenti
            </h3>
            <p style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 15, fontStyle: "italic", marginBottom: 20 }}>
              A chi rivolgersi sul territorio
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {LUTTO_RISORSE.servizi.map((srv, i) => {
                const Wrapper = srv.url ? "a" : "div";
                const wrapperProps = srv.url ? { href: srv.url, target: "_blank", rel: "noopener noreferrer" } : {};
                return (
                  <Wrapper key={i} {...wrapperProps} style={{
                    background: "white", borderRadius: 18, border: "1.5px solid rgba(0,0,0,0.06)",
                    padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start",
                    textDecoration: "none", color: "inherit",
                    transition: srv.url ? "border-color 0.18s, box-shadow 0.18s" : "none",
                    cursor: srv.url ? "pointer" : "default",
                  }}
                  onMouseEnter={srv.url ? e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 2px 12px ${accent}22`; } : undefined}
                  onMouseLeave={srv.url ? e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)"; e.currentTarget.style.boxShadow = "none"; } : undefined}
                  >
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{srv.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: COLORS.deepSlate, fontSize: 14, marginBottom: 4 }}>
                        {srv.title}{srv.url ? <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.5 }}>↗</span> : null}
                      </div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", color: COLORS.slateLight, fontSize: 13, lineHeight: 1.7 }}>{srv.text}</div>
                    </div>
                  </Wrapper>
                );
              })}
            </div>

            {/* Footer bibliografico */}
            <div style={{ marginTop: 32, padding: "16px 20px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700, color: COLORS.slateLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Riferimenti scientifici
              </p>
              {LUTTO_RISORSE.footer.map((ref, i) => (
                <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer" style={{
                  display: "block", fontFamily: "'Nunito', sans-serif", fontSize: 12, color: COLORS.slateLight,
                  lineHeight: 1.7, marginBottom: 4, textDecoration: "none", opacity: 0.75,
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = accent; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.75"; e.currentTarget.style.color = COLORS.slateLight; }}
                >
                  {ref.label} ↗
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Box chiusura + CrossLinks ── */}
        <div style={{
          background: "linear-gradient(135deg, #F5F0F8, #FBEAF2)",
          border: `1.5px solid ${accentBorder}`, borderRadius: 22,
          padding: "18px 22px", marginTop: 36, textAlign: "center",
        }}>
          <p style={{
            fontFamily: "'Playfair Display', serif", color: COLORS.deepSlate,
            fontSize: isMobile ? 16 : 18, fontWeight: 700, fontStyle: "italic",
            lineHeight: 1.6, margin: 0,
          }}>
            Il dolore non si argomenta — si accompagna.{" "}
            <span style={{ color: COLORS.slateLight, fontWeight: 400 }}>Non devi avere tutte le risposte. Devi solo esserci.</span>
          </p>
        </div>

        <CrossLinks cards={[
          { emoji: "🏠", label: "Separazione", desc: "Quando la famiglia cambia forma", section: "separazione", bg: "#FFF5F0" },
          { emoji: "🌿", label: "Ogni bambino è unico", desc: "Quando il percorso è diverso", section: "ognibambino", bg: "#EDF6F3" },
        ]} />
      </div>
    </div>
  );
}


export default function App() {
  const [section, setSectionRaw] = useState("guide");
  const setSection = (s) => {
    window.scrollTo({ top: 0, behavior: "instant" });
    /* Navigazione verso glossario: salva contesto corrente per bottone "Torna"
       indipendentemente dal percorso (menu, SubNav, CrossLinks, GlossLink) */
    if (s === "glossario") {
      _glossaryReturnSection = _globalCurrentSection;
      _glossaryReturnTab     = _globalCurrentTab;
      _glossaryReturnPhase   = _globalCurrentPhase;
      _glossaryReturnLabel   = SECTION_LABELS[_globalCurrentSection] || "Torna indietro";
    } else {
      /* Navigazione manuale verso altre sezioni: i globals tab/fase
         non devono inquinare il nuovo componente */
      _globalCurrentTab = null;
      _globalCurrentPhase = null;
    }
    setSectionRaw(s);
  };
  const [zone, setZone] = useState(null);
  // true = onboarding già visto almeno una volta (flag in localStorage)
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(
    () => !!localStorage.getItem("lba_onboarding_done")
  );
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [zonePickerCompact, setZonePickerCompact] = useState(false);
  const [legalPage, setLegalPage] = useState(null); // "privacy" | "termini" | null
  const [showAuthor, setShowAuthor] = useState(false);
  const [glossHighlight, setGlossHighlight] = useState(null);
  const isMobile = useIsMobile();

  // Wire global glossary navigation
  _globalSetSection = setSection;
  _globalSetHighlight = setGlossHighlight;
  _globalCurrentSection = section;
  _globalShowZonePicker = () => { window.scrollTo({ top: 0, behavior: "instant" }); setZonePickerCompact(true); setShowZonePicker(true); };

  /* Header sempre fisso a 60px — scroll collapse rimosso */
  const headerHeight = 60;

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    // Global button fix: entire button always clickable
    const style = document.createElement("style");
    style.textContent = [
      "button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }",
      "button > * { pointer-events: none; }",
    ].join("\n");
    document.head.appendChild(style);
  }, []);

  if (legalPage === "privacy") return <PrivacyPage onClose={() => setLegalPage(null)} />;
  if (legalPage === "termini") return <TerminiPage onClose={() => setLegalPage(null)} />;

  if (showZonePicker) {
    return (
        <ZonePickerPage
          compact={zonePickerCompact}
          onSelect={z => { setZone(z); setShowZonePicker(false); setZonePickerCompact(false); setSection("guide"); }}
        />
    );
  }

  if (!zone) {
    // Prima apertura: mostra onboarding completo (con testo)
    // Ritorni successivi via "Cambia fascia": mostra solo il picker (solo bottoni)
    const handleFirstSelect = (z) => {
      localStorage.setItem("lba_onboarding_done", "1");
      setHasSeenOnboarding(true);
      setZone(z);
      setSection("guide");
    };
    if (!hasSeenOnboarding) {
      return (
          <OnboardingScreen onSelect={handleFirstSelect} onLegal={setLegalPage} />
      );
    }
    // Utente di ritorno senza fascia attiva: picker diretto
    return (
        <ZonePickerPage onSelect={z => { setZone(z); setSection("guide"); }} />
    );
  }

  const ZONE_LABELS = {
    "gravidanza": "🤰 Gravidanza",
    "0-3":        "🌱 0–3 anni",
    "3-6":        "🌸 3–6 anni",
    "6-12":       "🌟 6–12 anni",
    "12-15":      "🌊 12–15 anni",
    "15-18":      "✨ 15–18 anni",
  };
  const zoneLabel = ZONE_LABELS[zone] || "🌱 0–3 anni";

  const ZONE_COLORS = {
    "gravidanza": { bg: "linear-gradient(135deg, #D4447A 0%, #E8735A 60%, #F0B84A 100%)", shadow: "rgba(212,68,122,0.35)" },
    "0-3":        { bg: "linear-gradient(135deg, #6BAE8A 0%, #9B8EC4 100%)", shadow: "rgba(107,174,138,0.35)" },
    "3-6":        { bg: "linear-gradient(135deg, #F0B84A 0%, #E8735A 100%)", shadow: "rgba(240,184,74,0.35)" },
    "6-12":       { bg: "linear-gradient(135deg, #E8735A 0%, #D4447A 100%)", shadow: "rgba(232,115,90,0.35)" },
    "12-15":      { bg: "linear-gradient(135deg, #5BA4D4 0%, #9B8EC4 100%)", shadow: "rgba(91,164,212,0.35)" },
    "15-18":      { bg: "linear-gradient(135deg, #F0B84A 0%, #E8735A 50%, #9B8EC4 100%)", shadow: "rgba(240,184,74,0.35)" },
  };
  const zoneStyle = ZONE_COLORS[zone] || ZONE_COLORS["0-3"];

  return (
    <div style={{ fontFamily: "'Nunito', Georgia, sans-serif", background: COLORS.cream, minHeight: "100vh" }}>
      {/* ─── KEYFRAMES GLOBALI ─── */}
      <style>{`
        @keyframes rose-pulse {
          0%,100% { box-shadow: 0 0 14px 3px rgba(204,34,104,0.65), 0 0 32px 6px rgba(204,34,104,0.30); filter: brightness(1); }
          50%      { box-shadow: 0 0 26px 8px rgba(204,34,104,0.90), 0 0 56px 16px rgba(204,34,104,0.45); filter: brightness(1.12); }
        }
        @keyframes lavender-pulse {
          0%,100% { box-shadow: 0 0 14px 3px rgba(139,122,192,0.65), 0 0 32px 6px rgba(139,122,192,0.30); filter: brightness(1); }
          50%      { box-shadow: 0 0 26px 8px rgba(139,122,192,0.90), 0 0 56px 16px rgba(139,122,192,0.45); filter: brightness(1.12); }
        }
        @keyframes papa-pulse {
          0%,100% { box-shadow: 0 0 14px 3px rgba(91,143,185,0.65), 0 0 32px 6px rgba(91,143,185,0.30); filter: brightness(1); }
          50%      { box-shadow: 0 0 26px 8px rgba(91,143,185,0.90), 0 0 56px 16px rgba(91,143,185,0.45); filter: brightness(1.12); }
        }
        @keyframes ob-bounce {
          0%,100% { transform: translateY(0); opacity: 0.5; }
          50%      { transform: translateY(6px); opacity: 1; }
        }
      `}</style>
      <Header activeSection={section} setActiveSection={setSection} zone={zone} setZone={setZone} onCambiaFascia={() => { if (_globalShowZonePicker) _globalShowZonePicker(); }} />
      <SubNav activeSection={section} setActiveSection={setSection} zone={zone} onCambiaFascia={() => { if (_globalShowZonePicker) _globalShowZonePicker(); }} headerHeight={headerHeight} />

      {/* Zone banner — glamour */}
      <div style={{
        background: zoneStyle.bg,
        boxShadow: `0 6px 28px ${zoneStyle.shadow}`,
        padding: "18px 24px",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: 12, position: "relative", overflow: "hidden",
      }}>
        {/* Shimmer overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%)",
        }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}>
            {ZONE_IMAGES[zone]
              ? <img src={ZONE_IMAGES[zone]} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
              : <span style={{ fontSize: 22 }}>{{"gravidanza":"🤰","0-3":"🌱","3-6":"🌸","6-12":"🌟","12-15":"🌊","15-18":"✨"}[zone] || "🌱"}</span>
            }
          </div>
          <div>
            <div style={{
              fontFamily: "'Nunito', sans-serif",
              color: "rgba(255,255,255,0.75)",
              fontSize: 12, fontWeight: 700, letterSpacing: "0.8px",
              textTransform: "uppercase", marginBottom: 2,
            }}>Sei nella fascia</div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              color: "white",
              fontSize: 20, fontWeight: 700, lineHeight: 1,
              textShadow: "0 1px 8px rgba(0,0,0,0.2)",
            }}>{zoneLabel.replace(/^[^\s]+\s/, "")}</div>
          </div>
        </div>
        <button
          onClick={() => { if (_globalShowZonePicker) _globalShowZonePicker(); }}
          style={{
            background: "rgba(255,255,255,0.22)",
            border: "1.5px solid rgba(255,255,255,0.6)",
            borderRadius: 50, padding: "9px 22px",
            color: "white",
            fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 800,
            cursor: "pointer", touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            backdropFilter: "blur(4px)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            position: "relative",
            alignSelf: isMobile ? "flex-end" : "auto",
          }}
        >✦ Cambia fascia</button>
      </div>


      {section === "guide" && (
        zone === "gravidanza" ? <GravidanzaPage /> :
        zone === "12-15" ? <PreadolescenzaPage /> :
        zone === "15-18" ? <AdolescenzaPage /> :
        <GuidePage zone={zone} setZone={setZone} />
      )}
      {section === "allattamento" && <GuidaAllattamento />}
      {section === "checklist" && <ChecklistPage zone={zone} setZone={setZone} setActiveSection={setSection} />}
      {section === "screens" && <ScreensPage zone={zone} />}
      {section === "curiosita" && <CuriositaPage zone={zone} />}
      {section === "library" && <LibraryPage />}
      {section === "genitori" && <GenitoriPage zone={zone} />}
      {section === "gravidanza" && <GravidanzaPage />}
      {section === "preadolescenza" && <PreadolescenzaPage />}
      {section === "adolescenza" && <AdolescenzaPage />}
      {section === "glossario" && <GlossarioPage highlightTerm={glossHighlight} setHighlightTerm={setGlossHighlight} />}
      {section === "ognibambino" && <OgniBambinoPage />}
      {section === "separazione" && <SeparazionePage />}
      {section === "lutto" && <LuttoPage />}

      <ScrollToTopButton />

      <footer style={{ background: "linear-gradient(135deg, #1E1428 0%, #3A1E3A 50%, #1E2840 100%)", padding: "32px 20px 24px", fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Disclaimer */}
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 28, padding: "16px 20px", marginBottom: 24, textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.75, margin: 0 }}>
              <strong style={{ color: COLORS.gold }}>⚕️ Avviso importante:</strong> I contenuti di questa app hanno scopo informativo e divulgativo. Non sostituiscono la consulenza clinica professionale.
            </p>
          </div>

          {/* Credits */}
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 2, marginBottom: 20 }}>
            <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", marginBottom: 6 }}>
              La Bebi App
            </div>
            <div style={{ fontSize: 17, marginBottom: 2 }}>
              A cura del <strong style={{ color: COLORS.slateLight }}>Dr. Daniele Lami</strong>
            </div>
            <button onClick={() => setShowAuthor(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.55)", fontFamily: "'Nunito', sans-serif", fontSize: 13, padding: "4px 0", textDecoration: "underline" }}>
              {showAuthor ? "▲ Nascondi info autore" : "▾ Chi è l'autore"}
            </button>
            {showAuthor && (
              <div style={{ marginTop: 12, background: "rgba(255,255,255,0.08)", borderRadius: 18, padding: "16px 20px", maxWidth: 500, margin: "12px auto 0" }}>
                <div style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 1.8 }}>
                  <strong style={{ color: COLORS.gold, display: "block", marginBottom: 6 }}>Dr. Daniele Lami</strong>
                  Psicologo e Psicoterapeuta<br />
                  Specializzato in psicologia dello sviluppo, età evolutiva e supporto alla genitorialità.<br />
                  <span style={{ fontSize: 13, marginTop: 6, display: "inline-block" }}>
                    ✉ <a href="mailto:danielelami@libero.it" style={{ color: "rgba(255,255,255,0.78)", textDecoration: "underline" }}>danielelami@libero.it</a>
                    &nbsp;·&nbsp;
                    🌐 <a href="https://www.psicologo-romanord.it/ita/Chi-Sono/" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.78)", textDecoration: "underline" }}>psicologo-romanord.it</a>
                  </span>
                </div>
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.8 }}>
              Fondata su neuroscienze, teoria dell'attaccamento e psicoanalisi dello sviluppo<br />
              Contenuti AI generati da Groq (llama-3.3-70b-versatile) · Hosting: Vercel
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.45)", fontStyle: "italic" }}>
              App completamente gratuita ad uso divulgativo
            </div>
          </div>

          {/* Legal links */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {[{ label: "Privacy Policy", page: "privacy" }, { label: "Termini di Utilizzo", page: "termini" }].map(l => (
              <button key={l.page} onClick={() => setLegalPage(l.page)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito', sans-serif",
                fontSize: 12, textDecoration: "underline", padding: "4px 8px",
                touchAction: "manipulation",
              }}>{l.label}</button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
