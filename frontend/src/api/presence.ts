import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

interface Viewer {
  user_id: string;
  username: string;
}

const HEARTBEAT_INTERVAL = 15_000; // 15s

export function usePresence(entityType: string, entityId: string | undefined) {
  const queryClient = useQueryClient();

  // Send heartbeats
  useEffect(() => {
    if (!entityId) return;

    const send = () =>
      api
        .post("/presence/heartbeat", {
          entity_type: entityType,
          entity_id: entityId,
        })
        .catch(() => {});

    send();
    const interval = setInterval(() => {
      send();
      queryClient.invalidateQueries({
        queryKey: ["presence", entityType, entityId],
      });
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [entityType, entityId, queryClient]);

  // Fetch viewers
  const { data: viewers = [] } = useQuery({
    queryKey: ["presence", entityType, entityId],
    queryFn: () =>
      api.get<Viewer[]>(
        `/presence/viewers?entity_type=${entityType}&entity_id=${encodeURIComponent(entityId!)}`,
      ),
    enabled: !!entityId,
    refetchInterval: HEARTBEAT_INTERVAL,
  });

  return viewers;
}
