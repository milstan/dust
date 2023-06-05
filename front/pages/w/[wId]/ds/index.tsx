import { Dialog, Transition } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/outline";
import Nango from "@nangohq/frontend";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";

import AppLayout from "@app/components/AppLayout";
import { Button } from "@app/components/Button";
import { ActionButton } from "@app/components/Button";
import MainTab from "@app/components/profile/MainTab";
import { getDataSources } from "@app/lib/api/data_sources";
import { Authenticator, getSession, getUserFromSession } from "@app/lib/auth";
import {
  ConnectorProvider,
  ConnectorsAPI,
  ConnectorType,
} from "@app/lib/connectors_api";
import { classNames, timeAgoFrom } from "@app/lib/utils";
import logger from "@app/logger/logger";
import { DataSourceType } from "@app/types/data_source";
import { UserType, WorkspaceType } from "@app/types/user";

const {
  GA_TRACKING_ID = "",
  NANGO_SLACK_CONNECTOR_ID = "",
  NANGO_NOTION_CONNECTOR_ID = "",
  NANGO_GOOGLE_DRIVE_CONNECTOR_ID = "",
  NANGO_PUBLIC_KEY = "",
} = process.env;

type UpcomingConnectorProvider = "google_drive" | "github";

type DataSourceIntegration = {
  name: string;
  connector?: ConnectorType | null;
  fetchConnectorError: boolean | null;
  isBuilt: boolean;
  connectorProvider: ConnectorProvider | UpcomingConnectorProvider;
  logoPath?: string;
  synchronizedAgo?: string | null;
};

const DATA_SOURCE_INTEGRATIONS: DataSourceIntegration[] = [
  {
    name: "Notion",
    connectorProvider: "notion",
    isBuilt: true,
    logoPath: "/static/notion_32x32.png",
    fetchConnectorError: null,
  },
  {
    name: "Slack",
    connectorProvider: "slack",
    isBuilt: true,
    logoPath: "/static/slack_32x32.png",
    fetchConnectorError: null,
  },
  {
    name: "Google Drive",
    connectorProvider: "google_drive",
    isBuilt: true,
    logoPath: "/static/google_drive_32x32.png",
    fetchConnectorError: null,
  },
  {
    name: "Github",
    connectorProvider: "github",
    isBuilt: false,
    logoPath: "/static/github_black_32x32.png",
    fetchConnectorError: null,
  },
];

export const getServerSideProps: GetServerSideProps<{
  user: UserType | null;
  owner: WorkspaceType;
  readOnly: boolean;
  dataSources: DataSourceType[];
  integrations: DataSourceIntegration[];
  canUseManagedDataSources: boolean;
  gaTrackingId: string;
  nangoConfig: {
    publicKey: string;
    slackConnectorId: string;
    notionConnectorId: string;
    googleDriveConnectorId: string;
  };
}> = async (context) => {
  const session = await getSession(context.req, context.res);
  const user = await getUserFromSession(session);
  const auth = await Authenticator.fromSession(
    session,
    context.params?.wId as string
  );

  const owner = auth.workspace();
  if (!owner) {
    return {
      notFound: true,
    };
  }

  const readOnly = !auth.isBuilder();

  const allDataSources = await getDataSources(auth);
  const dataSources = allDataSources.filter((ds) => !ds.connectorId);
  const managedDataSources = allDataSources.filter((ds) => ds.connectorId);
  const provider2Connector = await Promise.all(
    managedDataSources.map(async (mds) => {
      if (!mds.connectorId) {
        throw new Error(
          // Should never happen, but we need to make eslint happy
          "Unexpected empty connectorId for managed data sources"
        );
      }
      try {
        const statusRes = await ConnectorsAPI.getConnector(mds.connectorId);
        if (statusRes.isErr()) {
          return {
            provider: mds.connectorProvider,
            connector: undefined,
            fetchConnectorError: true,
          };
        }
        return {
          provider: mds.connectorProvider,
          connector: statusRes.value,
          fetchConnectorError: false,
        };
      } catch (e) {
        // Probably means `connectors` is down, we log but don't fail to avoid a 500 when just
        // displaying the datasources (eventual actions will fail but a 500 just at display is not
        // desirable). When that happens the managed data sources are shown as failed.
        logger.error(
          {
            error: e,
          },
          "Failed to get connector"
        );
        return {
          provider: mds.connectorProvider,
          connector: undefined,
          fetchConnectorError: true,
        };
      }
    })
  );

  return {
    props: {
      user,
      owner,
      readOnly,
      dataSources,
      integrations: DATA_SOURCE_INTEGRATIONS.map(
        (managedDs): DataSourceIntegration => {
          const p2c = provider2Connector.find(
            (p) => p.provider == managedDs.connectorProvider
          );
          return {
            ...managedDs,
            connector: p2c?.connector || null,
            fetchConnectorError:
              p2c?.fetchConnectorError === undefined
                ? null
                : p2c.fetchConnectorError,
            synchronizedAgo: p2c?.connector?.lastSyncSuccessfulTime
              ? timeAgoFrom(p2c.connector.lastSyncSuccessfulTime)
              : null,
          };
        }
      ),
      canUseManagedDataSources: owner.plan.limits.dataSources.managed,
      gaTrackingId: GA_TRACKING_ID,
      nangoConfig: {
        publicKey: NANGO_PUBLIC_KEY,
        slackConnectorId: NANGO_SLACK_CONNECTOR_ID,
        notionConnectorId: NANGO_NOTION_CONNECTOR_ID,
        googleDriveConnectorId: NANGO_GOOGLE_DRIVE_CONNECTOR_ID,
      },
    },
  };
};

