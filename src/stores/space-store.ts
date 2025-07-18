import { create } from "zustand";
import { Space, Window } from "../types/space";
import { listSpace, getSpaceWindows, removeSpaceById, gotoSpace, getAllWindows, focusWindow } from "../utils/space";
import { callHammerspoon } from "../utils/call-hammerspoon";
import { tryit, sleep } from "radash";
import { showFailureToast } from "@raycast/utils";
import { getApplications } from "@raycast/api";

/**
 * Space store interface for managing space-related state and actions
 */
interface SpaceStore {
  /** List of all spaces */
  spaces: Space[];
  /** Global loading state */
  isLoading: boolean;
  /** Windows data for each space, keyed by space ID */
  spaceWindows: Record<string, Window[]>;
  /** Loading state for windows of each space, keyed by space ID */
  loadingWindows: Record<string, boolean>;
  /** Currently selected space ID */
  selectedSpaceId: string | null;
  /** Application icons cache, keyed by application name */
  appIcons: Record<string, string>;
  /** All windows from all spaces */
  allWindows: Window[];
  /** Loading state for all windows */
  isLoadingAllWindows: boolean;
  /** Window snapshots cache, keyed by window ID */
  windowSnapshots: Record<string, string>;
  /** Loading state for window snapshots, keyed by window ID */
  loadingSnapshots: Record<string, boolean>;
  /** Currently selected window ID */
  selectedWindowId: string | null;

  /** Fetch all spaces from the system */
  fetchSpaces: () => Promise<void>;
  /** Fetch windows for a specific space */
  fetchSpaceWindows: (spaceId: string) => Promise<void>;
  /** Fetch application icons for given application names */
  fetchApplicationIcons: (applicationNames: string[]) => Promise<void>;
  /** Remove a space by ID */
  removeSpace: (spaceId: string) => Promise<void>;
  /** Navigate to a specific space */
  goToSpace: (spaceId: string) => Promise<void>;
  /** Set the currently selected space ID */
  setSelectedSpaceId: (spaceId: string | null) => void;
  /** Fetch all windows from all spaces */
  fetchAllWindows: () => Promise<void>;
  /** Focus a window by ID */
  focusWindow: (windowId: string) => Promise<void>;
  /** Fetch snapshot for a specific window */
  fetchWindowSnapshot: (windowId: string) => Promise<void>;
  /** Set the currently selected window ID */
  setSelectedWindowId: (windowId: string | null) => void;
}

/**
 * Zustand store for managing space-related state
 */
