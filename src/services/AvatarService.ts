import { supabase } from '../lib/supabase';
import { type Creature, createCreature, hydrateCreature } from '../world/EntityManager';
import { normalizeHandle } from '../utils/normalizeHandle';
import { WorldConfigService } from './WorldConfigService';
import { stringToHash, generateUUID } from '../engine/Utils';
import { SpawnManager } from '../world/SpawnManager';

export const AvatarService = {
    async getAll(): Promise<Creature[]> {
        const { data, error } = await supabase
            .from('creatures')
            .select('*');

        if (error) {
            console.error('Error fetching creatures:', error);
            return [];
        }
        return data.map((c: any) => hydrateCreature(c));
    },

    async getByName(handle: string): Promise<Creature | null> {
        const normalized = normalizeHandle(handle);
        // Case-insensitive search
        const { data, error } = await supabase
            .from('creatures')
            .select('*')
            .ilike('name', normalized)
            .maybeSingle();

        if (error) {
            console.error('Error fetching creature by name:', error);
            return null;
        }
        return data ? hydrateCreature(data) : null;
    },

    async create(name: string, x: number, y: number, variant: number, gender: 'M' | 'F' = 'M'): Promise<Creature | null> {
        const normalizedName = normalizeHandle(name);

        // Check for duplicates
        const existing = await this.getByName(normalizedName);
        if (existing) {
            console.warn(`Creature ${normalizedName} already exists. Skipping creation.`);
            return null; // or perhaps throw an error if you want to explicitly handle it in the UI
        }

        const roundedX = Math.round(x);
        const roundedY = Math.round(y);
        const newCreature = createCreature(normalizedName, roundedX, roundedY, variant, gender);

        // Fetch world config to decide seed logic
        const config = await WorldConfigService.getConfig();
        let variantSeed = '';

        if (config.visual_random_enabled !== false) {
            // v0.10: Generate random variant seed for visual uniqueness
            variantSeed = generateUUID().substring(0, 8);
        } else {
            // v0.14: Deterministic visual based on name hash
            variantSeed = stringToHash(normalizedName).toString();
        }

        const { error } = await supabase.from('creatures').insert({
            id: newCreature.id,
            name: newCreature.name,
            x: newCreature.x,
            y: newCreature.y,
            color: newCreature.color, // Save the HSL string
            variant_seed: variantSeed,
            gender: gender
        });

        if (error) {
            console.error('Error creating creature:', error);
            return null;
        }

        // Return with seed so local state is correct
        return { ...newCreature, variantSeed };
    },

    async createMany(creaturesData: { name: string, gender?: 'M' | 'F' }[]): Promise<Creature[]> {
        const config = await WorldConfigService.getConfig();
        const results: Creature[] = [];
        const inserts: any[] = [];

        // 1. Fetch all existing names to prevent duplicates
        const existingCreatures = await this.getAll();
        const existingNames = new Set(existingCreatures.map(c => c.name.toLowerCase()));

        // 2. Keep track of what we're inserting *now* to prevent duplicates inside the batch itself
        const inBatchNames = new Set<string>();

        for (const data of creaturesData) {
            const normalizedName = normalizeHandle(data.name);

            // Skip if it already exists in the database OR if we already added it to the batch
            if (existingNames.has(normalizedName.toLowerCase()) || inBatchNames.has(normalizedName.toLowerCase())) {
                continue;
            }

            inBatchNames.add(normalizedName.toLowerCase());

            const { x, y } = SpawnManager.findValidSpawnPoint(config); // Need to import SpawnManager if not already
            const roundedX = Math.round(x);
            const roundedY = Math.round(y);
            const gender = data.gender || 'M';

            const newCreature = createCreature(normalizedName, roundedX, roundedY, 0, gender);

            let variantSeed = '';
            if (config.visual_random_enabled !== false) {
                variantSeed = generateUUID().substring(0, 8);
            } else {
                variantSeed = stringToHash(normalizedName).toString();
            }

            inserts.push({
                id: newCreature.id,
                name: newCreature.name,
                x: newCreature.x,
                y: newCreature.y,
                color: newCreature.color,
                variant_seed: variantSeed,
                gender: gender
            });

            results.push({ ...newCreature, variantSeed });
        }

        if (inserts.length === 0) {
            console.log('No new unique creatures to insert.');
            return []; // All were duplicates
        }

        const { error } = await supabase.from('creatures').insert(inserts);

        if (error) {
            console.error('Error creating creatures in bulk:', error);
            return [];
        }

        return results;
    },

    async updatePosition(id: string, x: number, y: number): Promise<boolean> {
        const roundedX = Math.round(x);
        const roundedY = Math.round(y);

        const { error } = await supabase
            .from('creatures')
            .update({ x: roundedX, y: roundedY })
            .eq('id', id);

        if (error) {
            console.error('Error updating creature position:', error);
            return false;
        }

        return true;
    },

    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('creatures').delete().eq('id', id);
        if (error) {
            console.error('Error deleting creature:', error);
            return false;
        }
        return true;
    },

    async deleteAll(): Promise<boolean> {
        const { error } = await supabase.from('creatures').delete().not('id', 'is', null);
        if (error) {
            console.error('Error deleting all creatures:', error);
            return false;
        }
        return true;
    },

    async updateGender(id: string, gender: 'M' | 'F'): Promise<boolean> {
        const { error } = await supabase.from('creatures').update({ gender }).eq('id', id);
        if (error) {
            console.error('Error updating gender:', error);
            return false;
        }
        return true;
    }
};
