export default function BasePage({ children, title }: { children: any; title?: string }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title || "Dashboard"}</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="min-h-screen bg-black text-green-400"> 
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="w-full max-w-7xl p-12 rounded-lg bg-[#101010] text-green-400 shadow-2xl">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}