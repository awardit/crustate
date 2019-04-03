/* @flow */

import type { Storage } from "./storage";
import type { StatePath } from "./state";
import type { StateInstance
            , StateInstanceMap } from "./instance";

export interface SupervisorCommon {
  nested: StateInstanceMap;
  getStorage(): Storage;
  getPath(): StatePath;
}

export type Supervisor = (Storage | StateInstance<any, any>);