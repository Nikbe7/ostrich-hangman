export const getSessionId = (): string => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('ostrich_session_id');
    if (!id) {
        id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('ostrich_session_id', id);
    }
    return id;
};

export const getPlayerName = (): string => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('ostrich_player_name') || '';
};

export const setPlayerName = (name: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ostrich_player_name', name);
};
