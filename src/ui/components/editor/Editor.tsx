import {Operation} from "../../../core/document/types.ts";
import {useEffect, useRef, useState} from "react";

interface EditorProps {
    content: string;
    version: number;
    onEdit: (op: Operation) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function Editor({
    content,
    version,
    onEdit,
    disabled = false,
    placeholder = "Start typing..."
}: EditorProps) {
    const [localContent, setLocalContent] = useState(content);
    const textarea= useRef<HTMLTextAreaElement>(null);
    const isLocalChange = useRef(false);

    useEffect(() => {
        if (!isLocalChange.current) {
            setLocalContent(content);
        }
        isLocalChange.current = false;

    }, [content]);

    const handleChange = (newContent: string) => {
        if (disabled) return;

        isLocalChange.current = true;
        setLocalContent(newContent);

        const op = calculateOperation(content, newContent, version);

        if (op) {
            onEdit(op);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-white mx-4 mb-4 rounded-lg shadow-sm overflow-hidden">
            <textarea
                ref={textarea}
                value={localContent}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
                spellCheck={false}
                disabled={disabled}
                className="flex-1 p-5 font-mono text-sm leading-relaxed resize-none border-none outline-none focus:outline-none disabled:opacity-50 disabled:text-gray-500 disabled:cursor-not-allowed"
            />
        </div>
    );
}

function calculateOperation(
    oldContent: string,
    newContent: string,
    version: number): Operation | null {
    let position = 0;
    while (
        position < oldContent.length &&
        position < newContent.length &&
        oldContent[position] === newContent[position]
        ) {
        position++;
    }

    if (newContent.length > oldContent.length) {
        const insertedText = newContent.slice(position, newContent.length - (oldContent.length - position));
        return {
            documentId: '',
            type: 'insert',
            content: insertedText,
            position,
            version: version + 1,
        };
    }

    if (newContent.length < oldContent.length) {
        const deleteLength = oldContent.length - newContent.length;
        return {
            documentId: '',
            type: 'delete',
            position,
            length: deleteLength,
            version: version + 1,
        };
    }

    return null;
}
