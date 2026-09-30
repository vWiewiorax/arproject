/** The asset itself is unusable (bad host, too big, corrupt). Retrying won't help. */
export class PermanentAssetError extends Error {}

/** The asset host isn't allowlisted. Usually a config problem (ENGINE_ASSET_HOSTS), not a bad asset. */
export class HostNotAllowedError extends PermanentAssetError {}
