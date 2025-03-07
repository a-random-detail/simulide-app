import { API_BASE } from "./service-constants";

export interface DocumentResponse {
  id: string;
}

export type DocumentPayload = {
    name: string;
    content: string;
};


export const createDocument = async (doc: DocumentPayload): Promise<DocumentResponse> => {
  const response = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });

  if (!response.ok) throw new Error("Failed to create document");

  return response.json();
};
