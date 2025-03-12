
export type PartyChangeEvent = {
    connectionId: string;
    action: "Join" | "Leave";
};