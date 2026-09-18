declare const __ENGINE_VERSION__: string;
declare const __ENGINE_REPOSITORY__: string;
declare const __ENGINE_SHA__: string;
declare const __ENGINE_MIGRATIONS__: Record<string, string>;
declare const __ENGINE_BUILD_ID__: string;
export const buildInfo = {
  version: __ENGINE_VERSION__,
  repository: __ENGINE_REPOSITORY__,
  sha: __ENGINE_SHA__,
  migrations: __ENGINE_MIGRATIONS__,
};

export const publicBuildStamp = {
  format: 1,
  id: __ENGINE_BUILD_ID__,
  version: __ENGINE_VERSION__,
  commit: __ENGINE_SHA__ || null,
};
