// GÉNÉRÉ par scripts/generate.mjs depuis tokens.json — NE PAS ÉDITER.
// Thème React Native (D-021 : StyleSheet + tokens maison) — données pures,
// aucune dépendance de bibliothèque de styling (ARCHITECTURE §22, D-021 :
// le choix de styling ne fuite jamais dans les contrats ni dans ce module).
export const theme = {
  "color": {
    "light": {
      "bg": "#F4F6F8",
      "surface": "#FFFFFF",
      "text": "#14191F",
      "muted": "#55606D",
      "primary": "#15607F",
      "onPrimary": "#D0D1D2",
      "border": "#D3DAE2",
      "error": "#C42B1C",
      "success": "#1F7A3D",
      "warn": "#816600",
      "badgeBg": "#E8EDF2",
      "primaryText": "#15607F"
    },
    "dark": {
      "bg": "#0E1419",
      "surface": "#18212A",
      "text": "#EEF2F6",
      "muted": "#9BA7B4",
      "primary": "#4FB3D9",
      "onPrimary": "#16181D",
      "border": "#2A3542",
      "error": "#FF6B5E",
      "success": "#4CC17A",
      "warn": "#E3C25A",
      "badgeBg": "#1F2A34",
      "primaryText": "#4FB3D9"
    }
  },
  "space": {
    "xxs": 2,
    "xs": 4,
    "sm": 8,
    "md": 12,
    "lg": 16,
    "xl": 24
  },
  "radius": {
    "sm": 4,
    "md": 6,
    "lg": 10
  },
  "font": {
    "famille": "systeme",
    "label": 12,
    "body": 14,
    "title": 17,
    "heading": 22,
    "display": 34
  },
  "fontWeight": {
    "semibold": "600",
    "bold": "700"
  },
  "opacity": {
    "disabled": 0.5
  },
  "size": {
    "tapTarget": 48,
    "controlHeight": 54,
    "measure": 768
  }
} as const;
export type SchemeName = keyof typeof theme.color;
export type Palette = (typeof theme.color)[SchemeName];
