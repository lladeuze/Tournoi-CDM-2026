/* Shared country-flag helpers (used by predictions, matches, champion, admin). */

export const flagsByCode: Record<string, string> = {
  MEX: 'mx', RSA: 'za', KOR: 'kr', CZE: 'cz', CAN: 'ca', BIH: 'ba', QAT: 'qa',
  SUI: 'ch', BRA: 'br', MAR: 'ma', HAI: 'ht', SCO: 'gb-sct', USA: 'us',
  PAR: 'py', AUS: 'au', TUR: 'tr', GER: 'de', CUW: 'cw', CIV: 'ci', ECU: 'ec',
  NED: 'nl', JPN: 'jp', SWE: 'se', TUN: 'tn', BEL: 'be', EGY: 'eg', IRN: 'ir',
  NZL: 'nz', ESP: 'es', CPV: 'cv', KSA: 'sa', URU: 'uy', FRA: 'fr', SEN: 'sn',
  IRQ: 'iq', NOR: 'no', ARG: 'ar', ALG: 'dz', AUT: 'at', JOR: 'jo', POR: 'pt',
  COD: 'cd', UZB: 'uz', COL: 'co', ENG: 'gb-eng', CRO: 'hr', GHA: 'gh', PAN: 'pa',
};

const codeByName: Record<string, string> = {
  'mexique': 'MEX', 'afrique du sud': 'RSA', 'corée du sud': 'KOR',
  'tchéquie': 'CZE', 'canada': 'CAN', 'bosnie-herzégovine': 'BIH',
  'qatar': 'QAT', 'suisse': 'SUI', 'brésil': 'BRA', 'maroc': 'MAR',
  'haïti': 'HAI', 'écosse': 'SCO', 'états-unis': 'USA', 'paraguay': 'PAR',
  'australie': 'AUS', 'turquie': 'TUR', 'allemagne': 'GER', 'curaçao': 'CUW',
  "côte d'ivoire": 'CIV', 'équateur': 'ECU', 'pays-bas': 'NED', 'japon': 'JPN',
  'suède': 'SWE', 'tunisie': 'TUN', 'belgique': 'BEL', 'égypte': 'EGY',
  'iran': 'IRN', 'nouvelle-zélande': 'NZL', 'espagne': 'ESP', 'cap-vert': 'CPV',
  'arabie saoudite': 'KSA', 'uruguay': 'URU', 'france': 'FRA', 'sénégal': 'SEN',
  'irak': 'IRQ', 'norvège': 'NOR', 'argentine': 'ARG', 'algérie': 'ALG',
  'autriche': 'AUT', 'jordanie': 'JOR', 'portugal': 'POR', 'rd congo': 'COD',
  'ouzbékistan': 'UZB', 'ouzbekistan': 'UZB', 'colombie': 'COL',
  'angleterre': 'ENG', 'croatie': 'CRO', 'ghana': 'GHA', 'panama': 'PAN',
};

export function teamCodeFromName(name: string): string | null {
  return codeByName[name.trim().toLowerCase()] || null;
}

export function flagUrlFromCode(code?: string | null): string | null {
  const flagCode = code ? flagsByCode[code.trim().toUpperCase()] : null;
  return flagCode ? `https://flagcdn.com/w160/${flagCode}.png` : null;
}

/** Resolve a flag URL from a team object, falling back to its display name. */
export function teamFlagUrl(
  team: { code?: string | null } | null,
  fallbackName?: string
): string | null {
  const code = team?.code || (fallbackName ? teamCodeFromName(fallbackName) : null);
  return flagUrlFromCode(code);
}
