import {promises as fs} from "fs";
import {
    Blog,
    BlogData,
    Category,
    CategoryData,
    Comment,
    CommentData,
    createId,
    DatabaseAdapter,
    Filter,
    HydratedBlog,
    Media,
    MediaData,
    Permission,
    Plugin,
    PluginData,
    PluginHookMapping,
    PluginHookMappingData,
    Revision,
    RevisionData,
    SettingsEntry,
    SettingsEntryData,
    Tag,
    TagData,
    User,
    UserData
} from "@supergrowthai/next-blog-types/server";
import {v4 as uuidv4} from 'uuid';
import sift from 'sift';

export type * from "@supergrowthai/next-blog-types";

export class FileDBAdapter implements DatabaseAdapter {

    constructor(public dataPath: string) {
        this.ensureFilesExist();
    }

    get blogs() {
        return {
            findOne: async (filter: Filter<Blog>): Promise<Blog | null> => {
                const blogs = await this.readData<Blog>('blogs.json');
                const filtered = blogs.filter(sift(filter));
                return filtered[0] || null;
            },

            find: async (filter: Filter<Blog>, options?: {
                skip?: number,
                limit?: number
            }): Promise<Blog[]> => {
                const blogs = await this.readData<Blog>('blogs.json');
                let filtered = blogs.filter(sift(filter));

                // Apply skip and limit if provided
                if (options?.skip) {
                    filtered = filtered.slice(options.skip);
                }
                if (options?.limit) {
                    filtered = filtered.slice(0, options.limit);
                }

                return filtered;
            },

            count: async (filter: Filter<Blog>): Promise<number> => {
                const blogs = await this.readData<Blog>('blogs.json');
                const filtered = blogs.filter(sift(filter));
                return filtered.length;
            },

            findById: async (id: string): Promise<Blog | null> => {
                const blogs = await this.readData<Blog>('blogs.json');
                return blogs.find(blog => blog._id === id) || null;
            },

            create: async (data: BlogData): Promise<Blog> => {
                const blogs = await this.readData<Blog>('blogs.json');
                const newBlog: Blog = {
                    ...data,
                    _id: createId.blog(uuidv4()),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                blogs.push(newBlog);
                await this.writeData('blogs.json', blogs);
                return newBlog;
            },

            updateOne: async (filter: Filter<Blog>, {_id, ...update}: Filter<Blog>) => {
                let blogs = await this.readData<Blog>('blogs.json');
                const filtered = blogs.filter(sift(filter));
                const blogIndex = filtered[0] ? blogs.indexOf(filtered[0]) : -1;
                if (blogIndex !== -1) {
                    blogs[blogIndex] = {...blogs[blogIndex], ...update, updatedAt: Date.now()};
                    await this.writeData('blogs.json', blogs);
                    return blogs[blogIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<Blog>) => {
                let blogs = await this.readData<Blog>('blogs.json');
                const filtered = blogs.filter(sift(filter));
                const blogIndex = filtered[0] ? blogs.indexOf(filtered[0]) : -1;

                if (blogIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(blogs[blogIndex]));
                    blogs = blogs.filter((blog: any, index) => index !== blogIndex);
                    await this.writeData('blogs.json', blogs);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },

            delete: async (filter: Filter<Blog>): Promise<number> => {
                let blogs = await this.readData<Blog>('blogs.json');
                const initialLength = blogs.length;
                const toDelete = blogs.filter(sift(filter));
                blogs = blogs.filter(blog => !toDelete.includes(blog));
                await this.writeData('blogs.json', blogs);
                return initialLength - blogs.length;
            },
        }
    }

    get categories() {
        return {
            findOne: async (filter: Filter<Category>): Promise<Category | null> => {
                const categories = await this.readData<Category>('categories.json');
                const filtered = categories.filter(sift(filter));
                return filtered[0] || null;
            },
            find: async (filter: Filter<Category>, options?: {
                skip?: number,
                limit?: number
            }): Promise<Category[]> => {
                const categories = await this.readData<Category>('categories.json');
                let filtered = categories.filter(sift(filter));

                // Apply skip and limit if provided
                if (options?.skip) {
                    filtered = filtered.slice(options.skip);
                }
                if (options?.limit) {
                    filtered = filtered.slice(0, options.limit);
                }

                return filtered;
            },

            count: async (filter: Filter<Category>): Promise<number> => {
                const categories = await this.readData<Category>('categories.json');
                const filtered = categories.filter(sift(filter));
                return filtered.length;
            },
            findById: async (id: string): Promise<Category | null> => {
                const categories = await this.readData<Category>('categories.json');
                return categories.find(category => category._id === id) || null;
            },

            create: async (data: CategoryData): Promise<Category> => {
                const categories = await this.readData<Category>('categories.json');
                const newCategory: Category = {
                    ...data,
                    _id: createId.category(uuidv4()),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                } as any;
                categories.push(newCategory);
                await this.writeData('categories.json', categories);
                return newCategory;
            },

            updateOne: async (filter: Filter<Category>, {_id, ...update}: Filter<Category>) => {
                let categories = await this.readData<Category>('categories.json');
                const filtered = categories.filter(sift(filter));
                const categoryIndex = filtered[0] ? categories.indexOf(filtered[0]) : -1;
                if (categoryIndex !== -1) {
                    categories[categoryIndex] = {...categories[categoryIndex], ...update};
                    await this.writeData('categories.json', categories);
                    return categories[categoryIndex];
                }
                throw new Error("Nothing to update")
            },
            deleteOne: async (filter: Filter<Category>) => {
                let categories = await this.readData<Category>('categories.json');
                const filtered = categories.filter(sift(filter));
                const categoryIndex = filtered[0] ? categories.indexOf(filtered[0]) : -1;

                if (categoryIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(categories[categoryIndex]));
                    categories = categories.filter((category: any, index) => index !== categoryIndex);
                    await this.writeData('categories.json', categories);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },

            delete: async (filter: Filter<Category>): Promise<number> => {
                let categories = await this.readData<Category>('categories.json');
                const initialLength = categories.length;
                const toDelete = categories.filter(sift(filter));
                categories = categories.filter(category => !toDelete.includes(category));
                await this.writeData('categories.json', categories);
                return initialLength - categories.length;
            },
        }
    }

    get tags() {
        return {
            findOne: async (filter: Filter<Tag>): Promise<Tag | null> => {
                const tags = await this.readData<Tag>('tags.json');
                const filtered = tags.filter(sift(filter));
                return filtered[0] || null;
            },
            find: async (filter: Filter<Tag>, options?: {
                skip?: number,
                limit?: number
            }): Promise<Tag[]> => {
                const tags = await this.readData<Tag>('tags.json');
                let filtered = tags.filter(sift(filter));

                // Apply skip and limit if provided
                if (options?.skip) {
                    filtered = filtered.slice(options.skip);
                }
                if (options?.limit) {
                    filtered = filtered.slice(0, options.limit);
                }

                return filtered;
            },

            count: async (filter: Filter<Tag>): Promise<number> => {
                const tags = await this.readData<Tag>('tags.json');
                const filtered = tags.filter(sift(filter));
                return filtered.length;
            },
            findById: async (id: string): Promise<Tag | null> => {
                const tags = await this.readData<Tag>('tags.json');
                return tags.find(tag => tag._id === id) || null;
            },

            create: async (data: TagData): Promise<Tag> => {
                const tags = await this.readData<Tag>('tags.json');
                const newTag: Tag = {
                    ...data,
                    _id: createId.tag(uuidv4()),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                } as any;
                tags.push(newTag);
                await this.writeData('tags.json', tags);
                return newTag;
            },

            updateOne: async (filter: Filter<Tag>, {_id, ...update}: Filter<Tag>) => {
                let tags = await this.readData<Tag>('tags.json');
                const filtered = tags.filter(sift(filter));
                const tagIndex = filtered[0] ? tags.indexOf(filtered[0]) : -1;
                if (tagIndex !== -1) {
                    tags[tagIndex] = {...tags[tagIndex], ...update};
                    await this.writeData('tags.json', tags);
                    return tags[tagIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<Tag>) => {
                let tags = await this.readData<Tag>('tags.json');
                const filtered = tags.filter(sift(filter));
                const tagIndex = filtered[0] ? tags.indexOf(filtered[0]) : -1;

                if (tagIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(tags[tagIndex]));
                    tags = tags.filter((tag: any, index) => index !== tagIndex);
                    await this.writeData('tags.json', tags);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },

            delete: async (filter: Filter<Tag>): Promise<number> => {
                let tags = await this.readData<Tag>('tags.json');
                const initialLength = tags.length;
                const toDelete = tags.filter(sift(filter));
                tags = tags.filter(tag => !toDelete.includes(tag));
                await this.writeData('tags.json', tags);
                return initialLength - tags.length;
            },
        }
    }

    get users() {
        return {
            findOne: async (filter: Filter<User>): Promise<User | null> => {
                const users = await this.readData<User>('users.json');
                const filtered = users.filter(sift(filter));
                return filtered[0] || null;
            },
            find: async (filter: Filter<User>, options?: {
                skip?: number,
                limit?: number
            }): Promise<User[]> => {
                const users = await this.readData<User>('users.json');
                let filtered = users.filter(sift(filter));

                // Apply skip and limit if provided
                if (options?.skip) {
                    filtered = filtered.slice(options.skip);
                }
                if (options?.limit) {
                    filtered = filtered.slice(0, options.limit);
                }

                return filtered;
            },

            count: async (filter: Filter<User>): Promise<number> => {
                const users = await this.readData<User>('users.json');
                const filtered = users.filter(sift(filter));
                return filtered.length;
            },
            findById: async (id: string): Promise<User | null> => {
                const users = await this.readData<User>('users.json');
                return users.find(user => user._id === id) || null;
            },

            create: async (data: UserData): Promise<User> => {
                const users = await this.readData<User>('users.json');
                const isFirstUser = users.length === 0;

                // Set default permissions for the first user (admin access)
                const permissions: Permission[] = isFirstUser
                    ? ['all:all']
                    : data.permissions || [];

                const newUser: User = {
                    ...data,
                    _id: createId.user(uuidv4()),
                    permissions,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                users.push(newUser);
                await this.writeData('users.json', users);
                return newUser;
            },

            updateOne: async (filter: Filter<User>, {_id, ...update}: Filter<User>) => {
                let users = await this.readData<User>('users.json');
                const filtered = users.filter(sift(filter));
                const userIndex = filtered[0] ? users.indexOf(filtered[0]) : -1;
                if (userIndex !== -1) {
                    users[userIndex] = {...users[userIndex], ...update, updatedAt: Date.now()};
                    await this.writeData('users.json', users);
                    return users[userIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<User>) => {
                let users = await this.readData<User>('users.json');
                const filtered = users.filter(sift(filter));
                const userIndex = filtered[0] ? users.indexOf(filtered[0]) : -1;

                if (userIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(users[userIndex]));
                    users = users.filter((user: any, index) => index !== userIndex);
                    await this.writeData('users.json', users);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },

            delete: async (filter: Filter<User>): Promise<number> => {
                let users = await this.readData<User>('users.json');
                const initialLength = users.length;
                const toDelete = users.filter(sift(filter));
                users = users.filter(user => !toDelete.includes(user));
                await this.writeData('users.json', users);
                return initialLength - users.length;
            },
        }
    }

    get settings() {
        return {
            findOne: async (filter: Filter<SettingsEntry>): Promise<SettingsEntry | null> => {
                const settings = await this.readData<SettingsEntry>('settings.json');
                const filtered = settings.filter(sift(filter));
                return filtered[0] || null;
            },
            find: async (filter: Filter<SettingsEntry>, options?: {
                skip?: number,
                limit?: number
            }): Promise<SettingsEntry[]> => {
                const settings = await this.readData<SettingsEntry>('settings.json');
                let filtered = settings.filter(sift(filter));

                // Apply skip and limit if provided
                if (options?.skip) {
                    filtered = filtered.slice(options.skip);
                }
                if (options?.limit) {
                    filtered = filtered.slice(0, options.limit);
                }

                return filtered;
            },

            count: async (filter: Filter<SettingsEntry>): Promise<number> => {
                const settings = await this.readData<SettingsEntry>('settings.json');
                const filtered = settings.filter(sift(filter));
                return filtered.length;
            },
            findById: async (id: string): Promise<SettingsEntry | null> => {
                const settings = await this.readData<SettingsEntry>('settings.json');
                return settings.find(setting => setting._id === id) || null;
            },

            create: async (data: SettingsEntryData): Promise<SettingsEntry> => {
                const settings = await this.readData<SettingsEntry>('settings.json');
                const newSetting: SettingsEntry = {
                    ...data,
                    _id: createId.settingsEntry(uuidv4()),
                    ownerId: data.ownerId,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                } as any;
                settings.push(newSetting);
                await this.writeData('settings.json', settings);
                return newSetting;
            },

            updateOne: async (filter: Filter<SettingsEntry>, {_id, ...update}: Filter<SettingsEntry>) => {
                let settings = await this.readData<SettingsEntry>('settings.json');
                const filtered = settings.filter(sift(filter));
                const settingIndex = filtered[0] ? settings.indexOf(filtered[0]) : -1;
                if (settingIndex !== -1) {
                    settings[settingIndex] = {...settings[settingIndex], ...update, updatedAt: Date.now()};
                    await this.writeData('settings.json', settings);
                    return settings[settingIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<SettingsEntry>) => {
                let settings = await this.readData<SettingsEntry>('settings.json');
                const filtered = settings.filter(sift(filter));
                const settingIndex = filtered[0] ? settings.indexOf(filtered[0]) : -1;

                if (settingIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(settings[settingIndex]));
                    settings = settings.filter((setting: any, index) => index !== settingIndex);
                    await this.writeData('settings.json', settings);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },

            delete: async (filter: Filter<SettingsEntry>): Promise<number> => {
                let settings = await this.readData<SettingsEntry>('settings.json');
                const initialLength = settings.length;
                const toDelete = settings.filter(sift(filter));
                settings = settings.filter(setting => !toDelete.includes(setting));
                await this.writeData('settings.json', settings);
                return initialLength - settings.length;
            },
        }
    }

    get plugins() {
        return {
            findOne: async (filter: Filter<Plugin>): Promise<Plugin | null> => {
                const plugins = await this.readData<Plugin>('plugins.json');
                const filtered = plugins.filter(sift(filter));
                return filtered[0] || null;
            },
            find: async (filter: Filter<Plugin>, options?: {
                skip?: number,
                limit?: number
            }): Promise<Plugin[]> => {
                const plugins = await this.readData<Plugin>('plugins.json');
                let filtered = plugins.filter(sift(filter));

                // Apply skip and limit if provided
                if (options?.skip) {
                    filtered = filtered.slice(options.skip);
                }
                if (options?.limit) {
                    filtered = filtered.slice(0, options.limit);
                }

                return filtered;
            },

            count: async (filter: Filter<Plugin>): Promise<number> => {
                const plugins = await this.readData<Plugin>('plugins.json');
                const filtered = plugins.filter(sift(filter));
                return filtered.length;
            },
            findById: async (id: string): Promise<Plugin | null> => {
                const plugins = await this.readData<Plugin>('plugins.json');
                return plugins.find(plugin => plugin._id === id) || null;
            },

            create: async (data: PluginData): Promise<Plugin> => {
                const plugins = await this.readData<Plugin>('plugins.json');
                const newPlugin: Plugin = {
                    ...data,
                    _id: createId.plugin(uuidv4()),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                } as any;
                plugins.push(newPlugin);
                await this.writeData('plugins.json', plugins);
                return newPlugin;
            },

            updateOne: async (filter: Filter<Plugin>, {_id, ...update}: Filter<Plugin>) => {
                let plugins = await this.readData<Plugin>('plugins.json');
                const filtered = plugins.filter(sift(filter));
                const pluginIndex = filtered[0] ? plugins.indexOf(filtered[0]) : -1;
                if (pluginIndex !== -1) {
                    plugins[pluginIndex] = {...plugins[pluginIndex], ...update, updatedAt: Date.now()};
                    await this.writeData('plugins.json', plugins);
                    return plugins[pluginIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<Plugin>) => {
                let plugins = await this.readData<Plugin>('plugins.json');
                const filtered = plugins.filter(sift(filter));
                const pluginIndex = filtered[0] ? plugins.indexOf(filtered[0]) : -1;

                if (pluginIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(plugins[pluginIndex]));
                    plugins = plugins.filter((plugin: any, index) => index !== pluginIndex);
                    await this.writeData('plugins.json', plugins);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },

            delete: async (filter: Filter<Plugin>): Promise<number> => {
                let plugins = await this.readData<Plugin>('plugins.json');
                const initialLength = plugins.length;
                const toDelete = plugins.filter(sift(filter));
                plugins = plugins.filter(plugin => !toDelete.includes(plugin));
                await this.writeData('plugins.json', plugins);
                return initialLength - plugins.length;
            },
        }
    }

    // Authors functionality moved to users

    get pluginHookMappings() {
        return {
            findOne: async (filter: Filter<PluginHookMapping>): Promise<PluginHookMapping | null> => {
                const mappings = await this.readData<PluginHookMapping>('plugin-hook-mappings.json');
                const filtered = mappings.filter(sift(filter));
                return filtered[0] || null;
            },
            find: async (filter: Filter<PluginHookMapping>): Promise<PluginHookMapping[]> => {
                const mappings = await this.readData<PluginHookMapping>('plugin-hook-mappings.json');
                return mappings.filter(sift(filter));
            },

            count: async (filter: Filter<PluginHookMapping>): Promise<number> => {
                const mappings = await this.readData<PluginHookMapping>('plugin-hook-mappings.json');
                const filtered = mappings.filter(sift(filter));
                return filtered.length;
            },
            findById: async (id: string): Promise<PluginHookMapping | null> => {
                const mappings = await this.readData<PluginHookMapping>('plugin-hook-mappings.json');
                return mappings.find(mapping => mapping._id === id) || null;
            },

            create: async (data: PluginHookMappingData): Promise<PluginHookMapping> => {
                const mappings = await this.readData<PluginHookMapping>('plugin-hook-mappings.json');
                const newMapping: PluginHookMapping = {
                    ...data,
                    _id: createId.pluginHookMapping(uuidv4()),
                    pluginId: data.pluginId,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                } as any;
                mappings.push(newMapping);
                await this.writeData('plugin-hook-mappings.json', mappings);
                return newMapping;
            },

            updateOne: async (filter: Filter<PluginHookMapping>, {_id, ...update}: Filter<PluginHookMapping>) => {
                let mappings = await this.readData<PluginHookMapping>('plugin-hook-mappings.json');
                const filtered = mappings.filter(sift(filter));
                const mappingIndex = filtered[0] ? mappings.indexOf(filtered[0]) : -1;
                if (mappingIndex !== -1) {
                    mappings[mappingIndex] = {...mappings[mappingIndex], ...update, updatedAt: Date.now()};
                    await this.writeData('plugin-hook-mappings.json', mappings);
                    return mappings[mappingIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<PluginHookMapping>) => {
                let mappings = await this.readData<PluginHookMapping>('plugin-hook-mappings.json');
                const filtered = mappings.filter(sift(filter));
                const mappingIndex = filtered[0] ? mappings.indexOf(filtered[0]) : -1;

                if (mappingIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(mappings[mappingIndex]));
                    mappings = mappings.filter((mapping: any, index) => index !== mappingIndex);
                    await this.writeData('plugin-hook-mappings.json', mappings);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },

            delete: async (filter: Filter<PluginHookMapping>): Promise<number> => {
                let mappings = await this.readData<PluginHookMapping>('plugin-hook-mappings.json');
                const initialLength = mappings.length;
                const toDelete = mappings.filter(sift(filter));
                mappings = mappings.filter(mapping => !toDelete.includes(mapping));
                await this.writeData('plugin-hook-mappings.json', mappings);
                return initialLength - mappings.length;
            },
        }
    }

    get comments() {
        return {
            findOne: async (filter: Filter<Comment>): Promise<Comment | null> => {
                const comments = await this.readData<Comment>('comments.json');
                const filtered = comments.filter(sift(filter));
                return filtered[0] || null;
            },
            find: async (filter: Filter<Comment>): Promise<Comment[]> => {
                const comments = await this.readData<Comment>('comments.json');
                return comments.filter(sift(filter));
            },

            count: async (filter: Filter<Comment>): Promise<number> => {
                const comments = await this.readData<Comment>('comments.json');
                const filtered = comments.filter(sift(filter));
                return filtered.length;
            },
            findById: async (id: string): Promise<Comment | null> => {
                const comments = await this.readData<Comment>('comments.json');
                return comments.find(comment => comment._id === id) || null;
            },

            create: async (data: CommentData): Promise<Comment> => {
                const comments = await this.readData<Comment>('comments.json');
                const newComment: Comment = {
                    ...data,
                    _id: createId.comment(uuidv4()),
                    blogId: data.blogId,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                } as any;
                comments.push(newComment);
                await this.writeData('comments.json', comments);
                return newComment;
            },

            updateOne: async (filter: Filter<Comment>, {_id, ...update}: Filter<Comment>) => {
                let comments = await this.readData<Comment>('comments.json');
                const filtered = comments.filter(sift(filter));
                const commentIndex = filtered[0] ? comments.indexOf(filtered[0]) : -1;
                if (commentIndex !== -1) {
                    comments[commentIndex] = {...comments[commentIndex], ...update, updatedAt: Date.now()};
                    await this.writeData('comments.json', comments);
                    return comments[commentIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<Comment>) => {
                let comments = await this.readData<Comment>('comments.json');
                const filtered = comments.filter(sift(filter));
                const commentIndex = filtered[0] ? comments.indexOf(filtered[0]) : -1;

                if (commentIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(comments[commentIndex]));
                    comments = comments.filter((comment: any, index) => index !== commentIndex);
                    await this.writeData('comments.json', comments);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },

            delete: async (filter: Filter<Comment>): Promise<number> => {
                let comments = await this.readData<Comment>('comments.json');
                const initialLength = comments.length;
                const toDelete = comments.filter(sift(filter));
                comments = comments.filter(comment => !toDelete.includes(comment));
                await this.writeData('comments.json', comments);
                return initialLength - comments.length;
            },
        }
    }

    get revisions() {
        return {
            findOne: async (filter: Filter<Revision>): Promise<Revision | null> => {
                const revisions = await this.readData<Revision>('revisions.json');
                const filtered = revisions.filter(sift(filter));
                return filtered[0] || null;
            },
            find: async (filter: Filter<Revision>): Promise<Revision[]> => {
                const revisions = await this.readData<Revision>('revisions.json');
                return revisions.filter(sift(filter));
            },

            count: async (filter: Filter<Revision>): Promise<number> => {
                const revisions = await this.readData<Revision>('revisions.json');
                const filtered = revisions.filter(sift(filter));
                return filtered.length;
            },
            findById: async (id: string): Promise<Revision | null> => {
                const revisions = await this.readData<Revision>('revisions.json');
                return revisions.find(revision => revision._id === id) || null;
            },

            create: async (data: RevisionData): Promise<Revision> => {
                const revisions = await this.readData<Revision>('revisions.json');
                const newRevision: Revision = {
                    ...data,
                    _id: createId.revision(uuidv4()),
                    blogId: data.blogId,
                    userId: data.userId,
                    createdAt: Date.now()
                } as any;
                revisions.push(newRevision);
                await this.writeData('revisions.json', revisions);
                return newRevision;
            },

            updateOne: async (filter: Filter<Revision>, {_id, ...update}: Filter<Revision>) => {
                let revisions = await this.readData<Revision>('revisions.json');
                const filtered = revisions.filter(sift(filter));
                const revisionIndex = filtered[0] ? revisions.indexOf(filtered[0]) : -1;
                if (revisionIndex !== -1) {
                    revisions[revisionIndex] = {...revisions[revisionIndex], ...update};
                    await this.writeData('revisions.json', revisions);
                    return revisions[revisionIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<Revision>) => {
                let revisions = await this.readData<Revision>('revisions.json');
                const filtered = revisions.filter(sift(filter));
                const revisionIndex = filtered[0] ? revisions.indexOf(filtered[0]) : -1;

                if (revisionIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(revisions[revisionIndex]));
                    revisions = revisions.filter((revision: any, index) => index !== revisionIndex);
                    await this.writeData('revisions.json', revisions);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },

            delete: async (filter: Filter<Revision>): Promise<number> => {
                let revisions = await this.readData<Revision>('revisions.json');
                const initialLength = revisions.length;
                const toDelete = revisions.filter(sift(filter));
                revisions = revisions.filter(revision => !toDelete.includes(revision));
                await this.writeData('revisions.json', revisions);
                return initialLength - revisions.length;
            },
        }
    }

    get media() {
        return {
            findOne: async (filter: Filter<Media>): Promise<Media | null> => {
                const media = await this.readData<Media>('media.json');
                const filtered = media.filter(sift(filter));
                return filtered[0] || null;
            },
            find: async (filter: Filter<Media>, options?: {
                skip?: number,
                limit?: number
            }): Promise<Media[]> => {
                const media = await this.readData<Media>('media.json');
                let filtered = media.filter(sift(filter));

                // Apply skip and limit if provided
                if (options?.skip) {
                    filtered = filtered.slice(options.skip);
                }
                if (options?.limit) {
                    filtered = filtered.slice(0, options.limit);
                }

                return filtered;
            },

            count: async (filter: Filter<Media>): Promise<number> => {
                const media = await this.readData<Media>('media.json');
                const filtered = media.filter(sift(filter));
                return filtered.length;
            },
            findById: async (id: string): Promise<Media | null> => {
                const media = await this.readData<Media>('media.json');
                return media.find(item => item._id === id) || null;
            },

            create: async (data: MediaData): Promise<Media> => {
                const media = await this.readData<Media>('media.json');
                const newItem: Media = {
                    ...data,
                    _id: createId.media(uuidv4()),
                    userId: data.userId,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                } as any;
                media.push(newItem);
                await this.writeData('media.json', media);
                return newItem;
            },

            updateOne: async (filter: Filter<Media>, {_id, ...update}: Filter<Media>) => {
                let media = await this.readData<Media>('media.json');
                const filtered = media.filter(sift(filter));
                const itemIndex = filtered[0] ? media.indexOf(filtered[0]) : -1;
                if (itemIndex !== -1) {
                    media[itemIndex] = {...media[itemIndex], ...update, updatedAt: Date.now()};
                    await this.writeData('media.json', media);
                    return media[itemIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<Media>) => {
                let media = await this.readData<Media>('media.json');
                const filtered = media.filter(sift(filter));
                const itemIndex = filtered[0] ? media.indexOf(filtered[0]) : -1;

                if (itemIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(media[itemIndex]));
                    media = media.filter((item: any, index) => index !== itemIndex);
                    await this.writeData('media.json', media);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },

            delete: async (filter: Filter<Media>): Promise<number> => {
                let media = await this.readData<Media>('media.json');
                const initialLength = media.length;
                const toDelete = media.filter(sift(filter));
                media = media.filter(item => !toDelete.includes(item));
                await this.writeData('media.json', media);
                return initialLength - media.length;
            },
        }
    }

    get generated() {
        const self = this;

        // --- helpers ---
        const uniq = <T>(arr: T[]) => Array.from(new Set(arr));
        const indexById = <T extends { _id: string }>(items: (T | null | undefined)[]) => {
            const map = new Map<string, T>();
            for (const it of items) if (it) map.set(it._id, it);
            return map;
        };

        // --- core batched hydrator ---
        const hydrateBlogs = async (blogs: Blog[]): Promise<HydratedBlog[]> => {
            if (!blogs.length) return [];

            // Collect all IDs to fetch once
            const userIds = uniq(blogs.map(b => b.userId));
            const categoryIds = uniq(blogs.map(b => b.categoryId));
            const allTagIds = uniq(blogs.flatMap(b => b.tagIds || []));
            const mediaIds = uniq(blogs.map(b => b.featuredMediaId).filter(Boolean) as string[]);
            const parentIds = uniq(blogs.map(b => b.parentId).filter(Boolean) as string[]);

            // Fetch in parallel (single round trip per collection)
            const [users, categories, tags, media, parents] = await Promise.all([
                self.users.find({_id: {$in: userIds}}),
                self.categories.find({_id: {$in: categoryIds}}),
                self.tags.find({_id: {$in: allTagIds}}),
                mediaIds.length ? self.media.find({_id: {$in: mediaIds}}) : Promise.resolve([]),
                parentIds.length ? self.blogs.find({_id: {$in: parentIds}}) : Promise.resolve([]),
            ]);

            // Index for O(1) lookups
            const userById = indexById(users);
            const categoryById = indexById(categories);
            const tagById = indexById(tags);
            const mediaById = indexById(media);
            const parentById = indexById(parents);

            // Build hydrated objects
            const out: HydratedBlog[] = [];
            for (const b of blogs) {
                const author = userById.get(b.userId);
                const category = categoryById.get(b.categoryId);
                if (!author || !category) continue; // skip incomplete

                const hydratedTags = (b.tagIds || [])
                    .map(tid => tagById.get(tid))
                    .filter((t): t is Tag => !!t);

                out.push({
                    ...b,
                    user: author,
                    category,
                    tags: hydratedTags,
                    featuredMedia: b.featuredMediaId ? mediaById.get(b.featuredMediaId) : undefined,
                    parent: b.parentId ? parentById.get(b.parentId) : undefined,
                } as HydratedBlog);
            }
            return out;
        };

        return {
            // Single item now delegates to the batched path
            getHydratedBlog: async (filter: Filter<Blog>): Promise<HydratedBlog | null> => {
                const blogs = await self.blogs.find(filter, {limit: 1});
                const hydrated = await hydrateBlogs(blogs);
                return hydrated[0] ?? null;
            },

            // Batched hydrator entrypoint
            getHydratedBlogs: async (
                filter: Filter<Blog>,
                options?: { skip?: number; limit?: number; sort?: Record<string, 1 | -1> }
            ): Promise<HydratedBlog[]> => {
                const blogs = await self.blogs.find(filter, options);
                return hydrateBlogs(blogs);
            },

            // Prefer DB-side sort/limit if supported
            getRecentBlogs: async (limit: number = 10): Promise<HydratedBlog[]> => {
                return self.generated.getHydratedBlogs(
                    {status: 'published'},
                    {limit, sort: {createdAt: -1}}
                );
            },

            getRelatedBlogs: async (blogId: string, limit: number = 5): Promise<HydratedBlog[]> => {
                const seed = await self.blogs.findById(blogId);
                if (!seed) return [];

                // Fetch candidates with same category OR overlapping tags; exclude self
                const candidates = await self.blogs.find({
                    _id: {$ne: blogId},
                    status: 'published',
                    //@ts-ignore
                    $or: [
                        {categoryId: seed.categoryId},
                        {tagIds: {$in: seed.tagIds || []}},
                    ],
                });

                // Score in-memory, then take top N
                const scored = candidates
                    .map(b => {
                        let score = 0;
                        if (b.categoryId === seed.categoryId) score += 2;
                        const shared = (b.tagIds || []).filter(t => (seed.tagIds || []).includes(t));
                        score += shared.length;
                        return {b, score};
                    })
                    .filter(s => s.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, limit)
                    .map(s => s.b);

                return hydrateBlogs(scored);
            },

            getHydratedAuthor: async (userId: string): Promise<User | null> => {
                return self.users.findById(userId);
            },

            getAuthorBlogs: async (
                userId: string,
                options?: { skip?: number; limit?: number; sort?: Record<string, 1 | -1> }
            ): Promise<HydratedBlog[]> => {
                return self.generated.getHydratedBlogs({userId, status: 'published'}, options);
            },

            getHydratedCategories: async (): Promise<Category[]> => {
                return self.categories.find({});
            },

            getCategoryWithBlogs: async (
                categoryId: string,
                options?: { skip?: number; limit?: number; sort?: Record<string, 1 | -1> }
            ): Promise<{ category: Category | null; blogs: HydratedBlog[] }> => {
                const category = await self.categories.findById(categoryId);
                if (!category) return {category: null, blogs: []};
                const blogs = await self.generated.getHydratedBlogs({categoryId, status: 'published'}, options);
                return {category, blogs};
            },

            getHydratedTags: async (): Promise<Tag[]> => {
                return self.tags.find({});
            },

            getTagWithBlogs: async (
                tagId: string,
                options?: { skip?: number; limit?: number; sort?: Record<string, 1 | -1> }
            ): Promise<{ tag: Tag | null; blogs: HydratedBlog[] }> => {
                const tag = await self.tags.findById(tagId);
                if (!tag) return {tag: null, blogs: []};
                const blogs = await self.generated.getHydratedBlogs(
                    {status: 'published', tagIds: {$in: [tagId]}},
                    options
                );
                return {tag, blogs};
            },

            getBlogsByTag: async (
                tagSlug: string,
                options?: { skip?: number; limit?: number; sort?: Record<string, 1 | -1> }
            ): Promise<HydratedBlog[]> => {
                const tag = await self.tags.findOne({slug: tagSlug});
                if (!tag) return [];
                const res = await self.generated.getTagWithBlogs(tag._id, options);
                return res.blogs;
            },

            getBlogsByCategory: async (
                categorySlug: string,
                options?: { skip?: number; limit?: number; sort?: Record<string, 1 | -1> }
            ): Promise<HydratedBlog[]> => {
                const category = await self.categories.findOne({slug: categorySlug});
                if (!category) return [];
                const res = await self.generated.getCategoryWithBlogs(category._id, options);
                return res.blogs;
            },
        };
    }

    async readData<T>(fileName: string): Promise<T[]> {
        try {
            const data = await fs.readFile(this.dataPath + fileName, {encoding: 'utf8'});
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading file:', error);
            return [];
        }
    }

    async writeData<T>(fileName: string, data: T[]): Promise<void> {
        try {
            await fs.writeFile(this.dataPath + fileName, JSON.stringify(data, null, 2), {encoding: 'utf8'});
        } catch (error) {
            console.error('Error writing to file:', error);
        }
    }

    private async ensureFilesExist() {
        const files = [
            'blogs.json',
            'categories.json',
            'tags.json',
            'users.json',
            'settings.json',
            'plugins.json',
            'plugin-hook-mappings.json',
            'comments.json',
            'revisions.json',
            'media.json'
        ];
        await Promise.all(files.map(async (file) => {
            try {
                await fs.access(this.dataPath + file);
            } catch {
                await fs.writeFile(this.dataPath + file, JSON.stringify([], null, 2), {encoding: 'utf8'});
            }
        }));
    }
}

export default {}