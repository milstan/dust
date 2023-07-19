import {
  DocumentsPostProcessHookFilterParams,
  DocumentsPostProcessHookOnDeleteParams,
  DocumentsPostProcessHookOnUpsertParams,
} from "@app/documents_post_process_hooks/hooks";
import { TRACKABLE_CONNECTOR_TYPES } from "@app/documents_post_process_hooks/hooks/document_tracker/consts";
import { getDatasource } from "@app/documents_post_process_hooks/hooks/lib/data_source_helpers";
import { ConnectorProvider } from "@app/lib/connectors_api";
import { updateTrackedDocuments } from "@app/lib/document_tracker";
import { TrackedDocument } from "@app/lib/models";
import mainLogger from "@app/logger/logger";

const { RUN_DOCUMENT_TRACKER_FOR_WORKSPACE_IDS = "" } = process.env;

const logger = mainLogger.child({
  postProcessHook: "document_tracker_update_tracked_documents",
});

export async function shouldDocumentTrackerUpdateTrackedDocumentsRun(
  params: DocumentsPostProcessHookFilterParams
): Promise<boolean> {
  const localLogger = logger.child({
    workspaceId: params.workspaceId,
    dataSourceName: params.dataSourceName,
    documentId: params.documentId,
  });
  localLogger.info(
    "Checking if document_tracker_update_tracked_documents post process hook should run."
  );

  const whitelistedWorkspaceIds =
    RUN_DOCUMENT_TRACKER_FOR_WORKSPACE_IDS.split(",");

  if (!whitelistedWorkspaceIds.includes(params.workspaceId)) {
    localLogger.info(
      "Workspace not whitelisted, document_tracker_update_tracked_documents post process hook should not run."
    );
    return false;
  }

  const dataSource = await getDatasource(
    params.dataSourceName,
    params.workspaceId
  );

  if (
    params.verb === "upsert" &&
    params.documentText.includes("DUST_TRACK(") &&
    TRACKABLE_CONNECTOR_TYPES.includes(
      dataSource.connectorProvider as ConnectorProvider
    )
  ) {
    localLogger.info(
      "Document includes DUST_TRACK tags, document_tracker_update_tracked_documents post process hook should run."
    );
    return true;
  }

  const docIsTracked = !!(await TrackedDocument.count({
    where: {
      dataSourceId: dataSource.id,
      documentId: params.documentId,
    },
  }));

  if (docIsTracked) {
    // Always run the document tracker for tracked documents, so we can
    // garbage collect the TrackedDocuments if all the DUST_TRACK tags are removed.

    localLogger.info(
      "Document is tracked, document_tracker_update_tracked_documents post process hook should run."
    );
    return true;
  }

  return false;
}

export async function documentTrackerUpdateTrackedDocumentsOnUpsert({
  dataSourceName,
  workspaceId,
  documentId,
  documentText,
}: DocumentsPostProcessHookOnUpsertParams): Promise<void> {
  logger.info(
    {
      workspaceId,
      dataSourceName,
      documentId,
    },
    "Running document_tracker_update_tracked_documents post upsert hook."
  );

  const dataSource = await getDatasource(dataSourceName, workspaceId);
  if (
    TRACKABLE_CONNECTOR_TYPES.includes(
      dataSource.connectorProvider as ConnectorProvider
    )
  ) {
    logger.info("Updating tracked documents.");
    await updateTrackedDocuments(dataSource.id, documentId, documentText);
  }
}

export async function documentTrackerUpdateTrackedDocumentsOnDelete({
  dataSourceName,
  workspaceId,
  documentId,
}: DocumentsPostProcessHookOnDeleteParams): Promise<void> {
  logger.info(
    {
      workspaceId,
      dataSourceName,
      documentId,
    },
    "Running document_tracker_update_tracked_documents onDelete."
  );

  const dataSource = await getDatasource(dataSourceName, workspaceId);

  await TrackedDocument.destroy({
    where: {
      dataSourceId: dataSource.id,
      documentId,
    },
  });
}