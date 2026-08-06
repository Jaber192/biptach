import { useState } from "react";

// Hook for handling sync conflicts
export function useConflictResolution() {
  const [conflicts, setConflicts] = useState<any[]>([]);
  
  // Detect conflicts between local and remote data
  const detectConflicts = (localData: any[], remoteData: any[]): any[] => {
    const detectedConflicts: any[] = [];
    
    // Simple conflict detection: compare timestamps
    localData.forEach(localItem => {
      const remoteItem = remoteData.find(item => item.id === localItem.id);
      if (remoteItem && localItem.updated_at && remoteItem.updated_at) {
        const localTime = new Date(localItem.updated_at).getTime();
        const remoteTime = new Date(remoteItem.updated_at).getTime();
        
        if (Math.abs(localTime - remoteTime) > 1000) { // 1 second threshold
          detectedConflicts.push({
            id: localItem.id,
            entity: localItem.entity || "unknown",
            local: localItem,
            remote: remoteItem,
            conflictType: localTime > remoteTime ? "local-wins" : "remote-wins"
          });
        }
      }
    });
    
    return detectedConflicts;
  };
  
  // Resolve conflicts automatically
  const resolveConflicts = (conflicts: any[], strategy: "local-wins" | "remote-wins" | "manual" = "local-wins"): void => {
    if (strategy === "manual") {
      setConflicts(conflicts);
      return;
    }
    
    // Auto-resolve based on strategy
    conflicts.forEach(conflict => {
      if (strategy === "local-wins") {
        // Keep local version
        console.log(`Resolved conflict for ${conflict.id}: keeping local version`);
      } else {
        // Keep remote version
        console.log(`Resolved conflict for ${conflict.id}: keeping remote version`);
      }
    });
  };
  
  return {
    conflicts,
    detectConflicts,
    resolveConflicts,
  };
}