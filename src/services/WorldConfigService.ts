import { supabase } from '../lib/supabase';

export interface WorldConfig {
    width: number;
    height: number;
    seed: string;
}

export const WorldConfigService = {
    async getConfig(): Promise<WorldConfig> {
        const { data, error } = await supabase
            .from('world_config')
            .select('*')
            .eq('id', 1)
            .single();

        if (error || !data) {
            console.warn('Config not found, using default');
            return { width: 40, height: 40, seed: 'default' };
        }

        return {
            width: data.width,
            height: data.height,
            seed: data.seed
        };
    },

    async updateConfig(width: number, height: number, seed: string): Promise<boolean> {
        const { error } = await supabase
            .from('world_config')
            .upsert({ id: 1, width, height, seed });

        if (error) {
            console.error('Error updating world config:', error);
            return false;
        }
        return true;
    }
};
