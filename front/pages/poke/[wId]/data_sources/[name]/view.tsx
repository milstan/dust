import { Input, Page } from "@dust-tt/sparkle";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";

import PokeNavbar from "@app/components/poke/PokeNavbar";
import { getDataSource } from "@app/lib/api/data_sources";
import { Authenticator, getSession } from "@app/lib/auth";
import { CoreAPI, CoreAPIDocument } from "@app/lib/core_api";
import { classNames } from "@app/lib/utils";

export const getServerSideProps: GetServerSideProps<{
  document: CoreAPIDocument;
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

  const dataSource = await getDataSource(auth, context.params?.name as string);
  if (!dataSource) {
    return {
      notFound: true,
    };
  }

  const document = await CoreAPI.getDataSourceDocument({
    projectId: dataSource.dustAPIProjectId,
    dataSourceName: dataSource.name,
    documentId: context.query.documentId as string,
  });

  if (document.isErr()) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      document: document.value.document,
    },
  };
};

export default function DataSourceUpsert({
  document,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <div className="min-h-screen bg-structure-50">
      <PokeNavbar />
      <div className="mx-auto max-w-4xl">
        <div className="pt-6">
          <Page.Vertical align="stretch">
            <div className="pt-4">
              <Page.SectionHeader title="Document title" />
              <div className="pt-4">
                <Input
                  placeholder="Document title"
                  name="document"
                  disabled={true}
                  value={document.document_id}
                />
              </div>
            </div>

            <div className="pt-4">
              <Page.SectionHeader title="Source URL" />
              <div className="pt-4">
                <Input
                  placeholder=""
                  name="document"
                  disabled={true}
                  value={document.source_url || ""}
                />
              </div>
            </div>

            <div className="pt-4">
              <Page.SectionHeader title="Text content" />
              <div className="pt-4">
                <textarea
                  name="text"
                  id="text"
                  rows={20}
                  readOnly={true}
                  className={classNames(
                    "font-mono text-normal block w-full min-w-0 flex-1 rounded-md",
                    "border-structure-200 bg-structure-50",
                    "focus:border-gray-300 focus:ring-0"
                  )}
                  disabled={true}
                  value={document.text || ""}
                />
              </div>
            </div>

            <div className="pt-4">
              <Page.SectionHeader title="Tags" />
              <div className="pt-4">
                {document.tags.map((tag, index) => (
                  <div key={index} className="flex flex-grow flex-row">
                    <div className="flex flex-1 flex-row gap-8">
                      <div className="flex flex-1 flex-col">
                        <Input
                          className="w-full"
                          placeholder="Tag"
                          name="tag"
                          disabled={true}
                          value={tag}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Page.Vertical>
        </div>
      </div>
    </div>
  );
}
