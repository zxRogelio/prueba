export const PRODUCT_KIND_VALUES = Object.freeze([
  "supplement",
  "accessory",
  "apparel",
]);

export const PRODUCT_TYPE_BY_KIND = Object.freeze({
  supplement: "Suplementación",
  accessory: "Accesorios",
  apparel: "Ropa",
});

export const PRODUCT_KIND_LABELS = Object.freeze({
  supplement: "Suplementos",
  accessory: "Accesorios",
  apparel: "Ropa",
});

const SUPPLEMENT_FIELDS = [
  "supplementFlavor",
  "supplementPresentation",
  "supplementServings",
];

const APPAREL_FIELDS = [
  "apparelSize",
  "apparelColor",
  "apparelMaterial",
];

const trimOrNull = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

export const isValidProductKind = (value) => PRODUCT_KIND_VALUES.includes(value);

export const deriveProductTypeFromKind = (productKind) => {
  const productType = PRODUCT_TYPE_BY_KIND[productKind];

  if (!productType) {
    const error = new Error("productKind inválido");
    error.statusCode = 400;
    throw error;
  }

  return productType;
};

export const cleanProductFieldsForKind = (source, productKind) => {
  const payload = {};

  for (const field of SUPPLEMENT_FIELDS) {
    payload[field] =
      productKind === "supplement" ? trimOrNull(source?.[field]) : null;
  }

  for (const field of APPAREL_FIELDS) {
    payload[field] = productKind === "apparel" ? trimOrNull(source?.[field]) : null;
  }

  return payload;
};

export const cleanupPayloadForKind = (productKind) => {
  if (productKind === "supplement") {
    return {
      productType: PRODUCT_TYPE_BY_KIND.supplement,
      apparelSize: null,
      apparelColor: null,
      apparelMaterial: null,
    };
  }

  if (productKind === "apparel") {
    return {
      productType: PRODUCT_TYPE_BY_KIND.apparel,
      supplementFlavor: null,
      supplementPresentation: null,
      supplementServings: null,
    };
  }

  return {
    productType: PRODUCT_TYPE_BY_KIND.accessory,
    supplementFlavor: null,
    supplementPresentation: null,
    supplementServings: null,
    apparelSize: null,
    apparelColor: null,
    apparelMaterial: null,
  };
};
