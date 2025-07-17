import { showHUD } from "@raycast/api";
import { callHammerspoon } from "./utils/call-hammerspoon";

export default async function createSpace() {
  try {
    const code = /**lua*/ `
      -- Get the current focused space and screen
      local currentSpace = hs.spaces.focusedSpace()
      local currentScreen = hs.screen.mainScreen()
      
      -- Add a new space to the current screen
      hs.spaces.addSpaceToScreen(currentScreen, false)
      
      
      -- Get all spaces on the current screen to find our position
      local allSpaces = hs.spaces.spacesForScreen(currentScreen)
      local currentIndex = nil
      local newSpaceIndex = nil
      
      -- Find the index of current space
      for i, spaceId in ipairs(allSpaces) do
        if spaceId == currentSpace then
          currentIndex = i
          newSpaceIndex = i + 1
          break
        end
      end

      local newSpaceId = allSpaces[newSpaceIndex]
      print("New space ID: ", newSpaceId)
      
      -- Switch to the new space
      hs.timer.doAfter(0.4, function()
        hs.spaces.gotoSpace(newSpaceId)
      end)
      
      return "Space created successfully"
    `;

    const result = await callHammerspoon(code);
    await showHUD("Created new space");
  } catch (error) {
    console.error("Error creating space:", error);
    await showHUD(`Failed to create space: ${error}`);
  }
}
