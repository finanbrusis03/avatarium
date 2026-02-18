import { supabase } from '../lib/supabase';
import { type Creature, createCreature, hydrateCreature } from '../world/EntityManager';
import { normalizeHandle } from '../utils/normalizeHandle';
import { WorldConfigService } from './WorldConfigService';
import { stringToHash, generateUUID } from '../engine/Utils';

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

    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('creatures').delete().eq('id', id);
        if (error) {
            console.error('Error deleting creature:', error);
            return false;
        }
        return true;
    }
};
