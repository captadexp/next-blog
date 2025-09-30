/**
 * Type-safe ID branding and automatic hydration system
 * Inspired by earth.com-prod's type system
 */

// Brand type for type-safe IDs
export type Brand<B extends string> = { __brand: B };
export type BrandedId<B extends string> = string & Brand<B>;

// Helper type to extract array element type
export type Unarray<T> = T extends (infer U)[] ? U : T;

// Lookup type in model map
type LookupFor<M extends Record<string, any>, B extends string> =
    B extends keyof M ? M[B] : never;

// Infer hydrated value from branded ID
export type HydratedValue<T, M extends Record<string, any>> =
    NonNullable<Unarray<T>> extends BrandedId<infer B>
        ? T extends any[] ? LookupFor<M, B>[] : LookupFor<M, B>
        : never;

// Handle singular ID fields (userId → user, categoryId → category)
type HydratedSingles<T, M extends Record<string, any>> =
// Required singles
    {
        [K in keyof T as K extends `${infer P}Id`
        ? (undefined extends T[K] ? never : P)
        : never]: HydratedValue<T[K], M>
    } &
    // Optional singles
    {
        [K in keyof T as K extends `${infer P}Id`
        ? (undefined extends T[K] ? P : never)
        : never]?: HydratedValue<T[K], M>
    };

// Pluralization overrides for irregular words
type PluralOverrides = {
    category: "categories";
    media: "media";  // same singular/plural
    // Add more overrides as needed
};

// Pluralize a word following English rules
type Pluralize<S extends string> =
    S extends keyof PluralOverrides ? PluralOverrides[S] :
        // Words ending in 'y' → 'ies'
        S extends `${infer Stem}y` ? `${Stem}ies` :
            // Words ending in 's', 'x', 'z' → add 'es'
            S extends `${string}${'s' | 'x' | 'z'}` ? `${S}es` :
                // Words ending in 'ch', 'sh' → add 'es'
                S extends `${string}${'ch' | 'sh'}` ? `${S}es` :
                    // Default: add 's'
                    `${S}s`;

// Handle plural ID fields (tagIds → tags, mediaIds → media)
type HydratedPlurals<T, M extends Record<string, any>> =
// Required plurals
    {
        [K in keyof T as K extends `${infer P}Ids`
        ? (undefined extends T[K] ? never : Pluralize<P>)
        : never]: HydratedValue<T[K], M>
    } &
    // Optional plurals
    {
        [K in keyof T as K extends `${infer P}Ids`
        ? (undefined extends T[K] ? Pluralize<P> : never)
        : never]?: HydratedValue<T[K], M>
    };

// Omit the ID fields that get replaced with hydrated objects
type OmitHydratedFields<T> = Omit<T,
    | keyof HydratedSingles<T, any>
    | keyof HydratedPlurals<T, any>
>;

// Main hydration type - automatically converts ID fields to populated objects
export type Hydrated<T, M extends Record<string, any>> =
    OmitHydratedFields<T> & HydratedSingles<T, M> & HydratedPlurals<T, M>;

// Helper functions for creating branded IDs
export const createId = {
    blog: (id: string): BrandedId<"Blog"> => id as BrandedId<"Blog">,
    user: (id: string): BrandedId<"User"> => id as BrandedId<"User">,
    category: (id: string): BrandedId<"Category"> => id as BrandedId<"Category">,
    tag: (id: string): BrandedId<"Tag"> => id as BrandedId<"Tag">,
    media: (id: string): BrandedId<"Media"> => id as BrandedId<"Media">,
    comment: (id: string): BrandedId<"Comment"> => id as BrandedId<"Comment">,
    revision: (id: string): BrandedId<"Revision"> => id as BrandedId<"Revision">,
    plugin: (id: string): BrandedId<"Plugin"> => id as BrandedId<"Plugin">,
    pluginHookMapping: (id: string): BrandedId<"PluginHookMapping"> => id as BrandedId<"PluginHookMapping">,
    settingsEntry: (id: string): BrandedId<"SettingsEntry"> => id as BrandedId<"SettingsEntry">,
};

// Type guard to check if a value is a branded ID
export const isBrandedId = <B extends string>(
    value: unknown,
    _brand: B
): value is BrandedId<B> => {
    return typeof value === 'string';
};