import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import HistoryPage from "./pages/History";
import YouTube from "./pages/YouTube";
import PublicArchive from "./pages/PublicArchive";
import PublicAnalysis from "./pages/PublicAnalysis";
import { Toaster } from "./components/ui/sonner";

function PrivateApp() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/youtube" component={YouTube} />
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
  return (
    <>
      <Toaster position="top-right" richColors />
      <Switch>
        {/* Public routes - no auth required */}
        <Route path="/archive" component={PublicArchive} />
        <Route path="/analysis/:slug" component={PublicAnalysis} />
        {/* Private routes - wrapped in DashboardLayout with auth */}
        <Route component={PrivateApp} />
      </Switch>
    </>
  );
}

export default App;
