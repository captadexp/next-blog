# Next-Blog

****

### Currently supports nextjs apps router only

**Elevate your Next.js project with seamless blogging functionality.**

Next-Blog is designed to integrate a blogging platform into your Next.js application effortlessly, akin to the
simplicity of integrating NextAuth today.

**Currently, Next-Blog is a work in progress and I'm excited to invite collaborators to join me in this journey.**
Whether you're interested in coding, documentation, design, or testing, I welcome contributions of all kinds to make
Next-Blog robust and user-friendly.

![Folder Structure](https://github.com/captadexp/next-blog/blob/main/images/apps-router-folder-structure.png?raw=true)


### Quick Start

To add Next-Blog to your project, follow these simple steps:

1. **Install Next-Blog**

   First, ensure you have Next.js set up.
   Then, install Next-Blog by adding it to your project dependencies.
   ```shell
   npm i @supergrowthai/next-blog
   ```

2. **Link Next-Blog to Your Project**
 
   Run the following command to link Next-Blog in your project
   ```shell
   npm link @supergrowthai/next-blog
   ```


3. Create a new route at ```app/api/sgai-blog/[...page]/route.ts```


4. **Update Your Route Configuration**

   In your route.ts, integrate Next-Blog. Initially, bypass security for local development, and later, remove it for production environments:

   ```typescript
   import nextBlog from "@supergrowthai/next-blog";
   import FileDBProvider from "@supergrowthai/next-blog/adapters/FileDBAdapter";

   // For the first run in local development:
   const dbProvider = async () => new FileDBProvider("dataPath/");
   const { GET, POST } = nextBlog({ db: dbProvider, byPassSecurity: true });

   export { GET, POST };
   ```

<<<<<<< HEAD
   **After author creation** : Once your author is created successfully, remove ```byPassSecurity: true``` for a production-ready setup:
=======
   -**After author creation** : Once your author is created successfully, remove ```byPassSecurity: true``` for a production-ready setup:
>>>>>>> 1f8df7f36243aa7947ea55fcc3c894f2b2941a4b

   ```shell
   const { GET, POST } = nextBlog({ db: dbProvider });
   ```



5. **Create a DataPath Folder**

   Create a dataPath folder in the root of your project. The required files authors.json, blogs.json, categories.json, and tags.json will be automatically created when the project runs.

6. **Run the Development Server**

   Now, run the project using following commands
   
   ```shell
   npm run dev
   ```

   You can access the blogging dashboard at
   
   ```shell
   http://localhost:3000/api/next-blog/dashboard/blogs
   ```


### Roadmap

Here are the next steps on our journey to enhance Next-Blog:

- [x] Project initialization.
- [x] Added a simple database adapter (JSONFile + MongoDB).
- [x] Implement internal dashboard pages for managing posts, complete with an editor.
- [ ] Create hooks for accessing the blog content by slug
- [ ] Introduce configuration options for managing pages, tags, and filters.
- [ ] Create a sample theme to kickstart your blog aesthetics.
- [ ] And more - we're open to suggestions!

### Get Involved

I'm looking for contributors to help develop features, write documentation, design user interfaces, and more. If
you're passionate about making content creation accessible and straightforward for Next.js developers, I'd love to hear
from you.

**Join me in shaping the future of blogging in Next.js. Together, we can build something amazing.**

---

