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

function space.createSpace()
    -- Get the current focused space and screen
    local currentSpace = hs.spaces.focusedSpace()
    local currentScreen = hs.screen.mainScreen()

    -- Add a new space to the current screen
    hs.spaces.addSpaceToScreen(currentScreen, false)

    -- Get all spaces on the current screen to find our position
    local allSpaces = hs.spaces.spacesForScreen(currentScreen)
    local currentIndex = nil

    -- Find the index of current space
    for i, spaceId in ipairs(allSpaces) do
        if spaceId == currentSpace then
            currentIndex = i
            break
        end
    end

    local newSpaceIndex = #allSpaces + 1
    local newSpaceId = allSpaces[newSpaceIndex]
    print("New space ID: ", newSpaceId)

    -- Switch to the new space
    hs.timer.doAfter(0.1, function()
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
