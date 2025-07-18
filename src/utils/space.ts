import { sleep } from "radash";
import { Space, Window } from "../types/space";
import { callHammerspoon } from "./call-hammerspoon";

export function removeSpace(spaceId: Space["id"]) {
  const code = /* lua */ `
        local ok, err = hs.spaces.removeSpace(${spaceId})
        if not ok then
            print("Remove failed: " .. tostring(err))
            error("Failed to remove space: " .. tostring(err))
        end
    `;
  return callHammerspoon(code);
}

export async function removeCurrentSpace() {
  const code = /* lua */ `
    local currentScreen = hs.screen.mainScreen()
    local currentActiveSpaceOnCurrentScreen = hs.spaces.activeSpaceOnScreen(currentScreen)
    local spacesInCurrentScreen = hs.spaces.spacesForScreen(currentScreen)
    print(hs.inspect(spacesInCurrentScreen), currentActiveSpaceOnCurrentScreen)

    local prevSpaceId = nil
    for i, id in ipairs(spacesInCurrentScreen) do
        if id == currentActiveSpaceOnCurrentScreen and i > 1 then
            prevSpaceId = spacesInCurrentScreen[i - 1]
            break
        end
    end

    if not prevSpaceId then
        error("No previous space found, cannot remove current space.")
        return
    end

    print("Switching to previous space: ", prevSpaceId)
    hs.spaces.gotoSpace(prevSpaceId)

    local newActiveSpace = hs.spaces.activeSpaceOnScreen(currentScreen)
    print("New active space after switching: ", newActiveSpace)

    return currentActiveSpaceOnCurrentScreen
  `;

  const currentActiveSpaceOnCurrentScreen = await callHammerspoon(code);
  console.log(
    "🚀 ~ space.ts:45 ~ removeCurrentSpace ~ currentActiveSpaceOnCurrentScreen:",
    currentActiveSpaceOnCurrentScreen,
  );

  await sleep(100);

  await removeSpace(currentActiveSpaceOnCurrentScreen);
}

export function gotoSpace(spaceId: Space["id"]) {
  const code = /* lua */ `
        local ok, err = hs.spaces.gotoSpace(${spaceId})
        if not ok then
            print("Goto failed: " .. tostring(err))
            error("Failed to go to space: " .. tostring(err))
        end
    `;

  return callHammerspoon(code);
}

export async function createSpace() {
  const code = /* lua */ `
    local currentScreen = hs.screen.mainScreen()
    hs.spaces.addSpaceToScreen(currentScreen, false)

    -- Get all spaces on the current screen to find our position
    local allSpaces = hs.spaces.spacesForScreen(currentScreen)
    print("All spaces on current screen:", hs.inspect(allSpaces))

    -- newSpaceIndex=the last of the allSpaces
    local newSpaceIndex = #allSpaces
    print("New spae index", newSpaceIndex)

    local newSpaceId = allSpaces[newSpaceIndex]
    print("New space ID: ", newSpaceId)

    return newSpaceId
  `;

  const newSpaceId = await callHammerspoon(code);
  console.log("🚀 ~ space.ts:85 ~ createSpace ~ newSpaceId:", newSpaceId);

  await gotoSpace(newSpaceId);
}

export async function listSpace(): Promise<Space[]> {
  const code = /* lua */ `
    local spaces = {}
    local currentSpace = hs.spaces.focusedSpace()
    local spaceNames = hs.spaces.missionControlSpaceNames()
    
    -- Get screen information
    local screens = hs.screen.allScreens()
    local screenInfo = {}
    for _, screen in ipairs(screens) do
        local uuid = screen:getUUID()
        local name = screen:name()
        screenInfo[uuid] = name
    end

    for screenUUID, screenSpaces in pairs(spaceNames) do
        for spaceId, spaceName in pairs(screenSpaces) do
            table.insert(spaces, {
                id = tostring(spaceId),
                name = spaceName,
                screenId = screenUUID,
                screenName = screenInfo[screenUUID] or "Unknown Screen",
                isCurrent = spaceId == currentSpace
            })
        end
    end

    return hs.json.encode(spaces)
  `;

  const result = await callHammerspoon(code);
  return JSON.parse(result);
}

export async function getSpaceWindows(spaceId: Space["id"]): Promise<Window[]> {
  console.log("🚀 ~ space.ts:128 ~ getSpaceWindows ~ spaceId:", spaceId);
  const code = /* lua */ `
    local windows = {}
    local windowsInSpace = hs.spaces.windowsForSpace(${spaceId})
    
    for _, windowId in ipairs(windowsInSpace) do
        local window = hs.window.get(windowId)
        if window then
            local app = window:application()
            table.insert(windows, {
                id = tostring(windowId),
                title = window:title() or "Untitled",
                application = app and app:name() or "Unknown",
                isMinimized = window:isMinimized(),
                isFullscreen = window:isFullscreen()
            })
        end
    end
    
    return hs.json.encode(windows)
  `;

  const result = await callHammerspoon(code);
  return JSON.parse(result);
}
