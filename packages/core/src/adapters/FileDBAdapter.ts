import {promises as fs} from "fs";
import {
    Blog,
    BlogData,
    Category,
    CategoryData,
    DatabaseAdapter,
    Filter, Permission,
    Plugin,
    PluginData,
    PluginHookMapping,
    PluginHookMappingData,
    SettingsEntry,
    SettingsEntryData,
    Tag,
    TagData,
    User,
    UserData
} from "../types.js";
import {v4 as uuidv4} from 'uuid';

export default class FileDBAdapter implements DatabaseAdapter {

    constructor(public dataPath: string) {
        this.ensureFilesExist();
    }

    private async ensureFilesExist() {
        const files = ['blogs.json', 'categories.json', 'tags.json', 'users.json', 'settings.json', 'plugins.json', 'plugin-hook-mappings.json'];
        await Promise.all(files.map(async (file) => {
            try {
                await fs.access(this.dataPath + file);
            } catch {
                await fs.writeFile(this.dataPath + file, JSON.stringify([], null, 2), {encoding: 'utf8'});
            }
        }));
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

    get blogs() {
        return {
            findOne: async (filter: Filter<Blog>): Promise<Blog> => {
                const blogs = await this.readData<Blog>('blogs.json');
                return blogs.find((blog: any) => Object.keys(filter).every((key: any) => blog[key] === (filter as any)[key]))!;
            },

            find: async (filter: Filter<Blog>): Promise<Blog[]> => {
                const blogs = await this.readData<Blog>('blogs.json');
                return blogs.filter((blog: any) => Object.keys(filter).every(key => blog[key] === (filter as any)[key]));
            },

            findById: async (id: string): Promise<Blog> => {
                const blogs = await this.readData<Blog>('blogs.json');
                return blogs.find(blog => blog._id === id)!;
            },

            create: async (data: BlogData): Promise<Blog> => {
                const blogs = await this.readData<Blog>('blogs.json');
                const newBlog: Blog = {...data, _id: uuidv4(), createdAt: Date.now(), updatedAt: Date.now()};
                blogs.push(newBlog);
                await this.writeData('blogs.json', blogs);
                return newBlog;
            },

            updateOne: async (filter: Filter<Blog>, {_id, ...update}: Filter<Blog>) => {
                let blogs = await this.readData<Blog>('blogs.json');
                const blogIndex = blogs.findIndex((blog: any) => Object.keys(filter).every(key => blog[key] === (filter as any)[key]));
                if (blogIndex !== -1) {
                    blogs[blogIndex] = {...blogs[blogIndex], ...update, updatedAt: Date.now()};
                    await this.writeData('blogs.json', blogs);
                    return blogs[blogIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<Blog>) => {
                let blogs = await this.readData<Blog>('blogs.json');
                const blogIndex = blogs.findIndex((blog: any) => Object.keys(filter).every(key => blog[key] === (filter as any)[key]));

                if (blogIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(blogs[blogIndex]));
                    blogs = blogs.filter((blog: any, index) => index !== blogIndex);
                    await this.writeData('blogs.json', blogs);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },
        }
    }

    get categories() {
        return {
            findOne: async (filter: Filter<Category>): Promise<Category> => {
                const blogs = await this.readData<Category>('categories.json');
                return blogs.find((blog: any) => Object.keys(filter).every((key: any) => blog[key] === (filter as any)[key]))!;
            },
            find: async (filter: Filter<Category>): Promise<Category[]> => {
                const blogs = await this.readData<Category>('categories.json');
                return blogs.filter((blog: any) => Object.keys(filter).every(key => blog[key] === (filter as any)[key]));
            },
            findById: async (id: string): Promise<Category> => {
                const categories = await this.readData<Category>('categories.json');
                return categories.find(category => category._id === id)!;
            },

            create: async (data: CategoryData): Promise<Category> => {
                const categories = await this.readData<Category>('categories.json');
                const newCategory: Category = {...data, _id: uuidv4()} as any;
                categories.push(newCategory);
                await this.writeData('categories.json', categories);
                return newCategory;
            },

            updateOne: async (filter: Filter<Category>, {_id, ...update}: Filter<Category>) => {
                let categories = await this.readData<Category>('categories.json');
                const categoryIndex = categories.findIndex((category: any) => Object.keys(filter).every(key => category[key] === (filter as any)[key]));
                if (categoryIndex !== -1) {
                    categories[categoryIndex] = {...categories[categoryIndex], ...update};
                    await this.writeData('categories.json', categories);
                    return categories[categoryIndex];
                }
                throw new Error("Nothing to update")
            },
            deleteOne: async (filter: Filter<Category>) => {
                let categories = await this.readData<Category>('categories.json');
                const blogIndex = categories.findIndex((blog: any) => Object.keys(filter).every(key => blog[key] === (filter as any)[key]));

                if (blogIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(categories[blogIndex]));
                    categories = categories.filter((blog: any, index) => index !== blogIndex);
                    await this.writeData('categories.json', categories);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },
        }
    }

    get tags() {
        return {
            findOne: async (filter: Filter<Tag>): Promise<Tag> => {
                const blogs = await this.readData<Tag>('tags.json');
                return blogs.find((blog: any) => Object.keys(filter).every((key: any) => blog[key] === (filter as any)[key]))!;
            },
            find: async (filter: Filter<Tag>): Promise<Tag[]> => {
                const blogs = await this.readData<Tag>('tags.json');
                return blogs.filter((tag: any) => Object.keys(filter).every(key => tag[key] === (filter as any)[key]));
            },
            findById: async (id: string): Promise<Tag> => {
                const tags = await this.readData<Tag>('tags.json');
                return tags.find(tag => tag._id === id)!;
            },

            create: async (data: TagData): Promise<Tag> => {
                const tags = await this.readData<Tag>('tags.json');
                const newTag: Tag = {...data, _id: uuidv4()} as any;
                tags.push(newTag);
                await this.writeData('tags.json', tags);
                return newTag;
            },

            updateOne: async (filter: Filter<Tag>, {_id, ...update}: Filter<Tag>) => {
                let tags = await this.readData<Tag>('tags.json');
                const tagIndex = tags.findIndex((tag: any) => Object.keys(filter).every(key => tag[key] === (filter as any)[key]));
                if (tagIndex !== -1) {
                    tags[tagIndex] = {...tags[tagIndex], ...update};
                    await this.writeData('tags.json', tags);
                    return tags[tagIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<Tag>) => {
                let tags = await this.readData<Tag>('tags.json');

                const blogIndex = tags.findIndex((blog: any) => Object.keys(filter).every(key => blog[key] === (filter as any)[key]));

                if (blogIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(tags[blogIndex]));
                    tags = tags.filter((blog: any, index) => index !== blogIndex);
                    await this.writeData('tags.json', tags);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },
        }
    }

    // Authors functionality moved to users

    get users() {
        return {
            findOne: async (filter: Filter<User>): Promise<User> => {
                const users = await this.readData<User>('users.json');
                return users.find((user: any) => Object.keys(filter).every((key: any) => user[key] === (filter as any)[key]))!;
            },
            find: async (filter: Filter<User>): Promise<User[]> => {
                const users = await this.readData<User>('users.json');
                return users.filter((user: any) => Object.keys(filter).every(key => user[key] === (filter as any)[key]));
            },
            findById: async (id: string): Promise<User> => {
                const users = await this.readData<User>('users.json');
                return users.find(user => user._id === id)!;
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
                    _id: uuidv4(),
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
                const userIndex = users.findIndex((user: any) => Object.keys(filter).every(key => user[key] === (filter as any)[key]));
                if (userIndex !== -1) {
                    users[userIndex] = {...users[userIndex], ...update, updatedAt: Date.now()};
                    await this.writeData('users.json', users);
                    return users[userIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<User>) => {
                let users = await this.readData<User>('users.json');
                const userIndex = users.findIndex((user: any) => Object.keys(filter).every(key => user[key] === (filter as any)[key]));

                if (userIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(users[userIndex]));
                    users = users.filter((user: any, index) => index !== userIndex);
                    await this.writeData('users.json', users);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },
        }
    }

    get settings() {
        return {
            findOne: async (filter: Filter<SettingsEntry>): Promise<SettingsEntry> => {
                const settings = await this.readData<SettingsEntry>('settings.json');
                return settings.find((setting: any) => Object.keys(filter).every((key: any) => setting[key] === (filter as any)[key]))!;
            },
            find: async (filter: Filter<SettingsEntry>): Promise<SettingsEntry[]> => {
                const settings = await this.readData<SettingsEntry>('settings.json');
                return settings.filter((setting: any) => Object.keys(filter).every(key => setting[key] === (filter as any)[key]));
            },
            findById: async (id: string): Promise<SettingsEntry> => {
                const settings = await this.readData<SettingsEntry>('settings.json');
                return settings.find(setting => setting._id === id)!;
            },

            create: async (data: SettingsEntryData): Promise<SettingsEntry> => {
                const settings = await this.readData<SettingsEntry>('settings.json');
                const newSetting: SettingsEntry = {
                    ...data,
                    _id: uuidv4(),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                } as any;
                settings.push(newSetting);
                await this.writeData('settings.json', settings);
                return newSetting;
            },

            updateOne: async (filter: Filter<SettingsEntry>, {_id, ...update}: Filter<SettingsEntry>) => {
                let settings = await this.readData<SettingsEntry>('settings.json');
                const settingIndex = settings.findIndex((setting: any) => Object.keys(filter).every(key => setting[key] === (filter as any)[key]));
                if (settingIndex !== -1) {
                    settings[settingIndex] = {...settings[settingIndex], ...update, updatedAt: Date.now()};
                    await this.writeData('settings.json', settings);
                    return settings[settingIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<SettingsEntry>) => {
                let settings = await this.readData<SettingsEntry>('settings.json');
                const settingIndex = settings.findIndex((setting: any) => Object.keys(filter).every(key => setting[key] === (filter as any)[key]));

                if (settingIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(settings[settingIndex]));
                    settings = settings.filter((setting: any, index) => index !== settingIndex);
                    await this.writeData('settings.json', settings);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },
        }
    }
    get plugins() {
        return {
            findOne: async (filter: Filter<Plugin>): Promise<Plugin> => {
                const plugins = await this.readData<Plugin>('plugins.json');
                return plugins.find((plugin: any) => Object.keys(filter).every((key: any) => plugin[key] === (filter as any)[key]))!;
            },
            find: async (filter: Filter<Plugin>): Promise<Plugin[]> => {
                const plugins = await this.readData<Plugin>('plugins.json');
                return plugins.filter((plugin: any) => Object.keys(filter).every(key => plugin[key] === (filter as any)[key]));
            },
            findById: async (id: string): Promise<Plugin> => {
                const plugins = await this.readData<Plugin>('plugins.json');
                return plugins.find(plugin => plugin._id === id)!;
            },

            create: async (data: PluginData): Promise<Plugin> => {
                const plugins = await this.readData<Plugin>('plugins.json');
                const newPlugin: Plugin = {
                    ...data,
                    _id: uuidv4(),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                } as any;
                plugins.push(newPlugin);
                await this.writeData('plugins.json', plugins);
                return newPlugin;
            },

            updateOne: async (filter: Filter<Plugin>, {_id, ...update}: Filter<Plugin>) => {
                let plugins = await this.readData<Plugin>('plugins.json');
                const pluginIndex = plugins.findIndex((plugin: any) => Object.keys(filter).every(key => plugin[key] === (filter as any)[key]));
                if (pluginIndex !== -1) {
                    plugins[pluginIndex] = {...plugins[pluginIndex], ...update, updatedAt: Date.now()};
                    await this.writeData('plugins.json', plugins);
                    return plugins[pluginIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<Plugin>) => {
                let plugins = await this.readData<Plugin>('plugins.json');
                const pluginIndex = plugins.findIndex((plugin: any) => Object.keys(filter).every(key => plugin[key] === (filter as any)[key]));

                if (pluginIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(plugins[pluginIndex]));
                    plugins = plugins.filter((plugin: any, index) => index !== pluginIndex);
                    await this.writeData('plugins.json', plugins);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },
        }
    }

    get pluginHookMappings() {
        return {
            findOne: async (filter: Filter<PluginHookMapping>): Promise<PluginHookMapping> => {
                const mappings = await this.readData<PluginHookMapping>('plugin-hook-mappings.json');
                return mappings.find((mapping: any) => Object.keys(filter).every((key: any) => mapping[key] === (filter as any)[key]))!;
            },
            find: async (filter: Filter<PluginHookMapping>): Promise<PluginHookMapping[]> => {
                const mappings = await this.readData<PluginHookMapping>('plugin-hook-mappings.json');
                return mappings.filter((mapping: any) => Object.keys(filter).every(key => mapping[key] === (filter as any)[key]));
            },
            findById: async (id: string): Promise<PluginHookMapping> => {
                const mappings = await this.readData<PluginHookMapping>('plugin-hook-mappings.json');
                return mappings.find(mapping => mapping._id === id)!;
            },

            create: async (data: PluginHookMappingData): Promise<PluginHookMapping> => {
                const mappings = await this.readData<PluginHookMapping>('plugin-hook-mappings.json');
                const newMapping: PluginHookMapping = {
                    ...data,
                    _id: uuidv4(),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                } as any;
                mappings.push(newMapping);
                await this.writeData('plugin-hook-mappings.json', mappings);
                return newMapping;
            },

            updateOne: async (filter: Filter<PluginHookMapping>, {_id, ...update}: Filter<PluginHookMapping>) => {
                let mappings = await this.readData<PluginHookMapping>('plugin-hook-mappings.json');
                const mappingIndex = mappings.findIndex((mapping: any) => Object.keys(filter).every(key => mapping[key] === (filter as any)[key]));
                if (mappingIndex !== -1) {
                    mappings[mappingIndex] = {...mappings[mappingIndex], ...update, updatedAt: Date.now()};
                    await this.writeData('plugin-hook-mappings.json', mappings);
                    return mappings[mappingIndex];
                }
                throw new Error("Nothing to update")
            },

            deleteOne: async (filter: Filter<PluginHookMapping>) => {
                let mappings = await this.readData<PluginHookMapping>('plugin-hook-mappings.json');
                const mappingIndex = mappings.findIndex((mapping: any) => Object.keys(filter).every(key => mapping[key] === (filter as any)[key]));

                if (mappingIndex !== -1) {
                    const duplicate = JSON.parse(JSON.stringify(mappings[mappingIndex]));
                    mappings = mappings.filter((mapping: any, index) => index !== mappingIndex);
                    await this.writeData('plugin-hook-mappings.json', mappings);
                    return duplicate;
                }
                throw new Error("Nothing to update")
            },
        }
    }
}
