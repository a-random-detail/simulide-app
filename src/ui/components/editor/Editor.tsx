interface EditorProps {
    content: string;
    onEdit: (content: string) => void;
    onFlush: () => void;
    disabled?: boolean;
    placeholder?: string;
}

export function Editor({
    content,
    onEdit,
    onFlush,
    disabled = false,
    placeholder = "Start typing..."
}: EditorProps) {
    return (
        <div className="flex-1 flex flex-col bg-white mx-4 mb-4 rounded-lg shadow-sm overflow-hidden">
            <textarea
                value={content}
                onChange={(e) => onEdit(e.target.value)}
                placeholder={placeholder}
                onBlur={onFlush}
                spellCheck={false}
                disabled={disabled}
                className="flex-1 p-5 font-mono text-sm leading-relaxed resize-none border-none outline-none focus:outline-none disabled:opacity-50 disabled:text-gray-500 disabled:cursor-not-allowed"
            />
        </div>
    );
}

