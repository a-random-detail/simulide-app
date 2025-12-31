import {ActiveUser} from "../../../core/document/types.ts";
import {useActiveUsers} from "../../../application/ActiveUsersContext.tsx";

interface ActiveUsersProps {
    currentConnectionId: string;
}
export function ActiveUsers({currentConnectionId}: ActiveUsersProps) {
    const activeUsers = useActiveUsers();
    return (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-600">Active:</span>
            <div className="flex gap-2">
                    {activeUsers.map((user) => (
                    <div
                        key={user.userId}
                        title={user.userId}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                            user.userId === currentConnectionId
                                ? 'bg-green-100 border-green-300 text-green-700'
                                : 'bg-blue-100 border-blue-300 text-blue-700'
                        }`}
                    >
                        {user.userId === currentConnectionId ? 'You' : `User ${user.userId.substring(0,6)}` || 'Anonymous'}
                    </div>
                ))}
            </div>
        </div>
    );

}