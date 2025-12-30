export interface PartyChangedMessage {
    userId: string;
    action: 'joined' | 'left';
    activeUsers: Array<{
        userId: string;
        cursorPosition: number;
    }>
}
export interface WebSocketConnection {
    connect(): void;
    disconnect(): void;
    sendMessage(method: string, ...args: any[]): void;
    onMessage(method: string, handler: (...args: any[]) => void): void;
    offMessage(method: string, handler: (...args: any[]) => void): void;
    getState(): 'connected' | 'disconnected' | 'connecting' | 'reconnecting';
    getConnectionId(): string | null;
    isConnected(): boolean;
}
