import {promises as fs} from "fs";
import {
    Blog,
    BlogData,
    Category,
    CategoryData,
    DatabaseProvider,
    Filter, Permission,
    Tag,
    TagData,
    User,
    UserData
} from "../types";
import {v4 as uuidv4} from 'uuid';

export default class FileDBAdapter implements DatabaseProvider {

    constructor(public dataPath: string) {
        this.ensureFilesExist();
    }

    private async ensureFilesExist() {
        const files = ['blogs.json', 'categories.json', 'tags.json', 'users.json'];
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
                
                // Update tags with the blog's ID
                if (newBlog.tags && newBlog.tags.length > 0) {
                    const tags = await this.readData<Tag>('tags.json');
                    const updatedTags = tags.map(tag => {
                        if (newBlog.tags.includes(tag._id)) {
                            return {
                                ...tag,
                                blogs: [...(tag.blogs || []), newBlog._id],
                                updatedAt: Date.now()
                            };
                        }
                        return tag;
                    });
                    await this.writeData('tags.json', updatedTags);
                }
                
                return newBlog;
            },

            updateOne: async (filter: Filter<Blog>, {_id, ...update}: Filter<Blog>) => {
                let blogs = await this.readData<Blog>('blogs.json');
                const blogIndex = blogs.findIndex((blog: any) => Object.keys(filter).every(key => blog[key] === (filter as any)[key]));
                if (blogIndex !== -1) {
                    const oldBlog = blogs[blogIndex];
                    blogs[blogIndex] = {...blogs[blogIndex], ...update, updatedAt: Date.now()};
                    await this.writeData('blogs.json', blogs);
                    
                    // Update tags if the blog's tags have changed
                    if (update.tags && JSON.stringify(oldBlog.tags) !== JSON.stringify(update.tags)) {
                        const tags = await this.readData<Tag>('tags.json');
                        const updatedTags = tags.map(tag => {
                            // If tag was removed: remove blog ID from tag's blogs array
                            if (oldBlog.tags.includes(tag._id) && !update.tags.includes(tag._id)) {
                                return {
                                    ...tag,
                                    blogs: (tag.blogs || []).filter(blogId => blogId !== oldBlog._id),
                                    updatedAt: Date.now()
                                };
                            }
                            // If tag was added: add blog ID to tag's blogs array
                            else if (!oldBlog.tags.includes(tag._id) && update.tags.includes(tag._id)) {
                                return {
                                    ...tag,
                                    blogs: [...(tag.blogs || []), oldBlog._id],
                                    updatedAt: Date.now()
                                };
                            }
                            return tag;
                        });
                        await this.writeData('tags.json', updatedTags);
                    }
                    
                    return blogs[blogIndex];
                }
                throw new Error("Nothing to update")
            },

            updateMany: async (filter: Filter<Blog>, {_id, ...update}: Filter<Blog>) => {
                let blogs = await this.readData<Blog>('blogs.json');
                const updatedBlogs: Blog[] = [];
                
                blogs = blogs.map((blog: any) => {
                    if (Object.keys(filter).every(key => blog[key] === (filter as any)[key])) {
                        const updatedBlog = {...blog, ...update, updatedAt: Date.now()};
                        updatedBlogs.push(updatedBlog);
                        return updatedBlog;
                    }
                    return blog;
                });
                
                await this.writeData('blogs.json', blogs);
                return updatedBlogs;
            },

            deleteOne: async (filter: Filter<Blog>) => {
                let blogs = await this.readData<Blog>('blogs.json');
                const blogIndex = blogs.findIndex((blog: any) => Object.keys(filter).every(key => blog[key] === (filter as any)[key]));

                if (blogIndex !== -1) {
                    const blogToDelete = blogs[blogIndex];
                    const duplicate = JSON.parse(JSON.stringify(blogToDelete));
                    
                    // Remove blog from all associated tags
                    if (blogToDelete.tags && blogToDelete.tags.length > 0) {
                        const tags = await this.readData<Tag>('tags.json');
                        const updatedTags = tags.map(tag => {
                            if (blogToDelete.tags.includes(tag._id)) {
                                return {
                                    ...tag,
                                    blogs: (tag.blogs || []).filter(blogId => blogId !== blogToDelete._id),
                                    updatedAt: Date.now()
                                };
                            }
                            return tag;
                        });
                        await this.writeData('tags.json', updatedTags);
                    }
                    
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
            
            updateMany: async (filter: Filter<Category>, {_id, ...update}: Filter<Category>) => {
                let categories = await this.readData<Category>('categories.json');
                const updatedCategories: Category[] = [];
                
                categories = categories.map((category: any) => {
                    if (Object.keys(filter).every(key => category[key] === (filter as any)[key])) {
                        const updatedCategory = {...category, ...update};
                        updatedCategories.push(updatedCategory);
                        return updatedCategory;
                    }
                    return category;
                });
                
                await this.writeData('categories.json', categories);
                return updatedCategories;
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
                // Ensure blogs array is initialized and timestamp fields are set
                const newTag: Tag = {
                    ...data, 
                    _id: uuidv4(),
                    blogs: data.blogs || [],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
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
            
            updateMany: async (filter: Filter<Tag>, {_id, ...update}: Filter<Tag>) => {
                let tags = await this.readData<Tag>('tags.json');
                const updatedTags: Tag[] = [];
                
                tags = tags.map((tag: any) => {
                    if (Object.keys(filter).every(key => tag[key] === (filter as any)[key])) {
                        const updatedTag = {...tag, ...update};
                        updatedTags.push(updatedTag);
                        return updatedTag;
                    }
                    return tag;
                });
                
                await this.writeData('tags.json', tags);
                return updatedTags;
            },

            deleteOne: async (filter: Filter<Tag>) => {
                const tags = await this.readData<Tag>('tags.json');
                const tagToDelete = tags.find(tag =>
                    Object.keys(filter).every(key =>
                        tag[key as keyof Tag] === (filter as any)[key]
                    )
                );

                if (!tagToDelete) throw new Error("Tag not found");

                const updatedTags = tags.filter(tag => tag._id !== tagToDelete._id);
                await this.writeData('tags.json', updatedTags);

                const updatedBlogs = (await this.blogs.find({})).map(blog => ({
                    ...blog,
                    tags: blog.tags?.filter(tid => tid !== tagToDelete._id) || []
                }));
                await this.writeData('blogs.json', updatedBlogs);

                return tagToDelete;
            }
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
            
            updateMany: async (filter: Filter<User>, {_id, ...update}: Filter<User>) => {
                let users = await this.readData<User>('users.json');
                const updatedUsers: User[] = [];
                
                users = users.map((user: any) => {
                    if (Object.keys(filter).every(key => user[key] === (filter as any)[key])) {
                        const updatedUser = {...user, ...update, updatedAt: Date.now()};
                        updatedUsers.push(updatedUser);
                        return updatedUser;
                    }
                    return user;
                });
                
                await this.writeData('users.json', users);
                return updatedUsers;
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
}

