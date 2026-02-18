import { AvatarService } from '../services/AvatarService';

export async function cleanupAvatars() {
    console.log('Fetching avatars...');
    const avatars = await AvatarService.getAll();
    const keep = '@criszimn';

    for (const avatar of avatars) {
        if (avatar.name.toLowerCase() !== keep.toLowerCase()) {
            console.log(`Deleting ${avatar.name}...`);
            await AvatarService.delete(avatar.id);
        }
    }
    console.log('Cleanup complete.');
}
