import { supabase } from '../lib/supabase';
import { type Creature, createCreature, hydrateCreature } from '../world/EntityManager';
import { normalizeHandle } from '../utils/normalizeHandle';

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

    async create(name: string, x: number, y: number, variant: number): Promise<Creature | null> {
        const newCreature = createCreature(name, x, y, variant);

        // v0.10: Generate random variant seed for visual uniqueness
        // Using crypto.randomUUID or Math.random
        const variantSeed = Math.random().toString(36).substring(7);

        const { error } = await supabase.from('creatures').insert({
            id: newCreature.id,
            name: newCreature.name,
            x: newCreature.x,
            y: newCreature.y,
            color: newCreature.seed.toString(),
            variant_seed: variantSeed // New column
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
