import nextBlog from "@supergrowthai/next-blog"
import FileDBAdapter from "@supergrowthai/next-blog/adapters/FileDBAdapter"

const dbProvider = async () => new FileDBAdapter("./data/")
const {GET, POST} = nextBlog({db: dbProvider})

export { GET, POST };