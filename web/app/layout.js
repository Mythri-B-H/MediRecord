import "./globals.css";

export const metadata = {
  title: "MediRecord",
  description: "Intelligent Clinical Records & Symptom-Similarity Search System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
