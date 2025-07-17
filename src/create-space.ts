import { showHUD } from "@raycast/api";
import { callHammerspoon } from "./utils/call-hammerspoon";

export default async function createSpace() {
  try {
    const code = /**lua*/ `
local function createSpace()
    -- Get the current focused space and screen
    local currentScreen = hs.screen.mainScreen()
    local currentSpace = hs.spaces.activeSpaceOnScreen(currentScreen)

    -- Add a new space to the current screen
    hs.spaces.addSpaceToScreen(currentScreen, false)

    -- Get all spaces on the current screen to find our position
    local allSpaces = hs.spaces.spacesForScreen(currentScreen)
    print("All spaces on current screen:", hs.inspect(allSpaces))

    local currentIndex = nil
    local newSpaceIndex = nil

    -- newSpaceIndex=the last of the allSpaces
    newSpaceIndex = #allSpaces
    print("New spae index", newSpaceIndex)

    local newSpaceId = allSpaces[newSpaceIndex]
    print("New space ID: ", newSpaceId)

    -- Switch to the new space

    hs.timer.doAfter(0.1, function()
        -- Wait for 100 milliseconds before switching to the new space
        print("Switching to new space: ", newSpaceId)

        hs.spaces.gotoSpace(newSpaceId)
    end)

    return "Space created successfully"
end
createSpace()
    `;

    const result = await callHammerspoon(code);
    await showHUD(result);
  } catch (error) {
    console.error("Error creating space:", error);
    await showHUD(`Failed to create space: ${error}`);
  }
}
