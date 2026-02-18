import React from 'react';

interface HUDDesktopProps {
    onlineCount: number;
    searchQuery: string;
    onSearchChange: (val: string) => void;
    onSearchSubmit: () => void;
    searchError: string | null;
    isSearching: boolean;
    followedName?: string;
    onStopFollowing: () => void;
    onZoom: (factor: number) => void;
    onResetZoom: () => void;
}

export function HUDDesktop({
    onlineCount,
    searchQuery,
    onSearchChange,
    onSearchSubmit,
    searchError,
    isSearching,
    followedName,
    onStopFollowing,
    onZoom,
    onResetZoom
}: HUDDesktopProps) {
    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '60px',
            background: 'rgba(0,0,0,0.8)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', zIndex: 10
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontFamily: 'monospace', color: '#FFF' }}>Avatarium</h1>

                <div style={{ position: 'relative' }}>
                    <input
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
                        placeholder="Buscar @nome"
                        disabled={isSearching}
                        style={{
                            background: '#333', border: '1px solid #555', color: 'white',
                            padding: '6px 12px', borderRadius: '20px', outline: 'none',
                            width: '200px'
                        }}
                    />
                    <button
                        onClick={onSearchSubmit}
                        style={{
                            marginLeft: '-35px', background: 'transparent', border: 'none',
                            color: '#aaa', cursor: 'pointer'
                        }}
                    >
                        {isSearching ? '...' : '🔍'}
                    </button>

                    {searchError && (
                        <div style={{
                            position: 'absolute', top: '40px', left: 0,
                            background: '#E53935', color: 'white', padding: '5px 10px',
                            borderRadius: '4px', fontSize: '12px', whiteSpace: 'nowrap'
                        }}>
                            {searchError}
                        </div>
                    )}
                </div>
            </div>

            {/* Status / Controls */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <span>Online: {onlineCount}</span>

                {followedName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#333', padding: '5px 10px', borderRadius: '4px' }}>
                        <span style={{ color: '#aaa' }}>Seguindo:</span>
                        <span style={{ fontWeight: 'bold', color: '#FFD700' }}>{followedName}</span>
                        <button
                            onClick={onStopFollowing}
                            style={{ background: 'transparent', border: '1px solid #666', color: '#fff', cursor: 'pointer', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >✕</button>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => onZoom(1 / 1.2)} style={btnStyle}>-</button>
                    <button onClick={onResetZoom} style={btnStyle}>1x</button>
                    <button onClick={() => onZoom(1.2)} style={btnStyle}>+</button>
                </div>

                <a href="/admin" style={{ color: '#555', textDecoration: 'none', fontSize: '12px' }}>Admin</a>
            </div>
        </div>
    );
}

const btnStyle = {
    padding: '5px 10px',
    background: '#444',
    border: 'none',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    minWidth: '30px'
};
