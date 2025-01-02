import {CodeDocument} from "../types/CodeDocument.ts";
import useClient from "../hooks/use-client.ts";
import {useState} from "react";


export default function CodeEditor(){

    const [codeContent, setCodeContent] = useState<string | undefined>();
    const { createNewDocument }= useClient();

    const newDocFn = async () => {
        const content = `
        
export default function HelloWorld() {
    const print = () => ('Hello, World!');

    return {
      print 
    };
}
        `;
       const result = await createNewDocument({ name: 'foo', content } as CodeDocument);
       setCodeContent(result.content);
    };

    return (
        <>
            <div className="w-full flex flex-col">
                <h1> code editor here</h1>
                <button className={`btn btn-blue ml-auto flex flex-row`} data-testid="new-document" onClick={newDocFn}>New</button>
                <textarea data-testid="code-editor" className={`w-full flex flex-row whitespace-pre h-screen text-white p-10`} value={codeContent} contentEditable="true"></textarea>
            </div>
        </>
    );
}