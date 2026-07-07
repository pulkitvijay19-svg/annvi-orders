export const LANGUAGES = {
  EN: "EN",
  BN: "BN",
  BOTH: "BOTH",
};

export const TEXT = {
  grossWeight: {
    en: "Gross Weight",
    bn: "মোট ওজন",
  },
  lessWeight: {
    en: "Less Weight",
    bn: "কম ওজন",
  },
  netWeight: {
    en: "Net Weight",
    bn: "নেট ওজন",
  },
  saveDraft: {
    en: "Save Draft",
    bn: "ড্রাফট সেভ",
  },
  printTag: {
    en: "Print Tag",
    bn: "ট্যাগ প্রিন্ট",
  },
};

export function t(key, lang = "BOTH") {
  const item = TEXT[key];

  if (!item) return key;

  if (lang === "EN") return item.en;
  if (lang === "BN") return item.bn;

  return `${item.en} / ${item.bn}`;
}