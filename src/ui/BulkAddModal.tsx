import React, { useState, useRef } from 'react';
import { CSVParser } from '../utils/CSVParser';

interface BulkAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (avatars: { name: string, gender: 'M' | 'F' }[]) => Promise<void>;
}

export function BulkAddModal({ isOpen, onClose, onImport }: BulkAddModalProps) {
    const [namesText, setNamesText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleBulkAdd = async () => {
        if (!namesText.trim()) return;

        setIsProcessing(true);
        const names = namesText.split(/[\r\n,]+/)
            .map(n => n.trim())
            .filter(n => n.length > 0)
            .map(name => ({ name, gender: 'M' as const }));

        await onImport(names);
        setIsProcessing(false);
        setNamesText('');
        onClose();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvData = event.target?.result as string;
            const parsed = CSVParser.parse(csvData);
            if (parsed.length > 0) {
                await onImport(parsed);
            }
            setIsProcessing(false);
            onClose();
        };
        reader.readAsText(file);
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <div style={headerStyle}>
                    <h2 style={{ margin: 0, fontSize: '18px' }}>Adicionar em Lote</h2>
                    <button onClick={onClose} style={closeBtnStyle}>✕</button>
                </div>

                <div style={bodyStyle}>
                    <p style={labelStyle}>Cole uma lista de nomes (um por linha ou separados por vírgula):</p>
                    <textarea
                        value={namesText}
                        onChange={(e) => setNamesText(e.target.value)}
                        placeholder="@usuario1\n@usuario2\n@usuario3"
                        style={textareaStyle}
                    />

                    <div style={{ margin: '20px 0', borderTop: '1px solid #444', paddingTop: '20px' }}>
                        <p style={labelStyle}>Ou importe um arquivo CSV:</p>
                        <input
                            type="file"
                            accept=".csv,.txt"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={secondaryBtnStyle}
                            disabled={isProcessing}
                        >
                            📁 Selecionar Arquivo CSV
                        </button>
                    </div>
                </div>

                <div style={footerStyle}>
                    <button onClick={onClose} style={cancelBtnStyle} disabled={isProcessing}>Cancelar</button>
                    <button
                        onClick={handleBulkAdd}
                        style={primaryBtnStyle}
                        disabled={isProcessing || !namesText.trim()}
                    >
                        {isProcessing ? 'Processando...' : 'Adicionar Avatares'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000, color: 'white'
};

const modalStyle: React.CSSProperties = {
    background: '#222', width: '90%', maxWidth: '500px',
    borderRadius: '12px', overflow: 'hidden', border: '1px solid #444',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
};

const headerStyle: React.CSSProperties = {
    padding: '15px 20px', borderBottom: '1px solid #333',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#2a2a2a'
};

const closeBtnStyle: React.CSSProperties = {
    background: 'transparent', border: 'none', color: '#aaa',
    fontSize: '20px', cursor: 'pointer'
};

const bodyStyle: React.CSSProperties = { padding: '20px' };

const labelStyle: React.CSSProperties = { margin: '0 0 10px 0', fontSize: '14px', color: '#ccc' };

const textareaStyle: React.CSSProperties = {
    width: '100%', height: '120px', background: '#333', border: '1px solid #444',
    color: 'white', padding: '10px', borderRadius: '8px', outline: 'none',
    resize: 'none', boxSizing: 'border-box'
};

const footerStyle: React.CSSProperties = {
    padding: '15px 20px', background: '#2a2a2a', borderTop: '1px solid #333',
    display: 'flex', justifyContent: 'flex-end', gap: '10px'
};

const btnBase: React.CSSProperties = {
    padding: '8px 16px', borderRadius: '6px', cursor: 'pointer',
    border: 'none', fontWeight: 'bold'
};

const primaryBtnStyle: React.CSSProperties = {
    ...btnBase, background: '#4CAF50', color: 'white'
};

const secondaryBtnStyle: React.CSSProperties = {
    ...btnBase, background: '#444', color: 'white', width: '100%'
};

const cancelBtnStyle: React.CSSProperties = {
    ...btnBase, background: 'transparent', color: '#aaa', border: '1px solid #444'
};
