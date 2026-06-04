/** 封面 / 章节页底部意境装饰 SVG（无背景图时随机或按章节号展示其一，共 20 套） */
export interface PptCoverDecoration {
  id: string;
  /** 意境名称（开发参考） */
  name: string;
  svg: string;
}

const VIEW = 'viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg"';

export const PPT_COVER_DECORATIONS: PptCoverDecoration[] = [
  {
    id: "city",
    name: "城市天际",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="0.8" fill="none">
        <rect x="60" y="180" width="40" height="220"/><rect x="110" y="160" width="35" height="240"/>
        <rect x="200" y="140" width="50" height="260"/><rect x="900" y="170" width="45" height="230"/>
        <rect x="955" y="150" width="35" height="250"/><rect x="1050" y="165" width="50" height="235"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1" fill="none">
        <rect x="80" y="220" width="60" height="180"/><line x1="80" y1="260" x2="140" y2="260"/>
        <line x1="110" y1="220" x2="110" y2="400"/><rect x="270" y="170" width="70" height="230" rx="2"/>
        <ellipse cx="400" cy="340" rx="60" ry="30"/><path d="M340,340 Q400,280 460,340"/>
        <rect x="480" y="130" width="80" height="270"/><line x1="520" y1="130" x2="520" y2="100"/>
        <rect x="690" y="180" width="65" height="220" rx="2"/><ellipse cx="820" cy="350" rx="50" ry="25"/>
        <rect x="1000" y="190" width="60" height="210"/><rect x="1070" y="230" width="50" height="170"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "mountains",
    name: "山川层峦",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linejoin="round">
        <path d="M0,320 L120,240 L220,300 L340,200 L480,280 L620,180 L760,260 L900,200 L1020,280 L1200,220 L1200,400 L0,400 Z"/>
        <path d="M0,360 L80,300 L160,340 L280,260 L400,320 L520,270 L640,310 L780,250 L920,300 L1080,270 L1200,310 L1200,400 L0,400 Z"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round">
        <path d="M0,340 L100,260 L200,320 L320,220 L440,300 L560,240 L680,290 L820,210 L960,280 L1100,250 L1200,290 L1200,400 L0,400 Z"/>
        <path d="M180,400 L180,300"/><path d="M520,400 L520,280"/><path d="M860,400 L860,300"/>
        <circle cx="180" cy="295" r="4" fill="currentColor" stroke="none" opacity="0.5"/>
        <circle cx="520" cy="275" r="4" fill="currentColor" stroke="none" opacity="0.5"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "river",
    name: "江河蜿蜒",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="1" fill="none">
        <path d="M0,280 Q200,240 400,270 T800,250 T1200,280"/>
        <path d="M0,300 Q180,260 360,290 T720,270 T1200,300"/>
        <path d="M0,120 L80,100 L160,130 L240,90 L320,120 L400,80 L480,110 L560,85 L640,115 L720,95 L800,125 L880,100 L960,130 L1040,105 L1120,125 L1200,110"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1.2" fill="none">
        <path d="M0,310 C150,270 250,330 400,300 S650,270 800,310 S1050,280 1200,320"/>
        <path d="M0,330 C200,300 350,350 550,320 S850,300 1200,340"/>
        <ellipse cx="300" cy="305" rx="18" ry="6" opacity="0.6"/>
        <ellipse cx="700" cy="315" rx="22" ry="7" opacity="0.6"/>
        <ellipse cx="950" cy="308" rx="16" ry="5" opacity="0.6"/>
        <path d="M50,360 L70,340 M1150,350 L1170,330"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "stars",
    name: "星空璀璨",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="0.6" fill="currentColor">
        <circle cx="120" cy="80" r="1.5"/><circle cx="280" cy="55" r="1"/><circle cx="450" cy="90" r="1.5"/>
        <circle cx="620" cy="45" r="1.2"/><circle cx="780" cy="75" r="1"/><circle cx="950" cy="60" r="1.5"/>
        <circle cx="1100" cy="85" r="1"/><circle cx="200" cy="130" r="0.8"/><circle cx="880" cy="120" r="0.8"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="0.8" fill="none">
        <circle cx="600" cy="100" r="28" stroke-width="1.2"/>
        <path d="M600,72 L600,60 M628,100 L642,100 M600,128 L600,140 M572,100 L558,100"/>
        <path d="M350,140 L370,120 L390,140 L370,160 Z" fill="currentColor" stroke="none" opacity="0.4"/>
        <path d="M820,130 L835,115 L850,130 L835,145 Z" fill="currentColor" stroke="none" opacity="0.35"/>
        <path d="M150,160 L165,145 L180,160 L165,175 Z" fill="currentColor" stroke="none" opacity="0.3"/>
        <path d="M100,200 Q300,180 500,210 T900,190 T1200,215" stroke-width="0.6" opacity="0.5"/>
        <circle cx="500" cy="200" r="2" fill="currentColor"/><circle cx="720" cy="185" r="1.5" fill="currentColor"/>
        <circle cx="980" cy="205" r="2" fill="currentColor"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "waves",
    name: "海浪拍岸",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="1" fill="none">
        <path d="M0,320 Q75,300 150,320 T300,320 T450,320 T600,320 T750,320 T900,320 T1050,320 T1200,320"/>
        <path d="M0,340 Q100,320 200,340 T400,340 T600,340 T800,340 T1000,340 T1200,340"/>
        <path d="M0,360 Q80,345 160,360 T320,360 T480,360 T640,360 T800,360 T960,360 T1120,360 T1200,360"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1.2" fill="none">
        <path d="M0,300 C100,270 200,330 300,300 S500,270 600,300 S800,330 900,300 S1100,270 1200,300"/>
        <path d="M0,330 C120,300 240,350 360,330 S600,300 720,330 S960,350 1080,330 S1140,320 1200,335"/>
        <path d="M80,370 Q90,360 100,370"/><path d="M400,375 Q410,365 420,375"/>
        <path d="M750,372 Q760,362 770,372"/><path d="M1050,368 Q1060,358 1070,368"/>
        <line x1="0" y1="380" x2="1200" y2="380" opacity="0.4"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "forest",
    name: "森林幽径",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="0.8" fill="none" stroke-linejoin="round">
        <path d="M100,400 L100,280 L85,260 L100,240 L115,260 L100,280"/>
        <path d="M200,400 L200,250 L182,225 L200,200 L218,225 L200,250"/>
        <path d="M950,400 L950,270 L935,250 L950,230 L965,250 L950,270"/>
        <path d="M1050,400 L1050,290 L1035,270 L1050,250 L1065,270 L1050,290"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1" fill="none" stroke-linejoin="round">
        <path d="M280,400 L280,220 L258,190 L280,160 L302,190 L280,220"/>
        <path d="M380,400 L380,240 L360,215 L380,190 L400,215 L380,240"/>
        <path d="M480,400 L480,200 L455,165 L480,130 L505,165 L480,200"/>
        <path d="M580,400 L580,230 L560,205 L580,180 L600,205 L580,230"/>
        <path d="M680,400 L680,210 L658,178 L680,145 L702,178 L680,210"/>
        <path d="M780,400 L780,250 L762,225 L780,200 L798,225 L780,250"/>
        <path d="M880,400 L880,220 L860,192 L880,165 L900,192 L880,220"/>
        <path d="M150,400 L600,360 L1050,400" stroke-width="0.8" opacity="0.5"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "bamboo",
    name: "竹林清风",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="0.8" fill="none">
        <line x1="150" y1="400" x2="150" y2="120"/><line x1="220" y1="400" x2="220" y2="80"/>
        <line x1="290" y1="400" x2="290" y2="140"/><line x1="900" y1="400" x2="900" y2="100"/>
        <line x1="970" y1="400" x2="970" y2="130"/><line x1="1040" y1="400" x2="1040" y2="90"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1" fill="none">
        <line x1="400" y1="400" x2="400" y2="60"/><line x1="480" y1="400" x2="480" y2="100"/>
        <line x1="560" y1="400" x2="560" y2="70"/><line x1="640" y1="400" x2="640" y2="110"/>
        <line x1="720" y1="400" x2="720" y2="80"/><line x1="800" y1="400" x2="800" y2="120"/>
        <line x1="400" y1="180" x2="420" y2="180"/><line x1="380" y1="180" x2="400" y2="180"/>
        <line x1="480" y1="220" x2="500" y2="220"/><line x1="460" y1="220" x2="480" y2="220"/>
        <line x1="560" y1="160" x2="580" y2="160"/><line x1="640" y1="200" x2="660" y2="200"/>
        <line x1="720" y1="170" x2="740" y2="170"/><line x1="800" y1="210" x2="820" y2="210"/>
        <path d="M350,350 Q420,330 490,355 Q560,340 630,360" stroke-width="0.8" opacity="0.5"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "clouds",
    name: "云海苍茫",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="1" fill="none">
        <path d="M0,200 Q150,170 300,200 T600,195 T900,205 T1200,190"/>
        <path d="M0,230 Q200,200 400,230 T800,220 T1200,235"/>
        <path d="M100,320 L200,260 L320,300 L440,240 L560,290 L680,250 L800,300 L920,260 L1040,310 L1200,270 L1200,400 L100,400 Z" opacity="0.8"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1.2" fill="none">
        <path d="M0,260 Q180,230 360,260 T720,250 T1080,265 T1200,255"/>
        <path d="M0,290 Q220,260 440,290 T880,280 T1200,295"/>
        <path d="M50,320 Q120,300 190,320 Q260,340 330,320 Q400,300 470,325 Q540,345 610,320 Q680,300 750,330 Q820,350 890,325 Q960,305 1030,335 Q1100,355 1170,330"/>
        <ellipse cx="600" cy="310" rx="80" ry="12" opacity="0.4"/>
        <ellipse cx="350" cy="300" rx="60" ry="10" opacity="0.35"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "sunset",
    name: "夕照山峦",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="1" fill="none">
        <path d="M0,300 L200,220 L400,280 L600,200 L800,270 L1000,210 L1200,260 L1200,400 L0,400 Z"/>
        <path d="M520,120 A40,40 0 0 1 600,120 A40,40 0 0 1 680,120" stroke-width="1.5"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1.2" fill="none">
        <path d="M0,330 L150,270 L300,320 L450,250 L600,310 L750,260 L900,320 L1050,280 L1200,310 L1200,400 L0,400 Z"/>
        <path d="M560,130 A20,20 0 0 1 600,130 A20,20 0 0 1 640,130" stroke-width="1.5"/>
        <line x1="600" y1="150" x2="600" y2="310" stroke-width="0.6" opacity="0.4"/>
        <line x1="520" y1="200" x2="680" y2="200" stroke-width="0.6" opacity="0.3"/>
        <line x1="540" y1="240" x2="660" y2="240" stroke-width="0.6" opacity="0.25"/>
        <line x1="560" y1="280" x2="640" y2="280" stroke-width="0.6" opacity="0.2"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "lake",
    name: "月下湖影",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="1" fill="none">
        <path d="M0,250 L300,180 L600,230 L900,170 L1200,220"/>
        <ellipse cx="600" cy="90" rx="25" ry="25" stroke-width="1.2"/>
        <path d="M0,320 Q300,300 600,320 T1200,310"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1.2" fill="none">
        <path d="M0,280 L250,220 L500,260 L750,210 L1000,250 L1200,230 L1200,400 L0,400 Z"/>
        <path d="M0,340 Q200,330 400,345 T800,335 T1200,350"/>
        <path d="M0,360 Q200,355 400,362 T800,358 T1200,365"/>
        <line x1="600" y1="115" x2="600" y2="340" stroke-width="0.5" opacity="0.35"/>
        <ellipse cx="600" cy="330" rx="8" ry="20" opacity="0.5"/>
        <path d="M580,200 Q600,190 620,200" stroke-width="0.8" opacity="0.4"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "chip",
    name: "芯片封装",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="0.8" fill="none">
        <rect x="420" y="200" width="360" height="160" rx="6"/>
        <line x1="420" y1="220" x2="380" y2="220"/><line x1="420" y1="250" x2="380" y2="250"/><line x1="420" y1="280" x2="380" y2="280"/><line x1="420" y1="310" x2="380" y2="310"/><line x1="420" y1="340" x2="380" y2="340"/>
        <line x1="780" y1="220" x2="820" y2="220"/><line x1="780" y1="250" x2="820" y2="250"/><line x1="780" y1="280" x2="820" y2="280"/><line x1="780" y1="310" x2="820" y2="310"/><line x1="780" y1="340" x2="820" y2="340"/>
        <line x1="480" y1="200" x2="480" y2="160"/><line x1="540" y1="200" x2="540" y2="160"/><line x1="600" y1="200" x2="600" y2="160"/><line x1="660" y1="200" x2="660" y2="160"/><line x1="720" y1="200" x2="720" y2="160"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1" fill="none">
        <rect x="480" y="230" width="240" height="100" rx="4"/>
        <rect x="500" y="250" width="200" height="60" rx="2" stroke-width="0.8" opacity="0.7"/>
        <line x1="520" y1="265" x2="680" y2="265"/><line x1="520" y1="280" x2="660" y2="280"/><line x1="520" y1="295" x2="640" y2="295"/>
        <circle cx="520" cy="265" r="3" fill="currentColor" stroke="none" opacity="0.5"/><circle cx="680" cy="295" r="3" fill="currentColor" stroke="none" opacity="0.5"/>
        <rect x="120" y="280" width="80" height="50" rx="3" opacity="0.6"/><rect x="1000" y="270" width="90" height="55" rx="3" opacity="0.6"/>
        <path d="M200,305 L420,305 M780,305 L1000,305" stroke-width="0.8" stroke-dasharray="6 4"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "cpu",
    name: "处理器晶圆",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="0.7" fill="none">
        <rect x="460" y="170" width="280" height="200" rx="8"/>
        <line x1="460" y1="200" x2="420" y2="200"/><line x1="460" y1="240" x2="420" y2="240"/><line x1="460" y1="280" x2="420" y2="280"/><line x1="460" y1="320" x2="420" y2="320"/><line x1="460" y1="360" x2="420" y2="360"/>
        <line x1="740" y1="200" x2="780" y2="200"/><line x1="740" y1="240" x2="780" y2="240"/><line x1="740" y1="280" x2="780" y2="280"/><line x1="740" y1="320" x2="780" y2="320"/><line x1="740" y1="360" x2="780" y2="360"/>
        <line x1="500" y1="170" x2="500" y2="130"/><line x1="560" y1="170" x2="560" y2="130"/><line x1="620" y1="170" x2="620" y2="130"/><line x1="680" y1="170" x2="680" y2="130"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="0.9" fill="none">
        <rect x="500" y="210" width="200" height="120" rx="4"/>
        <line x1="520" y1="230" x2="680" y2="230"/><line x1="520" y1="250" x2="680" y2="250"/><line x1="520" y1="270" x2="680" y2="270"/><line x1="520" y1="290" x2="680" y2="290"/><line x1="520" y1="310" x2="680" y2="310"/>
        <line x1="540" y1="210" x2="540" y2="330"/><line x1="580" y1="210" x2="580" y2="330"/><line x1="620" y1="210" x2="620" y2="330"/><line x1="660" y1="210" x2="660" y2="330"/>
        <rect x="560" y="250" width="80" height="40" rx="2" stroke-width="1.2"/>
        <circle cx="600" cy="270" r="6" fill="currentColor" stroke="none" opacity="0.35"/>
        <path d="M180,320 L460,320 M740,320 L1020,320" stroke-dasharray="4 3" opacity="0.5"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "network",
    name: "网络拓扑",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="0.8" fill="none">
        <circle cx="600" cy="240" r="36"/><circle cx="320" cy="300" r="22"/><circle cx="880" cy="300" r="22"/>
        <circle cx="180" cy="340" r="14"/><circle cx="1020" cy="340" r="14"/>
        <line x1="600" y1="276" x2="600" y2="320"/><line x1="564" y1="260" x2="342" y2="288"/><line x1="636" y1="260" x2="858" y2="288"/>
        <line x1="298" y1="310" x2="194" y2="332"/><line x1="902" y1="310" x2="1006" y2="332"/>
        <path d="M0,350 L120,340 L240,355 L360,330 L480,348 L600,335 L720,352 L840,328 L960,345 L1080,338 L1200,350"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1" fill="none">
        <circle cx="600" cy="220" r="48"/><circle cx="280" cy="290" r="28"/><circle cx="920" cy="290" r="28"/>
        <circle cx="140" cy="330" r="16"/><circle cx="1060" cy="330" r="16"/>
        <line x1="600" y1="268" x2="600" y2="310"/><line x1="552" y1="248" x2="308" y2="278"/><line x1="648" y1="248" x2="892" y2="278"/>
        <line x1="252" y1="302" x2="156" y2="322"/><line x1="948" y1="302" x2="1044" y2="322"/>
        <circle cx="600" cy="220" r="8" fill="currentColor" stroke="none" opacity="0.4"/>
        <circle cx="280" cy="290" r="5" fill="currentColor" stroke="none" opacity="0.35"/><circle cx="920" cy="290" r="5" fill="currentColor" stroke="none" opacity="0.35"/>
        <path d="M0,360 Q200,340 400,365 T800,355 T1200,370" stroke-width="0.8" opacity="0.5"/>
        <path d="M80,200 Q300,180 600,195 T1000,185" stroke-width="0.6" stroke-dasharray="8 5" opacity="0.4"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "circuit",
    name: "电路走线",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="0.8" fill="none" stroke-linejoin="round">
        <path d="M80,320 L80,260 L200,260 L200,200 L360,200 L360,280 L520,280 L520,220 L680,220 L680,300 L840,300 L840,240 L1000,240 L1000,320"/>
        <path d="M200,320 L200,360 L400,360 L400,320 M680,320 L680,360 L900,360 L900,320"/>
        <rect x="350" y="190" width="24" height="24" rx="2"/><rect x="670" y="210" width="24" height="24" rx="2"/><rect x="990" y="230" width="24" height="24" rx="2"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1" fill="none" stroke-linejoin="round">
        <path d="M60,310 L60,240 L180,240 L180,180 L340,180 L340,270 L500,270 L500,200 L660,200 L660,290 L820,290 L820,220 L980,220 L980,310 L1120,310"/>
        <path d="M180,310 L180,370 L420,370 L420,310 M660,310 L660,370 L940,370 L940,310"/>
        <rect x="330" y="170" width="32" height="32" rx="3"/><rect x="650" y="190" width="32" height="32" rx="3"/><rect x="970" y="210" width="32" height="32" rx="3"/>
        <circle cx="346" cy="186" r="4" fill="currentColor" stroke="none" opacity="0.45"/><circle cx="666" cy="206" r="4" fill="currentColor" stroke="none" opacity="0.45"/><circle cx="986" cy="226" r="4" fill="currentColor" stroke="none" opacity="0.45"/>
        <line x1="346" y1="186" x2="500" y2="200" stroke-dasharray="4 3" opacity="0.5"/><line x1="666" y1="206" x2="820" y2="220" stroke-dasharray="4 3" opacity="0.5"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "data-lines",
    name: "数据流线",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="0.7" fill="none">
        <line x1="0" y1="280" x2="1200" y2="260"/><line x1="0" y1="300" x2="1200" y2="285"/><line x1="0" y1="320" x2="1200" y2="310"/><line x1="0" y1="340" x2="1200" y2="335"/><line x1="0" y1="360" x2="1200" y2="355"/>
        <line x1="0" y1="240" x2="1200" y2="230" stroke-dasharray="12 8"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1" fill="none">
        <path d="M0,270 C200,250 400,290 600,265 S1000,255 1200,275"/>
        <path d="M0,295 C180,280 360,310 540,290 S900,300 1200,285"/>
        <path d="M0,320 C220,305 440,335 660,315 S1000,325 1200,310"/>
        <path d="M0,345 C150,335 300,355 450,340 S750,350 1200,330"/>
        <circle cx="200" cy="268" r="4" fill="currentColor" stroke="none" opacity="0.5"/><circle cx="500" cy="292" r="4" fill="currentColor" stroke="none" opacity="0.5"/>
        <circle cx="800" cy="278" r="4" fill="currentColor" stroke="none" opacity="0.5"/><circle cx="1000" cy="312" r="4" fill="currentColor" stroke="none" opacity="0.5"/>
        <polyline points="150,200 200,240 250,210 300,250 350,220" stroke-width="0.8" opacity="0.45"/>
        <polyline points="850,190 900,230 950,200 1000,245 1050,215" stroke-width="0.8" opacity="0.45"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "grid-matrix",
    name: "数字矩阵",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="0.6" fill="none">
        <line x1="200" y1="150" x2="200" y2="380"/><line x1="280" y1="150" x2="280" y2="380"/><line x1="360" y1="150" x2="360" y2="380"/><line x1="440" y1="150" x2="440" y2="380"/><line x1="520" y1="150" x2="520" y2="380"/><line x1="600" y1="150" x2="600" y2="380"/><line x1="680" y1="150" x2="680" y2="380"/><line x1="760" y1="150" x2="760" y2="380"/><line x1="840" y1="150" x2="840" y2="380"/><line x1="920" y1="150" x2="920" y2="380"/><line x1="1000" y1="150" x2="1000" y2="380"/>
        <line x1="180" y1="220" x2="1020" y2="220"/><line x1="180" y1="280" x2="1020" y2="280"/><line x1="180" y1="340" x2="1020" y2="340"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="0.8" fill="none">
        <rect x="380" y="200" width="440" height="140" rx="4"/>
        <line x1="420" y1="240" x2="780" y2="240"/><line x1="420" y1="270" x2="780" y2="270"/><line x1="420" y1="300" x2="780" y2="300"/>
        <line x1="460" y1="200" x2="460" y2="340"/><line x1="540" y1="200" x2="540" y2="340"/><line x1="620" y1="200" x2="620" y2="340"/><line x1="700" y1="200" x2="700" y2="340"/>
        <rect x="500" y="255" width="40" height="30" rx="2" fill="currentColor" stroke="none" opacity="0.12"/>
        <rect x="620" y="255" width="40" height="30" rx="2" fill="currentColor" stroke="none" opacity="0.1"/>
        <circle cx="460" cy="240" r="3" fill="currentColor" stroke="none" opacity="0.4"/><circle cx="740" cy="300" r="3" fill="currentColor" stroke="none" opacity="0.4"/>
        <path d="M120,320 L380,320 M820,320 L1080,320" stroke-dasharray="5 4" opacity="0.45"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "signal-wave",
    name: "信号波形",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="0.8" fill="none">
        <path d="M0,300 L40,300 L60,260 L80,340 L100,280 L120,320 L140,300 L200,300"/>
        <path d="M200,300 L240,300 L260,270 L280,330 L300,290 L320,310 L340,300 L500,300"/>
        <path d="M500,300 L540,300 L560,250 L580,350 L600,280 L620,320 L640,300 L800,300"/>
        <path d="M800,300 L840,300 L860,265 L880,335 L900,275 L920,315 L940,300 L1200,300"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1" fill="none">
        <path d="M0,320 L30,320 L50,270 L70,370 L90,250 L110,350 L130,300 L160,320 L190,320 L220,280 L250,360 L280,290 L310,330 L340,320 L400,320"/>
        <path d="M400,320 L430,320 L450,260 L470,380 L490,240 L510,360 L530,310 L600,320"/>
        <path d="M600,320 L630,320 L650,275 L670,365 L690,255 L710,345 L730,305 L800,320"/>
        <path d="M800,320 L830,320 L850,268 L870,372 L890,248 L910,352 L930,298 L1000,320 L1030,285 L1060,355 L1090,295 L1120,325 L1200,320"/>
        <line x1="0" y1="350" x2="1200" y2="350" stroke-width="0.6" opacity="0.4"/>
        <circle cx="600" cy="320" r="5" fill="currentColor" stroke="none" opacity="0.35"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "hex-lattice",
    name: "六边形晶格",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="0.7" fill="none">
        <path d="M500,280 L530,263 L560,280 L560,314 L530,331 L500,314 Z"/><path d="M620,280 L650,263 L680,280 L680,314 L650,331 L620,314 Z"/><path d="M740,280 L770,263 L800,280 L800,314 L770,331 L740,314 Z"/>
        <path d="M440,314 L470,297 L500,314 L500,348 L470,365 L440,348 Z"/><path d="M560,314 L590,297 L620,314 L620,348 L590,365 L560,348 Z"/><path d="M680,314 L710,297 L740,314 L740,348 L710,365 L680,348 Z"/>
        <path d="M380,348 L410,331 L440,348 L440,382 L410,399 L380,382 Z"/><path d="M500,348 L530,331 L560,348 L560,382 L530,399 L500,382 Z"/><path d="M620,348 L650,331 L680,348 L680,382 L650,399 L620,382 Z"/><path d="M740,348 L770,331 L800,348 L800,382 L770,399 L740,382 Z"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="0.9" fill="none">
        <path d="M460,270 L500,247 L540,270 L540,316 L500,339 L460,316 Z"/><path d="M580,270 L620,247 L660,270 L660,316 L620,339 L580,316 Z"/><path d="M700,270 L740,247 L780,270 L780,316 L740,339 L700,316 Z"/>
        <path d="M520,316 L560,293 L600,316 L600,362 L560,385 L520,362 Z"/><path d="M640,316 L680,293 L720,316 L720,362 L680,385 L640,362 Z"/>
        <circle cx="500" cy="293" r="4" fill="currentColor" stroke="none" opacity="0.4"/><circle cx="620" cy="293" r="4" fill="currentColor" stroke="none" opacity="0.4"/><circle cx="740" cy="293" r="4" fill="currentColor" stroke="none" opacity="0.4"/>
        <path d="M200,360 L460,360 M780,360 L1000,360" stroke-width="0.8" opacity="0.45"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "fiber-optic",
    name: "光纤链路",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="0.8" fill="none">
        <path d="M0,300 Q300,260 600,300 T1200,290"/>
        <path d="M0,330 Q280,300 560,330 T1120,320"/>
        <circle cx="200" cy="295" r="8"/><circle cx="500" cy="305" r="8"/><circle cx="800" cy="298" r="8"/><circle cx="1000" cy="315" r="8"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1" fill="none">
        <path d="M0,285 Q250,240 500,285 T1000,275 T1200,280"/>
        <path d="M0,320 Q200,295 400,325 T800,310 T1200,318"/>
        <circle cx="250" cy="280" r="12"/><circle cx="550" cy="288" r="12"/><circle cx="850" cy="282" r="12"/>
        <circle cx="250" cy="280" r="4" fill="currentColor" stroke="none" opacity="0.5"/><circle cx="550" cy="288" r="4" fill="currentColor" stroke="none" opacity="0.5"/><circle cx="850" cy="282" r="4" fill="currentColor" stroke="none" opacity="0.5"/>
        <line x1="262" y1="280" x2="538" y2="288" stroke-dasharray="6 4"/><line x1="562" y1="288" x2="838" y2="282" stroke-dasharray="6 4"/>
        <path d="M100,200 Q400,170 700,195 T1100,180" stroke-width="0.7" stroke-dasharray="10 6" opacity="0.4"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    id: "server-stack",
    name: "算力集群",
    svg: `<svg ${VIEW}>
      <g opacity="0.12" stroke="currentColor" stroke-width="0.8" fill="none">
        <rect x="380" y="210" width="120" height="140" rx="4"/><rect x="540" y="210" width="120" height="140" rx="4"/><rect x="700" y="210" width="120" height="140" rx="4"/>
        <line x1="400" y1="240" x2="480" y2="240"/><line x1="400" y1="270" x2="480" y2="270"/><line x1="400" y1="300" x2="480" y2="300"/><line x1="400" y1="330" x2="480" y2="330"/>
        <line x1="560" y1="240" x2="640" y2="240"/><line x1="560" y1="270" x2="640" y2="270"/><line x1="720" y1="240" x2="800" y2="240"/><line x1="720" y1="270" x2="800" y2="270"/>
      </g>
      <g opacity="0.22" stroke="currentColor" stroke-width="1" fill="none">
        <rect x="360" y="190" width="140" height="160" rx="6"/><rect x="530" y="190" width="140" height="160" rx="6"/><rect x="700" y="190" width="140" height="160" rx="6"/>
        <line x1="385" y1="225" x2="475" y2="225"/><line x1="385" y1="255" x2="475" y2="255"/><line x1="385" y1="285" x2="475" y2="285"/><line x1="385" y1="315" x2="475" y2="315"/>
        <line x1="555" y1="225" x2="645" y2="225"/><line x1="555" y1="255" x2="645" y2="255"/><line x1="725" y1="225" x2="815" y2="225"/><line x1="725" y1="255" x2="815" y2="255"/>
        <circle cx="430" cy="225" r="4" fill="currentColor" stroke="none" opacity="0.45"/><circle cx="600" cy="255" r="4" fill="currentColor" stroke="none" opacity="0.45"/><circle cx="770" cy="225" r="4" fill="currentColor" stroke="none" opacity="0.45"/>
        <path d="M200,330 L360,330 M840,330 L1000,330" stroke-dasharray="5 4"/><path d="M440,190 L440,120 M600,190 L600,120 M770,190 L770,120" stroke-width="0.7" opacity="0.4"/>
        <ellipse cx="600" cy="110" rx="180" ry="20" opacity="0.35"/>
      </g>
      <line x1="0" y1="398" x2="1200" y2="398" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
];

export function pickRandomCoverDecorationIndex(): number {
  return Math.floor(Math.random() * PPT_COVER_DECORATIONS.length);
}

export function getCoverDecorationByIndex(index: number): PptCoverDecoration {
  const i = ((index % PPT_COVER_DECORATIONS.length) + PPT_COVER_DECORATIONS.length) % PPT_COVER_DECORATIONS.length;
  return PPT_COVER_DECORATIONS[i];
}

/** 按章节编号稳定映射到某一套意境装饰（同章多页一致） */
export function decorationIndexFromChapterKey(key: string | number): number {
  const s = String(key);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % PPT_COVER_DECORATIONS.length;
}

export function getChapterDecorationByKey(key: string | number): PptCoverDecoration {
  return getCoverDecorationByIndex(decorationIndexFromChapterKey(key));
}
