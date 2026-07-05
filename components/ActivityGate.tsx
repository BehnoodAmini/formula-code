"use client";

import * as React from "react";

/**
 * React 19.2 <Activity>: when the garage scrolls far off-screen we hide it
 * instead of unmounting, so the WebGL context, camera pose, selected part and
 * game config all survive a round trip down to the contact form and back.
 * Accessed defensively so a React minor that renames/removes the export
 * degrades to "always visible" instead of crashing the page.
 */
const ActivityComp = (
  React as unknown as {
    Activity?: React.ComponentType<{
      mode?: "visible" | "hidden";
      children: React.ReactNode;
    }>;
  }
).Activity;

export default function ActivityGate({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  if (ActivityComp) {
    return (
      <ActivityComp mode={active ? "visible" : "hidden"}>{children}</ActivityComp>
    );
  }
  return <>{children}</>;
}
