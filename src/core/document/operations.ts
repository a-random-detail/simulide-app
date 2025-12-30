import {Document, Operation} from "./types.ts";

export function applyOperation(
    document: Document,
    operation: Operation
): Document {
    let newContent = document.content;

    switch (operation.type) {
        case "insert":
            newContent =
                newContent.slice(0, operation.position) +
                (operation.content || "") +
                newContent.slice(operation.position);
            break;
        case "delete":
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
