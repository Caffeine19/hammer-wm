-- space.lua: Space management utilities for Hammerspoon
local space = {}

-- Remove the current space (move to previous, then remove original)
function space.removeCurrentSpace()
    -- local currentFocusedSpaceId = hs.spaces.focusedSpace()
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
    hs.timer.doAfter(0.1, function()
        -- Wait for 100 milliseconds before removing the original space
        -- This allows the switch to complete before we attempt to remove the space
        print("Removing original space: ", currentActiveSpaceOnCurrentScreen)
        local ok, err = hs.spaces.removeSpace(currentActiveSpaceOnCurrentScreen)
        if not ok then
            print("Remove failed: " .. tostring(err))
            error("Failed to remove space: " .. tostring(err))
        end
    end)
end

function space.createSpace()
    -- Get the current focused space and screen
    local currentScreen = hs.screen.mainScreen()
    local currentSpace = hs.spaces.activeSpaceOnScreen(currentScreen)

    -- Add a new space to the current screen
    hs.spaces.addSpaceToScreen(currentScreen, false)

    -- Get all spaces on the current screen to find our position
    local allSpaces = hs.spaces.spacesForScreen(currentScreen)
    print("All spaces on current screen:", hs.inspect(allSpaces))

    -- newSpaceIndex=the last of the allSpaces
    local newSpaceIndex = #allSpaces
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

function space.listSpaces()
    local spaces = {}
    local currentSpace = hs.spaces.focusedSpace()
    local spaceNames = hs.spaces.missionControlSpaceNames()

    for screenUUID, screenSpaces in pairs(spaceNames) do
        for spaceId, spaceName in pairs(screenSpaces) do
            table.insert(spaces, {
                id = tostring(spaceId),
                name = spaceName,
                screenId = screenUUID,
                isCurrent = spaceId == currentSpace
            })
        end
    end

    return hs.json.encode(spaces)
end

return space