export const useSpaceStore = create<SpaceStore>((set, get) => ({
  /** Initial state */
  spaces: [],
  isLoading: true,
  spaceWindows: {},
  loadingWindows: {},
  selectedSpaceId: null,
  appIcons: {},
  allWindows: [],
  isLoadingAllWindows: false,
  windowSnapshots: {},
  loadingSnapshots: {},
  selectedWindowId: null,

  /**
   * Fetch all spaces from the system
   * @returns Promise that resolves when spaces are fetched
   */
  fetchSpaces: async () => {
    set({ isLoading: true });
    const [err, res] = await tryit(listSpace)();
    set({ isLoading: false });

    if (err) {
      showFailureToast(err);
      return;
    }

    set({ spaces: res });
  },

  /**
   * Fetch application icons for given application names
   * @param applicationNames - Array of application names to fetch icons for
   * @returns Promise that resolves when icons are fetched
   */
  fetchApplicationIcons: async (applicationNames: string[]) => {
    const [err, applications] = await tryit(getApplications)();
    if (err) {
      console.error("Failed to fetch applications:", err);
      return;
    }

    const newAppIcons: Record<string, string> = {};
    applicationNames.forEach((appName) => {
      const app = applications.find((app) => app.name === appName);
      if (app) {
        newAppIcons[appName] = app.path;
      }
    });

    set((state: SpaceStore) => ({
      appIcons: { ...state.appIcons, ...newAppIcons },
    }));
  },

  /**
   * Fetch windows for a specific space
   * @param spaceId - The ID of the space to fetch windows for
   * @returns Promise that resolves when windows are fetched
   */
  fetchSpaceWindows: async (spaceId: string) => {
    const { spaceWindows, loadingWindows, appIcons } = get();

    if (spaceWindows[spaceId] || loadingWindows[spaceId]) {
      console.log("🚀 ~ fetchSpaceWindows ~ skipping, already loaded or loading");
      return;
    }

    set((state: SpaceStore) => ({
      isLoading: true,
      loadingWindows: { ...state.loadingWindows, [spaceId]: true },
    }));

    await sleep(100);
    const [err, windows] = await tryit(getSpaceWindows)(spaceId);

    set((state: SpaceStore) => ({
      loadingWindows: { ...state.loadingWindows, [spaceId]: false },
    }));

    // Reset loading after a delay
    setTimeout(() => {
      set({ isLoading: false });
    }, 200);

    if (err) {
      showFailureToast(err);
      return;
    }

    set((state: SpaceStore) => ({
      spaceWindows: { ...state.spaceWindows, [spaceId]: windows },
    }));

    // Fetch application icons for new applications
    const newAppNames = windows.map((window) => window.application).filter((appName) => !appIcons[appName]);

    if (newAppNames.length > 0) {
      get().fetchApplicationIcons(newAppNames);
    }
  },

  /**
   * Remove a space by ID
   * @param spaceId - The ID of the space to remove
   * @returns Promise that resolves when space is removed
   */
  removeSpace: async (spaceId: string) => {
    const [err] = await tryit(removeSpaceById)(spaceId);
    if (err) {
      showFailureToast(err);
      return;
    }

    // Remove space from list and clean up related data
    set((state: SpaceStore) => {
      const newSpaceWindows = { ...state.spaceWindows };
      const newLoadingWindows = { ...state.loadingWindows };
      delete newSpaceWindows[spaceId];
      delete newLoadingWindows[spaceId];

      return {
        spaces: state.spaces.filter((space: Space) => space.id !== spaceId),
        spaceWindows: newSpaceWindows,
        loadingWindows: newLoadingWindows,
      };
    });
  },

  /**
   * Navigate to a specific space
   * @param spaceId - The ID of the space to navigate to
   * @returns Promise that resolves when navigation is complete
   */
  goToSpace: async (spaceId: string) => {
    const [err] = await tryit(gotoSpace)(spaceId);
    if (err) {
      showFailureToast(err);
      return;
    }

    // Update current space in the list
    set((state: SpaceStore) => ({
      spaces: state.spaces.map((space: Space) => ({
        ...space,
        isCurrent: space.id === spaceId,
      })),
    }));
  },

  /**
   * Set the currently selected space ID and fetch its windows if needed
   * @param spaceId - The ID of the space to select, or null to deselect
   */
  setSelectedSpaceId: (spaceId: string | null) => {
    set({ selectedSpaceId: spaceId });

    if (spaceId) {
      const { spaceWindows, loadingWindows } = get();
      // Only fetch windows if we don't already have them
      if (!spaceWindows[spaceId] && !loadingWindows[spaceId]) {
        get().fetchSpaceWindows(spaceId);
      }
    }
  },

  /**
   * Fetch all windows from all spaces
   * @returns Promise that resolves when all windows are fetched
   */
  fetchAllWindows: async () => {
    set({ isLoadingAllWindows: true });
    const [err, windows] = await tryit(getAllWindows)();
    set({ isLoadingAllWindows: false });

    if (err) {
      showFailureToast(err);
      return;
    }

    set({ allWindows: windows });

    // Fetch app icons for all unique applications
    const uniqueApps = Array.from(new Set(windows.map((w) => w.application)));
    get().fetchApplicationIcons(uniqueApps);
  },

  /**
   * Focus a window by ID
   * @param windowId - The ID of the window to focus
   * @returns Promise that resolves when the window is focused
   */
  focusWindow: async (windowId: string) => {
    const [err] = await tryit(focusWindow)(windowId);
    if (err) {
      showFailureToast(err);
      return;
    }
  },

  /**
   * Fetch snapshot for a specific window
   * @param windowId - The ID of the window to fetch snapshot for
   * @returns Promise that resolves when the snapshot is fetched
   */
  fetchWindowSnapshot: async (windowId: string) => {
    const { windowSnapshots, loadingSnapshots } = get();

    // Don't fetch if already loading or already have snapshot
    if (loadingSnapshots[windowId] || windowSnapshots[windowId]) {
      return;
    }

    set((state) => ({
      loadingSnapshots: { ...state.loadingSnapshots, [windowId]: true },
    }));

    const [err, snapshot] = await tryit(async () => {
      const code = /* lua */ `
        local windowId = tonumber(${windowId})
        local windowFilter = hs.window.filter.new()
        local allWindows = windowFilter:getWindows()
        
        local window = nil
        for _, win in ipairs(allWindows) do
            if win:id() == windowId then
                window = win
                break
            end
        end
        
        if not window then
            error("Window not found with ID: " .. tostring(windowId))
        end
        
        if window:isMinimized() then
            return nil
        end
        
        local snapshotImage = window:snapshotForID()
        if snapshotImage then
            return snapshotImage:encodeAsURLString()
        end
        
        return nil
      `;

      return await callHammerspoon(code);
    })();

    set((state) => ({
      loadingSnapshots: { ...state.loadingSnapshots, [windowId]: false },
    }));

    if (err) {
      console.error("Failed to fetch window snapshot:", err);
      return;
    }

    if (snapshot) {
      set((state) => ({
        windowSnapshots: { ...state.windowSnapshots, [windowId]: snapshot },
      }));
    }
  },

  /**
   * Set the currently selected window ID
   * @param windowId - The ID of the window to select, or null to deselect
   */
  setSelectedWindowId: (windowId: string | null) => {
    console.log("🚀 ~ space-store.ts:333 ~ windowId:", windowId);

    // TODO performance issue
    // set({ selectedWindowId: windowId });

    // if (windowId) {
    //   const { windowSnapshots, loadingSnapshots } = get();
    //   // Only fetch snapshot if we don't already have it
    //   if (!windowSnapshots[windowId] && !loadingSnapshots[windowId]) {
    //     get().fetchWindowSnapshot(windowId);
    //   }
    // }
  },
}));
