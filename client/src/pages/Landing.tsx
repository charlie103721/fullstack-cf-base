import { Link } from "react-router";
import { Button } from "@/components/ui/button";

const APP_NAME = __APP_NAME__;
const APP_SUBTITLE = "A fullstack Cloudflare Workers app";

export default function Landing() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-5xl font-bold tracking-tight">{APP_NAME}</h1>
      <p className="text-xl text-muted-foreground">{APP_SUBTITLE}</p>
      <Button asChild size="lg">
        <Link to="/dashboard">Get Started</Link>
      </Button>
    </main>
  );
}
