import {
  Button,
  ContextItem,
  DocumentTextIcon,
  EyeIcon,
  Page,
} from "@dust-tt/sparkle";
import { JsonViewer } from "@textea/json-viewer";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

import PokeNavbar from "@app/components/poke/PokeNavbar";
import { getDataSource } from "@app/lib/api/data_sources";
import { Authenticator, getSession } from "@app/lib/auth";
import { ConnectorsAPI, ConnectorType } from "@app/lib/connectors_api";
import { getDisplayNameForDocument } from "@app/lib/data_sources";
import { useDocuments } from "@app/lib/swr";
import { timeAgoFrom } from "@app/lib/utils";
import { DataSourceType } from "@app/types/data_source";
import { WorkspaceType } from "@app/types/user";

export const getServerSideProps: GetServerSideProps<{
  owner: WorkspaceType;
  dataSource: DataSourceType;
  connector: ConnectorType | null;
}> = async (context) => {
  const wId = context.params?.wId;
  if (!wId || typeof wId !== "string") {
    return {
      notFound: true,
    };
  }

  const dataSourceName = context.params?.name;
  if (!dataSourceName || typeof dataSourceName !== "string") {
    return {
      notFound: true,
    };
  }

  const session = await getSession(context.req, context.res);
  const auth = await Authenticator.fromSuperUserSession(session, wId);
  const user = auth.user();
  const owner = auth.workspace();

  if (!user || !owner) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  if (!auth.isDustSuperUser()) {
    return {
      notFound: true,
    };
  }

  const dataSource = await getDataSource(auth, dataSourceName);
  if (!dataSource) {
    return {
      notFound: true,
    };
  }

  let connector: ConnectorType | null = null;
  if (dataSource.connectorId) {
    const connectorRes = await ConnectorsAPI.getConnector(
      dataSource.connectorId
    );
    if (connectorRes.isOk()) {
      connector = connectorRes.value;
    }
  }

  return {
    props: {
      owner,
      dataSource,
      connector,
    },
  };
};

const DataSourcePage = ({
  owner,
  dataSource,
  connector,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);

  const { documents, total, isDocumentsLoading, isDocumentsError } =
    useDocuments(owner, dataSource, limit, offset);

  const [displayNameByDocId, setDisplayNameByDocId] = useState<
    Record<string, string>
  >({});

  const router = useRouter();

  useEffect(() => {
    if (!isDocumentsLoading && !isDocumentsError) {
      setDisplayNameByDocId(
        documents.reduce(
          (acc, doc) =>
            Object.assign(acc, {
              [doc.document_id]: getDisplayNameForDocument(doc),
            }),
          {}
        )
      );
    }
    if (isDocumentsError) {
      setDisplayNameByDocId({});
    }
  }, [documents, isDocumentsLoading, isDocumentsError]);

  let last = offset + limit;
  if (offset + limit > total) {
    last = total;
  }

  return (
    <div className="min-h-screen bg-structure-50">
      <PokeNavbar />
      <div className="mx-auto max-w-4xl">
        <div className="px-8 py-8"></div>
        <Page.Vertical align="stretch">
          <Page.SectionHeader title={`${dataSource.name}`} />

          <div className="my-8 flex flex-col gap-y-4">
            <JsonViewer value={dataSource} rootName={false} />
            <JsonViewer value={connector} rootName={false} />
          </div>

          <div className="mt-4 flex flex-row">
            <div className="flex flex-1">
              <div className="flex flex-col">
                <div className="flex flex-row">
                  <div className="flex flex-initial gap-x-2">
                    <Button
                      variant="tertiary"
                      disabled={offset < limit}
                      onClick={() => {
                        if (offset >= limit) {
                          setOffset(offset - limit);
                        } else {
                          setOffset(0);
                        }
                      }}
                      label="Previous"
                    />
                    <Button
                      variant="tertiary"
                      label="Next"
                      disabled={offset + limit >= total}
                      onClick={() => {
                        if (offset + limit < total) {
                          setOffset(offset + limit);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-auto pl-2 text-sm text-gray-700">
                  {total > 0 && (
                    <span>
                      Showing documents {offset + 1} - {last} of {total}{" "}
                      documents
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="py-8">
            <ContextItem.List>
              {documents.map((d) => (
                <ContextItem
                  key={d.document_id}
                  title={displayNameByDocId[d.document_id]}
                  visual={
                    <ContextItem.Visual
                      visual={({ className }) =>
                        DocumentTextIcon({
                          className: className + " text-element-600",
                        })
                      }
                    />
                  }
                  action={
                    <Button.List>
                      <Button
                        variant="secondary"
                        icon={EyeIcon}
                        onClick={() => {
                          window.confirm(
                            "Are you sure you want to access this sensible user data?"
                          );
                          void router.push(
                            `/poke/${owner.sId}/data_sources/${
                              dataSource.name
                            }/view?documentId=${encodeURIComponent(
                              d.document_id
                            )}`
                          );
                        }}
                        label="View"
                        labelVisible={false}
                      />
                    </Button.List>
                  }
                >
                  <ContextItem.Description>
                    <div className="pt-2 text-sm text-element-700">
                      {Math.floor(d.text_size / 1024)} kb,{" "}
                      {timeAgoFrom(d.timestamp)} ago
                    </div>
                  </ContextItem.Description>
                </ContextItem>
              ))}
            </ContextItem.List>
            {documents.length == 0 ? (
              <div className="mt-10 flex flex-col items-center justify-center text-sm text-gray-500">
                <p>Empty</p>
              </div>
            ) : null}
          </div>
        </Page.Vertical>
      </div>
    </div>
  );
};

export default DataSourcePage;
