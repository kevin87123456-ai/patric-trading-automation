import { Route, Switch, Redirect } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import HistoryPage from "./pages/History";
import YouTube from "./pages/YouTube";
import DashboardArchive from "./pages/DashboardArchive";
import PublicArchive from "./pages/PublicArchive";
import PublicAnalysis from "./pages/PublicAnalysis";
import AboutPage from "./pages/AboutPage";
import Settings from "./pages/Settings";
import { Toaster } from "./components/ui/sonner";
import { trpc } from "@/lib/trpc";

function PrivateApp() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={Home} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/youtube" component={YouTube} />
        <Route path="/daily-viewpoint" component={DashboardArchive} />
        <Route path="/settings" component={Settings} />
        <Route>
          <div className="flex items-center justify-center py-20">
            <p className="text-zinc-400">頁面不存在</p>
          </div>
        </Route>
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  // Check if user is authenticated for routing decisions
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const isAuthenticated = !!meQuery.data;
  const isLoading = meQuery.isLoading;

  return (
    <>
      <Toaster position="top-right" richColors />
      <Switch>
        {/* Public routes - always accessible */}
        <Route path="/archive" component={PublicArchive} />
        <Route path="/analysis/:slug" component={PublicAnalysis} />
        <Route path="/about" component={AboutPage} />

        {/* Root: if authenticated go to dashboard, otherwise show archive */}
        <Route path="/">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-screen bg-background">
              <div className="animate-spin">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            </div>
          ) : isAuthenticated ? (
            <Redirect to="/dashboard" />
          ) : (
            <Redirect to="/archive" />
          )}
        </Route>

        {/* Private routes - wrapped in PrivateApp (DashboardLayout) */}
        {/* These routes will only show DashboardLayout if user is authenticated */}
        <Route path="/dashboard" component={PrivateApp} />
        <Route path="/history" component={PrivateApp} />
        <Route path="/youtube" component={PrivateApp} />
        <Route path="/daily-viewpoint" component={PrivateApp} />
        <Route path="/settings" component={PrivateApp} />

        {/* Catch-all: redirect to archive for visitors, or show PrivateApp for authenticated */}
        <Route>
          {isLoading ? (
            <div className="flex items-center justify-center min-h-screen bg-background">
              <div className="animate-spin">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            </div>
          ) : isAuthenticated ? (
            <PrivateApp />
          ) : (
            <Redirect to="/archive" />
          )}
        </Route>
      </Switch>
    </>
  );
}

export default App;
