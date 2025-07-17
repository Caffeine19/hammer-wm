import { showHUD } from "@raycast/api";
import { callHammerspoon } from "./utils/call-hammerspoon";

export default async function removeCurrentSpace() {
  try {
    const code = `
-- space.lua: Space management utilities for Hammerspoon
local space = {}

-- Remove the current space (move to previous, then remove original)
function space.removeCurrentSpace()
    local currentFocusedSpaceId = hs.spaces.focusedSpace()
    local currentScreen = hs.screen.mainScreen()
    local spacesInCurrentScreen = hs.spaces.spacesForScreen(currentScreen)
    print(hs.inspect(spacesInCurrentScreen))

    local prevSpaceId = nil
    for i, id in ipairs(spacesInCurrentScreen) do
        if id == currentFocusedSpaceId and i > 1 then
            prevSpaceId = spacesInCurrentScreen[i - 1]
            break
        end
    end
    if prevSpaceId then
        print("Switching to previous space: ", prevSpaceId)
        hs.spaces.gotoSpace(prevSpaceId)
        hs.timer.doAfter(1, function()
            print("Removing original space: ", currentFocusedSpaceId)
            local ok, err = hs.spaces.removeSpace(currentFocusedSpaceId)
            if not ok then
                print("Remove failed: " .. tostring(err))
            else
                print("Space removed successfully!")
            end
        end)
    else
        print("No previous space found, cannot remove current space.")
    end
end

-- call
space.removeCurrentSpace()
`;

    await callHammerspoon(code);
    await showHUD("Space removed successfully");
  } catch (error) {
    console.error("Error removing space:", error);
    await showHUD(`Failed to remove space: ${error}`);
  }
}
