
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FreezeDryerCalculator from "./pages/FreezeDryerCalculator";
import { Toaster } from "sonner";

function App() {
  return (
    <Router>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/" element={<FreezeDryerCalculator />} />
      </Routes>
    </Router>
  );
}

export default App;
