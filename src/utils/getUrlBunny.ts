import config from '../config';
import { encryptUrl } from './cryptoToken';
export const getBunnyUrl = async (fileKey: string) => {
     const url = `${config.bunnyCDN.pullZoneUrl}/${fileKey}`;
     return url;
};
export const getBunnyEncryptUrl = async (fileKey: string) => {
     const url = `${config.bunnyCDN.pullZoneUrl}/${fileKey}`;
     const en = encryptUrl(url, config.bunnyCDN.bunny_token as string);
     return en;
};
