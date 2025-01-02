import {CodeDocument, CodeDocumentGist} from "../types/CodeDocument.ts";

export default function useClient() {
    const createNewDocument = async (doc: CodeDocumentGist): Promise<CodeDocument> => {
        console.log(`we saving the doc with name ${doc.name}`)
        return {
            id: "1234",
            content: doc.content,
            name: doc.name,
            version: 1
        } as CodeDocument;
    };

    return {
       createNewDocument
    };
}