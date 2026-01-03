import {Document, Operation} from "./types.ts";
import {DELETE_OPERATION_TYPE, INSERT_OPERATION_TYPE} from "../../application/services/service-constants.ts";

export function applyOperation(
    document: Document,
    operation: Operation
): Document {
    console.log("[applyOperation] Applying operation:", operation);
    let newContent = document.content;

    switch (operation.type) {
        case INSERT_OPERATION_TYPE:
            console.log("[applyOperation] Applying insert operation:", operation);
            newContent =
                newContent.slice(0, operation.position) +
                (operation.content || "") +
                newContent.slice(operation.position);
            break;
        case DELETE_OPERATION_TYPE:
            console.log("[applyOperation] Applying delete operation:", operation);
            newContent =
                newContent.slice(0, operation.position) +
                newContent.slice(operation.position + (operation.length || 0));
            break;
    }

    return {
        ...document,
        content: newContent,
        version: operation.version,
    };
}

export function validateOperation(
    document: Document,
    operation: Operation,
    expectedResult: string
): boolean {
    try {
        const result = applyOperation(document, operation);
        return result.content === expectedResult;
    } catch {
        return false;
    }
}
