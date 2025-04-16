
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, ThermometerSnowflake } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50">
      <header className="container mx-auto px-4 py-8">
        <nav className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Freeze-Dry Wizard</h1>
          <div>
            <Button asChild variant="outline">
              <Link to="/calculator">
                Open Calculator <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-16 flex flex-col items-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="bg-blue-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mx-auto">
            <ThermometerSnowflake className="h-8 w-8 text-blue-600" />
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
            Optimize Your Freeze Drying Process
          </h2>
          
          <p className="text-xl text-gray-600">
            Calculate precise drying parameters to maximize terpene preservation and efficiency in your freeze drying process.
          </p>
          
          <Button asChild size="lg" className="mt-8">
            <Link to="/calculator">
              Launch Calculator
            </Link>
          </Button>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-3">Terpene Preservation</h3>
            <p className="text-gray-600">
              Visualize which terpenes might be at risk during each drying step based on temperature and pressure conditions.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-3">Sublimation Calculator</h3>
            <p className="text-gray-600">
              Calculate sublimation rate and total drying time based on your specific material and equipment parameters.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-3">Multi-step Programs</h3>
            <p className="text-gray-600">
              Plan up to 8 drying steps with different temperature and pressure combinations for perfect results.
            </p>
          </div>
        </div>
      </main>
      
      <footer className="container mx-auto px-4 py-8 mt-16 text-center text-gray-600 text-sm">
        <p>Freeze-Dry Wizard Calculator © 2023 - Optimizing terpene preservation in freeze drying processes</p>
      </footer>
    </div>
  );
};

export default Index;
