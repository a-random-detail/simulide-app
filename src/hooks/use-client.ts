import {CodeDocument} from "../types/CodeDocument.ts";

export default function useClient() {
    const createNewDocument = async (doc: CodeDocument): CodeDocument => {
        console.log(`we saving the doc with name ${doc.name}`)
    };

    return {
       createNewDocument
    };
}