import {promises as fs} from "fs";
import {Author, AuthorData, Blog, BlogData, Category, CategoryData, DatabaseProvider, Tag, TagData} from "../database";
import {v4 as uuidv4} from 'uuid';

type Filter<T> = Partial<Record<keyof T, any>>;

const fileDBProvider = (dataPath: string) => {

    async function readData<T>(fileName: string): Promise<T[]> {
        try {
            const data = await fs.readFile(dataPath + fileName, {encoding: 'utf8'});
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading file:', error);
            return [];
        }
    }

    async function writeData<T>(fileName: string, data: T[]): Promise<void> {
        try {
            await fs.writeFile(dataPath + fileName, JSON.stringify(data, null, 2), {encoding: 'utf8'});
        } catch (error) {
            console.error('Error writing to file:', error);
        }
    }

    return ({
        blogs: {
            findOne: async (filter: Filter<Blog>): Promise<Blog> => {
                const blogs = await readData<Blog>('blogs.json');
                return blogs.find((blog: any) => Object.keys(filter).every((key: any) => blog[key] === (filter as any)[key]))!;
            },

            find: async (filter: Filter<Blog>): Promise<Blog[]> => {
                const blogs = await readData<Blog>('blogs.json');
                return blogs.filter((blog: any) => Object.keys(filter).every(key => blog[key] === (filter as any)[key]));
            },

            findById: async (id: string): Promise<Blog> => {
                const blogs = await readData<Blog>('blogs.json');
                return blogs.find(blog => blog._id === id)!;
            },

            create: async (data: BlogData): Promise<Blog> => {
                const blogs = await readData<Blog>('blogs.json');
                const newBlog: Blog = {...data, _id: uuidv4(), createdAt: Date.now(), updatedAt: Date.now()};
                blogs.push(newBlog);
                await writeData('blogs.json', blogs);
                return newBlog;
            },

            updateOne: async (filter: Filter<Blog>, update: Object): Promise<void> => {
                let blogs = await readData<Blog>('blogs.json');
                const blogIndex = blogs.findIndex((blog: any) => Object.keys(filter).every(key => blog[key] === (filter as any)[key]));
                if (blogIndex !== -1) {
                    blogs[blogIndex] = {...blogs[blogIndex], ...update, updatedAt: Date.now()};
                    await writeData('blogs.json', blogs);
                }
            },

            deleteOne: async (filter: Filter<Blog>): Promise<void> => {
                let blogs = await readData<Blog>('blogs.json');
                blogs = blogs.filter((blog: any) => !Object.keys(filter).every(key => blog[key] === (filter as any)[key]));
                await writeData('blogs.json', blogs);
            },
        },
        categories: {
            find: async (filter: Filter<Category>): Promise<Category[]> => {
                const blogs = await readData<Category>('categories.json');
                return blogs.filter((blog: any) => Object.keys(filter).every(key => blog[key] === (filter as any)[key]));
            },
            findById: async (id: string): Promise<Category> => {
                const categories = await readData<Category>('categories.json');
                return categories.find(category => category._id === id)!;
            },

            create: async (data: CategoryData): Promise<Category> => {
                const categories = await readData<Category>('categories.json');
                const newCategory: Category = {...data, _id: uuidv4()};
                categories.push(newCategory);
                await writeData('categories.json', categories);
                return newCategory;
            },

            updateOne: async (filter: Filter<Category>, update: Object): Promise<void> => {
                let categories = await readData<Category>('categories.json');
                const categoryIndex = categories.findIndex((category: any) => Object.keys(filter).every(key => category[key] === (filter as any)[key]));
                if (categoryIndex !== -1) {
                    categories[categoryIndex] = {...categories[categoryIndex], ...update};
                    await writeData('categories.json', categories);
                }
            },

            deleteOne: async (filter: Filter<Category>): Promise<void> => {
                let categories = await readData<Category>('categories.json');
                categories = categories.filter((category: any) => !Object.keys(filter).every(key => category[key] === (filter as any)[key]));
                await writeData('categories.json', categories);
            },
        },
        tags: {
            find: async (filter: Filter<Tag>): Promise<Tag[]> => {
                const blogs = await readData<Tag>('tags.json');
                return blogs.filter((tag: any) => Object.keys(filter).every(key => tag[key] === (filter as any)[key]));
            },
            findById: async (id: string): Promise<Tag> => {
                const tags = await readData<Tag>('tags.json');
                return tags.find(tag => tag._id === id)!;
            },

            create: async (data: TagData): Promise<Tag> => {
                const tags = await readData<Tag>('tags.json');
                const newTag: Tag = {...data, _id: uuidv4()};
                tags.push(newTag);
                await writeData('tags.json', tags);
                return newTag;
            },

            updateOne: async (filter: Filter<Tag>, update: Object): Promise<void> => {
                let tags = await readData<Tag>('tags.json');
                const tagIndex = tags.findIndex((tag: any) => Object.keys(filter).every(key => tag[key] === (filter as any)[key]));
                if (tagIndex !== -1) {
                    tags[tagIndex] = {...tags[tagIndex], ...update};
                    await writeData('tags.json', tags);
                }
            },

            deleteOne: async (filter: Filter<Tag>): Promise<void> => {
                let tags = await readData<Tag>('tags.json');
                tags = tags.filter((tag: any) => !Object.keys(filter).every(key => tag[key] === (filter as any)[key]));
                await writeData('tags.json', tags);
            },
        },
        authors: {
            find: async (filter: Filter<Author>): Promise<Author[]> => {
                const blogs = await readData<Author>('authors.json');
                return blogs.filter((author: any) => Object.keys(filter).every(key => author[key] === (filter as any)[key]));
            },
            findById: async (id: string): Promise<Author> => {
                const authors = await readData<Author>('authors.json');
                return authors.find(author => author._id === id)!;
            },

            create: async (data: AuthorData): Promise<Author> => {
                const authors = await readData<Author>('authors.json');
                const newAuthor: Author = {...data, _id: uuidv4()};
                authors.push(newAuthor);
                await writeData('authors.json', authors);
                return newAuthor;
            },

            updateOne: async (filter: Filter<Author>, update: Object): Promise<void> => {
                let authors = await readData<Author>('authors.json');
                const authorIndex = authors.findIndex((author: any) => Object.keys(filter).every(key => author[key] === (filter as any)[key]));
                if (authorIndex !== -1) {
                    authors[authorIndex] = {...authors[authorIndex], ...update};
                    await writeData('authors.json', authors);
                }
            },

            deleteOne: async (filter: Filter<Author>): Promise<void> => {
                let authors = await readData<Author>('authors.json');
                authors = authors.filter((author: any) => !Object.keys(filter).every(key => author[key] === (filter as any)[key]));
                await writeData('authors.json', authors);
            },
        }
    }) as DatabaseProvider
}
export default fileDBProvider;
