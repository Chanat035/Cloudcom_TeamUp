// components/MainLayout.jsx
import Header from "@/app/component/header.jsx"

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-pink-50">
      <Header />
      <main className="max-w-full mx-auto px-4 md:px-8 py-6">{children}</main>
    </div>
  );
}