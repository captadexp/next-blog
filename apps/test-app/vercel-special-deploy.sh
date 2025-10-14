NEXT_BLOG_DATA_PATH=/tmp
bun --cwd=../.. run build
bun --cwd=../.. i
mkdir -p "public/api/next-blog/dashboard/static/"
cp -r ../../packages/core/dist/nextjs/assets/@supergrowthai/next-blog-dashboard/static/* ./public/api/next-blog/dashboard/static/
bun build-plugins.ts
next build