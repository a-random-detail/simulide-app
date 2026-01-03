export const API_BASE = "http://localhost:8080";
export const RECEIVE_OPERATION_COMMAND = "ReceiveOperation";
export const PARTY_CHANGED_COMMAND = "PartyChanged";
export const APPLY_OPERATION_COMMAND = "ApplyOperation";
export const JOIN_DOCUMENT_GROUP_COMMAND = "JoinDocumentGroup";
export const LEAVE_DOCUMENT_GROUP_COMMAND = "LeaveDocumentGroup";

export const INSERT_OPERATION_TYPE = "Insert";
export const DELETE_OPERATION_TYPE = "Delete";

export interface ServiceError {
    message: string;
}

export enum HttpStatusCode {
    OK = 200,
    Created = 201,
    BadRequest = 400,
    NotFound = 404,
    InternalServerError = 500
}

