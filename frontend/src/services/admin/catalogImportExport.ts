import { API } from "../../api/api";

export const AVAILABLE_EXPORT_FIELDS = [
  "id_producto",
  "name",
  "brandId",
  "brandName",
  "categoryId",
  "categoryName",
  "price",
  "stock",
  "status",
  "productType",
  "description",
  "features",
  "imageUrl",
  "supplementFlavor",
  "supplementPresentation",
  "supplementServings",
  "apparelSize",
  "apparelColor",
  "apparelMaterial",
  "createdAt",
  "updatedAt",
] as const;

export type ExportField = (typeof AVAILABLE_EXPORT_FIELDS)[number];

export const exportProductsCsv = async (fields?: ExportField[]) => {
  const response = await API.get("/admin/products/export/csv", {
    responseType: "blob",
    params: fields?.length ? { fields: fields.join(",") } : undefined,
  });
  return response.data;
};

export const exportProductsImportTemplateCsv = async (fields?: ExportField[]) => {
  const response = await API.get("/admin/products/import/template/csv", {
    responseType: "blob",
    params: fields?.length ? { fields: fields.join(",") } : undefined,
  });
  return response.data;
};

export const uploadProductsCsv = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await API.post("/admin/products/import/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const validateProductsImport = async (batchId: string) => {
  const response = await API.post(`/admin/products/import/${batchId}/validate`);
  return response.data;
};

export const previewProductsImport = async (batchId: string) => {
  const response = await API.get(`/admin/products/import/${batchId}/preview`);
  return response.data;
};

export const getProductsImportErrors = async (batchId: string) => {
  const response = await API.get(`/admin/products/import/${batchId}/errors`);
  return response.data;
};

export const commitProductsImport = async (batchId: string) => {
  const response = await API.post(`/admin/products/import/${batchId}/commit`);
  return response.data;
};