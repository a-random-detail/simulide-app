import {DocumentState} from "../../../core/document/types.ts";

interface EditorHeaderProps {
    state: DocumentState;
    onResync: () => void;
}

export function EditorHeader({ state, onResync }: EditorHeaderProps) {
    const getStatusDisplay = () => {
        switch (state.status) {
            case 'synced':
                return {
                    text: 'All changes saved',
                    className: 'bg-green-100 text-green-700'
                };
            case 'optimistic':
                return {
                    text: 'Saving changes...',
                    className: 'bg-yellow-100 text-yellow-700'
                };
            case 'syncing':
                return {
                    text: 'Syncing with server...',
                    className: 'bg-blue-100 text-blue-700'
                };
            default:
                return {
                    text: '',
                    className: ''
                };
        }
    };

    const status = getStatusDisplay();

    return (
        <div className="flex justify-between items-center px-5 py-4 bg-white border-b border-gray-200">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold">
                    { state.status !== 'loading' && state.status !== 'error' ? state.document.name || 'Untitled Document' : 'Document' }
                </h2>

                { state.status !== 'loading' && state.status !== 'error' && (
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                        Version: {state.document.version}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-4">
                { status.text && <span className={`px-2 py-1 rounded text-sm font-medium ${status.className}`}>{status.text}</span> }
            </div>
            <button
                onClick={onResync}
                disabled={state.status === 'syncing' || state.status === 'loading' }
                title="Resync Document"
                className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded text-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Resync
            </button>
        </div>
    );
}