import {useNavigate, useParams} from "react-router";
import {Editor} from "../components/editor/Editor.tsx";
import {EditorHeader} from "../components/editor/EditorHeader.tsx";
import {ActiveUsers} from "../components/active-users/ActiveUsers.tsx";
import {useCollaborativeDocument} from "../../application/hooks/use-collaborative-document.ts";
import { ActiveUsersContext } from "../../application/ActiveUsersContext.tsx";
import { DocumentStateContext } from "../../application/DocumentStateContext.tsx";
import {ConnectionIdContext} from "../../application/ConnectionIdContext.tsx";
import {LocalContentContext} from "../../application/LocalContentContext.tsx";
import {DocumentActionsContext} from "../../application/DocumentActionsContext.tsx";

export function DocumentPage() {
    const { documentId } = useParams<{ documentId: string }>();
    const navigate = useNavigate();
    const {
        state,
        setLocalContent,
        localContent,
        connectionId,
        applyEdit,
        flush,
        resyncDocument
    } = useCollaborativeDocument(documentId!);

    console.log('[DocumentPage] Current document state:', state, documentId);

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
        <ConnectionIdContext.Provider value={connectionId ?? ""}>
            <LocalContentContext.Provider value={{localContent, setLocalContent}}>
                <DocumentActionsContext.Provider value={{applyEdit, flush, resyncDocument}}>
                    <DocumentStateContext.Provider value={state}>
                        <ActiveUsersContext.Provider value={state.activeUsers ?? []}>
                            <div className="flex flex-col h-screen bg-gray-100">
                                <EditorHeader onResync={resyncDocument} />
                                {state.status === 'syncing' && <div>Syncing changes...</div>}

                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <ActiveUsers currentConnectionId={connectionId ?? ""}/>
                                    <Editor
                                        content={localContent}
                                        onEdit={applyEdit}
                                        onFlush={flush}
                                        disabled={state.status === 'syncing'}
                                        placeholder="Start collaborating..."
                                    />
                                </div>
                            </div>
                        </ActiveUsersContext.Provider>
                    </DocumentStateContext.Provider>
                </DocumentActionsContext.Provider>
            </LocalContentContext.Provider>
        </ConnectionIdContext.Provider>
    );
}