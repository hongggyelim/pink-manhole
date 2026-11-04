/**
 * About-page illustration: three pink terrazzo manhole covers seen from above —
 * ① cracked (broken-through hole), ② corroded (rust, eroded concrete, exposed rebar),
 * ③ collapsed (caved-in centre). Pure SVG; the slab colour matches the page background chips.
 */
export function DamagedManholes({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 110" className={className} role="img" aria-label="깨진 맨홀, 부식된 맨홀, 무너진 맨홀 그림">
      <defs>
        <pattern id="dm-terrazzo" width="34" height="34" patternUnits="userSpaceOnUse">
          <rect width="34" height="34" fill="#eba9b0"/>
          <circle cx="11.0" cy="5.1" r="0.45" fill="#ffffff" opacity="0.55"/>
          <circle cx="12.4" cy="2.0" r="1.05" fill="#7c5357" opacity="0.55"/>
          <circle cx="2.9" cy="14.2" r="0.55" fill="#ffffff" opacity="1.00"/>
          <circle cx="2.0" cy="19.2" r="0.55" fill="#ffffff" opacity="1.00"/>
          <circle cx="1.7" cy="7.5" r="1.05" fill="#fbe6e8" opacity="0.85"/>
          <circle cx="14.3" cy="18.4" r="1.05" fill="#a06a70" opacity="0.70"/>
          <circle cx="3.5" cy="19.4" r="0.55" fill="#c98289" opacity="0.55"/>
          <circle cx="18.6" cy="2.1" r="0.45" fill="#7c5357" opacity="1.00"/>
          <circle cx="23.1" cy="14.5" r="0.70" fill="#3e2a2c" opacity="1.00"/>
          <circle cx="12.3" cy="8.4" r="0.55" fill="#7c5357" opacity="0.55"/>
          <circle cx="19.5" cy="17.9" r="0.70" fill="#3e2a2c" opacity="0.85"/>
          <circle cx="20.7" cy="2.5" r="1.05" fill="#5d3f42" opacity="0.70"/>
          <circle cx="25.7" cy="5.2" r="0.85" fill="#5d3f42" opacity="0.55"/>
          <circle cx="32.7" cy="2.6" r="1.05" fill="#c98289" opacity="0.85"/>
          <circle cx="23.6" cy="20.2" r="1.05" fill="#3e2a2c" opacity="0.55"/>
          <circle cx="28.6" cy="32.1" r="0.85" fill="#ffffff" opacity="0.55"/>
          <circle cx="24.9" cy="10.5" r="1.05" fill="#3e2a2c" opacity="0.85"/>
          <circle cx="24.4" cy="30.2" r="0.70" fill="#ffffff" opacity="1.00"/>
          <circle cx="12.1" cy="20.8" r="0.85" fill="#ffffff" opacity="0.70"/>
          <circle cx="26.1" cy="4.4" r="0.55" fill="#5d3f42" opacity="1.00"/>
          <circle cx="31.2" cy="16.9" r="0.55" fill="#3e2a2c" opacity="1.00"/>
          <circle cx="18.7" cy="30.0" r="0.85" fill="#d9a0a6" opacity="0.85"/>
          <circle cx="24.0" cy="33.5" r="0.85" fill="#7c5357" opacity="0.70"/>
          <circle cx="2.8" cy="5.1" r="0.55" fill="#ffffff" opacity="1.00"/>
          <circle cx="28.3" cy="6.2" r="0.70" fill="#ffffff" opacity="0.70"/>
          <circle cx="14.2" cy="12.6" r="1.05" fill="#c98289" opacity="0.70"/>
        </pattern>
        <radialGradient id="dm-void" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#000"/>
          <stop offset="80%" stopColor="#140c0e"/>
          <stop offset="100%" stopColor="#3a2427"/>
        </radialGradient>
        <radialGradient id="dm-rust" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8a4b25" stopOpacity=".75"/>
          <stop offset="100%" stopColor="#8a4b25" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="dm-grime" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5a3a3d" stopOpacity=".45"/>
          <stop offset="100%" stopColor="#5a3a3d" stopOpacity="0"/>
        </radialGradient>
        <filter id="dm-shadow" x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity=".3"/>
        </filter>
        {/* radial vent slots shared by all three covers */}
        <g id="dm-slots">
          <rect x="-1.6" y="-31" width="3.2" height="7" rx="1.6" transform="rotate(0)"/>
          <rect x="-1.6" y="-31" width="3.2" height="7" rx="1.6" transform="rotate(45)"/>
          <rect x="-1.6" y="-31" width="3.2" height="7" rx="1.6" transform="rotate(90)"/>
          <rect x="-1.6" y="-31" width="3.2" height="7" rx="1.6" transform="rotate(135)"/>
          <rect x="-1.6" y="-31" width="3.2" height="7" rx="1.6" transform="rotate(180)"/>
          <rect x="-1.6" y="-31" width="3.2" height="7" rx="1.6" transform="rotate(225)"/>
          <rect x="-1.6" y="-31" width="3.2" height="7" rx="1.6" transform="rotate(270)"/>
          <rect x="-1.6" y="-31" width="3.2" height="7" rx="1.6" transform="rotate(315)"/>
        </g>
      </defs>

      {/* ① 깨진 맨홀 */}
      <g transform="translate(5 5)" filter="url(#dm-shadow)">
        <rect width="100" height="100" rx="3" fill="url(#dm-terrazzo)"/>
        <rect width="100" height="100" rx="3" fill="none" stroke="#c4868d" strokeWidth="1.5"/>
        <circle cx="50" cy="50" r="39" fill="none" stroke="#a9666e" strokeWidth="2.4"/>
        <circle cx="50" cy="50" r="40.6" fill="none" stroke="#f7d3d7" strokeWidth=".8" opacity=".8"/>
        <use href="#dm-slots" transform="translate(50 50) rotate(22)" fill="#2b1c1f"/>
        {/* hole */}
        <path d="M24 26 L29 18 L35 19 L38 14 L46 17 L51 24 L48 29 L52 34 L46 41 L40 39 L35 44 L28 40 L22 36 Z" fill="#c98990"/>
        <path d="M26 27 L30.5 20.5 L35.5 21.5 L38.5 17 L45 19.5 L49 24.5 L45.5 29 L49.5 34 L45 38.5 L39.5 36.5 L35 41.5 L29 38 L24.5 35 Z" fill="url(#dm-void)"/>
        <path d="M30.5 20.5 L35.5 21.5 L33 26 Z" fill="#a8737a"/>
        {/* cracks */}
        <path d="M46 41 L52 46 L55 53 L62 58" stroke="#6b4246" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <path d="M40 18 L42 10 L47 3 L49 0" stroke="#6b4246" strokeWidth=".9" fill="none" strokeLinecap="round"/>
        <path d="M25 29 L17 31 L10 27" stroke="#6b4246" strokeWidth=".9" fill="none" strokeLinecap="round"/>
        <path d="M52 46 L60 43 L66 45" stroke="#6b4246" strokeWidth=".7" fill="none" strokeLinecap="round"/>
        <path d="M84 70 L92 76 L100 74" stroke="#6b4246" strokeWidth=".8" fill="none" strokeLinecap="round"/>
        <circle cx="50" cy="50" r="60" fill="url(#dm-grime)" opacity=".5"/>
      </g>

      {/* ② 부식된 맨홀 */}
      <g transform="translate(120 5)" filter="url(#dm-shadow)">
        <rect width="100" height="100" rx="3" fill="url(#dm-terrazzo)"/>
        <rect width="100" height="100" rx="3" fill="none" stroke="#c4868d" strokeWidth="1.5"/>
        <ellipse cx="34" cy="64" rx="26" ry="18" fill="url(#dm-rust)"/>
        <ellipse cx="70" cy="30" rx="18" ry="14" fill="url(#dm-rust)" opacity=".8"/>
        <ellipse cx="62" cy="72" rx="20" ry="14" fill="url(#dm-grime)"/>
        <circle cx="50" cy="50" r="39" fill="none" stroke="#9b5f5f" strokeWidth="2.2" strokeDasharray="20 3 9 4 30 2"/>
        <use href="#dm-slots" transform="translate(50 50)" fill="#3a2422"/>
        {/* eroded patch with exposed aggregate + rusty rebar */}
        <path d="M19 52 L23 44 L30 45 L34 39 L42 42 L47 40 L51 47 L48 53 L52 60 L45 66 L39 64 L33 69 L26 64 L21 62 Z" fill="#a39591"/>
        <path d="M19 52 L23 44 L30 45 L34 39 L42 42 L47 40 L51 47 L48 53 L52 60 L45 66 L39 64 L33 69 L26 64 L21 62 Z" fill="none" stroke="#c58a90" strokeWidth="1.2"/>
        <circle cx="27" cy="50" r="1.5" fill="#7f726f"/><circle cx="36" cy="46" r="1.1" fill="#cfc4c0"/>
        <circle cx="43" cy="58" r="1.7" fill="#6f6360"/><circle cx="30" cy="60" r="1.1" fill="#d6cbc7"/>
        <circle cx="46" cy="49" r="1" fill="#867976"/><circle cx="24" cy="56" r="1.2" fill="#9b8e8a"/>
        <circle cx="38" cy="62" r=".9" fill="#c9bdb9"/><circle cx="33" cy="53" r="1.3" fill="#8e817d"/>
        <path d="M21 49.5 L49 46" stroke="#93461b" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M22 59 L50 55.5" stroke="#93461b" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M31 42 L33.5 67" stroke="#a8521f" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M41 41 L43.5 65" stroke="#a8521f" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M21 49.5 L49 46 M22 59 L50 55.5" stroke="#d58445" strokeWidth=".5" opacity=".7"/>
        {/* rust drips */}
        <path d="M33 69 q 1 6 -1 11" stroke="#8a4b25" strokeWidth="1.6" fill="none" opacity=".6" strokeLinecap="round"/>
        <path d="M45 66 q 2 5 0 9" stroke="#8a4b25" strokeWidth="1.2" fill="none" opacity=".5" strokeLinecap="round"/>
        {/* chipped corner + hairline cracks */}
        <path d="M100 78 L96 84 L97 89 L91 93 L89 100 L100 100 Z" fill="#9c9ca2"/><path d="M100 78 L96 84 L97 89 L91 93 L89 100" fill="none" stroke="#c4868d" strokeWidth="1"/>
        <path d="M91 93 L82 87 L72 85" stroke="#6b4246" strokeWidth=".8" fill="none"/>
        <path d="M64 18 L72 26 L78 24" stroke="#6b4246" strokeWidth=".7" fill="none"/>
      </g>

      {/* ③ 무너진 맨홀 */}
      <g transform="translate(235 5)" filter="url(#dm-shadow)">
        <rect width="100" height="100" rx="3" fill="url(#dm-terrazzo)"/>
        <rect width="100" height="100" rx="3" fill="none" stroke="#c4868d" strokeWidth="1.5"/>
        <path d="M11 50 A 39 39 0 0 1 50 11" fill="none" stroke="#a9666e" strokeWidth="2.4"/>
        <path d="M66 14 A 39 39 0 0 1 86 66" fill="none" stroke="#a9666e" strokeWidth="2.4"/>
        <path d="M78 79 A 39 39 0 0 1 21 76" fill="none" stroke="#a9666e" strokeWidth="2.4"/>
        <use href="#dm-slots" transform="translate(50 50) rotate(10)" fill="#2b1c1f"/>
        {/* collapsed centre */}
        <path d="M27 41 L31 33 L37 27 L43 28 L50 21 L57 25 L66 27 L69 35 L75 42 L72 49 L74 58 L67 63 L62 72 L54 72 L46 76 L40 69 L32 67 L29 59 L24 52 Z" fill="#b97880"/>
        <path d="M30 42 L33.5 35 L38.5 30 L44 31 L50 24.5 L56 28 L64 30 L66.5 37 L71.5 43 L69 49 L71 57 L65 60.5 L60.5 69 L54 69 L46.5 72.5 L41.5 66.5 L34 64.5 L31.5 58 L27.5 52 Z" fill="url(#dm-void)"/>
        {/* broken pieces hanging in */}
        <path d="M38 29 L46 27 L44 36 Z" fill="#d79aa1"/>
        <path d="M62 58 L68 52 L66 61 Z" fill="#c98990"/>
        <path d="M44 62 L52 60 L50 68 L42 66 Z" fill="#a46a71" opacity=".8"/>
        {/* cracks */}
        <path d="M27 41 L16 35 L6 37 L0 33" stroke="#6b4246" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <path d="M75 42 L86 41 L94 35" stroke="#6b4246" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <path d="M54 72 L58 86 L56 100" stroke="#6b4246" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <path d="M37 27 L30 15 L32 4" stroke="#6b4246" strokeWidth=".8" fill="none" strokeLinecap="round"/>
        <path d="M29 59 L17 67 L12 80" stroke="#6b4246" strokeWidth=".8" fill="none" strokeLinecap="round"/>
        <circle cx="50" cy="50" r="58" fill="url(#dm-grime)" opacity=".6"/>
      </g>
    </svg>
  );
}
