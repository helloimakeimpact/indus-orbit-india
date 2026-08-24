import { createContext, useContext } from "react";
import type { IoWorkspaceView } from "@/features/io/io-workspace-view";

export const IoWorkspaceViewContext = createContext<IoWorkspaceView>("overview");

export function useIoWorkspaceView() {
  return useContext(IoWorkspaceViewContext);
}
