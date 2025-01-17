import {
  executeChild,
  proxyActivities,
  setHandler,
  sleep,
  workflowInfo,
} from "@temporalio/workflow";
import PQueue from "p-queue";

import type * as activities from "@connectors/connectors/slack/temporal/activities";
import { ModelId } from "@connectors/lib/models";

import { getWeekEnd, getWeekStart } from "../lib/utils";
import { newWebhookSignal, syncChannelSignal } from "./signals";

const {
  getChannel,
  syncThread,
  syncNonThreaded,
  syncChannel,
  fetchUsers,
  saveSuccessSyncActivity,
  reportInitialSyncProgressActivity,
  getChannelsToGarbageCollect,
  joinChannelAct,
  deleteChannel,
  deleteChannelsFromConnectorDb,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 minutes",
});

/**
 * - Concurrency model:
 * One child workflow per Slack channel is triggered
 * For one channel:
 *  We fetch messages by batch of 100.
 *   We trigger 2 sync activities per batch of 100:
 *    One for all threaded messages
 *     Inside, we have one promise per thread
 *    One for all non threaded messages
 *     Inside, we have one promise per week
 *    Promises are sent and awaited by batch of activities.MAX_CONCURRENCY_LEVEL
 */
export async function workspaceFullSync(
  connectorId: ModelId,
  fromTs: number | null
): Promise<void> {
  let i = 1;
  const promises: Promise<void>[] = [];
  const childWorkflowQueue = new PQueue({
    concurrency: 1,
  });
  setHandler(syncChannelSignal, async (input) => {
    for (const channelId of input.channelIds) {
      promises.push(
        childWorkflowQueue.add(async () => {
          const percentSync = Math.round(
            (i / Math.max(promises.length, input.channelIds.length)) * 100
          );
          await reportInitialSyncProgressActivity(
            connectorId,
            `${percentSync}%`
          );
          return await executeChild(syncOneChannel, {
            workflowId: syncOneChanneWorkflowlId(connectorId, channelId),
            args: [connectorId, channelId, false, fromTs],
            memo: workflowInfo().memo,
          });
          i++;
        })
      );
    }
  });
  await fetchUsers(connectorId);
  await Promise.all(promises);

  await executeChild(slackGarbageCollectorWorkflow, {
    workflowId: slackGarbageCollectorWorkflowId(connectorId),
    args: [connectorId],
    memo: workflowInfo().memo,
  });

  await saveSuccessSyncActivity(connectorId);
  console.log(`Workspace sync done for connector ${connectorId}`);
}

export async function syncOneChannel(
  connectorId: ModelId,
  channelId: string,
  updateSyncStatus: boolean,
  fromTs: number | null
) {
  await joinChannelAct(connectorId, channelId);

  let messagesCursor: string | undefined = undefined;
  let weeksSynced: Record<number, boolean> = {};

  do {
    const syncChannelRes = await syncChannel(
      channelId,
      connectorId,
      fromTs,
      weeksSynced,
      messagesCursor
    );
    if (syncChannelRes) {
      messagesCursor = syncChannelRes.nextCursor;
      weeksSynced = syncChannelRes.weeksSynced;
    }
  } while (messagesCursor);

  if (updateSyncStatus) {
    await saveSuccessSyncActivity(connectorId);
  }
}

export async function syncOneThreadDebounced(
  connectorId: ModelId,
  channelId: string,
  threadTs: string
) {
  let signaled = false;
  let debounceCount = 0;

  setHandler(newWebhookSignal, () => {
    console.log("Got a new webhook ");
    signaled = true;
  });

  while (signaled) {
    signaled = false;
    await sleep(10000);
    if (signaled) {
      debounceCount++;
      continue;
    }
    const channel = await getChannel(connectorId, channelId);
    if (!channel.name) {
      throw new Error(`Could not find channel name for channel ${channelId}`);
    }

    console.log(`Talked to slack after debouncing ${debounceCount} time(s)`);
    await syncThread(channelId, channel.name, threadTs, connectorId);
    await saveSuccessSyncActivity(connectorId);
  }
  // /!\ Any signal received outside of the while loop will be lost, so don't make any async
  // call here, which will allow the signal handler to be executed by the nodejs event loop. /!\
}

export async function syncOneMessageDebounced(
  connectorId: ModelId,
  channelId: string,
  threadTs: string
) {
  let signaled = false;
  let debounceCount = 0;

  setHandler(newWebhookSignal, () => {
    console.log("Got a new webhook ");
    signaled = true;
  });

  while (signaled) {
    signaled = false;
    await sleep(10000);
    if (signaled) {
      debounceCount++;
      console.log("Debouncing, sleep 10 secs");
      continue;
    }
    console.log(`Talked to slack after debouncing ${debounceCount} time(s)`);

    const channel = await getChannel(connectorId, channelId);
    if (!channel.name) {
      throw new Error(`Could not find channel name for channel ${channelId}`);
    }
    const messageTs = parseInt(threadTs) * 1000;
    const startTsMs = getWeekStart(new Date(messageTs)).getTime();
    const endTsMs = getWeekEnd(new Date(messageTs)).getTime();
    await syncNonThreaded(
      channelId,
      channel.name,
      startTsMs,
      endTsMs,
      connectorId
    );
    await saveSuccessSyncActivity(connectorId);
  }
  // /!\ Any signal received outside of the while loop will be lost, so don't make any async
  // call here, which will allow the signal handler to be executed by the nodejs event loop. /!\
}

export async function slackGarbageCollectorWorkflow(
  connectorId: ModelId
): Promise<void> {
  const { channelsToDeleteFromConnectorsDb, channelsToDeleteFromDataSource } =
    await getChannelsToGarbageCollect(connectorId);
  for (const channelId of channelsToDeleteFromDataSource) {
    await deleteChannel(channelId, connectorId);
  }
  await deleteChannelsFromConnectorDb(
    channelsToDeleteFromConnectorsDb,
    connectorId
  );
}

export function workspaceFullSyncWorkflowId(
  connectorId: ModelId,
  fromTs: number | null
) {
  if (fromTs) {
    return `slack-workspaceFullSync-${connectorId}-fromTs-${fromTs}`;
  }
  return `slack-workspaceFullSync-${connectorId}`;
}

export function syncOneChanneWorkflowlId(
  connectorId: ModelId,
  channelId: string
) {
  return `slack-syncOneChannel-${connectorId}-${channelId}`;
}

export function syncOneThreadDebouncedWorkflowId(
  connectorId: ModelId,
  channelId: string,
  threadTs: string
) {
  return `slack-syncOneThreadDebounced-${connectorId}-${channelId}-${threadTs}`;
}

export function syncOneMessageDebouncedWorkflowId(
  connectorId: ModelId,
  channelId: string,
  startTsMs: number
) {
  return `slack-syncOneMessageDebounced-${connectorId}-${channelId}-${startTsMs}`;
}

export function slackGarbageCollectorWorkflowId(connectorId: ModelId) {
  return `slack-GarbageCollector-${connectorId}`;
}
