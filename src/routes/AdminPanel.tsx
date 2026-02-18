import React, { useState, useEffect } from 'react';
import { type Creature } from '../world/EntityManager';
import { AvatarService } from '../services/AvatarService';
import { useNavigate } from 'react-router-dom';
import { WorldConfigService, type WorldConfig } from '../services/WorldConfigService';
import { generateUUID } from '../engine/Utils';

export function AdminPanel() {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');

    const [creatures, setCreatures] = useState<Creature[]>([]);
    const [newName, setNewName] = useState('');
    const [variant, setVariant] = useState(0);

    // World Config State
    const [config, setConfig] = useState<WorldConfig>({ width: 20, height: 20, seed: 'default' });
    const [pendingConfig, setPendingConfig] = useState<WorldConfig>({ width: 20, height: 20, seed: 'default' });

    // Initial auth check
    useEffect(() => {
        const cached = localStorage.getItem('avatarium_admin');
        if (cached === 'true') setIsAuthenticated(true);
    }, []);

    // Load data
    useEffect(() => {
        if (isAuthenticated) {
            loadData();
        }
    }, [isAuthenticated]);

    const loadData = async () => {
        const data = await AvatarService.getAll();
        setCreatures(data);

        const cfg = await WorldConfigService.getConfig();
        setConfig(cfg);
        setPendingConfig(cfg);
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const envPass = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
        if (password === envPass) {
            setIsAuthenticated(true);
            localStorage.setItem('avatarium_admin', 'true');
        } else {
            alert('Acesso Negado');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('avatarium_admin');
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;

        const x = Math.floor(Math.random() * config.width); // Use dynamic world size
        const y = Math.floor(Math.random() * config.height);

        await AvatarService.create(newName, x, y, variant);
        setNewName('');
        loadData();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir permanentemente?')) {
            await AvatarService.delete(id);
            loadData();
        }
    };

    const handleApplyConfig = async () => {
        if (confirm(`Alterar tamanho do mundo para ${pendingConfig.width}x${pendingConfig.height}? Isso pode afetar avatares fora do limite.`)) {
            await WorldConfigService.updateConfig(pendingConfig.width, pendingConfig.height, pendingConfig.seed);
            loadData();
            alert('Configuração salva!');
        }
    };

    const handleRegenerateSeed = async () => {
        const newSeed = generateUUID().substring(0, 8);
        setPendingConfig(prev => ({ ...prev, seed: newSeed }));
    };

    const handleFocus = (name: string) => {
        navigate(`/?focus=${name}`);
    };

    if (!isAuthenticated) {
        // ... (Login Form unchanged) ...
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#111', color: 'white' }}>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px', background: '#222', borderRadius: '8px', minWidth: '300px' }}>
                    <h2 style={{ textAlign: 'center', margin: '0 0 20px 0' }}>Avatarium Admin</h2>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Senha de Acesso"
                        style={{ padding: '10px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: 'white' }}
                    />
                    <button type="submit" style={{ padding: '10px', cursor: 'pointer', background: '#4CAF50', border: 'none', color: 'white', borderRadius: '4px' }}>Entrar</button>
                    <a href="/" style={{ textAlign: 'center', color: '#666', fontSize: '12px', marginTop: '10px' }}>Voltar ao Mundo Público</a>
                </form>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', background: '#111', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h1 style={{ margin: 0 }}>Painel de Controle</h1>
                    <span style={{ fontSize: '12px', background: '#333', padding: '2px 6px', borderRadius: '4px' }}>v0.13</span>
                </div>
                <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <button onClick={loadData} style={{ cursor: 'pointer', background: 'transparent', border: '1px solid #555', color: '#aaa', padding: '5px 10px', borderRadius: '4px' }}>↻ Atualizar</button>
                    <a href="/" target="_blank" style={{ color: '#4CAF50', textDecoration: 'none' }}>Abrir Mundo ↗</a>
                    <button onClick={handleLogout} style={{ cursor: 'pointer', background: '#E53935', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px' }}>Sair</button>
                </nav>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '40px' }}>

                {/* World Configuration */}
                <div style={{ flex: 1, minWidth: '300px', background: '#1E1E1E', padding: '20px', borderRadius: '8px', height: 'fit-content', border: '1px solid #333' }}>
                    <h3 style={{ marginTop: 0 }}>🌍 Configuração do Mundo</h3>

                    <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>Largura (Tiles)</label>
                            <input
                                type="number"
                                value={pendingConfig.width}
                                onChange={e => setPendingConfig(prev => ({ ...prev, width: Number(e.target.value) }))}
                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: 'white' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>Altura (Tiles)</label>
                            <input
                                type="number"
                                value={pendingConfig.height}
                                onChange={e => setPendingConfig(prev => ({ ...prev, height: Number(e.target.value) }))}
                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: 'white' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>Seed (Gerador de Terreno)</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                value={pendingConfig.seed}
                                onChange={e => setPendingConfig(prev => ({ ...prev, seed: e.target.value }))}
                                style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: 'white', fontFamily: 'monospace' }}
                            />
                            <button onClick={handleRegenerateSeed} style={{ cursor: 'pointer', background: '#2196F3', border: 'none', color: 'white', padding: '0 15px', borderRadius: '4px' }} title="Gerar Nova Seed">🎲</button>
                        </div>
                    </div>

                    <button
                        onClick={handleApplyConfig}
                        style={{ width: '100%', padding: '12px', background: '#FF9800', border: 'none', color: 'black', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
                    >
                        Salvar e Regenerar Mundo
                    </button>

                    <p style={{ fontSize: '11px', color: '#666', marginTop: '10px' }}>
                        * Alterar o tamanho ou seed recriará o terreno. Avatares existentes serão mantidos, mas podem ficar fora do mapa se o tamanho for reduzido.
                    </p>
                </div>

                {/* Create Form */}
                <div style={{ flex: 1, minWidth: '300px', background: '#222', padding: '20px', borderRadius: '8px', height: 'fit-content' }}>
                    <h3 style={{ marginTop: 0 }}>👤 Novo Avatar</h3>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input
                            value={newName} onChange={e => setNewName(e.target.value)}
                            placeholder="Nome (ex: Gandalf)"
                            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: 'white' }}
                        />
                        <label style={{ fontSize: '12px', color: '#aaa' }}>Variante (Visual):</label>
                        <input
                            type="number" value={variant} onChange={e => setVariant(Number(e.target.value))}
                            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: 'white' }}
                        />
                        <button type="submit" style={{ padding: '10px', background: '#4CAF50', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>
                            Criar Avatar
                        </button>
                    </form>
                </div>

                {/* List */}
                <div style={{ flex: 2, minWidth: '400px' }}>
                    <h3 style={{ marginTop: 0 }}>População ({creatures.length})</h3>
                    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #333' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#222' }}>
                            <thead>
                                <tr style={{ background: '#333', textAlign: 'left' }}>
                                    <th style={{ padding: '12px', borderBottom: '1px solid #444' }}>Nome</th>
                                    <th style={{ padding: '12px', borderBottom: '1px solid #444' }}>Posição</th>
                                    <th style={{ padding: '12px', borderBottom: '1px solid #444' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {creatures.map(c => (
                                    <tr key={c.id} style={{ borderBottom: '1px solid #333' }}>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ fontWeight: 'bold' }}>{c.name}</div>
                                            <div style={{ fontSize: '10px', color: '#666' }}>{c.id}</div>
                                        </td>
                                        <td style={{ padding: '12px' }}>{Math.round(c.x)}, {Math.round(c.y)}</td>
                                        <td style={{ padding: '12px', display: 'flex', gap: '10px' }}>
                                            <button onClick={() => handleFocus(c.name)} style={{ cursor: 'pointer', padding: '5px 10px', borderRadius: '4px', border: '1px solid #555', background: 'transparent', color: 'white' }}>Ver</button>
                                            <button onClick={() => handleDelete(c.id)} style={{ cursor: 'pointer', padding: '5px 10px', borderRadius: '4px', border: 'none', background: '#E53935', color: 'white' }}>Excluir</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
