
export type PartyChangeEvent = {
    connectionId: string;
    action: number;
};

export enum ActionType {
    Join = 0,
    Leave = 1,
}