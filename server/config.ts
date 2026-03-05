// M5 test
type ImportMetaWithEnv = ImportMeta & {
  env?: {
    DEV?: boolean;
  };
};

const viteDev = (import.meta as ImportMetaWithEnv).env?.DEV;

export const isDev = viteDev ?? process.env.NODE_ENV !== "production";
