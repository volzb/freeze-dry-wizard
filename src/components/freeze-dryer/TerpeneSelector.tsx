
import { useEffect, useState } from "react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { terpenes, getTerpeneGroups } from "@/utils/terpeneData";
import { ChevronDown } from "lucide-react";

interface TerpeneSelectorProps {
  selectedTerpenes: string[];
  onChange: (selected: string[]) => void;
}

export function TerpeneSelector({ selectedTerpenes, onChange }: TerpeneSelectorProps) {
  const [selectionMode, setSelectionMode] = useState<'none' | 'all' | 'major' | 'minor' | 'custom'>('major');
  const terpeneGroups = getTerpeneGroups();

  // Initialize with major terpenes
  useEffect(() => {
    if (selectedTerpenes.length === 0) {
      const majorTerpenes = terpeneGroups.major.map(t => t.name);
      onChange(majorTerpenes);
      setSelectionMode('major');
    } else {
      // Determine the current selection mode
      const allTerpeneNames = terpenes.map(t => t.name);
      const majorTerpeneNames = terpeneGroups.major.map(t => t.name);
      const minorTerpeneNames = terpeneGroups.minor.map(t => t.name);
      
      if (selectedTerpenes.length === 0) {
        setSelectionMode('none');
      } else if (selectedTerpenes.length === allTerpeneNames.length) {
        setSelectionMode('all');
      } else if (
        selectedTerpenes.length === majorTerpeneNames.length && 
        majorTerpeneNames.every(name => selectedTerpenes.includes(name))
      ) {
        setSelectionMode('major');
      } else if (
        selectedTerpenes.length === minorTerpeneNames.length && 
        minorTerpeneNames.every(name => selectedTerpenes.includes(name))
      ) {
        setSelectionMode('minor');
      } else {
        setSelectionMode('custom');
      }
    }
  }, []);

  const handleGroupSelection = (value: 'all' | 'major' | 'minor' | 'none') => {
    if (value === 'all') {
      onChange(terpenes.map(t => t.name));
      setSelectionMode('all');
    } else if (value === 'none') {
      onChange([]);
      setSelectionMode('none');
    } else if (value === 'major') {
      onChange(terpeneGroups.major.map(t => t.name));
      setSelectionMode('major');
    } else if (value === 'minor') {
      onChange(terpeneGroups.minor.map(t => t.name));
      setSelectionMode('minor');
    }
  };
  
  const handleTerpeneToggle = (terpeneName: string, checked: boolean) => {
    const currentSelection = [...selectedTerpenes];
    
    if (checked && !currentSelection.includes(terpeneName)) {
      onChange([...currentSelection, terpeneName]);
    } else if (!checked && currentSelection.includes(terpeneName)) {
      onChange(currentSelection.filter(t => t !== terpeneName));
    }
    
    setSelectionMode('custom');
  };
  
  // Get current display text based on selection mode
  const getDisplayText = () => {
    switch (selectionMode) {
      case 'all': return 'All Terpenes';
      case 'major': return 'Major Terpenes';
      case 'minor': return 'Minor Terpenes';
      case 'none': return 'No Terpenes';
      case 'custom': return `${selectedTerpenes.length} Terpenes Selected`;
      default: return 'Select Terpenes';
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full flex justify-between">
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 max-h-80 overflow-auto bg-popover">
        <DropdownMenuLabel>Terpene Groups</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => handleGroupSelection('all')}>
          <div className="flex items-center space-x-2">
            <Checkbox 
              checked={selectionMode === 'all'} 
              onCheckedChange={() => handleGroupSelection('all')}
              id="all-terpenes"
            />
            <label htmlFor="all-terpenes" className="cursor-pointer flex-1">All Terpenes</label>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleGroupSelection('major')}>
          <div className="flex items-center space-x-2">
            <Checkbox 
              checked={selectionMode === 'major'} 
              onCheckedChange={() => handleGroupSelection('major')}
              id="major-terpenes"
            />
            <label htmlFor="major-terpenes" className="cursor-pointer flex-1">Major Terpenes</label>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleGroupSelection('minor')}>
          <div className="flex items-center space-x-2">
            <Checkbox 
              checked={selectionMode === 'minor'} 
              onCheckedChange={() => handleGroupSelection('minor')}
              id="minor-terpenes"
            />
            <label htmlFor="minor-terpenes" className="cursor-pointer flex-1">Minor Terpenes</label>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleGroupSelection('none')}>
          <div className="flex items-center space-x-2">
            <Checkbox 
              checked={selectionMode === 'none'} 
              onCheckedChange={() => handleGroupSelection('none')}
              id="no-terpenes"
            />
            <label htmlFor="no-terpenes" className="cursor-pointer flex-1">No Terpenes</label>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Major Terpenes</DropdownMenuLabel>
        {terpeneGroups.major.map(terpene => (
          <DropdownMenuItem 
            key={`major-${terpene.name}`}
            onSelect={(e) => e.preventDefault()}
            className="pl-2"
          >
            <div className="flex items-center space-x-2">
              <Checkbox 
                checked={selectedTerpenes.includes(terpene.name)} 
                onCheckedChange={(checked) => handleTerpeneToggle(terpene.name, checked === true)}
                id={`terpene-${terpene.name}`}
              />
              <div
                className="h-3 w-3 rounded-full mr-1"
                style={{ backgroundColor: terpene.color }}
              />
              <label 
                htmlFor={`terpene-${terpene.name}`}
                className="cursor-pointer flex-1 flex justify-between items-center"
              >
                <span>{terpene.name}</span>
                <span className="text-xs text-muted-foreground">{terpene.boilingPoint}°C</span>
              </label>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Minor Terpenes</DropdownMenuLabel>
        {terpeneGroups.minor.map(terpene => (
          <DropdownMenuItem 
            key={`minor-${terpene.name}`}
            onSelect={(e) => e.preventDefault()}
            className="pl-2"
          >
            <div className="flex items-center space-x-2">
              <Checkbox 
                checked={selectedTerpenes.includes(terpene.name)} 
                onCheckedChange={(checked) => handleTerpeneToggle(terpene.name, checked === true)}
                id={`terpene-${terpene.name}`}
              />
              <div
                className="h-3 w-3 rounded-full mr-1"
                style={{ backgroundColor: terpene.color }}
              />
              <label 
                htmlFor={`terpene-${terpene.name}`}
                className="cursor-pointer flex-1 flex justify-between items-center"
              >
                <span>{terpene.name}</span>
                <span className="text-xs text-muted-foreground">{terpene.boilingPoint}°C</span>
              </label>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Other Terpenes</DropdownMenuLabel>
        {terpeneGroups.other.map(terpene => (
          <DropdownMenuItem 
            key={`other-${terpene.name}`}
            onSelect={(e) => e.preventDefault()}
            className="pl-2"
          >
            <div className="flex items-center space-x-2">
              <Checkbox 
                checked={selectedTerpenes.includes(terpene.name)} 
                onCheckedChange={(checked) => handleTerpeneToggle(terpene.name, checked === true)}
                id={`terpene-${terpene.name}`}
              />
              <div
                className="h-3 w-3 rounded-full mr-1"
                style={{ backgroundColor: terpene.color }}
              />
              <label 
                htmlFor={`terpene-${terpene.name}`}
                className="cursor-pointer flex-1 flex justify-between items-center"
              >
                <span>{terpene.name}</span>
                <span className="text-xs text-muted-foreground">{terpene.boilingPoint}°C</span>
              </label>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
