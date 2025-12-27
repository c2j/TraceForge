import React, { useState, useEffect } from 'react';
import { useForgeStore } from '../stores/useForgeStore';
import { ChevronDown, Check, Chrome, AlertCircle } from 'lucide-react';

interface KernelSelectorProps {
  selectedKernelIds: string[];
  onSelectionChange: (kernelIds: string[]) => void;
  mode?: 'single' | 'multi';
  disabled?: boolean;
  label?: string;
}

const KernelSelector: React.FC<KernelSelectorProps> = ({
  selectedKernelIds,
  onSelectionChange,
  mode = 'single',
  disabled = false,
  label = 'Select Kernel',
}) => {
  const { kernels, loadKernels } = useForgeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadKernels();
  }, [loadKernels]);

  const compatibleKernels = kernels.filter(k => k.is_compatible);
  const hasKernels = compatibleKernels.length > 0;

  const handleToggleKernel = (kernelId: string) => {
    if (mode === 'single') {
      onSelectionChange([kernelId]);
      setIsOpen(false);
    } else {
      if (selectedKernelIds.includes(kernelId)) {
        onSelectionChange(selectedKernelIds.filter(id => id !== kernelId));
      } else {
        onSelectionChange([...selectedKernelIds, kernelId]);
      }
    }
  };

  const handleSelectAll = () => {
    const allCompatibleIds = compatibleKernels.map(k => k.id);
    onSelectionChange(allCompatibleIds);
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelectionChange([]);
  };

  const getSelectedLabel = () => {
    if (selectedKernelIds.length === 0) return label;
    if (selectedKernelIds.length === 1) {
      const kernel = kernels.find(k => k.id === selectedKernelIds[0]);
      return kernel ? `${kernel.name} ${kernel.version}` : label;
    }
    return `${selectedKernelIds.length} kernels selected`;
  };

  const filteredKernels = compatibleKernels.filter(kernel =>
    kernel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kernel.version.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || !hasKernels}
        className={`
          w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-left transition-colors
          ${disabled ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-surface border-slate-600 text-white hover:border-slate-500 cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-2">
          <Chrome className="w-4 h-4 text-slate-400" />
          <span className="text-sm">{getSelectedLabel()}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && hasKernels && (
        <div className="absolute z-50 w-full mt-2 bg-surface border border-slate-600 rounded-lg shadow-xl max-h-80 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-700">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search kernels..."
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            />
          </div>

          {/* Multi-select Actions */}
          {mode === 'multi' && (
            <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700">
              <span className="text-xs text-slate-400">{selectedKernelIds.length} of {compatibleKernels.length} selected</span>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-primary hover:text-blue-400"
                >
                  Select All
                </button>
                <button
                  onClick={handleClear}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Kernel List */}
          <div className="overflow-y-auto flex-1">
            {filteredKernels.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                No matching kernels found
              </div>
            ) : (
              filteredKernels.map((kernel) => {
                const isSelected = selectedKernelIds.includes(kernel.id);
                return (
                  <button
                    key={kernel.id}
                    type="button"
                    onClick={() => handleToggleKernel(kernel.id)}
                    className={`
                      w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-700/50 transition-colors
                      ${isSelected ? 'bg-primary/20' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-5 h-5 rounded border flex items-center justify-center transition-colors
                        ${isSelected ? 'bg-primary border-primary' : 'border-slate-500'}
                      `}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <Chrome className="w-4 h-4 text-slate-400" />
                      <div className="text-left">
                        <div className="text-sm text-white font-medium">{kernel.name}</div>
                        <div className="text-xs text-slate-500">{kernel.version}</div>
                      </div>
                    </div>
                    {kernel.is_default_agent && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Incompatible Notice */}
          {kernels.some(k => !k.is_compatible) && (
            <div className="px-3 py-2 bg-yellow-500/10 border-t border-yellow-500/20">
              <div className="flex items-center gap-2 text-xs text-yellow-400">
                <AlertCircle className="w-3 h-3" />
                <span>
                  {kernels.filter(k => !k.is_compatible).length} incompatible kernel(s) hidden
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Kernels Notice */}
      {isOpen && !hasKernels && (
        <div className="absolute z-50 w-full mt-2 bg-surface border border-slate-600 rounded-lg shadow-xl p-4">
          <div className="text-center text-slate-400 text-sm">
            <Chrome className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>No compatible kernels found</p>
            <p className="text-xs mt-1">Add Chrome kernels in Kernel Manager</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default KernelSelector;
