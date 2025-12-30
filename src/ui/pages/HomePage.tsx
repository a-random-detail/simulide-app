import {useNavigate} from "react-router";
import {useState} from "react";
import {useCreateDocument} from "../../application/hooks/use-create-document.ts";

export function HomePage() {
    const navigate = useNavigate();
    const { createDocument, isCreating, error } = useCreateDocument();
    const [title, setTitle] = useState("");

    const handleCreateDocument = async () => {
        const newDocument = await createDocument(title || "Untitled Document", "");
        if (newDocument) navigate(`/documents/${newDocument.id}`);
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                <h1 className="text-3xl font-bold mb-2"> SimulIDE Collaborative Editor</h1>
                <p className="text-gray-600 mb-8">
                    Create a new document to start collaborating in real-time!
                </p>

                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Dcocument Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isCreating}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-indigo-100 focus:border-indigo-300 disabled:opacity-50" />
                    <button
                        onClick={handleCreateDocument}
                        disabled={isCreating}
                        className="w-full bg-indigo-600 text-white px-4 py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                        {isCreating ? "Creating..." : "Create Document"}
                    </button>
                    {error && <p className="text-red-500 text-sm">Failed to create document: {error.message}</p>}
                </div>
            </div>
        </div>
    );
}