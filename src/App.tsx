
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FreezeDryerCalculator from "./pages/FreezeDryerCalculator";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  return (
    <Router>
      <TooltipProvider>
        <Toaster position="top-center" richColors />
        <Routes>
          <Route path="/" element={<FreezeDryerCalculator />} />
        </Routes>
      </TooltipProvider>
    </Router>
  );
}

export default App;
