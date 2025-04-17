
import { useEffect, useState } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectGroup,
  SelectLabel
} from "@/components/ui/select";
import { terpenes, getTerpeneGroups } from "@/utils/terpeneData";

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

  const handleSelectionChange = (value: string) => {
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
    } else {
      // For specific terpene selections
      const currentSelection = [...selectedTerpenes];
      
      if (currentSelection.includes(value)) {
        onChange(currentSelection.filter(t => t !== value));
      } else {
        onChange([...currentSelection, value]);
      }
      
      setSelectionMode('custom');
    }
  };
  
  return (
    <Select value={selectionMode} onValueChange={handleSelectionChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select terpenes to display" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Terpene Groups</SelectLabel>
          <SelectItem value="all">All Terpenes</SelectItem>
          <SelectItem value="major">Major Terpenes</SelectItem>
          <SelectItem value="minor">Minor Terpenes</SelectItem>
          <SelectItem value="none">No Terpenes</SelectItem>
        </SelectGroup>
        
        <SelectGroup>
          <SelectLabel>Major Terpenes</SelectLabel>
          {terpeneGroups.major.map(terpene => (
            <SelectItem key={terpene.name} value={terpene.name}>
              {terpene.name} ({terpene.boilingPoint}°C)
            </SelectItem>
          ))}
        </SelectGroup>
        
        <SelectGroup>
          <SelectLabel>Minor Terpenes</SelectLabel>
          {terpeneGroups.minor.map(terpene => (
            <SelectItem key={terpene.name} value={terpene.name}>
              {terpene.name} ({terpene.boilingPoint}°C)
            </SelectItem>
          ))}
        </SelectGroup>
        
        <SelectGroup>
          <SelectLabel>Other Terpenes</SelectLabel>
          {terpeneGroups.other.map(terpene => (
            <SelectItem key={terpene.name} value={terpene.name}>
              {terpene.name} ({terpene.boilingPoint}°C)
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