export default function DataSourcesView({
  user,
  owner,
  readOnly,
  dataSources,
  integrations,
  canUseManagedDataSources,
  gaTrackingId,
  nangoConfig,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [localIntegrations, setLocalIntegrations] = useState(integrations);

  const [isLoadingByProvider, setIsLoadingByProvider] = useState<
    Record<ConnectorProvider, boolean | undefined>
  >({} as Record<ConnectorProvider, boolean | undefined>);

  const handleEnableManagedDataSource = async (provider: ConnectorProvider) => {
    const nangoConnectorId = {
      slack: nangoConfig.slackConnectorId,
      notion: nangoConfig.notionConnectorId,
      google_drive: nangoConfig.googleDriveConnectorId,
    }[provider];
    const nango = new Nango({ publicKey: nangoConfig.publicKey });

    try {
      const {
        connectionId: nangoConnectionId,
      }: { providerConfigKey: string; connectionId: string } = await nango.auth(
        nangoConnectorId,
        `${provider}-${owner.sId}`
      );

      setIsLoadingByProvider((prev) => ({ ...prev, [provider]: true }));

      const res = await fetch(`/api/w/${owner.sId}/data_sources/managed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          nangoConnectionId,
        }),
      });
      if (res.ok) {
        const createdManagedDataSource: {
          dataSource: DataSourceType;
          connector: ConnectorType;
        } = await res.json();
        setLocalIntegrations((prev) =>
          prev.map((ds) => {
            return ds.connectorProvider == provider
              ? { ...ds, connector: createdManagedDataSource.connector }
              : ds;
          })
        );
      } else {
        logger.error(
          {
            status: res.status,
            body: await res.text(),
            provider,
          },
          `Failed to enable managed Data Source`
        );
        window.alert(`Failed to enable ${provider} Data Source`);
      }
    } catch (e) {
      logger.error(e, "Failed to enable managed Data Source");
      window.alert(`Failed to enable ${provider}  Data Source`);
    } finally {
      setIsLoadingByProvider((prev) => ({ ...prev, [provider]: false }));
    }
  };

  useEffect(() => {
    setLocalIntegrations(localIntegrations);
  }, [localIntegrations]);
  const googleDrive = integrations.find((integration) => {
    return integration.connectorProvider === "google_drive";
  });

  return (
    <AppLayout user={user} owner={owner} gaTrackingId={gaTrackingId}>
      <div className="flex flex-col">
        <div className="mt-2 flex flex-initial">
          {googleDrive && googleDrive.connector && (
            <GoogleDriveFoldersPicker
              owner={owner}
              connectorId={googleDrive.connector.id}
            />
          )}

          <MainTab currentTab="Data Sources" owner={owner} />
        </div>
        <div className="">
          <div className="mx-auto mt-8 max-w-4xl divide-y divide-gray-200 px-6">
            <div className="mt-8 flex flex-col justify-between md:flex-row md:items-center">
              <div className="">
                <h1 className="text-base font-medium text-gray-900">
                  Data Sources
                </h1>

                <p className="text-sm text-gray-500">
                  Data Sources let you perform semantic searches on your data.
                </p>
              </div>
              <div className="mr-2 mt-2 whitespace-nowrap md:ml-12">
                {!readOnly && (
                  <Link
                    className="ml-auto"
                    href={`/w/${owner.sId}/ds/new`}
                    onClick={(e) => {
                      // Enforce plan limits: DataSources count.
                      if (
                        owner.plan.limits.dataSources.count != -1 &&
                        dataSources.length >=
                          owner.plan.limits.dataSources.count
                      ) {
                        e.preventDefault();
                        window.alert(
                          "You are limited to 1 DataSource on our free plan. Contact team@dust.tt if you want to increase this limit."
                        );
                        return;
                      }
                    }}
                  >
                    <Button>
                      <PlusIcon className="-ml-1 mr-1 h-5 w-5" />
                      Create Data Source
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="my-4">
              {dataSources.length == 0 ? (
                <div className="mt-12 flex flex-col items-center justify-center pt-4 text-sm text-gray-500">
                  {readOnly ? (
                    <>
                      <p>
                        Welcome to Dust Data Sources 🔎 This user has not
                        created any data source yet 🙃
                      </p>
                      <p className="mt-2">
                        Sign-in to create your own data sources.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>Welcome to Dust Data Sources 🔎</p>
                      <p className="mt-2">
                        Data sources let you upload documents to perform
                        semantic searches on them (
                        <span className="rounded-md bg-gray-200 px-1 py-0.5 font-bold">
                          data_source
                        </span>{" "}
                        block).
                      </p>
                    </>
                  )}
                </div>
              ) : null}
              <ul role="list" className="pt-4">
                {dataSources.map((ds) => (
                  <li key={ds.name} className="px-2">
                    <div className="py-4">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/w/${owner.sId}/ds/${ds.name}`}
                          className="block"
                        >
                          <p className="truncate text-base font-bold text-violet-600">
                            {ds.name}
                          </p>
                        </Link>
                        <div className="ml-2 flex flex-shrink-0">
                          <p
                            className={classNames(
                              "inline-flex rounded-full px-2 text-xs font-semibold leading-5",
                              ds.visibility == "public"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            )}
                          >
                            {ds.visibility}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-700">
                            {ds.description}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-300 sm:mt-0"></div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-4xl space-y-4 divide-y divide-gray-200 px-6">
        <div className="sm:flex sm:items-center">
          <div className="mt-8 sm:flex-auto">
            <h1 className="text-base font-medium text-gray-900">
              Managed Data Sources
            </h1>

            <p className="text-sm text-gray-500 ">
              Continuously synchronized with the products you use.
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden">
          <ul role="list" className="mt-4">
            {localIntegrations.map((ds) => {
              return (
                <li
                  key={`managed-${ds.connectorProvider}`}
                  className="px-2 py-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {ds.logoPath ? (
                        <div className="mr-1 flex h-4 w-4 flex-initial">
                          <img src={ds.logoPath}></img>
                        </div>
                      ) : null}
                      {ds.connector ? (
                        <Link
                          href={`/w/${
                            owner.sId
                          }/ds/${`managed-${ds.connectorProvider}`}`}
                          className="block"
                        >
                          <p
                            className={classNames(
                              "truncate text-base font-bold",
                              ds.connector
                                ? "text-violet-600"
                                : "text-slate-400"
                            )}
                          >
                            {ds.name}
                          </p>
                        </Link>
                      ) : (
                        <p
                          className={classNames(
                            "truncate text-base font-bold",
                            ds.connector ? "text-violet-600" : "text-slate-400"
                          )}
                        >
                          {ds.name}
                        </p>
                      )}
                    </div>
                    <div>
                      {(() => {
                        if (ds.fetchConnectorError) {
                          return (
                            <p className="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800">
                              errored
                            </p>
                          );
                        }

                        if (!ds || !ds.connector) {
                          return (
                            <Button
                              disabled={
                                !ds.isBuilt ||
                                isLoadingByProvider[
                                  ds.connectorProvider as ConnectorProvider
                                ]
                              }
                              onClick={
                                canUseManagedDataSources
                                  ? async () => {
                                      await handleEnableManagedDataSource(
                                        ds.connectorProvider as ConnectorProvider
                                      );
                                    }
                                  : () => {
                                      window.alert(
                                        "Managed Data Sources are only available on our paid plans. Contact us at team@dust.tt to get access."
                                      );
                                      logger.info(
                                        {
                                          workspace: owner.sId,
                                          connector_provider:
                                            ds.connectorProvider,
                                        },
                                        "request_early_access_managed_data_source"
                                      );
                                    }
                              }
                            >
                              {!ds.isBuilt
                                ? "Coming soon"
                                : !isLoadingByProvider[
                                    ds.connectorProvider as ConnectorProvider
                                  ] && !ds.fetchConnectorError
                                ? "Connect"
                                : "Connecting..."}
                            </Button>
                          );
                        }

                        if (!ds.connector?.lastSyncSuccessfulTime) {
                          return (
                            <div className="flex-col justify-items-end text-right">
                              <p className="leading-2 inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold text-green-800">
                                Synchronizing
                                {ds.connector?.firstSyncProgress
                                  ? ` (${ds.connector?.firstSyncProgress})`
                                  : null}
                              </p>
                            </div>
                          );
                        } else {
                          return (
                            <>
                              <div className="flex-col justify-items-end text-right">
                                <p className="leading-2 inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold text-green-800">
                                  Synchronized
                                </p>
                                <p className="flex-1 rounded-full px-2 text-xs italic text-gray-400">
                                  {ds.synchronizedAgo} ago
                                </p>
                              </div>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}

function GoogleDriveFoldersPicker(props: {
  // onSave: (folders: string[]) => void;
  owner: WorkspaceType;
  connectorId: string;
}) {
  const [open, setOpen] = useState(true);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(
    new Set<string>()
  );
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void (async () => {
      const foldersRes = await fetch(
        `/api/w/${props.owner.sId}/data_sources/google_drive/folders?connectorId=${props.connectorId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (foldersRes.ok) {
        const folders = await foldersRes.json();
        setFolders(folders);
      } else {
        window.alert("Failed to fetch folders");
      }
    })();
  }, []);

  const onSave = async (folders: string[]) => {
    const res = await fetch(
      `/api/w/${props.owner.sId}/data_sources/google_drive/folders`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folders: folders,
          connectorId: props.connectorId.toString(),
        }),
      }
    );
    if (res.ok) {
    } else {
      window.alert("Failed to save folders");
    }
  };

  const cancelButtonRef = useRef(null);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        initialFocus={cancelButtonRef}
        onClose={setOpen}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full  sm:mx-0 sm:h-10 sm:w-10">
                    <img
                      src="/static/google_drive_32x32.png"
                      className="bg-white"
                    />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <Dialog.Title
                      as="h3"
                      className="text-base font-semibold leading-6 text-gray-900"
                    >
                      Select the folders to synchronize.
                    </Dialog.Title>
                    <div className="mt-2">
                      <ul className="h-96 w-auto overflow-auto">
                        {folders.map((folder) => {
                          return (
                            <label key={folder.id} htmlFor={folder.id}>
                              <div className="relative flex items-start p-1">
                                <div className="flex h-6 items-center text-2xl">
                                  {/* <FolderIcon className="-ml-1 mr-1 h-5 w-5" /> */}
                                  <input
                                    id={folder.id}
                                    aria-describedby="comments-description"
                                    type="checkbox"
                                    name={folder.id}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 "
                                    checked={selectedFolders.has(folder.id)}
                                    onChange={() => {
                                      if (selectedFolders.has(folder.id)) {
                                        selectedFolders.delete(folder.id);
                                        setSelectedFolders(
                                          new Set(selectedFolders)
                                        );
                                      } else {
                                        selectedFolders.add(folder.id);
                                        setSelectedFolders(
                                          new Set(selectedFolders)
                                        );
                                      }
                                    }}
                                  />
                                </div>
                                <div className="ml-3 text-base leading-6">
                                  <label
                                    htmlFor="comments"
                                    className="font-medium text-gray-900"
                                  >
                                    {folder.name}
                                  </label>{" "}
                                  <span
                                    id="comments-description"
                                    className="text-gray-500"
                                  >
                                    Drive
                                  </span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <ActionButton
                    onClick={() => {
                      void onSave(Array.from(selectedFolders));
                    }}
                  >
                    Save
                  </ActionButton>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
