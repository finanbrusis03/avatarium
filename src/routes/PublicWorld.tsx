import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom'; import { useGameLoop } from '../engine/GameLoop';
import { type Camera, INITIAL_CAMERA } from '../engine/Camera';
import { isoToScreen, screenToIso } from '../engine/IsoMath';
import { WorldRenderer } from '../world/WorldRenderer';
import { type Creature } from '../world/EntityManager';
import { updateCreatures } from '../world/MovementSystem';
import { AvatarService } from '../services/AvatarService';
import { normalizeHandle } from '../utils/normalizeHandle';
import type { WorldConfig } from '../services/WorldConfigService';
import { WorldConfigService } from '../services/WorldConfigService';
import { chatService } from '../services/ChatService';
import { soundService } from '../services/SoundService';

// UI Components
import { useIsMobile } from '../hooks/useIsMobile';
import { HUDDesktop } from '../ui/HUDDesktop';
import { HUDMobile } from '../ui/HUDMobile';

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3.5;

export function PublicWorld() {
    const [searchParams] = useSearchParams();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<WorldRenderer | null>(null);
    const isMobile = useIsMobile();

    const [camera, setCamera] = useState<Camera>(INITIAL_CAMERA);
    const [creatures, setCreatures] = useState<Creature[]>([]);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchError, setSearchError] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const lastMousePos = useRef<{ x: number, y: number } | null>(null);

    // Touch State (Pinch/Pan)
    const lastTouchDistance = useRef<number | null>(null);
    const touchStartPos = useRef<{ x: number, y: number } | null>(null); // For tap detection

    const timeRef = useRef(0);
    const pollIntervalRef = useRef<number | null>(null);

    // World Config State
    const [worldConfig, setWorldConfig] = useState<WorldConfig>({ width: 20, height: 20, seed: 'default' });
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);

    // Sync Logic
    const syncCreatures = async () => {
        const allAvatars = await AvatarService.getAll();

        // Enforce Rules:
        // 1. Delete 'Visitante' (Phantom avatars)
        // 2. Ensure '@criszimn' exists

        const validAvatars: Creature[] = [];

        for (const av of allAvatars) {
            if (av.name === 'Visitante') {
                // Delete silently
                AvatarService.delete(av.id).catch(console.error);
            } else {
                validAvatars.push(av);
            }
        }

        // Auto-create player if missing (REMOVED)
        // if (!playerExists) {
        //     console.log('Spawning @criszimn...');
        //     const { x, y } = SpawnManager.findValidSpawnPoint(worldConfig);
        //     const newPlayer = await AvatarService.create('criszimn', x, y, 0, 'M');
        //     if (newPlayer) validAvatars.push(newPlayer);
        // }

        setCreatures(prev => {
            const prevMap = new Map(prev.map(c => [c.id, c]));
            return validAvatars.map(next => {
                const existing = prevMap.get(next.id);
                if (existing) {
                    // Pre-existing avatar.
                    // If they are currently moving locally on our screen, do not snap them back yet.
                    // If they are idle, safely sync their position to match the database truth.
                    const isMoving = existing.state === 'MOVING' || (existing.path && existing.path.length > 0);

                    return {
                        ...existing,
                        color: next.color,
                        name: next.name,
                        // Only sync DB coordinates if we aren't interrupting an active local animation
                        x: isMoving ? existing.x : next.x,
                        y: isMoving ? existing.y : next.y,
                        targetX: isMoving ? existing.targetX : undefined,
                        targetY: isMoving ? existing.targetY : undefined
                    };
                }
                // New creature joined (if legitimate)
                return { ...next, targetX: next.x, targetY: next.y };
            });
        });
    };

    // Load Config & Sync Logic
    useEffect(() => {
        // 1. Load Config
        WorldConfigService.getConfig().then(cfg => {
            setWorldConfig(cfg);
            setIsConfigLoaded(true);
            if (rendererRef.current) {
                rendererRef.current.updateConfig(cfg);
            }
        });

        syncCreatures().then(() => {
            // Handle URL Focus
            const focusName = searchParams.get('focus');
            if (focusName) {
                handleSearch(focusName);
            }
        });

        pollIntervalRef.current = window.setInterval(syncCreatures, 5000);

        // 3. Chat Subscription
        const unsubscribe = chatService.onMessage((msg) => {
            setCreatures(prev => {
                return prev.map(c => {
                    if (c.id === msg.avatarId) {
                        return {
                            ...c,
                            currentChat: msg.text,
                            chatExpires: Date.now() + 6000 // 6 seconds duration
                        };
                    }
                    return c;
                });
            });
        });

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            unsubscribe();
        };
    }, []);

    // Game Loop
    useGameLoop((deltaTime) => {
        timeRef.current += deltaTime;
        // Use Config for map size
        const mapSize = Math.max(worldConfig.width, worldConfig.height);

        // Dynamic collision check
        const checkCollision = (x: number, y: number): boolean => {
            if (rendererRef.current) {
                return rendererRef.current.isPositionBlocked(x, y);
            }
            return false;
        };

        setCreatures(prev => updateCreatures(prev, deltaTime, mapSize, checkCollision));

        setCamera(prev => {
            // ... strict camera updates ...
            let newCam = { ...prev };
            if (Math.abs(newCam.targetZoom - newCam.zoom) > 0.001) {
                newCam.zoom += (newCam.targetZoom - newCam.zoom) * 0.1;
            } else {
                newCam.zoom = newCam.targetZoom;
            }

            if (newCam.followTargetId) {
                const target = creatures.find(c => c.id === newCam.followTargetId);
                if (target) {
                    const p = isoToScreen(target.x, target.y);
                    newCam.targetX = p.x;
                    newCam.targetY = p.y - 40;
                }
            }

            if (Math.abs(newCam.targetX - newCam.x) > 0.1 || Math.abs(newCam.targetY - newCam.y) > 0.1) {
                newCam.x += (newCam.targetX - newCam.x) * 0.1;
                newCam.y += (newCam.targetY - newCam.y) * 0.1;
            } else {
                newCam.x = newCam.targetX;
                newCam.y = newCam.targetY;
            }
            return newCam;
        });

        // Render
        if (!isConfigLoaded) return;

        // Only recreate renderer if structural config changed
        if (!rendererRef.current ||
            rendererRef.current.mapWidth !== worldConfig.width ||
            rendererRef.current.mapHeight !== worldConfig.height ||
            rendererRef.current.seed !== worldConfig.seed) {

            console.log('Recreating renderer due to structural config change...');
            if (canvasRef.current) {
                rendererRef.current = new WorldRenderer(
                    canvasRef.current.getContext('2d')!,
                    canvasRef.current.width,
                    canvasRef.current.height,
                    worldConfig
                );
            }
        } else if (rendererRef.current) {
            // Update canvas dimensions in case they changed without map change
            if (canvasRef.current) {
                rendererRef.current.canvasWidth = canvasRef.current.width;
                rendererRef.current.canvasHeight = canvasRef.current.height;
            }
            // If config changed but not structurally, just update the renderer's config
            rendererRef.current.updateConfig(worldConfig);
        }

        if (rendererRef.current) {
            rendererRef.current.clear();

            // Simple Day/Night Cycle
            const timeSec = timeRef.current / 1000;
            // Use absolute time for event logic to stay synced across reloads
            const globalTimeSec = Math.floor(Date.now() / 1000);

            // Event Logic: "Noite"
            // Use config values or defaults
            const interval = worldConfig?.night_interval_seconds || 600;
            const duration = worldConfig?.night_duration_seconds || 120;
            const intensity = worldConfig?.night_intensity ?? 0.2;

            const cycleTime = globalTimeSec % interval;
            const isEventActive = cycleTime < duration;

            let ll = 1.0;

            if (isEventActive) {
                // FORCE NIGHT using config intensity
                ll = Math.min(intensity, 0.4); // Ensures it always triggers darkness mask (limit is 0.65)
            } else {
                // Normal Cycle (slower, ~5 min period)
                // Kept bright to avoid false dark mode
                const dayCycle = Math.sin(timeSec * 0.02);
                const n = (dayCycle + 1) / 2;
                ll = 0.7 + n * 0.3;
            }

            rendererRef.current.drawWorld(camera, creatures, timeRef.current, ll, null, camera.followTargetId);

            // Quick UI Hack: manipulating DOM directly for the banner
            const banner = document.getElementById('event-banner');
            if (banner) {
                if (isEventActive) {
                    banner.style.display = 'block';
                    banner.innerText = `🌙 Noite (${Math.ceil(duration - cycleTime)}s)`;
                } else {
                    banner.style.display = 'none';
                }
            }
        }
    });

    // Handle Resize (DPR Logic could be improved, currently just match window)
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
                if (rendererRef.current && isConfigLoaded) {
                    // Re-init with correct config? Or just update dims?
                    // WorldRenderer doesn't resize automatically.
                    rendererRef.current = new WorldRenderer(
                        canvasRef.current.getContext('2d')!,
                        canvasRef.current.width,
                        canvasRef.current.height,
                        worldConfig
                    );
                }
            }
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize); // Mobile orient
        handleResize();
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, [isConfigLoaded, worldConfig]);


    const applyZoom = (factor: number) => {
        setCamera(prev => ({
            ...prev,
            targetZoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev.targetZoom * factor))
        }));
    };

    const handleSearch = async (query: string) => {
        if (!query) return;
        setIsSearching(true);

        const normalized = normalizeHandle(query);
        let target = creatures.find(c => normalizeHandle(c.name) === normalized);

        if (!target) {
            const dbCreature = await AvatarService.getByName(normalized);
            if (dbCreature) {
                setCamera(prev => ({ ...prev, followTargetId: dbCreature.id }));
                setSearchError(null);
                setSearchQuery('');
                if (!creatures.find(c => c.id === dbCreature.id)) {
                    setCreatures(prev => [...prev, dbCreature]);
                }
            } else {
                setSearchError('Avatar não encontrado');
                setTimeout(() => setSearchError(null), 3000);
            }
        } else {
            setCamera(prev => ({ ...prev, followTargetId: target.id }));
            setSearchError(null);
            setSearchQuery('');
        }
        setIsSearching(false);
    };
    // --- Input Handlers (Mouse) ---
    const handleWheel = (e: React.WheelEvent) => {
        applyZoom(e.deltaY > 0 ? 0.9 : 1.1);
    };


    // --- Input Handlers (Touch) ---
    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault(); // Prevent scrolling
        if (e.touches.length === 1) {
            // Pan Start or Tap Start
            const t = e.touches[0];
            lastMousePos.current = { x: t.clientX, y: t.clientY };
            touchStartPos.current = { x: t.clientX, y: t.clientY };
            setIsDragging(true);
            setCamera(prev => ({ ...prev, followTargetId: null }));
        } else if (e.touches.length === 2) {
            // Pinch Start
            const d = getTouchDistance(e.touches);
            lastTouchDistance.current = d;
            setIsDragging(false);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging && lastMousePos.current) {
            // Pan
            const t = e.touches[0];
            const dx = t.clientX - lastMousePos.current.x;
            const dy = t.clientY - lastMousePos.current.y;
            applyPan(dx, dy);
            lastMousePos.current = { x: t.clientX, y: t.clientY };
        } else if (e.touches.length === 2) {
            // Pinch Zoom
            const d = getTouchDistance(e.touches);
            if (lastTouchDistance.current) {
                const delta = d / lastTouchDistance.current;
                // Sensible zoom speed
                // Alternatively, stick to delta directly but damp it
                // Let's rely on simple factor for now:
                if (Math.abs(1 - delta) > 0.005) {
                    applyZoom(delta);
                }
            }
            lastTouchDistance.current = d;
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.preventDefault();
        // Check for Tap (if movement was minimal)
        if (e.touches.length === 0 && touchStartPos.current && lastMousePos.current) {
            const dist = Math.hypot(
                lastMousePos.current.x - touchStartPos.current.x,
                lastMousePos.current.y - touchStartPos.current.y
            );

            if (dist < 10) {
                // It was a tap!
                const rect = canvasRef.current!.getBoundingClientRect();
                handleTapOrClick(lastMousePos.current.x - rect.left, lastMousePos.current.y - rect.top);
            }
        }

        setIsDragging(false);
        lastMousePos.current = null;
        lastTouchDistance.current = null;
        touchStartPos.current = null;
    };


    // --- Shared Logic ---
    const applyPan = (dx: number, dy: number) => {
        setCamera(prev => ({
            ...prev,
            targetX: prev.targetX - dx / prev.zoom,
            targetY: prev.targetY - dy / prev.zoom,
            x: prev.x - dx / prev.zoom,
            y: prev.y - dy / prev.zoom
        }));
    };

    const getTouchDistance = (touches: React.TouchList) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
    };

    const handleTapOrClick = (screenX: number, screenY: number) => {
        const cx = canvasRef.current!.width / 2;
        const cy = canvasRef.current!.height / 2;
        const worldX = (screenX - cx) / camera.zoom + camera.x;
        const worldY = (screenY - cy) / camera.zoom + camera.y;

        // 1. Check for Entity Hit (Selection)
        const sorted = [...creatures].sort((a, b) => (b.x + b.y) - (a.x + a.y));
        let hitId: string | null = null;

        for (const c of sorted) {
            const p = isoToScreen(c.x, c.y);
            const dx = worldX - p.x;
            const dy = worldY - p.y;
            // Hitbox
            if (dx >= -20 && dx <= 20 && dy >= -60 && dy <= 10) {
                hitId = c.id;
                break;
            }
        }

        if (hitId) {
            setCamera(prev => ({ ...prev, followTargetId: hitId }));
        } else {
            // 2. Check for Prop Hit (e.g. TOWEL)
            const iso = screenToIso(worldX, worldY);
            const gx = Math.round(iso.x);
            const gy = Math.round(iso.y);

            if (rendererRef.current) {
                const prop = rendererRef.current.terrainInstance.getPropAt(gx, gy);
                if (prop && prop.type === 'TOWEL') {
                    // Start sitting process
                    setCreatures(prev => {
                        return prev.map(c => {
                            if (normalizeHandle(c.name) === 'criszimn') {
                                // Player moves to towel and then sits
                                // For now, let's just snap and sit for simplicity as requested
                                return {
                                    ...c,
                                    x: gx,
                                    y: gy,
                                    targetX: undefined,
                                    targetY: undefined,
                                    state: 'SITTING'
                                };
                            }
                            return c;
                        });
                    });
                    soundService.playSit();
                    return; // Done
                }
            }

            // Normal movement or stand up
            soundService.playClick();
            setCreatures(prev => {
                return prev.map(c => {
                    if (normalizeHandle(c.name) === 'criszimn' && c.state === 'SITTING') {
                        return { ...c, state: 'IDLE' };
                    }
                    return c;
                });
            });

            setCamera(prev => ({ ...prev, followTargetId: null }));
        }
    };

    // Explicit mouse down wrapper for desktop specificity if needed
    // For touch, we wait for move to drag.

    const followedName = creatures.find(c => c.id === camera.followTargetId)?.name;

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#1a1a1a' }}>

            {isMobile ? (
                <HUDMobile
                    onlineCount={creatures.length}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onSearchSubmit={() => handleSearch(searchQuery)}
                    searchError={searchError}
                    isSearching={isSearching}
                    followedName={followedName}
                    onStopFollowing={() => setCamera(prev => ({ ...prev, followTargetId: null }))}
                    onZoom={applyZoom}
                    onResetZoom={() => setCamera(prev => ({ ...prev, targetZoom: 1 }))}
                    onRecententer={() => setCamera(prev => ({ ...prev, targetX: 0, targetY: 0, followTargetId: null }))}
                />
            ) : (
                <HUDDesktop
                    onlineCount={creatures.length}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onSearchSubmit={() => handleSearch(searchQuery)}
                    searchError={searchError}
                    isSearching={isSearching}
                    followedName={followedName}
                    onStopFollowing={() => setCamera(prev => ({ ...prev, followTargetId: null }))}
                    onZoom={applyZoom}
                    onResetZoom={() => setCamera(prev => ({ ...prev, targetZoom: 1 }))}
                />
            )}

            {/* Event Banner (Managed by Game Loop for performance) */}
            <div
                id="event-banner"
                style={{
                    position: 'absolute',
                    top: '80px', // Below HUD
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(90deg, #ff9800, #ff5722)',
                    color: 'white',
                    padding: '8px 24px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    boxShadow: '0 0 15px #ff5722',
                    zIndex: 10,
                    display: 'none', // Default hidden
                    pointerEvents: 'none'
                }}
            >
                ✨ Evento Ativo ✨
            </div>

            <canvas
                ref={canvasRef}
                // Mouse Events
                // Mouse Events
                onWheel={handleWheel}
                onMouseDown={(e) => {
                    lastMousePos.current = { x: e.clientX, y: e.clientY };
                    setIsDragging(false); // Reset
                }}
                onMouseMove={(e) => {
                    if (lastMousePos.current) {
                        const dist = Math.hypot(e.clientX - lastMousePos.current.x, e.clientY - lastMousePos.current.y);
                        if (dist > 5) {
                            setIsDragging(true);
                            setCamera(prev => ({ ...prev, followTargetId: null }));
                        }

                        if (isDragging) {
                            const dx = e.clientX - lastMousePos.current.x;
                            const dy = e.clientY - lastMousePos.current.y;
                            applyPan(dx, dy);
                            lastMousePos.current = { x: e.clientX, y: e.clientY };
                        }
                    }
                }}
                onMouseUp={(e) => {
                    if (!isDragging && lastMousePos.current) {
                        // It was a click!
                        const rect = canvasRef.current!.getBoundingClientRect();
                        handleTapOrClick(e.clientX - rect.left, e.clientY - rect.top);
                    }
                    setIsDragging(false);
                    lastMousePos.current = null;
                }}
                onMouseLeave={() => { setIsDragging(false); lastMousePos.current = null; }}

                // Touch Events
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}

                style={{
                    display: 'block',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    touchAction: 'none' // Critical for blocking scroll
                }}
            />
        </div>
    );
}
