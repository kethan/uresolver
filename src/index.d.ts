export type PropertyResolver<T, V, C> = (
  value: V | undefined,
  obj: T,
  context: C
) => Promise<V | undefined>;

export type VirtualResolver<T, V, C> = (
  obj: T,
  context: C
) => Promise<V | undefined>;

export type ResolverConverter<T, C> = (
  obj: T,
  context: C
) => Promise<T | undefined>;

export function virtual<T, V, C>(
  resolver: VirtualResolver<T, V, C>
): PropertyResolver<T, V, C>;

export type PropertyResolverMap<T, C> = {
  [key in keyof T]?:
  | PropertyResolver<T, T[key], C>
  | ReturnType<typeof virtual<T, T[key], C>>;
};

export interface ResolverOptions<T, C> {
  converter?: ResolverConverter<T, C>;
}

export interface Resolver<T, C> {
  resolve: (obj: T, context: C) => Promise<T>;
}

export function resolve<T, C>(
  properties: PropertyResolverMap<T, C>,
  options?: ResolverOptions<T, C>
): Resolver<T, C>;