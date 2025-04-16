
import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { terpenes } from "@/utils/terpeneData";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TerpeneSelectorProps {
  selectedTerpenes: string[];
  onChange: (selectedTerpenes: string[]) => void;
}

export function TerpeneSelector({ selectedTerpenes, onChange }: TerpeneSelectorProps) {
  const [open, setOpen] = useState(false);
  
  const toggleTerpene = (terpene: string) => {
    if (selectedTerpenes.includes(terpene)) {
      onChange(selectedTerpenes.filter(t => t !== terpene));
    } else {
      onChange([...selectedTerpenes, terpene]);
    }
  };
  
  const selectAll = () => {
    onChange(terpenes.map(t => t.name));
  };
  
  const clearAll = () => {
    onChange([]);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span>Select Terpenes ({selectedTerpenes.length})</span>
          <span className="sr-only">Toggle terpene selection</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 flex items-center justify-between border-b">
          <h4 className="font-medium text-sm">Terpenes</h4>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              className="h-8 px-2 text-xs" 
              onClick={selectAll}
            >
              Select All
            </Button>
            <Button 
              variant="ghost" 
              className="h-8 px-2 text-xs text-muted-foreground" 
              onClick={clearAll}
            >
              Clear
            </Button>
          </div>
        </div>
        <ScrollArea className="h-80 overflow-auto">
          <div className="p-2">
            {terpenes.map((terpene) => {
              const isSelected = selectedTerpenes.includes(terpene.name);
              return (
                <div
                  key={terpene.name}
                  className={cn(
                    "flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer",
                    isSelected && "bg-accent/50"
                  )}
                  onClick={() => toggleTerpene(terpene.name)}
                >
                  <div 
                    className={cn(
                      "h-4 w-4 border rounded-sm flex items-center justify-center",
                      isSelected ? "bg-primary border-primary" : "border-primary/30"
                    )}
                  >
                    {isSelected && <CheckIcon className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="block h-3 w-3 rounded-full" 
                      style={{ backgroundColor: terpene.color }} 
                    />
                    <span className="text-sm">{terpene.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
