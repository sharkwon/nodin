import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatedRoutes, PageTransition } from "@/components/AnimatedRoutes";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import Index from "./pages/Index";
import CoveragePage from "./pages/Coverage";
import SearchPage from "./pages/Search";
import ResearchPage from "./pages/Research";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: { retry: 1 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-1">
              <AnimatedRoutes>
                <Routes>
                  <Route path="/" element={<PageTransition transition="slide-up"><Index /></PageTransition>} />
                  <Route path="/coverage" element={<PageTransition transition="fade"><CoveragePage /></PageTransition>} />
                  <Route path="/search" element={<PageTransition transition="fade"><SearchPage /></PageTransition>} />
                  <Route path="/research" element={<PageTransition transition="fade"><ResearchPage /></PageTransition>} />
                  <Route path="*" element={<PageTransition transition="fade"><NotFound /></PageTransition>} />
                </Routes>
              </AnimatedRoutes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
