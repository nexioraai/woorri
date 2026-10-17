// GÉNÉRÉ par scripts/generate.mjs depuis tokens.json — NE PAS ÉDITER.
// Thème React Native (D-021 : StyleSheet + tokens maison) — données pures,
// aucune dépendance de bibliothèque de styling (ARCHITECTURE §22, D-021 :
// le choix de styling ne fuite jamais dans les contrats ni dans ce module).
export const theme = {
  "color": {
    "light": {
      "bg": "#FBF6F0",
      "surface": "#FFFFFF",
      "text": "#2A1C13",
      "muted": "#6B5543",
      "primary": "#B5431C",
      "onPrimary": "#E8E8E8",
      "border": "#E7D9C9",
      "error": "#C42B1C",
      "success": "#1E763B",
      "warn": "#816600",
      "badgeBg": "#F4E8DB",
      "primaryText": "#B5431C"
    },
    "dark": {
      "bg": "#1A120C",
      "surface": "#261A12",
      "text": "#F7EFE7",
      "muted": "#B9A290",
      "primary": "#F08050",
      "onPrimary": "#16181D",
      "border": "#3B2A1E",
      "error": "#FF6B5E",
      "success": "#4CC17A",
      "warn": "#E3C25A",
      "badgeBg": "#2E2017",
      "primaryText": "#F08050"
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
    "sm": 8,
    "md": 14,
    "lg": 22
  },
  "font": {
    "famille": "serif",
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
