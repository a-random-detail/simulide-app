import { useState } from "react";
import { useDocumentContext } from "../context/DocumentContext";


export const CodeEditor = () => {

    const { documentId, content, initializeDocument, handleDocumentChange} = useDocumentContext();
    const [lastContent, setLastContent] = useState<string>("");

    const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = event.target.value;
        const position = event.target.selectionStart;
        const operationType = newContent.length > lastContent.length ? "insert" : "delete";

        handleDocumentChange(newContent, position, operationType);
        setLastContent(newContent);
    };  

    return (
        <div className="w-full flex flex-col" data-testid="code-editor">
            <h1> {!documentId && <button onClick={initializeDocument}>New Document</button>} </h1>
            { documentId && (
                <textarea value={content} onChange={handleContentChange} rows={10} cols={50}/>

            )}
        </div>
    );
}