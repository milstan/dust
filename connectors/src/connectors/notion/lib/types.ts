import {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

// notion SDK types
export type PageObjectProperties = PageObjectResponse["properties"];
export type PropertyKeys = keyof PageObjectProperties;
export type PropertyTypes = PageObjectProperties[PropertyKeys]["type"];

// Extractor types
export type ParsedNotionPage = {
  id: string;
  url: string;
  title?: string;
  properties: ParsedNotionPageProperty[];
  blocks: ParsedNotionBlock[];
  rendered: string;
  createdTime: number;
  updatedTime: number;
  author: string;
  lastEditor: string;
  hasBody: boolean;
  parentType: "database" | "page" | "block" | "workspace";
  parentId: string;
};

export type ParsedNotionPageProperty = {
  key: string;
  id: string;
  type: PropertyTypes;
  text: string | null;
};

export type NotionBlockType = BlockObjectResponse["type"];

export type ParsedNotionBlock = {
  id: string;
  type: NotionBlockType;
  text: string | null;
  hasChildren: boolean;
  childDatabaseTitle: string | null;
};

export type ParsedNotionDatabase = {
  id: string;
  url: string;
  title?: string;
  parentType: "database" | "page" | "block" | "workspace";
  parentId: string;
};
