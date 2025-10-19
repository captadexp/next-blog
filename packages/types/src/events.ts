/**
 * Event system types for configuration callbacks
 */

import type {
    Blog,
    Category,
    Comment,
    Media,
    Plugin,
    PluginHookMapping,
    Revision,
    SettingsEntry,
    Tag,
    User
} from './database/entities';

// Event payload types with discriminated unions
export type EventPayload =
    | { event: "createBlog"; payload: Blog }
    | { event: "updateBlog"; payload: Blog }
    | { event: "deleteBlog"; payload: Blog }

    | { event: "createTag"; payload: Tag }
    | { event: "updateTag"; payload: Tag }
    | { event: "deleteTag"; payload: Tag }

    | { event: "createCategory"; payload: Category }
    | { event: "updateCategory"; payload: Category }
    | { event: "deleteCategory"; payload: Category }

    | { event: "createUser"; payload: User }
    | { event: "updateUser"; payload: User }
    | { event: "deleteUser"; payload: User }

    | { event: "createSettingsEntry"; payload: SettingsEntry }
    | { event: "updateSettingsEntry"; payload: SettingsEntry }
    | { event: "deleteSettingsEntry"; payload: SettingsEntry }

    | { event: "createPlugin"; payload: Plugin }
    | { event: "updatePlugin"; payload: Plugin }
    | { event: "deletePlugin"; payload: { _id: Plugin["_id"] } }

    | { event: "createPluginHookMapping"; payload: PluginHookMapping }
    | { event: "updatePluginHookMapping"; payload: PluginHookMapping }
    | { event: "deletePluginHookMapping"; payload: PluginHookMapping }

    | { event: "createComment"; payload: Comment }
    | { event: "updateComment"; payload: Comment }
    | { event: "deleteComment"; payload: Comment }

    | { event: "createRevision"; payload: Revision }
    | { event: "updateRevision"; payload: Revision }
    | { event: "deleteRevision"; payload: Revision }

    | { event: "createMedia"; payload: Media }
    | { event: "updateMedia"; payload: Media }
    | { event: "deleteMedia"; payload: Media };

// Configuration callbacks interface
export interface ConfigurationCallbacks {
    on?<E extends EventPayload>(
        event: E['event'],
        payload: E['payload'] | null
    ): void;
}