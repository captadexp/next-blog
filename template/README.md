# Next-Blog Deployment Template

This is a starter template for deploying [Next-Blog](https://github.com/captadexp/next-blog), the enterprise-grade headless CMS for Next.js.

## 🚀 Deployment

Click the button below to deploy your own instance of Next-Blog to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FS-Dhruv%2Fnext-blog&project-name=next-blog-starter&repository-name=next-blog-starter&root-directory=template&install-command=bun+install&build-command=bun+run+build&teamSlug=s-dhruvs-projects&products=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22atlas%22%2C%22integrationSlug%22%3A%22mongodbatlas%22%7D%5D&skippable-integrations=1&env=NAME,DESCRIPTION,ADMIN_EMAIL,ADMIN_PASSWORD,ADMIN_USERNAME,ADMIN_NAME&envDescription=NAME%3A+Blog+name%7C+DESCRIPTION%3A+Short+blog+description%7C+SESSION_SECRET%3A+Random+string%7C+ADMIN_EMAIL%3A+Admin+email%7C+ADMIN_PASSWORD%3A+Admin+password%7C+ADMIN_USERNAME%3A+Optional+(default+admin)%7C+ADMIN_NAME%3A+Optional+display+name&envLink=https%3A%2F%2Fgithub.com%2FS-Dhruv%2Fnext-blog%23readme)

## 📋 Environment Variables

When deploying, Vercel will ask for the following Environment Variables:

### Required for Production (MongoDB)
- `MONGODB_URI`: Your MongoDB connection string (e.g. from MongoDB Atlas)
- `MONGODB_DB_NAME`: The database name (default: nextblog)

### Security
- `SESSION_SECRET`: A random 32-character string for securing sessions.
- `ADMIN_EMAIL`: The email address for the initial admin user.

### Optional (S3 Storage)
If you want to store images in S3 (highly recommended for production):
- `S3_BUCKET`: Your S3 bucket name
- `S3_REGION`: Your S3 region (e.g., us-east-1)
- `S3_ACCESS_KEY`: Your AWS Access Key ID
- `S3_SECRET_KEY`: Your AWS Secret Access Key

## 🛠 Local Development

1.  Clone your repository (created by Vercel)
2.  Install dependencies: `npm install`
3.  Copy `.env.example` to `.env` and fill in your values
4.  Run the dev server: `npm run dev`
5.  Open `http://localhost:3000/api/next-blog/dashboard`
