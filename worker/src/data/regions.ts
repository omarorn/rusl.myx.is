/**
 * Svæðisbundnar reglur um ruslaflokkun á Íslandi
 * Regional waste sorting rules for Iceland
 *
 * Uppfært: Janúar 2026
 *
 * Heimildir / Sources:
 * - SORPA: https://www.sorpa.is
 * - Kalka: https://www.kalka.is
 * - Akureyri: https://www.akureyri.is
 * - Reykjanesbær: https://www.reykjanesbaer.is
 */

export type BinType = 'paper' | 'plastic' | 'food' | 'mixed' | 'recycling_center' | 'deposit';

export interface BinInfo {
  name_is: string;
  name_en: string;
  color: string;
  icon: string;
  description_is: string;
  examples_is: string[];
  not_allowed_is: string[];
}

export interface RegionInfo {
  id: string;
  name_is: string;
  name_en: string;
  operator: string;
  website: string;
  municipalities: string[];
  bins: Record<BinType, BinInfo>;
  special_rules: string[];
}

// Samræmd flokkun - Nýju lögin frá 2023 kveða á um fjóra flokka við öll heimili
// Unified sorting - 2023 law mandates four categories at all households

export const REGIONS: Record<string, RegionInfo> = {
  // ============================================
  // HÖFUÐBORGARSVÆÐIÐ - SORPA
  // ============================================
  'sorpa': {
    id: 'sorpa',
    name_is: 'Höfuðborgarsvæðið (SORPA)',
    name_en: 'Capital Region (SORPA)',
    operator: 'SORPA bs.',
    website: 'https://www.sorpa.is',
    municipalities: [
      'Reykjavík',
      'Kópavogur',
      'Hafnarfjörður',
      'Garðabær',
      'Mosfellsbær',
      'Seltjarnarnes',
    ],
    bins: {
      paper: {
        name_is: 'Pappír og pappi',
        name_en: 'Paper and cardboard',
        color: '#2563eb', // Blár / Blue
        icon: '📄',
        description_is: 'Blá tunna - Hreinir pappírspokar, dagblöð, tímarit, pappakassar',
        examples_is: [
          'Dagblöð og tímarit',
          'Pappakassar (flatir)',
          'Umslög (má vera með plastglugga)',
          'Bækur (mjúkt kápu)',
          'Pizzakassar (HREINAR)',
          'Mjólkurfernur og safafernur (TetraPak)',
          'Pappírspokar',
        ],
        not_allowed_is: [
          'Fitubleyttur pappír',
          'Pappír með matarleifum',
          'Límmiðar',
          'Innbundnar bækur',
          'Plastlimuð pappír',
        ],
      },
      plastic: {
        name_is: 'Plastumbúðir og málmar',
        name_en: 'Plastic packaging and metals',
        color: '#16a34a', // Grænn / Green
        icon: '🧴',
        description_is: 'Græn tunna - Plastflöskur, pokar, dósir, álpappír',
        examples_is: [
          'Plastflöskur og ílát',
          'Plastpokar og filmur',
          'Snyrtivöruílát (sjampó o.fl.)',
          'Niðursuðudósir',
          'Bjórdósir og gosdósir',
          'Álpappír og álbakkar',
          'Plastlok og málmlok',
          'Hreinsar mjólkurfernu plastlok',
        ],
        not_allowed_is: [
          'Plastleikföng',
          'Plaströr og plastpípur',
          'Plasthúsgögn',
          '3D prentað plast (PLA, ABS, PETG)',
          'Líffræðilegt plast / bioplast',
          'Plastílát með efnisleifum',
        ],
      },
      food: {
        name_is: 'Matarleifar',
        name_en: 'Food waste',
        color: '#92400e', // Brúnn / Brown
        icon: '🍎',
        description_is: 'Brún tunna - Í bréfpoka! Enginn plastur!',
        examples_is: [
          'Allir matarafgangar',
          'Eggjaskurn',
          'Kaffi- og tekorg',
          'Bein og fiskibein',
          'Ávaxta- og grænmetisúrgangur',
          'Brauð og bakarísvörur',
          'Afskorin blóm (ekki garðaúrgangur)',
        ],
        not_allowed_is: [
          'Plastpokar (notið AÐEINS bréfpoka)',
          'Garðaúrgangur',
          'Dýraúrgangur (kattasandur, o.fl.)',
          'Olía og fita í vökvafara',
          'Stór bein',
        ],
      },
      mixed: {
        name_is: 'Blandaður úrgangur',
        name_en: 'Mixed waste',
        color: '#6b7280', // Grár / Gray
        icon: '🗑️',
        description_is: 'Grá tunna - Allt sem fer ekki annað',
        examples_is: [
          'Dömubindi og tíðaholkar',
          'Blautklútar',
          'Bleyjur',
          'Ryksugupokar',
          'Sígarettustubbar',
          'Kattasandur og dýraúrgangur',
          'Plastleikföng og plastmunir',
          '3D prentað plast',
          'Fitubleyttur pappír',
          'Tannburstar',
        ],
        not_allowed_is: [
          'Rafhlöður',
          'Gler',
          'Hættulegur úrgangur',
          'Rafmagnstæki',
          'Málning',
        ],
      },
      recycling_center: {
        name_is: 'Endurvinnslustöð',
        name_en: 'Recycling center',
        color: '#7c3aed', // Fjólublár / Purple
        icon: '♻️',
        description_is: 'Fara á SORPA endurvinnslustöð eða grenndarstöð',
        examples_is: [
          'Gler og glerílát',
          'Rafhlöður (allar gerðir)',
          'Rafmagnstæki',
          'Fatnaður og textíll',
          'Málning og efni',
          'Stórir málmhlutir',
          'Frauðplast (styrofoam/flamingó)',
          'Garðaúrgangur',
          'Byggingarúrgangur',
        ],
        not_allowed_is: [],
      },
      deposit: {
        name_is: 'Skilagjald (Endurvinnslan)',
        name_en: 'Deposit Return (Endurvinnslan)',
        color: '#f59e0b', // Gulur / Yellow-Orange (like the pig logo)
        icon: '🐷',
        description_is: 'Skila í Endurvinnslan skilagjaldsstöð - fáðu peningana til baka!',
        examples_is: [
          'PET flöskur með skilagjald',
          'Áldósir með skilagjald',
          'Glerflöskur með skilagjald',
          'Gosdósir og bjórdósir',
          'Vatnsflöskur (með skilagjald)',
        ],
        not_allowed_is: [
          'Krumpaðar flöskur (verða að vera heilar!)',
          'Flöskur með vökva í',
          'Flöskur/dósir án skilagjalds',
          'Mjólkurfernu og safafernu (fara í pappír)',
          'Plastílát án skilagjaldsmerkis',
        ],
      },
    },
    special_rules: [
      'Mjólkurfernur (TetraPak) fara í pappír - sent til Svíþjóðar til endurvinnslu',
      '3D prentað plast (PLA, ABS, PETG) fer í blandaðan - SORPA getur ekki unnið úr því',
      'Líffræðilegt plast fer í blandaðan - engin iðnaðarmoltugerð á Íslandi',
      'Bréfpokar fyrir matarleifar fást ókeypis á SORPA stöðvum og í Bónus/Hagkaup/Krónan',
      'Skilagjald: Flöskur mega EKKI vera krumpaðar og ekki hafa vökva í',
      'Endurvinnslan stöðvar: https://www.sorpa.is/mottokustadir/endurvinnslustodvar/',
    ],
  },

  // ============================================
  // SUÐURNES - KALKA
  // ============================================
  'kalka': {
    id: 'kalka',
    name_is: 'Suðurnes (Kalka)',
    name_en: 'Suðurnes Region (Kalka)',
    operator: 'Kalka Sorpeyðingarstöð sf.',
    website: 'https://www.kalka.is',
    municipalities: [
      'Reykjanesbær',
      'Grindavíkurbær',
      'Sandgerðisbær',
      'Sveitarfélagið Garður',
      'Sveitarfélagið Vogar',
    ],
    bins: {
      paper: {
        name_is: 'Pappír og pappi',
        name_en: 'Paper and cardboard',
        color: '#2563eb',
        icon: '📄',
        description_is: 'Sérstök tunna fyrir pappír og pappa',
        examples_is: [
          'Dagblöð og tímarit',
          'Pappakassar',
          'Pappírsumbúðir',
          'Pizzakassar (hreinir)',
          'Umslög',
        ],
        not_allowed_is: [
          'Fitubleyttur pappír',
          'Pappír með matarleifum',
        ],
      },
      plastic: {
        name_is: 'Plastumbúðir',
        name_en: 'Plastic packaging',
        color: '#16a34a',
        icon: '🧴',
        description_is: 'Sérstök tunna fyrir plastumbúðir',
        examples_is: [
          'Snakkapokar',
          'Plastfilmur',
          'Plastpokar',
          'Sjampóflöskur',
          'Plastílát',
        ],
        not_allowed_is: [
          'Plastleikföng',
          'Plaströr',
          '3D prentað plast',
        ],
      },
      food: {
        name_is: 'Matarleifar / Lífrænt',
        name_en: 'Food waste / Organic',
        color: '#92400e',
        icon: '🍎',
        description_is: 'Hólf í tvískiptri tunnu - notið bréfpoka',
        examples_is: [
          'Eggjaskurn',
          'Matarafgangar með beinum',
          'Kaffikorgur',
          'Fiskiúrgangur',
          'Ávaxta- og grænmetisleifar',
        ],
        not_allowed_is: [
          'Plastpokar',
          'Garðaúrgangur',
        ],
      },
      mixed: {
        name_is: 'Blandaður úrgangur',
        name_en: 'Mixed waste',
        color: '#6b7280',
        icon: '🗑️',
        description_is: 'Hólf í tvískiptri tunnu - allt sem fer ekki annað',
        examples_is: [
          'Dömubindi',
          'Blautklútar',
          'Bleyjur',
          'Ryksugupokar',
        ],
        not_allowed_is: [
          'Rafhlöður',
          'Gler',
          'Hættulegur úrgangur',
        ],
      },
      recycling_center: {
        name_is: 'Grenndarstöð / Kalka',
        name_en: 'Neighborhood station / Kalka',
        color: '#7c3aed',
        icon: '♻️',
        description_is: 'Fara á grenndarstöð eða Kölku í Helguvík',
        examples_is: [
          'Glerílát',
          'Málmílát',
          'Textíll',
          'Rafhlöður',
          'Rafmagnstæki',
          'Stórir málmhlutir',
        ],
        not_allowed_is: [],
      },
      deposit: {
        name_is: 'Skilagjald (Endurvinnslan)',
        name_en: 'Deposit Return (Endurvinnslan)',
        color: '#f59e0b',
        icon: '🐷',
        description_is: 'Skila í Endurvinnslan skilagjaldsstöð - fáðu peningana til baka!',
        examples_is: [
          'PET flöskur með skilagjald',
          'Áldósir með skilagjald',
          'Glerflöskur með skilagjald',
          'Gosdósir og bjórdósir',
        ],
        not_allowed_is: [
          'Krumpaðar flöskur',
          'Flöskur með vökva í',
          'Án skilagjaldsmerkis',
        ],
      },
    },
    special_rules: [
      'Kalka og SORPA eru í samstarfi - sama flokkunarkerfi',
      'Endurvinnslutunnur (pappír/plast) tæmdar á 4 vikna fresti',
      'Matarleifar og blandaður tæmdur á 2 vikna fresti',
      'Grenndarstöðvar á mörgum stöðum á Suðurnesjum',
      'Skilagjald: Flöskur mega EKKI vera krumpaðar',
    ],
  },

  // ============================================
  // AKUREYRI OG NORÐURLAND
  // ============================================
  'akureyri': {
    id: 'akureyri',
    name_is: 'Akureyri og nágrenni',
    name_en: 'Akureyri and surroundings',
    operator: 'Akureyrarbær / Terra',
    website: 'https://www.akureyri.is',
    municipalities: [
      'Akureyri',
      'Hörgársveit',
      'Eyjafjarðarsveit',
      'Arnarneshreppur',
    ],
    bins: {
      paper: {
        name_is: 'Pappír og pappi',
        name_en: 'Paper and cardboard',
        color: '#2563eb',
        icon: '📄',
        description_is: 'Hólf í 360L tvískiptri tunnu',
        examples_is: [
          'Dagblöð og tímarit',
          'Pappakassar',
          'Pappírsumbúðir',
          'Umslög (má vera með plastglugga)',
          'Bækur með mjúku kápu',
        ],
        not_allowed_is: [
          'Fitubleyttur pappír',
          'Mikið ámálaður pappír',
          'Límmiðar',
          'Innbundnar bækur',
        ],
      },
      plastic: {
        name_is: 'Plastumbúðir',
        name_en: 'Plastic packaging',
        color: '#16a34a',
        icon: '🧴',
        description_is: 'Hólf í 360L tvískiptri tunnu - AÐEINS umbúðaplast',
        examples_is: [
          'Plastflöskur',
          'Plastpokar og filmur',
          'Snyrtivöruílát',
          'Mjólkurbrúsar',
        ],
        not_allowed_is: [
          'Plastleikföng',
          'Plaströr og pípur',
          'Plasthúsgögn',
          'Plast sem ekki er umbúðir',
        ],
      },
      food: {
        name_is: 'Matarleifar',
        name_en: 'Food waste',
        color: '#92400e',
        icon: '🍎',
        description_is: 'Hólf í 240L tvískiptri tunnu - í maís/kartöflupoka eða bréfpoka',
        examples_is: [
          'Allir matarafgangar',
          'Eggjaskurn',
          'Kaffi- og tekorg',
          'Bein',
          'Afskorin blóm',
        ],
        not_allowed_is: [
          'Plastpokar (jarðgerast ekki!)',
          'Garðaúrgangur (fer á gámasvæði)',
        ],
      },
      mixed: {
        name_is: 'Blandaður úrgangur',
        name_en: 'Mixed waste',
        color: '#6b7280',
        icon: '🗑️',
        description_is: 'Hólf í 240L tvískiptri tunnu',
        examples_is: [
          'Blautklútar',
          'Dömubindi',
          'Bleyjur',
          'Ryksugupokar',
          'Tannburstar',
        ],
        not_allowed_is: [
          'Rafhlöður',
          'Hættulegur úrgangur',
        ],
      },
      recycling_center: {
        name_is: 'Gámasvæði Akureyrar',
        name_en: 'Akureyri recycling center',
        color: '#7c3aed',
        icon: '♻️',
        description_is: 'Söfnunar- og móttökustöð við Rangárvelli 2',
        examples_is: [
          'Gler',
          'Rafhlöður',
          'Rafmagnstæki',
          'Textíll',
          'Málning',
          'Stórir málmhlutir',
          'Garðaúrgangur',
          'Byggingarúrgangur',
        ],
        not_allowed_is: [],
      },
      deposit: {
        name_is: 'Skilagjald (Endurvinnslan)',
        name_en: 'Deposit Return (Endurvinnslan)',
        color: '#f59e0b',
        icon: '🐷',
        description_is: 'Skila í Endurvinnslan skilagjaldsstöð - fáðu peningana til baka!',
        examples_is: [
          'PET flöskur með skilagjald',
          'Áldósir með skilagjald',
          'Glerflöskur með skilagjald',
          'Gosdósir og bjórdósir',
        ],
        not_allowed_is: [
          'Krumpaðar flöskur',
          'Flöskur með vökva í',
          'Án skilagjaldsmerkis',
        ],
      },
    },
    special_rules: [
      'Tvískiptar tunnur: 240L (mat+blandað) og 360L (pappír+plast)',
      '100 lífrænar pokar fást ókeypis á ári - dreift í byrjun mars',
      'Pokar fást einnig hjá Terra og í matvöruverslunum',
      'Klippikort fyrir umframúrgang - 5.650 kr fyrir 8 klipp',
      'Gámasvæði: Sumar kl.13-20 (virkir) / 13-17 (helgar), Vetur kl.13-18 / 13-17',
      'flokkumfleira@akureyri.is fyrir fyrirspurnir',
      'Skilagjald: Flöskur mega EKKI vera krumpaðar',
    ],
  },
};

// Sjálfgefið svæði / Default region
export const DEFAULT_REGION = 'sorpa';

// Finna svæði eftir sveitarfélagi
export function getRegionByMunicipality(municipality: string): RegionInfo {
  const lowerMuni = municipality.toLowerCase();

  for (const region of Object.values(REGIONS)) {
    for (const muni of region.municipalities) {
      if (muni.toLowerCase() === lowerMuni || lowerMuni.includes(muni.toLowerCase())) {
        return region;
      }
    }
  }

  // Sjálfgefið á SORPA
  return REGIONS[DEFAULT_REGION];
}

// Fá bin info fyrir svæði
export function getBinInfo(regionId: string, bin: BinType): BinInfo {
  const region = REGIONS[regionId] || REGIONS[DEFAULT_REGION];
  return region.bins[bin];
}

// Allar bin upplýsingar fyrir svæði
export function getAllBins(regionId: string): Record<BinType, BinInfo> {
  const region = REGIONS[regionId] || REGIONS[DEFAULT_REGION];
  return region.bins;
}
