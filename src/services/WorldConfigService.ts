import { supabase } from '../lib/supabase';

export interface WorldConfig {
    width: number;
    height: number;
    seed: string;
    night_interval_seconds?: number;
    night_duration_seconds?: number;
    night_intensity?: number;
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
            seed: data.seed,
            night_interval_seconds: data.night_interval_seconds,
            night_duration_seconds: data.night_duration_seconds,
            night_intensity: data.night_intensity
        };
    },

    async updateConfig(config: WorldConfig): Promise<boolean> {
        const { error } = await supabase
            .from('world_config')
            .upsert({
                id: 1,
                width: config.width,
                height: config.height,
                seed: config.seed,
                night_interval_seconds: config.night_interval_seconds,
                night_duration_seconds: config.night_duration_seconds,
                night_intensity: config.night_intensity
            });

        if (error) {
            console.error('Error updating world config:', error);
            return false;
        }
        return true;
    }
};
