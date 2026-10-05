import type { IndexSettings } from "../../lib/providers/search/types";
import { attrField } from "./documents";

const RANKING = ["words", "typo", "proximity", "attribute", "sort", "exactness", "rankScore:desc"];

export const PRODUCT_FACET_FIELDS = ["categoryPaths", "businessType", "rd", "tier", "province", "certifications", "audited", "supportsSample"] as const;
export const SUPPLIER_FACET_FIELDS = ["categoryPaths", "businessType", "rd", "tier", "province", "certifications", "audited"] as const;

export function productSettings(filterableAttrKeys: string[]): IndexSettings {
  return {
    searchable: ["title", "keywords", "categoryName", "specsText", "supplierName", "summary"],
    filterable: [
      "categoryPaths", "businessType", "rd", "tier", "audited", "province", "supportsSample", "supportsEscrow",
      "hasVideo", "certifications", "moq", "priceMinUsd", "ratingAvg", ...filterableAttrKeys.map(attrField),
    ],
    sortable: ["priceMinUsd", "publishedAt", "moq", "ratingAvg"],
    ranking: RANKING,
    maxFacetValues: 10000,
  };
}

export function supplierSettings(): IndexSettings {
  return {
    searchable: ["name", "mainProducts", "city", "province"],
    filterable: ["categoryPaths", "businessType", "rd", "tier", "audited", "province", "certifications", "supportsEscrow"],
    sortable: ["yearFounded", "productCount", "ratingAvg"],
    ranking: RANKING,
    maxFacetValues: 10000,
  };
}
