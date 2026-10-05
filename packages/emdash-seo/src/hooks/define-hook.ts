export function defineHook<T>(
  handler: T,
  overrides: Partial<{
    priority: number;
    timeout: number;
    dependencies: string[];
    errorPolicy: 'continue' | 'abort';
    exclusive: boolean;
  }> = {}
) {
  return {
    priority: overrides.priority ?? 100,
    timeout: overrides.timeout ?? 5000,
    dependencies: overrides.dependencies ?? [],
    errorPolicy: overrides.errorPolicy ?? ('abort' as const),
    exclusive: overrides.exclusive ?? false,
    pluginId: 'emdash-seo',
    handler,
  };
}
