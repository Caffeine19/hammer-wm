import { ActionPanel, List, Action, Icon, Color, getApplications } from "@raycast/api";
import { useState, useEffect } from "react";
import { Space, Window } from "./types/space";
import { gotoSpace, listSpace, getSpaceWindows } from "./utils/space";
import { tryit, group, sleep } from "radash";
import { showFailureToast } from "@raycast/utils";

// Window display component
function WindowList({ windows, appIcons }: { windows: Window[]; appIcons: Record<string, string> }) {
  return (
    <>
      {windows.map((window: Window) => (
        <List.Item.Detail.Metadata.Label
          key={window.id}
          title={window.application}
          text={window.title.length > 40 ? `${window.title.substring(0, 40)}...` : window.title}
          icon={{
            fileIcon:
              appIcons[window.application] ||
              (window.isMinimized ? Icon.Minus : window.isFullscreen ? Icon.Maximize : Icon.Window),
          }}
        />
      ))}
    </>
  );
}

// Space detail metadata component
function SpaceDetail({
  space,
  windows,
  isLoadingSpaceWindows,
  appIcons,
}: {
  space: Space;
  windows: Window[];
  isLoadingSpaceWindows: boolean;
  appIcons: Record<string, string>;
}) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={space.name || `Space ${space.id}`} />
          <List.Item.Detail.Metadata.Label title="ID" text={space.id} />
          <List.Item.Detail.Metadata.Label title="Screen" text={space.screenName} />
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={space.isCurrent ? "Current Active Space" : "Inactive Space"}
            icon={{
              source: space.isCurrent ? Icon.CheckCircle : Icon.Circle,
              tintColor: space.isCurrent ? Color.Green : undefined,
            }}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Windows"
            text={isLoadingSpaceWindows ? "Loading..." : `${windows.length} windows`}
          />
          <WindowList windows={windows} appIcons={appIcons} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Available Actions" text="" />
          <List.Item.Detail.Metadata.Label title="• Go to Space" text="Press ⏎" />
          {/* <List.Item.Detail.Metadata.Label title="• Remove Space" text="Press ⌘⌫ (if not current)" /> */}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// Individual space item component
function SpaceItem({
  space,
  spaceWindows,
  loadingWindows,
  appIcons,
}: {
  space: Space;
  spaceWindows: Record<string, Window[]>;
  loadingWindows: Record<string, boolean>;
  appIcons: Record<string, string>;
}) {
  const windows = (spaceWindows[space.id] || []).filter((window) => window.application !== "Raycast");
  const isLoadingSpaceWindows = loadingWindows[space.id] || false;

  return (
    <List.Item
      key={space.id}
      id={space.id}
      icon={{
        source: Icon.Window,
        tintColor: space.isCurrent ? Color.Green : undefined,
      }}
      title={space.name || `Space ${space.id}`}
      accessories={[
        {
          text: space.isCurrent ? "Current" : undefined,
          icon: space.isCurrent
            ? {
                source: Icon.CheckCircle,
                tintColor: Color.Green,
              }
            : undefined,
        },
      ]}
      detail={
        <SpaceDetail
          space={space}
          windows={windows}
          isLoadingSpaceWindows={isLoadingSpaceWindows}
          appIcons={appIcons}
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Go to Space" onAction={() => gotoSpace(space.id)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [spaceWindows, setSpaceWindows] = useState<Record<string, Window[]>>({});
  const [loadingWindows, setLoadingWindows] = useState<Record<string, boolean>>({});
  const [, setSelectedSpaceId] = useState<string | null>(null);
  const [appIcons, setAppIcons] = useState<Record<string, string>>({});

  const fetchSpaces = async () => {
    setIsLoading(true);
    const [err, res] = await tryit(listSpace)();
    setIsLoading(false);
    if (err) {
      showFailureToast(err);
      return;
    }
    setSpaces(res);
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchApplicationIcons = async (applicationNames: string[]) => {
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

    setAppIcons((prev) => ({ ...prev, ...newAppIcons }));
  };

  const fetchSpaceWindows = async (spaceId: string) => {
    if (spaceWindows[spaceId] || loadingWindows[spaceId]) {
      console.log("🚀 ~ list-spaces.tsx:36 ~ fetchSpaceWindows ~ skipping, already loaded or loading");
      return;
    }

    setIsLoading(true);
    setLoadingWindows((prev) => ({ ...prev, [spaceId]: true }));
    await sleep(100);
    const [err, windows] = await tryit(getSpaceWindows)(spaceId);
    setLoadingWindows((prev) => ({ ...prev, [spaceId]: false }));
    (async () => {
      await sleep(200);
      setIsLoading(false);
    })();

    if (err) {
      showFailureToast(err);
      return;
    }

    setSpaceWindows((prev) => ({ ...prev, [spaceId]: windows }));

    // Fetch application icons for new applications
    const newAppNames = windows.map((window) => window.application).filter((appName) => !appIcons[appName]);

    if (newAppNames.length > 0) {
      fetchApplicationIcons(newAppNames);
    }
  };

  const handleSelectionChange = async (spaceId: string | null) => {
    console.log("🚀 ~ list-spaces.tsx:47 ~ handleSelectionChange ~ spaceId:", spaceId);
    setSelectedSpaceId(spaceId);

    if (spaceId) {
      // Only fetch windows if we don't already have them
      if (!spaceWindows[spaceId] && !loadingWindows[spaceId]) {
        fetchSpaceWindows(spaceId);
      }
    }
  };

  // Group spaces by screen using radash.group
  const spacesByScreen = group(spaces, (space) => space.screenName);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Spaces"
      searchBarPlaceholder="Search spaces..."
      isShowingDetail
      onSelectionChange={handleSelectionChange}
    >
      {Object.entries(spacesByScreen).map(([screenName, spacesInScreen]) => (
        <List.Section key={screenName} title={screenName} subtitle={`${spacesInScreen?.length || 0} spaces`}>
          {spacesInScreen?.map((space: Space) => (
            <SpaceItem
              key={space.id}
              space={space}
              spaceWindows={spaceWindows}
              loadingWindows={loadingWindows}
              appIcons={appIcons}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
