import {ApiError, ApiResponse} from "../../infrastructure/http/types.ts";
import {Document} from "../../core/document/types.ts";

export interface CreateDocumentRequest {
    name: string;
    content: string;
}

export interface DocumentHttpClient {
    createDocument(request: CreateDocumentRequest): Promise<Document>;
    getDocument(documentId: string): Promise<Document>;
}

async function handleApiResponse<T>(response: Response): Promise<T> {
    let apiResponse: ApiResponse<T>;

    try {
        apiResponse = await response.json();
    } catch (err) {
        const error = err as Error;
        throw new ApiError(`Failed to fetch data from API: ${error.message || ""}`, response.status, []);
    }

    if (!apiResponse.isSuccessful) {
        const errorCount = apiResponse.errors?.length ?? 0;
        const errorMessage = errorCount > 0 ? apiResponse.errors?.map(e => e.message).join(", ") : "Unknown error occurred";
        throw new ApiError(errorMessage, response.status, apiResponse.errors || []);
    }

    if (!response.ok) {
        throw new ApiError(`API request failed with status ${response.status}`, response.status, apiResponse.errors || []);
    }

    return apiResponse.data;
}

export function createDocumentHttpClient(apiBaseUrl: string): DocumentHttpClient {
    return {
        async createDocument(request: CreateDocumentRequest): Promise<Document> {
            try {
                const response = await fetch(`${apiBaseUrl}/documents`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(request),
                });

                const data = await handleApiResponse<Document>(response);
                console.log('[DocumentHttpClient] Document  created successfully:', data);
                return data;
            } catch (error) {
                if (error instanceof ApiError) {
                    console.error("API Error creating document:", { status: error.statusCode, errors: error.errors});
                    if (error.statusCode === 404) {
                        throw new Error("Document not found");
                    }
                } else {
                    console.error("Unexpected error creating document:", error);
                }
                throw error;
            }
        },

        async getDocument(documentId: string): Promise<Document> {
            try {
                const response = await fetch(`${apiBaseUrl}/documents/${documentId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });

                const data = await handleApiResponse<Document>(response);
                console.log('[DocumentHttpClient] Document fetched successfully:', data);
                return data;
            } catch (error) {
                if (error instanceof ApiError) {
                    console.error("API Error fetching document:", { status: error.statusCode, errors: error.errors});
                    if (error.statusCode === 404) {
                        throw new Error("Document not found");
                    }
                } else {
                    console.error("Unexpected error fetching document:", error);
                }
                throw error;
            }
        },
    };
}