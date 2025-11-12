import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdvancedFilters({ filters, onFiltersChange, filterConfig }) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = Object.values(filters).filter(v => 
    v && v !== "all" && v !== "" && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  const handleReset = () => {
    const resetFilters = {};
    Object.keys(filters).forEach(key => {
      resetFilters[key] = Array.isArray(filters[key]) ? [] : "";
    });
    onFiltersChange(resetFilters);
  };

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 relative">
          <Filter className="w-4 h-4" />
          Filtres avancés
          {activeFiltersCount > 0 && (
            <Badge className="ml-1 bg-orange-600 text-white px-1.5 py-0.5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Filtres avancés</h4>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 text-xs"
              >
                Réinitialiser
              </Button>
            )}
          </div>

          {filterConfig.map((config) => (
            <div key={config.key} className="space-y-2">
              <Label htmlFor={config.key}>{config.label}</Label>
              {config.type === "select" && (
                <Select
                  value={filters[config.key] || "all"}
                  onValueChange={(value) => handleFilterChange(config.key, value)}
                >
                  <SelectTrigger id={config.key}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {config.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {config.type === "date" && (
                <Input
                  id={config.key}
                  type="date"
                  value={filters[config.key] || ""}
                  onChange={(e) => handleFilterChange(config.key, e.target.value)}
                />
              )}
              {config.type === "number" && (
                <Input
                  id={config.key}
                  type="number"
                  placeholder={config.placeholder}
                  value={filters[config.key] || ""}
                  onChange={(e) => handleFilterChange(config.key, e.target.value)}
                />
              )}
              {config.type === "multiselect" && (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {config.options.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(filters[config.key] || []).includes(option.value)}
                        onChange={(e) => {
                          const current = filters[config.key] || [];
                          const newValue = e.target.checked
                            ? [...current, option.value]
                            : current.filter(v => v !== option.value);
                          handleFilterChange(config.key, newValue);
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="pt-4 border-t flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              Fermer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}