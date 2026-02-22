import { useState } from 'react';

interface HUDMobileProps {
    onlineCount: number;
    followedName?: string;
    onStopFollowing: () => void;
    onZoom: (factor: number) => void;
    onResetZoom: () => void;
    onRecententer: () => void; // Reset camera position
}

export function HUDMobile({
    onlineCount,
    followedName,
    onStopFollowing,
    onZoom,
    onResetZoom,
    onRecententer
}: HUDMobileProps) {
    const [isOpen, setIsOpen] = useState(false);


    return (
        <>
            {/* Top Bar (Compact) */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '50px',
                background: 'rgba(0,0,0,0.85)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 15px', zIndex: 10,
                boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
            }}>
                <h1 style={{ margin: 0, fontSize: '18px', fontFamily: 'monospace', color: '#FFF' }}>Avatarium</h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>Online: {onlineCount}</span>
                    <button
                        onClick={() => setIsOpen(true)}
                        style={{
                            background: '#333', border: '1px solid #555', color: 'white',
                            width: '32px', height: '32px', borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '18px'
                        }}
                    >
                        ☰
                    </button>
                </div>
            </div>

            {/* Bottom Sheet / Modal */}
            {isOpen && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 20, pointerEvents: 'none' // Allow seeing through to canvas logic? No, modal blocks.
                }}>
                    {/* Backdrop */}
                    <div
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', pointerEvents: 'auto' }}
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Drawer Content */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: '#222',
                        borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
                        padding: '20px', pointerEvents: 'auto',
                        display: 'flex', flexDirection: 'column', gap: '20px',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <div style={{ width: '40px', height: '4px', background: '#444', borderRadius: '2px', margin: '0 auto' }} />





                        {/* Follow Status */}
                        {followedName && (
                            <div style={{
                                background: '#333', padding: '10px', borderRadius: '10px',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <span style={{ color: '#aaa' }}>Seguindo: <b style={{ color: 'white' }}>{followedName}</b></span>
                                <button
                                    onClick={onStopFollowing}
                                    style={{ background: '#555', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '5px' }}
                                >
                                    Parar
                                </button>
                            </div>
                        )}

                        {/* Camera Controls */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            <button onClick={() => onZoom(1 / 1.2)} style={bigBtnStyle}>- Zoom</button>
                            <button onClick={onResetZoom} style={bigBtnStyle}>1x</button>
                            <button onClick={() => onZoom(1.2)} style={bigBtnStyle}>+ Zoom</button>
                        </div>

                        <button onClick={onRecententer} style={{ ...bigBtnStyle, background: '#444' }}>
                            Recentralizar Câmera
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                            <a href="/admin" style={{ color: '#666', textDecoration: 'none' }}>Admin Panel</a>
                            <span style={{ color: '#444' }}>v1.0.0</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

const bigBtnStyle = {
    padding: '15px',
    background: '#333',
    border: '1px solid #444',
    color: 'white',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
};
