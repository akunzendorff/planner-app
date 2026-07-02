import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-24 text-center">
      <p className="text-6xl font-light text-muted-foreground/30 mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>404</p>
      <h1 className="text-2xl font-medium mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Página não encontrada</h1>
      <p className="text-sm text-muted-foreground mb-8">Esse endereço não existe no planner.</p>
      <Link to="/" className="text-sm text-accent hover:underline">Voltar ao início</Link>
    </main>
  );
}
