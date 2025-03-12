import { API_BASE } from "./service-constants";

export interface DocumentResponse {
  id: string;
}

export type DocumentPayload = {
    name: string;
    content: string;
};

interface ServiceError {
  message: string;
}

enum HttpStatusCode {
    OK = 200,
    Created = 201,
    BadRequest = 400,
    NotFound = 404,
    InternalServerError = 500
}

class ServiceResponse<T> {
  public data: T | null;
  public isSuccessful: boolean;
  public errors: ServiceError[] | null;
  public statusCode: HttpStatusCode;

  constructor(init: {
    data: T | null;
    isSuccessful: boolean;
    errors: ServiceError[] | null;
    statusCode: HttpStatusCode;
  }) {
    this.data = init.data;
    this.isSuccessful = init.isSuccessful;
    this.errors = init.errors;
    this.statusCode = init.statusCode;
  }
}

export const createDocument = async (doc: DocumentPayload): Promise<ServiceResponse<DocumentResponse>> => {
  const response = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });

  if (!response.ok) throw new Error("Failed to create document");

  return response.json();
};
