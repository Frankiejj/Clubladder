
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import MyMatches from "./pages/MyMatches";
import ClubManagement from "./pages/ClubManagement";
import ClubAdmin from "./pages/ClubAdmin";
import Registration from "./pages/Registration";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import MyLadder from "./pages/MyLadder";
import MyClub from "./pages/MyClub";
import Auth from "./pages/Auth";
import AddClub from "./pages/AddClub";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import NotFound from "./pages/NotFound";
import TeamDetails from "./pages/TeamDetails";
import Rules from "./pages/Rules";
import Terms from "./pages/Terms";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/app" element={<Index />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/my-matches" element={<MyMatches />} />
          <Route path="/club-management" element={<ClubManagement />} />
          <Route path="/club-admin" element={<ClubAdmin />} />
          <Route path="/add-club" element={<AddClub />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/super-admin" element={<SuperAdmin />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-ladder" element={<MyLadder />} />
          <Route path="/my-club" element={<MyClub />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/team/:membershipId" element={<TeamDetails />} />
          <Route path="/registration" element={<Registration />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
