import {CodeDocument} from "../types/CodeDocument.ts";
import useClient from "../hooks/use-client.ts";
import {useState} from "react";


export default function CodeEditor(){

    const [codeContent, setCodeContent] = useState<string | undefined>();
    const { createNewDocument }= useClient();

    const newDocFn = async () => {
       const result = await createNewDocument({ name: 'foo', content: 'bar'} as CodeDocument);
       setCodeContent(result.content);
    };

    return (
        <>
            <h1> code editor here</h1>
            <button data-testid="new-document" onClick={newDocFn}>New</button>
            <textarea data-testid="code-editor" value={codeContent}></textarea>
        </>
    );
}