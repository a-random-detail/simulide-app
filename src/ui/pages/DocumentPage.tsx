import {useNavigate, useParams} from "react-router";
import {Editor} from "../components/editor/Editor.tsx";
import {EditorHeader} from "../components/editor/EditorHeader.tsx";
import {ActiveUsers} from "../components/active-users/ActiveUsers.tsx";
import {useCollaborativeDocument} from "../../application/hooks/use-collaborative-document.ts";

export function DocumentPage() {
    const { documentId } = useParams<{ documentId: string }>();
    const navigate = useNavigate();
    const { state, applyEdit, resyncDocument } = useCollaborativeDocument(documentId!);

    if (state.status === 'loading') {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <div className="text-lg text-gray-600"> Loading document... </div>
            </div>
        );
    }

    if (state.status === 'error') {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
                <div className="text-lg text-red-600 mb-4"> Error loading document: {state.error.message} </div>
                <button
                    onClick={() => navigate('/')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                    Go to Home
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <EditorHeader state={state} onResync={resyncDocument} />
            {state.status === 'syncing' && <div>Syncing changes...</div>}

            <div className="flex-1 flex flex-col overflow-hidden">
                <ActiveUsers activeUsers={state.activeUsers} />
                <Editor
                    content={state.document.content}
                    onEdit={applyEdit}
                    disabled={state.status === 'syncing'}
                    version={state.document.version}
                    placeholder="Start collaborating..."
                />
            </div>
        </div>
    );
}