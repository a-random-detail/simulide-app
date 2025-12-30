export enum ServiceLayer {
    Application = "Application",
    Validation = "Validation",
    Domain = "Domain",
    Database = "Database",
    Unknown = "Unknown",
}

export interface ServiceError {
    message: string;
    layer: ServiceLayer;
}

export interface ApiResponse<T> {
    data: T;
    isSuccessful: boolean;
    errors: ServiceError[] | null;
    statusCode: number;
}

export class ApiError extends Error {
    constructor(message: string | undefined, public statusCode: number, public errors: ServiceError[]) {
        super(message || "");
        this.name = "ApiError";
    }

    getErrorsByLayer(layer: ServiceLayer): ServiceError[] | undefined {
        return this.errors.filter(error => error.layer === layer);
    }

    getAllMessages(): string[] {
        return this.errors.map(error => error.message);
    }

    formatErrors(): string {
        return this.errors.map(error => `[${error.layer}] ${error.message}`).join("\n");
    }
}
