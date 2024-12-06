import BasePage from "../../components/utils/BasePage";

export default function Dashboard() {
  return (
    <BasePage title="Dashboard">
      <h1 className="text-5xl font-bold text-center mb-12 glitch">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 p-8">
        {["Blogs", "Tags", "Categories", "Authors"].map((item) => (
          <a key={item} href={`/api/next-blog/dashboard/${item.toLowerCase()}`} className="w-full">
            <div className="p-16 bg-[#1e1e1e] text-green-400 rounded-xl shadow-2xl hover:bg-[#00FF00] hover:text-black hover:scale-105 hover:shadow-[0px_20px_50px_rgba(0,255,0,0.3)] transition-all duration-300 ease-in-out transform text-center glitch-box">
              <h2 className="text-2xl font-bold">{item}</h2>
            </div>
          </a>
        ))}
      </div>
    </BasePage>
  );
}
