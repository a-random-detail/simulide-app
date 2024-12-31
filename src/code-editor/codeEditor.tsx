import {CodeDocument} from "../types/CodeDocument.ts";
import useClient from "../hooks/use-client.ts";


export default function CodeEditor(){

    const { createNewDocument }= useClient();

    const newDocFn = async () => {
        await createNewDocument({ name: 'foo', content: 'bar'} as CodeDocument);
    };

    return (
        <>
            <h1> code editor here</h1>
            <button data-testid="new-document" onClick={newDocFn}>New</button>
            <textarea data-testid="code-editor"></textarea>
        </>
    );
}